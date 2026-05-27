// Pasty - Copyright (c) 2026. MIT License.
// Duplex protocol test: host-call request/response round-trip through the bridge.
// Uses a minimal fixture bridge (testBridge.cjs) that mirrors the real bridge protocol
// to verify ipcBus frame shapes and promise resolution without spawning a full plugin process.

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const bridgePath = path.resolve(__dirname, "__fixtures__/testBridge.cjs");
const exitBridgePath = path.resolve(__dirname, "__fixtures__/testBridgeExit.cjs");

/** Poll `liveFrames` until `predicate` matches or timeout is reached. */
async function waitForFrame(liveFrames, predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const frame = liveFrames.find(predicate);
    if (frame) return frame;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for frame matching predicate");
}

function runDuplex(bridgeScript, writeFrames, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [bridgeScript], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const frames = [];
    let buf = "";

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

    const stderrLines = [];
    proc.stderr.on("data", (chunk) => {
      stderrLines.push(chunk.toString("utf8"));
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("duplex test timed out"));
    }, timeoutMs);

    proc.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ frames, exitCode: code, stderr: stderrLines.join("") });
    });

    writeFrames(proc.stdin, frames).catch((err) => {
      proc.kill();
      reject(err);
    });
  });
}

/** Convenience wrapper using the default test bridge. */
function run(writeFrames, timeoutMs) {
  return runDuplex(bridgePath, writeFrames, timeoutMs);
}

test("bridge emits host-call frame when runtime.invokeRenderer triggers item.materializeImagePath", async () => {
  const invokeID = "inv-1";
  const { frames } = await run(async (stdin, liveFrames) => {
    stdin.write(JSON.stringify({ id: invokeID, method: "runtime.invokeRenderer", request: { requestID: "r1" } }) + "\n");
    const hostCall = await waitForFrame(liveFrames, (f) => f.method === "item.materializeImagePath");
    stdin.write(JSON.stringify({ id: hostCall.id, response: "/tmp/materialized.png" }) + "\n");
    stdin.end();
  });

  const hostCall = frames.find((f) => f.method === "item.materializeImagePath");
  assert.ok(hostCall, "bridge must emit an item.materializeImagePath frame");
  assert.ok(typeof hostCall.id === "string" && hostCall.id.length > 0, "host call must have an id");
  assert.deepEqual(hostCall.request, {}, "materializeImagePath request must be empty object");
});

test("host-call response resolves to the payload and runtime.invokeRenderer response carries result", async () => {
  const invokeID = "inv-2";
  const expectedPath = "/tmp/test-image-123.png";

  const { frames } = await run(async (stdin, liveFrames) => {
    stdin.write(JSON.stringify({ id: invokeID, method: "runtime.invokeRenderer", request: { requestID: "r2" } }) + "\n");
    const hostCall = await waitForFrame(liveFrames, (f) => f.method === "item.materializeImagePath");
    stdin.write(JSON.stringify({ id: hostCall.id, response: expectedPath }) + "\n");
    stdin.end();
  });

  const invokeResponse = frames.find((f) => f.id === invokeID && f.response !== undefined);
  assert.ok(invokeResponse, "bridge must emit a response frame for the runtime.invokeRenderer");
  assert.equal(invokeResponse.response.errorMessage, null, "response must have no errorMessage");
  assert.equal(invokeResponse.response.result?.path, expectedPath, "result must contain the path from the host-call response");
});

test("host-call error response causes runtime.invokeRenderer response to carry errorMessage", async () => {
  const invokeID = "inv-3";

  const { frames } = await run(async (stdin, liveFrames) => {
    stdin.write(JSON.stringify({ id: invokeID, method: "runtime.invokeRenderer", request: { requestID: "r3" } }) + "\n");
    const hostCall = await waitForFrame(liveFrames, (f) => f.method === "item.materializeImagePath");
    stdin.write(JSON.stringify({ id: hostCall.id, error: "item is not an image" }) + "\n");
    stdin.end();
  });

  const invokeResponse = frames.find((f) => f.id === invokeID && f.response !== undefined);
  assert.ok(invokeResponse, "bridge must emit a response frame");
  assert.ok(
    invokeResponse.response.errorMessage?.includes("item is not an image"),
    `response.errorMessage must propagate host-call error, got: ${invokeResponse.response.errorMessage}`
  );
});

test("response with unrecognised id is silently ignored — bridge does not crash", async () => {
  const invokeID = "inv-4";
  const { frames } = await run(async (stdin, liveFrames) => {
    stdin.write(JSON.stringify({ id: invokeID, method: "runtime.invokeRenderer", request: { requestID: "r4" } }) + "\n");
    const hostCall = await waitForFrame(liveFrames, (f) => f.method === "item.materializeImagePath");
    // Send unknown id first — must be silently dropped.
    stdin.write(JSON.stringify({ id: "unknown-id", response: "/tmp/wrong.png" }) + "\n");
    // Then send the correct id to resolve the pending promise.
    stdin.write(JSON.stringify({ id: hostCall.id, response: "/tmp/real.png" }) + "\n");
    stdin.end();
  });

  const invokeResponse = frames.find((f) => f.id === invokeID && f.response !== undefined);
  assert.ok(invokeResponse, "bridge must still emit a response frame");
  assert.equal(invokeResponse.response.result?.path, "/tmp/real.png", "result must use the correct response payload");
});

test("unhandled rejection causes bridge to exit with non-zero code and no response frame", async () => {
  const invokeID = "inv-exit";
  const { frames, exitCode, stderr } = await runDuplex(
    exitBridgePath,
    async (stdin) => {
      stdin.write(JSON.stringify({ id: invokeID, method: "runtime.invokeRenderer", request: { requestID: "r-exit" } }) + "\n");
      stdin.end();
    }
  );

  const invokeResponse = frames.find((f) => f.id === invokeID && f.response !== undefined);
  assert.ok(!invokeResponse, "bridge must NOT emit a response frame on unhandled rejection");
  assert.notEqual(exitCode, 0, "bridge must exit with non-zero code on unhandled rejection");
  assert.ok(stderr.includes("Unhandled rejection"), `stderr must mention the rejection, got: ${stderr}`);
});
