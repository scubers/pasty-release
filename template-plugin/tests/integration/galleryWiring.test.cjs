'use strict';
// Contract test (TDD anchor) for capability-gallery feature.
//
// Enforces three-way wiring consistency across:
//   1. manifest.json  — declared capability IDs (detector / renderers / actions)
//   2. src/plugin.ts  — registered handler keys (via runtime composition)
//   3. catalog files  — renderer-bounded-ui/catalog.ts + draft-action-ui/catalog.ts
//
// If any of these three sources drift, this test reports the diff and fails.
// See: openspec/changes/plugin-show-case/tasks.md §1

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'manifest.json'), 'utf8'));
}

function loadGalleryPluginRegistry() {
  // Compose the gallery registry directly from feature factories (avoids
  // requiring src/plugin.ts which has bare ESM specifiers that trip node
  // --experimental-strip-types resolution).
  const { createGalleryDetector } = require(path.resolve(projectRoot, 'src/features/capability-gallery/runtime/detector.ts'));
  const {
    createGalleryRendererFixed,
    createGalleryRendererAuto,
    createGalleryRendererBounded,
  } = require(path.resolve(projectRoot, 'src/features/capability-gallery/runtime/renderers.ts'));
  const {
    createAutoActionText,
    createAutoActionImage,
    createAutoActionNone,
  } = require(path.resolve(projectRoot, 'src/features/capability-gallery/runtime/auto-actions.ts'));
  const { createGalleryDraftAction } = require(path.resolve(projectRoot, 'src/features/capability-gallery/runtime/draft-action.ts'));

  return {
    detectors: { 'gallery-detector': createGalleryDetector() },
    attachmentRenderers: {
      'gallery-renderer-fixed': createGalleryRendererFixed(),
      'gallery-renderer-auto': createGalleryRendererAuto(),
      'gallery-renderer-bounded': createGalleryRendererBounded(),
    },
    actions: {
      'gallery-auto-text': createAutoActionText(),
      'gallery-auto-image': createAutoActionImage(),
      'gallery-auto-none': createAutoActionNone(),
      'gallery-draft': createGalleryDraftAction(),
    },
  };
}

function loadBoundedCatalogVerbs() {
  const { galleryCapabilitySections } = require(path.resolve(
    projectRoot,
    'src/features/capability-gallery/renderer-bounded-ui/catalog.ts',
  ));
  const verbs = new Set();
  for (const section of galleryCapabilitySections) {
    for (const button of section.buttons) {
      // apiSignature is shaped like "pasty.item.addTags({ tags })" — extract
      // the dotted verb between `pasty.` and the opening paren.
      const match = String(button.apiSignature || '').match(/^pasty\.([a-zA-Z0-9_.]+)\(/);
      if (match) verbs.add(match[1]);
    }
  }
  return verbs;
}

function loadBoundedCatalogButton(id) {
  const { galleryCapabilitySections } = require(path.resolve(
    projectRoot,
    'src/features/capability-gallery/renderer-bounded-ui/catalog.ts',
  ));
  for (const section of galleryCapabilitySections) {
    for (const button of section.buttons) {
      if (button.id === id) return button;
    }
  }
  throw new Error(`bounded catalog button not found: ${id}`);
}

function loadDraftCatalogVerbs() {
  const { galleryActionCapabilities } = require(path.resolve(
    projectRoot,
    'src/features/capability-gallery/draft-action-ui/catalog.ts',
  ));
  const verbs = new Set();
  const resultKinds = new Set();
  for (const button of galleryActionCapabilities) {
    const match = String(button.apiSignature || '').match(/^pasty\.([a-zA-Z0-9_.]+)\(/);
    if (match) verbs.add(match[1]);
    if (button.resultKind) resultKinds.add(button.resultKind);
  }
  return { verbs, resultKinds };
}

// SDK base-scope verbs (UI side). Excludes the 3 action-scope verbs
// (action.{setButtons,complete}) and the attachment-scope verb
// (attachmentRenderer.setButtons), since those cannot be invoked from
// the bounded attachment renderer.
//
// SOURCE OF TRUTH: protocol/plugin/src/catalog.ts `capabilities` array,
// filtered to `surface.side ∈ {'ui','both'}` AND `surface.context !== 'action'`
// AND excluding `attachmentRenderer.setButtons` (attachment-scope only).
//
// MANUAL SYNC: this list is intentionally hand-maintained rather than parsed
// from the catalog at test time, because the catalog uses extension-less
// imports that Node strip-types resolution does not handle. When the SDK adds
// a new base-scope verb, update this list AND add a button to
// `renderer-bounded-ui/catalog.ts`.
// NOTE: item.setTags/addTags/removeTags/setPinned/setSearchExtension/materializeImagePath
// were moved to Node-runtime-only (host.item.*) in the plugin-api-shrink rollout.
// They are no longer available in the UI pasty.* namespace and are not shown in
// the bounded-ui catalog.
// NOTE: `item.setAttachments` is intentionally excluded from the gallery demo
// — the SDK has no clear-all variant, and core's parseReplaceRequest rejects
// `{attachments: []}` (attachment_json_api.cpp L91-103). A live "write demo
// attachment" would litter the user's history with an orphaned record without
// educational value. The `setAttachment` permission stays declared in manifest
// for plugin authors who legitimately use it; this is purely a demo gap.
const EXPECTED_BASE_VERBS = new Set([
  'runtime.invoke',
  'item.readAttachment',
  'clipboard.copyText',
  'navigation.openUrl',
  'navigation.revealInFinder',
  'navigation.openFilePath',
  'window.setHeight',
  'window.autoFit',
  'settings.get',
  'settings.getAll',
  'console.log',
  'textInput.stateChanged',
]);

const EXPECTED_ACTION_VERBS = new Set([
  'action.setButtons',
  'action.complete',
]);

const EXPECTED_PERMISSIONS = new Set([
  'setAttachment',
  'setSearchExtension',
  'setTags',
  'setPinned',
]);

const GALLERY_PREFIX = 'gallery-';

describe('plugin-show-case wiring', () => {
  test('manifest gallery- detectors registered in plugin registry', () => {
    const manifest = loadManifest();
    const registry = loadGalleryPluginRegistry();
    const manifestIDs = manifest.detectors
      .filter((entry) => String(entry.id).startsWith(GALLERY_PREFIX))
      .map((entry) => entry.id);
    assert.ok(manifestIDs.length >= 1, 'expected at least one gallery- detector in manifest');
    for (const id of manifestIDs) {
      assert.ok(registry.detectors[id], `manifest detector ${id} must have a runtime handler`);
    }
  });

  test('manifest gallery- attachmentRenderers registered in plugin registry', () => {
    const manifest = loadManifest();
    const registry = loadGalleryPluginRegistry();
    const manifestIDs = manifest.attachmentRenderers
      .filter((entry) => String(entry.id).startsWith(GALLERY_PREFIX))
      .map((entry) => entry.id);
    assert.equal(manifestIDs.length, 3, 'expected 3 gallery- attachmentRenderers in manifest');
    for (const id of manifestIDs) {
      assert.ok(registry.attachmentRenderers[id], `manifest renderer ${id} must have a runtime handler`);
    }
  });

  test('manifest gallery- actions registered in plugin registry', () => {
    const manifest = loadManifest();
    const registry = loadGalleryPluginRegistry();
    const manifestIDs = manifest.actions
      .filter((entry) => String(entry.id).startsWith(GALLERY_PREFIX))
      .map((entry) => entry.id);
    assert.equal(manifestIDs.length, 4, 'expected 4 gallery- actions in manifest (3 auto-run + 1 draft)');
    for (const id of manifestIDs) {
      assert.ok(registry.actions[id], `manifest action ${id} must have a runtime handler`);
    }
  });

  test('bounded-ui catalog covers all base-scope SDK verbs', () => {
    const observed = loadBoundedCatalogVerbs();
    const missing = [...EXPECTED_BASE_VERBS].filter((v) => !observed.has(v));
    assert.deepEqual(
      missing,
      [],
      `bounded-ui catalog is missing base-scope SDK verbs (must add a button for each): ${missing.join(', ')}`,
    );
  });

  test('draft-action-ui catalog covers all action-scope SDK verbs + 3 resultKinds', () => {
    const { verbs, resultKinds } = loadDraftCatalogVerbs();
    const missing = [...EXPECTED_ACTION_VERBS].filter((v) => !verbs.has(v));
    assert.deepEqual(
      missing,
      [],
      `draft-action-ui catalog is missing action-scope SDK verbs: ${missing.join(', ')}`,
    );
    for (const kind of ['text', 'image', 'none']) {
      assert.ok(resultKinds.has(kind), `draft-action-ui catalog must include complete({resultKind:"${kind}"}) button`);
    }
  });

  test('manifest permissions equal the canonical 4-permission set', () => {
    const manifest = loadManifest();
    const observed = new Set(manifest.permissions || []);
    const missing = [...EXPECTED_PERMISSIONS].filter((p) => !observed.has(p));
    assert.deepEqual(
      missing,
      [],
      `manifest.permissions must declare all 4 SDK permissions; missing: ${missing.join(', ')}`,
    );
  });

  test('bounded readAttachment demos use the detector-emitted attachment ref', async () => {
    const registry = loadGalleryPluginRegistry();
    const detector = registry.detectors['gallery-detector'];
    const artifacts = await detector.detect({
      item: { id: 'i', type: 'text', tags: [], sourceAppID: 'a' },
      content: { kind: 'text', text: 'hello gallery' },
      attachments: [],
    });
    const bounded = artifacts.find((artifact) => artifact.attachmentType === 'plugin.template.full.gallery.bounded');
    assert.ok(bounded, 'detector must emit the bounded gallery attachment');
    const expectedPayload = {
      attachmentType: bounded.attachmentType,
      attachmentKey: bounded.attachmentKey,
    };

    const directButton = loadBoundedCatalogButton('item-readAttachment');
    const runtimeButton = loadBoundedCatalogButton('runtime-host-item-readAttachment');
    const calls = [];
    const previousWebkit = globalThis.webkit;
    globalThis.webkit = {
      messageHandlers: {
        pastyPluginCall: {
          postMessage: async (frame) => {
            calls.push(frame);
            if (frame.method === 'runtime.invoke') {
              return { response: { ok: true, result: { payloadJson: bounded.payloadJson } } };
            }
            return { payloadJson: bounded.payloadJson };
          },
        },
      },
    };
    try {
      await directButton.invoke();
      await runtimeButton.invoke();
    } finally {
      if (previousWebkit === undefined) {
        delete globalThis.webkit;
      } else {
        globalThis.webkit = previousWebkit;
      }
    }

    assert.deepEqual(calls, [
      { method: 'item.readAttachment', payload: expectedPayload },
      {
        method: 'runtime.invoke',
        payload: {
          key: 'gallery.host.item.readAttachment',
          payload: { payload: expectedPayload },
        },
      },
    ]);
  });

  test('gallery detector emits 3 attachments per supported input kind', async () => {
    const registry = loadGalleryPluginRegistry();
    const detector = registry.detectors['gallery-detector'];
    const inputs = [
      { item: { id: 'i', type: 'text', tags: [], sourceAppID: 'a' }, content: { kind: 'text', text: 'hello gallery' }, attachments: [] },
      { item: { id: 'i', type: 'image', tags: [], sourceAppID: 'a' }, content: { kind: 'image', width: 1, height: 1, format: 'png', bytes: 0 }, attachments: [] },
      { item: { id: 'i', type: 'path_reference', tags: [], sourceAppID: 'a' }, content: { kind: 'path_reference', entries: [{ kind: 'file', path: '/tmp/x.txt', displayName: 'x.txt' }] }, attachments: [] },
    ];
    for (const input of inputs) {
      const result = await detector.detect(input);
      assert.equal(result.length, 3, `gallery detector must emit 3 artifacts for ${input.content.kind}`);
      const types = result.map((a) => a.attachmentType).sort();
      assert.deepEqual(types, [
        'plugin.template.full.gallery.auto',
        'plugin.template.full.gallery.bounded',
        'plugin.template.full.gallery.fixed',
      ]);
    }
  });
});
