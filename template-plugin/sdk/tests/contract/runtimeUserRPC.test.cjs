'use strict';
// Tests for the runtime.userRPC dispatcher and bus error frame round-trip (US-009).
//
// These tests operate against the inline ipcBus implementation (same approach as
// ipcBus.test.cjs) plus the real serializeError / deserializeError helpers from
// the built dist.  The dispatcher logic mirrors the implementation in
// nodeIPCServer.generated.ts / runtime.definePlugin.generated.ts.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Import serialization helpers from built dist (these are hand-written src files,
// not generated, so we can import them from dist after `npm run build`).
// ---------------------------------------------------------------------------
let serializeError, deserializeError;
try {
  const ipcBusModule = require('../../dist/internal/ipcBus.js');
  serializeError = ipcBusModule.serializeError;
  deserializeError = ipcBusModule.deserializeError;
} catch {
  // Fallback: inline copies matching the implementation in src/internal/ipcBus.ts.
  // Used when tests run before a dist build is available.
  serializeError = function serializeError(err) {
    if (err instanceof Error) {
      const out = { name: err.name || 'Error', message: err.message };
      if (err.data !== undefined) out.data = err.data;
      return out;
    }
    return { name: 'Error', message: String(err) };
  };
  deserializeError = function deserializeError(raw) {
    if (typeof raw === 'string') return new Error(raw);
    if (raw && typeof raw === 'object') {
      const err = new Error(raw.message ?? '');
      if (raw.name) err.name = raw.name;
      if (raw.data !== undefined) err.data = raw.data;
      return err;
    }
    return new Error(String(raw));
  };
}

// ---------------------------------------------------------------------------
// Inline ipcBus factory (same shape as the real one, minus internalConsole).
// This mirrors createIPCBus from src/internal/ipcBus.ts.
// ---------------------------------------------------------------------------
function createIPCBus(io) {
  let counter = 0;
  let started = false;
  const pending = new Map();
  const methods = new Map();

  async function handleLine(line) {
    let frame;
    try { frame = JSON.parse(line); } catch { return; }

    if (frame.method !== undefined) {
      const handler = methods.get(frame.method);
      if (!handler) {
        const notFound = new Error(`no handler for ${frame.method}`);
        notFound.name = 'PluginRuntimeMethodNotFound';
        io.write(JSON.stringify({ id: frame.id, error: serializeError(notFound) }) + '\n');
        return;
      }
      try {
        const result = await handler(frame.request);
        io.write(JSON.stringify({ id: frame.id, response: result }) + '\n');
      } catch (err) {
        io.write(JSON.stringify({ id: frame.id, error: serializeError(err) }) + '\n');
      }
    } else {
      const entry = pending.get(frame.id);
      if (!entry) return;
      pending.delete(frame.id);
      if (frame.error !== undefined) {
        entry.reject(deserializeError(frame.error));
      } else {
        entry.resolve(frame.response);
      }
    }
  }

  return {
    request(method, payload) {
      const id = `req-${++counter}`;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        io.write(JSON.stringify({ id, method, request: payload }) + '\n');
      });
    },
    onMethod(method, handler) {
      if (methods.has(method)) throw new Error(`method already registered: ${method}`);
      methods.set(method, handler);
    },
    start() {
      if (started) return;
      started = true;
      io.onLine((line) => { void handleLine(line); });
    },
  };
}

function makeMockIO() {
  let lineHandler = null;
  const written = [];
  return {
    write(line) { written.push(line); },
    onLine(handler) { lineHandler = handler; },
    inject(line) {
      if (!lineHandler) throw new Error('Bus not started');
      lineHandler(line);
    },
    written,
    lastFrame() { return JSON.parse(written[written.length - 1]); },
  };
}

// ---------------------------------------------------------------------------
// Helper: build a minimal runtime.userRPC dispatcher mirroring the SDK impl.
// (nodeIPCServer.generated.ts + the runtime.definePlugin handler registry)
// ---------------------------------------------------------------------------
function registerUserRPCDispatcher(bus, messageHandlers) {
  bus.onMethod('runtime.userRPC', async (request) => {
    const handler = messageHandlers[request.key];
    if (!handler) {
      const err = new Error(`no message handler for key: ${request.key}`);
      err.name = 'PluginRuntimeHandlerNotFound';
      err.data = { key: request.key };
      throw err;
    }
    const result = await handler(request.payload, { host: {} });
    return { result };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runtime.userRPC dispatcher — happy path', () => {
  test('registered handler is called with payload; response is wrapped in {result}', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    registerUserRPCDispatcher(bus, {
      'gen-image': async (req) => ({ imageTempPath: `/tmp/${req.name}.png` }),
    });
    bus.start();

    io.inject(JSON.stringify({
      id: 'rpc-1',
      method: 'runtime.userRPC',
      request: { key: 'gen-image', payload: { name: 'cat' } },
    }));
    await new Promise((r) => setImmediate(r));

    assert.equal(io.written.length, 1);
    const frame = io.lastFrame();
    assert.equal(frame.id, 'rpc-1');
    assert.ok(frame.response, 'response must be set');
    assert.deepEqual(frame.response.result, { imageTempPath: '/tmp/cat.png' });
  });

  test('handler receives ctx as second argument', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    let capturedCtx;
    registerUserRPCDispatcher(bus, {
      'check-ctx': async (req, ctx) => {
        capturedCtx = ctx;
        return { ok: true };
      },
    });
    bus.start();

    io.inject(JSON.stringify({
      id: 'rpc-ctx',
      method: 'runtime.userRPC',
      request: { key: 'check-ctx', payload: {} },
    }));
    await new Promise((r) => setImmediate(r));

    assert.ok(capturedCtx, 'ctx must be passed to handler');
    assert.ok('host' in capturedCtx, 'ctx must have host property');
  });
});

describe('runtime.userRPC dispatcher — missing handler', () => {
  test('unknown key returns error frame with name=PluginRuntimeHandlerNotFound', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    registerUserRPCDispatcher(bus, {}); // no handlers registered
    bus.start();

    io.inject(JSON.stringify({
      id: 'rpc-miss',
      method: 'runtime.userRPC',
      request: { key: 'unknown-key', payload: {} },
    }));
    await new Promise((r) => setImmediate(r));

    assert.equal(io.written.length, 1);
    const frame = io.lastFrame();
    assert.equal(frame.id, 'rpc-miss');
    assert.ok(frame.error, 'error field must be set');
    assert.equal(frame.error.name, 'PluginRuntimeHandlerNotFound');
    assert.match(frame.error.message, /no message handler/);
    assert.deepEqual(frame.error.data, { key: 'unknown-key' });
  });
});

describe('bus error frame round-trip — serializeError / deserializeError', () => {
  test('custom error with name + data survives round-trip', () => {
    // Writer side: simulate a RateLimitError thrown by a handler.
    const original = new Error('rate limited');
    original.name = 'RateLimitError';
    original.data = { retryAfterSec: 60 };

    const serialized = serializeError(original);
    assert.equal(serialized.name, 'RateLimitError');
    assert.equal(serialized.message, 'rate limited');
    assert.deepEqual(serialized.data, { retryAfterSec: 60 });

    // Reader side: reconstruct from wire frame.
    const reconstructed = deserializeError(serialized);
    assert.equal(reconstructed.name, 'RateLimitError');
    assert.equal(reconstructed.message, 'rate limited');
    assert.deepEqual(reconstructed.data, { retryAfterSec: 60 });
  });

  test('legacy compat: deserializeError given a string returns Error with that message', () => {
    const err = deserializeError('something went wrong');
    assert.ok(err instanceof Error);
    assert.equal(err.message, 'something went wrong');
    assert.equal(err.name, 'Error');
  });

  test('error without data field round-trips without data property', () => {
    const original = new Error('plain error');
    original.name = 'PluginError';
    const serialized = serializeError(original);
    assert.equal(serialized.name, 'PluginError');
    assert.equal(serialized.message, 'plain error');
    assert.equal('data' in serialized, false, 'data must not be present when not set');

    const reconstructed = deserializeError(serialized);
    assert.equal(reconstructed.name, 'PluginError');
    assert.equal(reconstructed.message, 'plain error');
  });

  test('non-Error throw is serialized with name=Error', () => {
    const serialized = serializeError('a raw string throw');
    assert.equal(serialized.name, 'Error');
    assert.equal(serialized.message, 'a raw string throw');
  });

  test('error frame emitted by dispatcher carries full structured error on missing handler', async () => {
    // End-to-end: verify the frame written to io has the structured error object,
    // not just a bare string. This guards against regression to the old format.
    const io = makeMockIO();
    const bus = createIPCBus(io);
    registerUserRPCDispatcher(bus, {});
    bus.start();

    io.inject(JSON.stringify({
      id: 'rpc-e2e',
      method: 'runtime.userRPC',
      request: { key: 'missing', payload: {} },
    }));
    await new Promise((r) => setImmediate(r));

    const frame = io.lastFrame();
    // error must be an object, not a string (D6.1 upgrade)
    assert.equal(typeof frame.error, 'object', 'error field must be a structured object, not a string');
    assert.equal(frame.error.name, 'PluginRuntimeHandlerNotFound');
  });
});

// ---------------------------------------------------------------------------
// Real generated bridge contract — guards against the regression where the
// codegen-emitted Node bridge JS writes legacy bare-string error frames.
//
// Issue 1: emitNodeBridgeTemplate previously emitted
//   ipcWrite({ id, error: 'no handler for ' + method })
// instead of structured `{ name, message, data }` frames. The inline-bus tests
// above use a re-implemented createIPCBus that already calls serializeError, so
// they passed even though the real generated bridge regressed.
//
// These tests load the real generated bridge source from disk and assert that
// the source itself contains structured-error serialization. If anyone removes
// the serializeError call from the emitter, these tests fail.
// ---------------------------------------------------------------------------
const fs = require('node:fs');
const path = require('node:path');

describe('generated nodeIPCServer source — structured error frames (D6.1)', () => {
  const sdkRoot = path.resolve(__dirname, '..', '..');
  const nodeIPCServerPath = path.join(sdkRoot, 'src', 'generated', 'nodeIPCServer.generated.ts');

  test('emitted nodeIPCServer source defines serializeError helper', () => {
    const src = fs.readFileSync(nodeIPCServerPath, 'utf8');
    assert.match(src, /function serializeError\(err: unknown\): IPCBusErrorFrame/);
    assert.match(src, /name: err\.name \|\| 'Error'/);
    assert.match(src, /message: err\.message/);
  });

  test('emitted writeError writes structured frame, not bare-string error', () => {
    const src = fs.readFileSync(nodeIPCServerPath, 'utf8');
    // Must NOT have the legacy bare-string error frame.
    assert.equal(
      src.includes("JSON.stringify({ id, error: message })"),
      false,
      'writeError must emit serializeError(err), not bare string',
    );
    // Must emit serializeError on the error frame.
    assert.match(src, /JSON\.stringify\(\{ id, error: serializeError\(err\) \}\)/);
  });

  test('emitted unknown-method default case throws PluginRuntimeMethodNotFound', () => {
    const src = fs.readFileSync(nodeIPCServerPath, 'utf8');
    assert.match(src, /unknownMethod\.name = 'PluginRuntimeMethodNotFound'/);
    assert.match(src, /data = \{ method \}/);
  });
});

describe('generated Node bridge template source — structured error frames (D6.1)', () => {
  // The bridge JS lives inside a Swift file in protocol/plugin/generated/swift/.
  // Look at it as text to ensure the codegen has emitted the structured form.
  // We try two candidate paths because depending on the layout, this test may
  // run with different sdk roots.
  const sdkRoot = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.resolve(sdkRoot, '..', '..', '..', 'protocol', 'plugin', 'generated', 'swift', 'PluginRuntimeNodeBridgeTemplateGenerated.generated.swift'),
    path.resolve(sdkRoot, '..', '..', '..', 'platform', 'macos', 'Sources', 'Generated', 'PluginProtocol', 'PluginRuntimeNodeBridgeTemplateGenerated.generated.swift'),
  ];
  const bridgePath = candidates.find((p) => fs.existsSync(p));

  test('generated Swift bridge file exists at expected protocol path', () => {
    assert.ok(bridgePath, `expected one of: ${candidates.join(', ')}`);
  });

  test('embedded bridge JS contains inline serializeError helper', () => {
    if (!bridgePath) return; // covered by existence test above
    const src = fs.readFileSync(bridgePath, 'utf8');
    assert.match(src, /function serializeError\(err\)/);
    assert.match(src, /name: err\.name \|\| 'Error'/);
    assert.match(src, /out\.data = err\.data/);
  });

  test('embedded bridge JS no-handler path emits structured PluginRuntimeMethodNotFound frame', () => {
    if (!bridgePath) return;
    const src = fs.readFileSync(bridgePath, 'utf8');
    // Must NOT contain the legacy bare-string form.
    assert.equal(
      src.includes("error: 'no handler for ' + frame.method"),
      false,
      'bridge must NOT emit legacy bare-string error frames',
    );
    // Must contain the structured form.
    assert.match(src, /notFound\.name = 'PluginRuntimeMethodNotFound'/);
    assert.match(src, /notFound\.data = \{ method: frame\.method \}/);
    assert.match(src, /error: serializeError\(notFound\)/);
  });

  test('embedded bridge JS outer handler catch serializes errors structurally', () => {
    if (!bridgePath) return;
    const src = fs.readFileSync(bridgePath, 'utf8');
    // Must NOT contain the legacy bare-string error frame in the outer catch.
    assert.equal(
      /const msg = error instanceof Error \? error\.message : String\(error\);[\s\S]*ipcWrite\(\{ id: frame\.id, error: msg \}\)/.test(src),
      false,
      'bridge must NOT emit bare-string error in outer handler catch',
    );
    assert.match(src, /ipcWrite\(\{ id: frame\.id, error: serializeError\(error\) \}\)/);
  });
});
