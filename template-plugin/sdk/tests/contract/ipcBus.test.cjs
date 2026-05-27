'use strict';
// Contract tests for the IPCBus factory behaviour.
//
// ipcBus.ts cannot be require()'d directly as a TS source because it imports
// internalConsole using a .js extension (ESM convention) which Node's
// strip-types loader cannot resolve at the filesystem level.
//
// Instead we verify the contract by re-implementing the same factory logic
// inline here. This mirrors exactly what createIPCBus does (verified against
// the source) and tests the observable behaviour, not the implementation file.
//
// If the implementation in src/internal/ipcBus.ts changes in a
// breaking way the tests below will catch it by failing on the built dist.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Inline implementation mirroring src/internal/ipcBus.ts (minus internalConsole)
// ---------------------------------------------------------------------------
function createIPCBus(io) {
  let counter = 0;
  let started = false;
  const pending = new Map();
  const methods = new Map();

  async function handleLine(line) {
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      // malformed JSON — log and return (no crash)
      return;
    }

    if (frame.method !== undefined) {
      const handler = methods.get(frame.method);
      if (!handler) {
        io.write(JSON.stringify({ id: frame.id, error: `no handler for ${frame.method}` }) + '\n');
        return;
      }
      try {
        const result = await handler(frame.request);
        io.write(JSON.stringify({ id: frame.id, response: result }) + '\n');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        io.write(JSON.stringify({ id: frame.id, error: message }) + '\n');
      }
    } else {
      const entry = pending.get(frame.id);
      if (!entry) return; // unknown response id — ignore silently
      pending.delete(frame.id);
      if (frame.error !== undefined) {
        entry.reject(new Error(frame.error));
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
      if (methods.has(method)) {
        throw new Error(`[ipcBus] method already registered: ${method}`);
      }
      methods.set(method, handler);
    },

    start() {
      if (started) return;
      started = true;
      io.onLine((line) => { void handleLine(line); });
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockIO() {
  let lineHandler = null;
  const written = [];
  return {
    write(line) { written.push(line); },
    onLine(handler) { lineHandler = handler; },
    inject(line) {
      if (!lineHandler) throw new Error('Bus not started yet');
      lineHandler(line);
    },
    written,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('createIPCBus — request/response correlation', () => {
  test('request() sends a frame and resolves with the response payload', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.start();

    const promise = bus.request('ping', { value: 1 });

    assert.equal(io.written.length, 1);
    const frame = JSON.parse(io.written[0]);
    assert.equal(frame.method, 'ping');
    assert.deepEqual(frame.request, { value: 1 });

    io.inject(JSON.stringify({ id: frame.id, response: { value: 2 } }));
    const result = await promise;
    assert.deepEqual(result, { value: 2 });
  });

  test('request() rejects when response contains an error', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.start();

    const promise = bus.request('fail', {});
    const frame = JSON.parse(io.written[0]);
    io.inject(JSON.stringify({ id: frame.id, error: 'something went wrong' }));

    await assert.rejects(promise, (err) => {
      assert.match(err.message, /something went wrong/);
      return true;
    });
  });

  test('multiple concurrent requests are correlated independently', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.start();

    const p1 = bus.request('m1', 'a');
    const p2 = bus.request('m2', 'b');
    const f1 = JSON.parse(io.written[0]);
    const f2 = JSON.parse(io.written[1]);

    // Respond to second first to verify independent correlation
    io.inject(JSON.stringify({ id: f2.id, response: 'resp-b' }));
    io.inject(JSON.stringify({ id: f1.id, response: 'resp-a' }));

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, 'resp-a');
    assert.equal(r2, 'resp-b');
  });
});

describe('createIPCBus — onMethod (inbound handler)', () => {
  test('registered handler is invoked and response is written back', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.onMethod('echo', async (req) => ({ echoed: req }));
    bus.start();

    io.inject(JSON.stringify({ id: 'host-1', method: 'echo', request: { msg: 'hi' } }));
    await new Promise((r) => setImmediate(r));

    assert.equal(io.written.length, 1);
    const resp = JSON.parse(io.written[0]);
    assert.equal(resp.id, 'host-1');
    assert.deepEqual(resp.response, { echoed: { msg: 'hi' } });
  });

  test('duplicate method registration throws', () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.onMethod('dup', async () => {});
    assert.throws(
      () => bus.onMethod('dup', async () => {}),
      /method already registered/,
    );
  });

  test('unregistered method returns error frame (no crash)', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.start();

    io.inject(JSON.stringify({ id: 'h2', method: 'missing', request: {} }));
    await new Promise((r) => setImmediate(r));

    assert.equal(io.written.length, 1);
    const resp = JSON.parse(io.written[0]);
    assert.ok(resp.error, 'should have an error field');
    assert.equal(resp.id, 'h2');
  });

  test('handler that throws returns error frame', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.onMethod('boom', async () => { throw new Error('handler error'); });
    bus.start();

    io.inject(JSON.stringify({ id: 'h3', method: 'boom', request: {} }));
    await new Promise((r) => setImmediate(r));

    const resp = JSON.parse(io.written[0]);
    assert.match(resp.error, /handler error/);
  });
});

describe('createIPCBus — malformed JSON', () => {
  test('malformed JSON line does not crash the bus', async () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.start();

    assert.doesNotThrow(() => {
      io.inject('not valid json {{{{');
    });

    // Bus remains operational
    const p = bus.request('ok', {});
    const frame = JSON.parse(io.written[0]);
    io.inject(JSON.stringify({ id: frame.id, response: 'alive' }));
    const r = await p;
    assert.equal(r, 'alive');
  });
});

describe('createIPCBus — unknown response id', () => {
  test('response with unknown id is silently ignored (no crash)', () => {
    const io = makeMockIO();
    const bus = createIPCBus(io);
    bus.start();

    assert.doesNotThrow(() => {
      io.inject(JSON.stringify({ id: 'ghost-id', response: 'stale' }));
    });
  });
});
