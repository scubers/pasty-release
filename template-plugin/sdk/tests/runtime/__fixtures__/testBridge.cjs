// Minimal host-call bridge fixture for duplex protocol testing.
// Uses ipcBus protocol: inbound {id, method, request}, outbound {id, method, request} | {id, response} | {id, error}
"use strict";
const readline = require("readline");

process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write("[pasty-bridge] Unhandled rejection: " + msg + "\n");
  process.exit(1);
});

let ipcCounter = 0;
const ipcPending = new Map(); // id -> {resolve, reject}

function ipcWrite(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function ipcRequest(method, payload) {
  const id = "req-" + (++ipcCounter);
  return new Promise((resolve, reject) => {
    ipcPending.set(id, { resolve, reject });
    ipcWrite({ id, method, request: payload });
  });
}

// Lifecycle: exit when stdin EOFs and all in-flight work has settled.
let pendingHandlers = 0;
let stdinClosed = false;
function maybeExit() {
  if (stdinClosed && pendingHandlers === 0 && ipcPending.size === 0) {
    process.exit(0);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  if (!line) return;
  let frame;
  try {
    frame = JSON.parse(line);
  } catch (_) {
    process.stderr.write("[pasty-bridge] malformed JSON: " + line + "\n");
    return;
  }

  if (frame.method !== undefined) {
    pendingHandlers++;
    try {
      if (frame.method === "runtime.invokeRenderer") {
        // Exercise the materializeImagePath → ipcRequest → response round-trip.
        try {
          const imagePath = await ipcRequest("item.materializeImagePath", {});
          ipcWrite({ id: frame.id, response: { requestID: frame.request?.requestID || null, result: { path: imagePath }, errorMessage: null } });
        } catch (err) {
          ipcWrite({ id: frame.id, response: { requestID: frame.request?.requestID || null, result: null, errorMessage: String(err.message) } });
        }
        return;
      }
      ipcWrite({ id: frame.id, error: "unknown method: " + frame.method });
    } finally {
      pendingHandlers--;
      maybeExit();
    }
    return;
  }

  if (frame.id !== undefined && (frame.response !== undefined || frame.error !== undefined)) {
    // Response to an outbound host call
    const pending = ipcPending.get(frame.id);
    if (pending) {
      ipcPending.delete(frame.id);
      if (frame.error !== undefined) { pending.reject(new Error(frame.error)); }
      else { pending.resolve(frame.response); }
    }
    maybeExit();
    return;
  }

  ipcWrite({ id: frame.id, error: "unknown frame" });
});

rl.on("close", () => {
  stdinClosed = true;
  maybeExit();
});
