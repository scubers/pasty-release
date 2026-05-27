'use strict';
// E2E wire roundtrip contract test.
//
// Verifies that the Node bridge (generated via emitBridgeJSCore from the IR) can
// load plugin.cjs and correctly handle each runtime.invoke* IPC method, and that
// every response has the JSON shape mandated by the catalog typeRef.
//
// This is a regression gate: if catalog changes the wire shape, this test fails,
// alerting developers that the bridge needs regeneration and plugin.cjs needs a
// rebuild.
//
// Strategy (Plan B): call emitBridgeJSCore(ir) directly via tsx to get the raw JS
// without any Swift wrapping, write it to a temp file, and spawn a Node subprocess.

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

// ─── Paths ────────────────────────────────────────────────────────────────────

const PROTOCOL_DIR = path.resolve(__dirname, '../../../../protocol/plugin');
const CODEGEN_DIR = path.join(PROTOCOL_DIR, 'codegen');
const CATALOG_PATH = path.join(PROTOCOL_DIR, 'src/catalog.ts');
const PLUGIN_CJS = path.resolve(__dirname, '../../dist/plugin.cjs');
const TSX_BIN = path.join(PROTOCOL_DIR, 'node_modules/.bin/tsx');

// ─── Bridge JS generation ─────────────────────────────────────────────────────

/** Generate the raw bridge JS from the catalog IR using tsx + emitBridgeJSCore. */
function generateBridgeJS() {
  // Use a tiny inline tsx script that imports emitBridgeJSCore and parseDSL,
  // parses the catalog, and writes the JS to stdout.
  const inlineScript = [
    `import { parseDSL } from '${CODEGEN_DIR}/src/parseDSL.js';`,
    `import { emitBridgeJSCore } from '${CODEGEN_DIR}/src/emitNodeBridgeTemplate.js';`,
    `const ir = parseDSL({ catalogPath: '${CATALOG_PATH}' });`,
    `process.stdout.write(emitBridgeJSCore(ir));`,
  ].join('\n');

  return execSync(
    `${TSX_BIN} --input-type=module`,
    {
      input: inlineScript,
      encoding: 'utf8',
      cwd: PROTOCOL_DIR,
      timeout: 30000,
    },
  );
}

// ─── Temp dir + bridge path (shared across all tests) ────────────────────────

let tmpDir = '';
let bridgePath = '';

// ─── IPC roundtrip helper ─────────────────────────────────────────────────────

/**
 * Default mock host responses for capabilities the plugin may call via IPC
 * (e.g. settings.get). The bridge sends these as outbound request frames;
 * we reply with a minimal valid response so the handler can complete.
 */
const HOST_MOCK_RESPONSES = {
  'item.setTags': { tags: ['wire-user-rpc'] },
  'item.materializeImagePath': { path: '/tmp/pasty-gallery-wire.png' },
  'settings.get': { value: null },
  'settings.getAll': {},
};

/**
 * Spawn bridge + plugin, send one request frame, collect the matching response frame.
 *
 * The bridge may also send outbound IPC requests to the host (e.g. settings.get).
 * We auto-reply to those with mocks from HOST_MOCK_RESPONSES so the handler
 * can complete without a real host process.
 *
 * @param {string} method  e.g. 'runtime.invokeDetector'
 * @param {object} request  the request payload (without id/method wrapper)
 * @param {number} [timeoutMs=10000]
 * @param {{hostCalls?: string[]}} [options]
 * @returns {Promise<object>} parsed response from stdout
 */
function roundtrip(method, request, timeoutMs = 10000, options = undefined) {
  return new Promise((resolve, reject) => {
    if (!existsSync(bridgePath)) {
      return reject(new Error(`Bridge file not found: ${bridgePath}`));
    }
    if (!existsSync(PLUGIN_CJS)) {
      return reject(new Error(`plugin.cjs not found: ${PLUGIN_CJS}`));
    }

    const proc = spawn(
      process.execPath,
      [bridgePath, PLUGIN_CJS, '[]', '{}'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    // Buffer partial stdout until full newline-delimited frames arrive.
    let stdoutBuf = '';
    let stderr = '';
    let settled = false;
    const TEST_FRAME_ID = 'test-1';

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill('SIGKILL');
        reject(new Error(`roundtrip timed out after ${timeoutMs}ms (method=${method})`));
      }
    }, timeoutMs);

    function settle(fn) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        proc.stdin.end();
        fn();
      }
    }

    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      // Process all complete lines in the buffer.
      let nl;
      while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;

        let frame;
        try {
          frame = JSON.parse(line);
        } catch {
          // Ignore unparseable lines (e.g. debug output).
          continue;
        }

        // Outbound host request from bridge: { id, method, request }
        // Reply with a mock response so the handler can complete.
        if (frame.method !== undefined && frame.id !== undefined) {
          if (options?.hostCalls) {
            options.hostCalls.push(frame.method);
          }
          const mockResult = HOST_MOCK_RESPONSES[frame.method] ?? {};
          const reply = JSON.stringify({ id: frame.id, response: mockResult }) + '\n';
          if (!settled) {
            proc.stdin.write(reply);
          }
          continue;
        }

        // Response frame: { id, response } or { id, error }
        if (frame.id === TEST_FRAME_ID) {
          if (frame.error !== undefined) {
            settle(() => reject(new Error(`Bridge returned error: ${frame.error}`)));
          } else {
            settle(() => resolve(frame.response));
          }
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      settle(() => reject(new Error(`Bridge process error: ${err.message}`)));
    });

    proc.on('close', (code) => {
      if (!settled) {
        settle(() => reject(new Error(
          `Bridge process closed (code=${code}) without response.\nstderr=${stderr}`,
        )));
      }
    });

    // Send the IPC request frame
    const frame = JSON.stringify({ id: TEST_FRAME_ID, method, request }) + '\n';
    proc.stdin.write(frame);
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

before(() => {
  // Generate bridge JS and write to temp file
  const bridgeJS = generateBridgeJS();
  tmpDir = mkdtempSync(path.join(tmpdir(), 'pasty-wire-test-'));
  bridgePath = path.join(tmpDir, 'bridge.cjs');
  writeFileSync(bridgePath, bridgeJS);
});

after(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const sampleItem = {
  id: 'item-wire-1',
  type: 'text',
  tags: [],
  sourceAppID: 'com.example.wire-test',
};

const textContent = { kind: 'text', text: 'hello wire roundtrip' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('wire roundtrip — runtime.userRPC gallery bridge', () => {
  test('gallery host.item.setTags handler reaches runtime host IPC', async () => {
    const hostCalls = [];
    const res = await roundtrip(
      'runtime.userRPC',
      {
        key: 'gallery.host.item.setTags',
        payload: { payload: { tags: ['wire-user-rpc'] } },
      },
      10000,
      { hostCalls },
    );

    assert.deepEqual(hostCalls, ['item.setTags']);
    assert.deepEqual(res.result, {
      ok: true,
      result: { tags: ['wire-user-rpc'] },
    });
  });

  test('gallery host.item.materializeImagePath handler reaches runtime host IPC', async () => {
    const hostCalls = [];
    const res = await roundtrip(
      'runtime.userRPC',
      {
        key: 'gallery.host.item.materializeImagePath',
        payload: { payload: {} },
      },
      10000,
      { hostCalls },
    );

    assert.deepEqual(hostCalls, ['item.materializeImagePath']);
    assert.deepEqual(res.result, {
      ok: true,
      result: { path: '/tmp/pasty-gallery-wire.png' },
    });
  });
});

describe('wire roundtrip — runtime.invokeDetector', () => {
  test('response has requestID field matching request', async () => {
    const res = await roundtrip('runtime.invokeDetector', {
      requestID: 'req-det-1',
      detectorID: 'template-detector',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
      },
    });

    // Shape: { requestID, result?, errorMessage? }
    assert.equal(typeof res, 'object', 'response must be an object');
    assert.equal(res.requestID, 'req-det-1', 'requestID must echo back');
  });

  test('result is an array when detector succeeds', async () => {
    const res = await roundtrip('runtime.invokeDetector', {
      requestID: 'req-det-2',
      detectorID: 'template-detector',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
      },
    });

    // Either result is a non-null array, or errorMessage is a string
    if (res.errorMessage != null) {
      assert.equal(typeof res.errorMessage, 'string', 'errorMessage must be a string');
    } else {
      assert.ok(Array.isArray(res.result), 'result must be an array');
      for (const artifact of res.result) {
        assert.equal(typeof artifact.attachmentType, 'string', 'artifact.attachmentType must be string');
        assert.equal(typeof artifact.attachmentKey, 'string', 'artifact.attachmentKey must be string');
        assert.equal(typeof artifact.payloadJson, 'string', 'artifact.payloadJson must be string');
        assert.equal(typeof artifact.attachmentSyncScope, 'string', 'artifact.attachmentSyncScope must be string');
        // payloadJson must be valid JSON
        assert.doesNotThrow(() => JSON.parse(artifact.payloadJson), 'artifact.payloadJson must be valid JSON');
      }
    }
  });

  test('unknown detectorID returns errorMessage (not found shape)', async () => {
    const res = await roundtrip('runtime.invokeDetector', {
      requestID: 'req-det-3',
      detectorID: 'nonexistent-detector',
      input: { item: sampleItem, content: textContent, attachments: [] },
    });

    assert.equal(res.requestID, 'req-det-3');
    assert.equal(typeof res.errorMessage, 'string', 'errorMessage must be string for unknown detector');
    assert.ok(res.errorMessage.length > 0, 'errorMessage must not be empty');
  });
});

describe('wire roundtrip — runtime.invokeRenderer', () => {
  const sampleAttachment = {
    rendererID: 'template-renderer',
    attachmentType: 'plugin.template.full.preview',
    attachmentKey: 'k-wire-1',
    payloadJson: JSON.stringify({ kind: 'template_preview', version: 2 }),
  };

  test('response has requestID field matching request', async () => {
    const res = await roundtrip('runtime.invokeRenderer', {
      requestID: 'req-rnd-1',
      rendererID: 'template-renderer',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
        attachment: sampleAttachment,
        declaredActions: [],
      },
    });

    assert.equal(typeof res, 'object', 'response must be an object');
    assert.equal(res.requestID, 'req-rnd-1', 'requestID must echo back');
  });

  test('result has AttachmentResolveResult shape when renderer succeeds', async () => {
    const res = await roundtrip('runtime.invokeRenderer', {
      requestID: 'req-rnd-2',
      rendererID: 'template-renderer',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
        attachment: sampleAttachment,
        declaredActions: [],
      },
    });

    if (res.errorMessage != null) {
      assert.equal(typeof res.errorMessage, 'string');
    } else if (res.result != null) {
      const r = res.result;
      // PluginAttachmentResolveResult shape from catalog
      assert.equal(typeof r.displayName, 'string', 'result.displayName must be string');
      assert.ok(Array.isArray(r.buttons), 'result.buttons must be an array');
      // tintHex is nullable, shouldDisplay is boolean
      assert.ok(r.tintHex === null || typeof r.tintHex === 'string', 'result.tintHex must be null or string');
      assert.equal(typeof r.shouldDisplay, 'boolean', 'result.shouldDisplay must be boolean');
    }
  });

  test('unknown rendererID returns errorMessage', async () => {
    const res = await roundtrip('runtime.invokeRenderer', {
      requestID: 'req-rnd-3',
      rendererID: 'nonexistent-renderer',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
        attachment: { ...sampleAttachment, rendererID: 'nonexistent-renderer' },
        declaredActions: [],
      },
    });

    assert.equal(res.requestID, 'req-rnd-3');
    assert.equal(typeof res.errorMessage, 'string', 'errorMessage must be string for unknown renderer');
  });
});

describe('wire roundtrip — runtime.invokeAction', () => {
  // gallery-draft is the live draft action; template-draft-action was removed
  // in plugin-api-shrink together with features/draft-action/.
  test('response has requestID field matching request', async () => {
    const res = await roundtrip('runtime.invokeAction', {
      requestID: 'req-act-1',
      actionID: 'gallery-draft',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
      },
    });

    assert.equal(typeof res, 'object', 'response must be an object');
    assert.equal(res.requestID, 'req-act-1', 'requestID must echo back');
  });

  test('result has ActionResolveResult shape when action succeeds', async () => {
    const res = await roundtrip('runtime.invokeAction', {
      requestID: 'req-act-2',
      actionID: 'gallery-draft',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
      },
    });

    if (res.errorMessage != null) {
      assert.equal(typeof res.errorMessage, 'string');
    } else if (res.result != null) {
      const r = res.result;
      // PluginActionResolveResult shape (normalized): displayName, buttons, defaultButtonID, initialDraft
      assert.ok(r.displayName === null || typeof r.displayName === 'string', 'result.displayName must be null or string');
      assert.ok(Array.isArray(r.buttons), 'result.buttons must be an array');
      assert.ok(r.defaultButtonID === null || typeof r.defaultButtonID === 'string', 'result.defaultButtonID must be null or string');
      assert.equal(typeof r.initialDraft, 'object', 'result.initialDraft must be an object');
    }
  });

  test('unknown actionID returns errorMessage', async () => {
    const res = await roundtrip('runtime.invokeAction', {
      requestID: 'req-act-3',
      actionID: 'nonexistent-action',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
      },
    });

    assert.equal(res.requestID, 'req-act-3');
    assert.equal(typeof res.errorMessage, 'string', 'errorMessage must be string for unknown action');
  });
});

describe('wire roundtrip — runtime.invokeActionAutoRun', () => {
  // PluginAutoRunActionInput.action and .trigger fields were removed in
  // plugin-api-shrink; input now only carries item/content/attachments/draft/buttonID.
  test('response has requestID field matching request', async () => {
    const res = await roundtrip('runtime.invokeActionAutoRun', {
      requestID: 'req-auto-1',
      actionID: 'template-auto-action',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
        draft: {},
        buttonID: null,
      },
    });

    assert.equal(typeof res, 'object', 'response must be an object');
    assert.equal(res.requestID, 'req-auto-1', 'requestID must echo back');
  });

  test('result has ActionOperationResult shape when auto-run action succeeds', async () => {
    const res = await roundtrip('runtime.invokeActionAutoRun', {
      requestID: 'req-auto-2',
      actionID: 'template-auto-action',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
        draft: {},
        buttonID: null,
      },
    });

    if (res.errorMessage != null) {
      assert.equal(typeof res.errorMessage, 'string');
    } else if (res.result != null) {
      const r = res.result;
      // PluginActionOperationResult shape: { result?, userMessage? }
      assert.equal(typeof r, 'object', 'result must be object');
      if (r.result != null) {
        assert.equal(typeof r.result.resultKind, 'string', 'result.result.resultKind must be string');
      }
      if (r.userMessage != null) {
        assert.equal(typeof r.userMessage, 'string', 'result.userMessage must be string');
      }
    }
  });

  test('unknown actionID returns errorMessage', async () => {
    const res = await roundtrip('runtime.invokeActionAutoRun', {
      requestID: 'req-auto-3',
      actionID: 'nonexistent-auto-action',
      input: {
        item: sampleItem,
        content: textContent,
        attachments: [],
        draft: {},
        buttonID: null,
      },
    });

    assert.equal(res.requestID, 'req-auto-3');
    assert.equal(typeof res.errorMessage, 'string', 'errorMessage must be string for unknown auto-run action');
  });
});
