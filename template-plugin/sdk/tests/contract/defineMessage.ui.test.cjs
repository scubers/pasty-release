'use strict';
// Integration test for ui/defineMessage — guards against the double-unwrap regression.
//
// Root cause of the bug: defineMessage previously did `result?.response` on the
// return value of pasty.runtime.invoke, but callRuntimeInvokeStrict already
// unwraps the {response} envelope (runtimeInvokeClient.ts:66). That meant
// every .invoke() call returned null (undefined?.response === undefined, then
// fallback to null). This test mocks the webkit handler to return a known
// sample response and asserts the resolved value is the unwrapped TResp, not
// {response: TResp} nor null.
//
// To run: cd plugins/template-plugin/sdk && npm test
// The test runner is invoked with --require ./tests/setup.cjs (package.json),
// which installs globalThis.addEventListener before any module is loaded.

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Load the dist bundle (setup.cjs already installed addEventListener polyfill
// via --require). We require the CJS build because the test runner is CJS.
// ---------------------------------------------------------------------------
const { defineMessage } = require('../../dist/ui/index.cjs');

// ---------------------------------------------------------------------------
// webkit mock helpers
// ---------------------------------------------------------------------------
function installWebkitMock(responseValue) {
  globalThis.webkit = {
    messageHandlers: {
      pastyPluginCall: {
        // callRuntimeInvokeStrict posts to this handler and awaits the reply.
        // The native bridge wraps the handler result in {response: <value>}
        // before resolving — that envelope is what callRuntimeInvokeStrict
        // unwraps at line 66 (reply?.response). We replicate the same shape.
        postMessage: async (_msg) => ({ response: responseValue }),
      },
    },
  };
}

function removeWebkitMock() {
  delete globalThis.webkit;
}

afterEach(() => {
  removeWebkitMock();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('defineMessage — invoke returns unwrapped TResp (not {response: TResp} or null)', () => {
  test('invoke resolves to the direct response object, not the {response} envelope', async () => {
    const sampleResponse = { title: 'Hello World' };
    installWebkitMock(sampleResponse);

    const FetchTitle = defineMessage('fetch-title');
    const result = await FetchTitle.invoke({ url: 'https://example.com' });

    // Must be the plain response object — not wrapped in {response: ...}
    assert.deepEqual(result, sampleResponse, 'invoke must return TResp directly');

    // Guard: the double-unwrap bug would have returned null
    assert.notEqual(result, null, 'invoke must not return null');

    // Guard: the bug would have returned undefined or {response: ...} if wrapper was returned
    assert.ok(!('response' in result), 'invoke result must not have a .response property');
    assert.equal(result.title, 'Hello World');
  });

  test('invoke resolves to a scalar-valued response', async () => {
    // Verify it works for non-object responses too (e.g. a number)
    installWebkitMock(42);

    const Ping = defineMessage('ping');
    const result = await Ping.invoke({});

    assert.equal(result, 42);
  });

  test('invoke passes key and payload to the webkit handler', async () => {
    let capturedMsg = null;
    globalThis.webkit = {
      messageHandlers: {
        pastyPluginCall: {
          postMessage: async (msg) => {
            capturedMsg = msg;
            return { response: { ok: true } };
          },
        },
      },
    };

    const DoThing = defineMessage('do-thing');
    await DoThing.invoke({ foo: 'bar' });

    assert.ok(capturedMsg, 'postMessage must have been called');
    assert.equal(capturedMsg.method, 'runtime.invoke');
    assert.equal(capturedMsg.payload.key, 'do-thing');
    assert.deepEqual(capturedMsg.payload.payload, { foo: 'bar' });
  });

  test('invoke passes timeoutMs option through to the payload', async () => {
    let capturedMsg = null;
    globalThis.webkit = {
      messageHandlers: {
        pastyPluginCall: {
          postMessage: async (msg) => {
            capturedMsg = msg;
            return { response: null };
          },
        },
      },
    };

    const Timed = defineMessage('timed-op');
    await Timed.invoke({ x: 1 }, { timeoutMs: 5000 });

    assert.equal(capturedMsg.payload.timeoutMs, 5000);
  });

  test('invoke throws when webkit handler is not installed', async () => {
    // No globalThis.webkit set (afterEach already cleared it)
    const Msg = defineMessage('any-key');

    await assert.rejects(
      () => Msg.invoke({}),
      /runtime\.invoke is only available inside a Pasty plugin WebView/,
    );
  });
});
