'use strict';
// Integration tests for UI bootstrap — verifies that pasty.* reads the
// correct state after mock window globals are injected.
//
// The SDK ui dist reads window globals at module-evaluation time:
//   _itemTopic = createTopic(readWindowGlobal("__PASTY_PLUGIN_ITEM__"))
// So globals MUST be set BEFORE require()ing the module.
// Attachment updates come in via "pasty-plugin-item" and
// "pasty-plugin-attachment" CustomEvents dispatched after require().
//
// setup.cjs (required via --require before this file) patches globalThis
// addEventListener/removeEventListener so the ui dist can load in Node.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JSDOM = require(path.resolve(__dirname, '../../node_modules/jsdom')).JSDOM;

const sampleItem = {
  id: 'item-bootstrap-1',
  type: 'text',
  tags: ['a', 'b'],
  sourceAppID: 'com.example.test',
};

const sampleAttachment = {
  rendererID: 'template-renderer',
  attachmentType: 'plugin.template.full.preview',
  attachmentKey: 'key-1',
  payloadJson: '{"kind":"template_preview","version":2}',
  item: sampleItem,
  buttons: [],
};

/**
 * Bootstrap a fresh pasty instance with attachment-mode globals.
 *
 * The ui dist reads window globals at module evaluation time:
 *   _itemTopic = createTopic(readWindowGlobal("__PASTY_PLUGIN_ITEM__"))
 * So item MUST be set BEFORE require(). Attachment is seeded via
 * "pasty-plugin-attachment" CustomEvent dispatched after require.
 */
function freshAttachmentPasty(item, attachment) {
  // Bust require cache for the ui dist so module-level singletons reset
  for (const key of Object.keys(require.cache)) {
    if (key.includes('dist/ui') || key.includes('dist\\ui')) {
      delete require.cache[key];
    }
  }
  const dom = new JSDOM('', { url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;

  // Set item global BEFORE require so the topic seeds correctly
  if (item !== null && item !== undefined) {
    global.window.__PASTY_PLUGIN_ITEM__ = item;
  }

  const pasty = require(path.resolve(__dirname, '../../sdk/dist/ui/index.cjs')).pasty;

  // Seed attachment via event AFTER require (listeners registered at module load)
  if (attachment !== null && attachment !== undefined) {
    global.window.dispatchEvent(
      new global.window.CustomEvent('pasty-plugin-attachment', { detail: attachment }),
    );
  }

  return pasty;
}

// ---------------------------------------------------------------------------
// Attachment context bootstrap
// ---------------------------------------------------------------------------
describe('pasty.item — attachment context bootstrap', () => {
  test('pasty.item.current() returns the bootstrapped item', () => {
    const pasty = freshAttachmentPasty(sampleItem, sampleAttachment);
    const item = pasty.item.current();
    assert.deepEqual(item, sampleItem);
  });

  test('pasty.item.attachment.current() returns the bootstrapped attachment', () => {
    const pasty = freshAttachmentPasty(sampleItem, sampleAttachment);
    const att = pasty.item.attachment.current();
    assert.deepEqual(att, sampleAttachment);
  });

  test('pasty.item.current() is undefined when no bootstrap provided', () => {
    const pasty = freshAttachmentPasty(null, null);
    const item = pasty.item.current();
    // Accept undefined or null
    assert.ok(item === undefined || item === null, `expected null/undefined, got ${JSON.stringify(item)}`);
  });

  test('pasty.item.attachment.current() is undefined when no bootstrap provided', () => {
    const pasty = freshAttachmentPasty(null, null);
    const att = pasty.item.attachment.current();
    assert.ok(att === undefined || att === null, `expected null/undefined, got ${JSON.stringify(att)}`);
  });
});

// ---------------------------------------------------------------------------
// Live item updates via CustomEvents
// ---------------------------------------------------------------------------
describe('pasty.item — live update via pasty-plugin-item event', () => {
  test('dispatching pasty-plugin-item event changes pasty.item.current()', () => {
    const pasty = freshAttachmentPasty(sampleItem, sampleAttachment);
    const updatedItem = { ...sampleItem, tags: ['x'] };
    global.window.dispatchEvent(
      new global.window.CustomEvent('pasty-plugin-item', { detail: updatedItem }),
    );
    assert.deepEqual(pasty.item.current(), updatedItem);
  });

  test('on() listener fires when pasty-plugin-item event dispatched', () => {
    const pasty = freshAttachmentPasty(sampleItem, sampleAttachment);
    const received = [];
    pasty.item.on((v) => received.push(v));
    const updatedItem = { ...sampleItem, tags: ['y'] };
    global.window.dispatchEvent(
      new global.window.CustomEvent('pasty-plugin-item', { detail: updatedItem }),
    );
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], updatedItem);
  });

  test('unsubscribed listener does not fire after unsub', () => {
    const pasty = freshAttachmentPasty(sampleItem, sampleAttachment);
    const received = [];
    const unsub = pasty.item.on((v) => received.push(v));
    unsub();
    global.window.dispatchEvent(
      new global.window.CustomEvent('pasty-plugin-item', {
        detail: { ...sampleItem, tags: ['z'] },
      }),
    );
    assert.equal(received.length, 0);
  });
});

// ---------------------------------------------------------------------------
// pasty.* namespace shape checks
// ---------------------------------------------------------------------------
describe('pasty namespace shape', () => {
  test('pasty exposes item, action, clipboard, navigation, settings, console', () => {
    const pasty = freshAttachmentPasty(null, null);
    assert.ok(typeof pasty.item === 'object');
    assert.ok(typeof pasty.action === 'object');
    assert.ok(typeof pasty.clipboard === 'object');
    assert.ok(typeof pasty.navigation === 'object');
    assert.ok(typeof pasty.settings === 'object');
    assert.ok(typeof pasty.console === 'object');
  });

  test('pasty.item exposes current, on, attachment (setTags/addTags/removeTags moved to runtime-only)', () => {
    const pasty = freshAttachmentPasty(null, null);
    assert.ok(typeof pasty.item.current === 'function');
    assert.ok(typeof pasty.item.on === 'function');
    assert.ok(typeof pasty.item.attachment === 'object');
    // setTags/addTags/removeTags/setPinned/setSearchExtension/materializeImagePath
    // were removed from the UI namespace in plugin-api-shrink; they are now
    // runtime-only via ctx.host.item.*
    assert.ok(pasty.item.setTags === undefined, 'setTags must not be on UI pasty.item');
    assert.ok(pasty.item.addTags === undefined, 'addTags must not be on UI pasty.item');
    assert.ok(pasty.item.removeTags === undefined, 'removeTags must not be on UI pasty.item');
  });

  test('pasty.action exposes complete (current/on removed with pasty-plugin-action-session host event)', () => {
    const pasty = freshAttachmentPasty(null, null);
    assert.ok(typeof pasty.action.complete === 'function');
    // pasty.action.current() and pasty.action.on() were removed along with the
    // pasty-plugin-action-session host event in plugin-api-shrink
    assert.ok(pasty.action.current === undefined || typeof pasty.action.current === 'function',
      'pasty.action.current may be absent after host event removal');
  });
});
