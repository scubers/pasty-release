"use strict";
// Tests for the bridge typed dispatch methods.
// Spawns bridgeRunner.cjs with a minimal plugin fixture and exercises each method.

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const bridgePath = path.resolve(__dirname, "__fixtures__/bridgeRunner.cjs");
const pluginPath = path.resolve(__dirname, "__fixtures__/bridgeDispatchPlugin.cjs");

let invokeCounter = 0;

function sendAndReceive(method, requestPayload, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [bridgePath, pluginPath, "[]", "{}"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let buf = "";
    const frames = [];

    proc.stdout.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (line.trim()) {
          try { frames.push(JSON.parse(line)); }
          catch { frames.push({ _raw: line }); }
        }
      }
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("timed out waiting for bridge response"));
    }, timeoutMs);

    proc.on("exit", () => clearTimeout(timer));

    const id = "invoke-" + (++invokeCounter);
    proc.stdin.write(JSON.stringify({ id, method, request: requestPayload }) + "\n");
    proc.stdin.end();

    proc.on("close", () => {
      clearTimeout(timer);
      const responseFrame = frames.find((f) => f.id === id && f.response !== undefined);
      if (responseFrame) { resolve(responseFrame.response); }
      else { reject(new Error("No response frame received. frames: " + JSON.stringify(frames))); }
    });
  });
}

test("runtime.invokeRenderer — result includes shouldDisplay field", async () => {
  const result = await sendAndReceive("runtime.invokeRenderer", {
    requestID: "req-1",
    rendererID: "demoRenderer",
    input: {
      item: { id: "i1", type: "text", tags: [], sourceAppID: "" },
      content: null,
      attachments: [],
      attachment: { historyID: "i1", owner: "test", attachmentType: "t", attachmentKey: "k", payloadJson: "{}" },
      declaredActions: []
    }
  });
  assert.equal(result.errorMessage, null, `unexpected error: ${result.errorMessage}`);
  assert.ok("shouldDisplay" in result.result, "result must contain shouldDisplay field");
  assert.equal(result.result.shouldDisplay, true);
});

test("runtime.invokeDetector — unknown detector returns errorMessage", async () => {
  const result = await sendAndReceive("runtime.invokeDetector", {
    requestID: "req-2",
    detectorID: "unknownDetector",
    input: {
      item: { id: "i1", type: "text", tags: [], sourceAppID: "" },
      content: null,
      attachments: []
    }
  });
  assert.ok(result.errorMessage, "errorMessage must be set for unknown detector");
});

test("runtime.invokeDetector — known detector returns result array", async () => {
  const result = await sendAndReceive("runtime.invokeDetector", {
    requestID: "req-3",
    detectorID: "demoDetector",
    input: {
      item: { id: "i1", type: "text", tags: [], sourceAppID: "" },
      content: null,
      attachments: []
    }
  });
  assert.equal(result.errorMessage, null, `unexpected error: ${result.errorMessage}`);
  assert.ok(Array.isArray(result.result), "result must be an array");
});

test("runtime.invokeActionAutoRun — calls runAutoAction, returns result", async () => {
  const result = await sendAndReceive("runtime.invokeActionAutoRun", {
    requestID: "req-4",
    actionID: "autoRunAction",
    input: {
      item: { id: "i1", type: "text", tags: [], sourceAppID: "" },
      content: null,
      attachments: [],
      draft: {},
      trigger: { kind: "autoRun", buttonID: null }
    }
  });
  assert.equal(result.errorMessage, null, `unexpected error: ${result.errorMessage}`);
  assert.ok(result.result, "result must be present");
  assert.equal(result.result.resultKind, "none");
});

test("runtime.invokeAction — unknown action returns errorMessage", async () => {
  const result = await sendAndReceive("runtime.invokeAction", {
    requestID: "req-5",
    actionID: "unknownAction",
    input: {
      item: { id: "i1", type: "text", tags: [], sourceAppID: "" },
      content: null,
      attachments: [],
      action: { id: "a1", actionID: "unknownAction", title: "X", lifecycle: "autoRun", supportedItemTypes: [], keywords: [], buttons: [] }
    }
  });
  assert.ok(result.errorMessage, "errorMessage must be set for unknown action");
});

test("unknown method — bridge returns error frame", async () => {
  const result = await sendAndReceive("runtime.invokeUnknown", {
    requestID: "req-6"
  }).catch((err) => {
    // The bridge returns an error frame (not a response frame) for unknown methods,
    // so sendAndReceive rejects because there is no .response key.
    assert.ok(err.message.includes("No response frame"), `unexpected rejection: ${err.message}`);
    return null;
  });
  // If we get here with a null result, that means we got the expected rejection.
  // If result is non-null, it means the bridge returned a response frame (unexpected).
  if (result !== null) {
    assert.fail(`expected no response frame for unknown method, got: ${JSON.stringify(result)}`);
  }
});
