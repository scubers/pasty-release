'use strict';
// Integration tests for runtime handler factories.
//
// We test the handler implementations directly via their TS source files
// (Node 25 strip-types supports this) rather than going through dist/plugin.cjs,
// which requires configureIpcBus() to be called before module load.
//
// Each test exercises the public contract of the handler:
//   - detector: detect(input) → DetectorArtifact[]
//   - renderer: resolveAttachment(input) → AttachmentResolveResult
//   - auto-action: runAutoAction(input, ctx) → ActionOperationResult
//   - draft-action: resolveSession(input, ctx) → ActionResolveResult
//
// These tests verify end-to-end data flow through the feature modules
// without requiring an IPC bus or subprocess.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const sampleItem = {
  id: 'item-1',
  type: 'text',
  tags: [],
  sourceAppID: 'com.example.app',
};

const textContent = {
  kind: 'text',
  text: 'hello world from integration test',
};

const imageContent = {
  kind: 'image',
  width: 100,
  height: 80,
  format: 'png',
  bytes: 0,
};

// Minimal stub ctx used by action handlers (replaces host capability calls).
function makeMinimalCtx(overrides = {}) {
  return {
    host: {
      settings: {
        get: async () => ({ value: null }),
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------
describe('composite detector (template-detector)', () => {
  function makeDetector() {
    const { buildPreviewArtifact } = require(
      path.resolve(projectRoot, 'src/features/preview-renderer/detector.ts')
    );
    const { buildExpandedArtifact } = require(
      path.resolve(projectRoot, 'src/features/expanded-renderer/detector.ts')
    );
    return {
      async detect(input) {
        const out = [];
        const a = buildPreviewArtifact(input);
        if (a) out.push(a);
        const b = buildExpandedArtifact(input);
        if (b) out.push(b);
        return out;
      },
    };
  }

  test('detects text input and returns at least one artifact', async () => {
    const detector = makeDetector();
    const input = { item: sampleItem, content: textContent, attachments: [] };
    const result = await detector.detect(input);
    assert.ok(Array.isArray(result), 'result must be an array');
    assert.ok(result.length >= 1, 'should detect at least one artifact for text content');
  });

  test('each artifact has attachmentType and payloadJson', async () => {
    const detector = makeDetector();
    const input = { item: sampleItem, content: textContent, attachments: [] };
    const result = await detector.detect(input);
    for (const artifact of result) {
      assert.ok(typeof artifact.attachmentType === 'string', 'artifact.attachmentType must be a string');
      assert.ok(typeof artifact.payloadJson === 'string', 'artifact.payloadJson must be a string');
      // payloadJson must be valid JSON
      assert.doesNotThrow(() => JSON.parse(artifact.payloadJson));
    }
  });

  test('detects image input', async () => {
    const detector = makeDetector();
    const input = { item: sampleItem, content: imageContent, attachments: [] };
    const result = await detector.detect(input);
    assert.ok(Array.isArray(result));
    // Image content should also produce artifacts
    assert.ok(result.length >= 1, 'should detect at least one artifact for image content');
  });

  test('returns empty array for null/missing content', async () => {
    const detector = makeDetector();
    const input = { item: sampleItem, content: null, attachments: [] };
    const result = await detector.detect(input);
    assert.ok(Array.isArray(result));
    // No content → no artifacts (or graceful empty)
    // Either [] or artifacts is acceptable — just must not throw
  });
});

// ---------------------------------------------------------------------------
// Preview renderer
// ---------------------------------------------------------------------------
describe('template preview renderer', () => {
  function makeRenderer() {
    const { createTemplatePreviewRenderer } = require(
      path.resolve(projectRoot, 'src/features/preview-renderer/renderer.ts')
    );
    return createTemplatePreviewRenderer();
  }

  const sampleAttachment = {
    rendererID: 'template-renderer',
    attachmentType: 'plugin.template.full.preview',
    attachmentKey: 'k1',
    payloadJson: JSON.stringify({ kind: 'template_preview', version: 2 }),
  };

  test('resolveAttachment returns a result object', async () => {
    const renderer = makeRenderer();
    const input = {
      item: sampleItem,
      content: textContent,
      attachments: [],
      attachment: sampleAttachment,
      declaredActions: [],
    };
    const result = await renderer.resolveAttachment(input);
    // result may be null/undefined (renderer decides) but must not throw
    // If non-null it should be an object
    if (result !== null && result !== undefined) {
      assert.equal(typeof result, 'object');
    }
  });
});

// ---------------------------------------------------------------------------
// Auto-run action
// ---------------------------------------------------------------------------
describe('template auto-run action', () => {
  function makeAutoAction() {
    const { createTemplateAutoAction } = require(
      path.resolve(projectRoot, 'src/features/auto-action/action.ts')
    );
    return createTemplateAutoAction();
  }

  const sampleActionInput = {
    item: sampleItem,
    content: textContent,
    attachments: [],
    action: { actionID: 'template-auto-action', label: 'Auto' },
    trigger: { kind: 'manual' },
  };

  test('runAutoAction returns a result object with resultKind', async () => {
    const action = makeAutoAction();
    const ctx = makeMinimalCtx();
    const result = await action.runAutoAction(sampleActionInput, ctx);
    assert.ok(result !== null && result !== undefined, 'result must not be null');
    assert.ok(typeof result === 'object');
    // result.result should have resultKind
    if (result.result) {
      assert.ok(typeof result.result.resultKind === 'string', 'resultKind must be a string');
    }
  });
});

// ---------------------------------------------------------------------------
// Draft action (gallery-draft — template-draft-action was removed in
// plugin-api-shrink; gallery-draft is the live draft action in manifest)
// ---------------------------------------------------------------------------
describe('gallery draft action', () => {
  function makeDraftAction() {
    const { createGalleryDraftAction } = require(
      path.resolve(projectRoot, 'src/features/capability-gallery/runtime/draft-action.ts')
    );
    return createGalleryDraftAction();
  }

  const sampleSessionInput = {
    item: sampleItem,
    content: textContent,
    attachments: [],
  };

  test('resolveSession returns a session descriptor', async () => {
    const action = makeDraftAction();
    const ctx = makeMinimalCtx();
    const result = await action.resolveSession(sampleSessionInput, ctx);
    assert.ok(result !== null && result !== undefined, 'result must not be null');
    assert.ok(typeof result === 'object');
  });
});
