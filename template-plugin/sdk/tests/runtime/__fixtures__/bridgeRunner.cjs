"use strict";
// Standalone bridge runner used by bridgeModeDispatch tests.
// This mirrors the JS embedded in PluginRuntimeNodeBridgeTemplate.swift.
// Update both in lockstep.

const readline = require("readline");

const pluginModulePath = process.argv[2];
const permissions = new Set(JSON.parse(process.argv[3] || "[]"));
const initContext = JSON.parse(process.argv[4] || "{}");

// --- Inline ipcBus ---
// Wire: inbound  {id, method, request} | {id, response} | {id, error}
//        outbound {id, method, request} | {id, response} | {id, error}

let ipcCounter = 0;
const ipcPending = new Map(); // id -> {resolve, reject}
const ipcMethods = new Map(); // method -> handler

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

function ipcOnMethod(method, handler) {
  ipcMethods.set(method, handler);
}

// --- Plugin loading ---

function loadPluginDefinition() {
  const exported = require(pluginModulePath);
  if (exported && typeof exported.setup === "function") { return exported; }
  if (exported && exported.default && typeof exported.default.setup === "function") { return exported.default; }
  throw new Error("Plugin must export definePlugin(...) result");
}

const pluginDefinition = loadPluginDefinition();
let pluginRuntime = null;

function ensurePluginRuntime() {
  if (!pluginRuntime) { pluginRuntime = pluginDefinition.setup(initContext) || {}; }
  return pluginRuntime;
}

// --- Helpers ---

function normalizeTriggerSource(kind) {
  switch (kind) {
    case "commandStrip": case "hostRevealButton": return "hostButton";
    case "webview": case "pluginUI": return "pluginUI";
    case "autoRun": return "autoRun";
    default: return kind || "hostButton";
  }
}

function cloneJSONValue(value) {
  if (value === undefined) { return null; }
  return JSON.parse(JSON.stringify(value));
}

// --- Host client built from ipcBus ---

function makeHost() {
  const capabilities = {
    canCopyText: true,
    canOpenUrl: true,
    canRevealInFinder: true,
    canOpenFilePath: true,
    canSetAttachment: permissions.has("setAttachment"),
    canSetTags: permissions.has("setTags"),
    canSetPinned: permissions.has("setPinned"),
    canSetSearchExtension: permissions.has("setSearchExtension"),
    canReadExternalSettings: true
  };
  const clipboard = {
    copyText: async (payload) => ipcRequest("clipboard.copyText", payload)
  };
  const navigation = {
    openUrl: async (payload) => ipcRequest("navigation.openUrl", payload),
    revealInFinder: async (payload) => ipcRequest("navigation.revealInFinder", payload),
    openFilePath: async (payload) => ipcRequest("navigation.openFilePath", payload)
  };
  const item = {
    setTags: async (payload) => ipcRequest("item.setTags", payload),
    addTags: async (payload) => ipcRequest("item.addTags", payload),
    removeTags: async (payload) => ipcRequest("item.removeTags", payload),
    setPinned: async (payload) => ipcRequest("item.setPinned", payload),
    setAttachments: async (payload) => ipcRequest("item.setAttachments", payload),
    setSearchExtension: async (payload) => ipcRequest("item.setSearchExtension", payload),
    materializeImagePath: async (payload) => ipcRequest("item.materializeImagePath", payload || {}),
    readAttachment: async (payload) => ipcRequest("item.readAttachment", payload)
  };
  const action = {
    allocateImageTempPath: async (payload) => ipcRequest("action.allocateImageTempPath", payload)
  };
  const settings = {
    get: async (payload) => ipcRequest("settings.get", payload),
    getAll: async (payload) => ipcRequest("settings.getAll", payload)
  };
  return { capabilities, clipboard, navigation, item, action, settings };
}

function makeCtx(requestID) {
  return {
    request: { id: requestID || "" },
    plugin: { id: initContext?.plugin?.id || "" },
    capability: null,
    host: makeHost(),
    log: { info: (...args) => console.info(...args), warn: (...args) => console.warn(...args), error: (...args) => console.error(...args) }
  };
}

function normalizeButtonList(raw) {
  if (!Array.isArray(raw)) { return []; }
  const seen = new Set();
  const out = [];
  for (const btn of raw) {
    if (!btn || typeof btn !== "object") { continue; }
    if (typeof btn.id !== "string" || btn.id === "") { continue; }
    if (seen.has(btn.id)) { continue; }
    seen.add(btn.id);
    out.push({ id: btn.id, title: typeof btn.title === "string" ? btn.title : "", isEnabled: btn.isEnabled !== false });
  }
  return out;
}

function normalizeAttachmentResolveResult(result) {
  return {
    displayName: result?.displayName || "",
    tintHex: result?.tintHex || null,
    shouldDisplay: result?.shouldDisplay ?? true,
    buttons: normalizeButtonList(result?.buttons)
  };
}

function normalizeActionResolveResult(result) {
  return {
    displayName: result?.displayName || null,
    buttons: normalizeButtonList(result?.buttons),
    defaultButtonID: result?.defaultButtonID || null,
    initialDraft: result?.initialDraft || {}
  };
}

// --- 4 typed runtime.invoke* handlers ---

ipcOnMethod("runtime.invokeRenderer", async (request) => {
  const runtime = ensurePluginRuntime();
  const renderer = runtime?.attachmentRenderers?.[request.rendererID];
  if (!renderer) {
    return { requestID: request.requestID, result: null, errorMessage: "Renderer not found: " + request.rendererID };
  }
  const ctx = makeCtx(request.requestID);
  try {
    const result = normalizeAttachmentResolveResult(await renderer.resolveAttachment(request.input || {}, ctx));
    return { requestID: request.requestID, result, errorMessage: null };
  } catch (err) {
    return { requestID: request.requestID, result: null, errorMessage: err instanceof Error ? err.message : String(err) };
  }
});

ipcOnMethod("runtime.invokeDetector", async (request) => {
  const runtime = ensurePluginRuntime();
  const detector = runtime?.detectors?.[request.detectorID];
  if (!detector) {
    return { requestID: request.requestID, result: null, errorMessage: "Detector not found: " + request.detectorID };
  }
  const ctx = makeCtx(request.requestID);
  try {
    const detectorResult = await detector.detect(request.input || {}, ctx);
    const rawArtifacts = Array.isArray(detectorResult) ? detectorResult : (detectorResult?.artifacts || []);
    const result = rawArtifacts.map((a) => ({ attachmentSyncScope: "syncable", ...a }));
    return { requestID: request.requestID, result, errorMessage: null };
  } catch (err) {
    return { requestID: request.requestID, result: null, errorMessage: err instanceof Error ? err.message : String(err) };
  }
});

ipcOnMethod("runtime.invokeAction", async (request) => {
  const runtime = ensurePluginRuntime();
  const action = runtime?.actions?.[request.actionID];
  if (!action) {
    return { requestID: request.requestID, result: null, errorMessage: "Action not found: " + request.actionID };
  }
  const ctx = makeCtx(request.requestID);
  try {
    const result = normalizeActionResolveResult(await (action.resolveSession ? action.resolveSession(request.input || {}, ctx) : {}));
    return { requestID: request.requestID, result, errorMessage: null };
  } catch (err) {
    return { requestID: request.requestID, result: null, errorMessage: err instanceof Error ? err.message : String(err) };
  }
});

ipcOnMethod("runtime.invokeActionAutoRun", async (request) => {
  const runtime = ensurePluginRuntime();
  const action = runtime?.actions?.[request.actionID];
  if (!action) {
    return { requestID: request.requestID, result: null, errorMessage: "Action not found: " + request.actionID };
  }
  if (typeof action.runAutoAction !== "function") {
    return { requestID: request.requestID, result: null, errorMessage: "Action does not expose runAutoAction" };
  }
  const ctx = makeCtx(request.requestID);
  const input = request.input || {};
  const mappedInput = {
    item: input.item || null,
    content: input.content || null,
    attachments: input.attachments || [],
    buttonID: input.trigger?.buttonID || null,
    triggerSource: normalizeTriggerSource(input.trigger?.kind)
  };
  try {
    const result = await action.runAutoAction(mappedInput, ctx);
    return { requestID: request.requestID, result, errorMessage: null };
  } catch (err) {
    return { requestID: request.requestID, result: null, errorMessage: err instanceof Error ? err.message : String(err) };
  }
});

// --- Unhandled rejection ---

process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write("[pasty-bridge] Unhandled rejection: " + msg + "\n");
  process.exit(1);
});

// --- Readline pump ---
// Lifecycle: track in-flight handlers so we can exit cleanly when stdin EOFs.
// Without an explicit exit, readline alone does NOT keep the process alive after
// 'close', but pending Promise resolutions or unread stdout buffers can — and
// in test environments parents that don't SIGKILL leak stuck children.

let pendingHandlers = 0;
let stdinClosed = false;
function maybeExit() {
  if (stdinClosed && pendingHandlers === 0 && ipcPending.size === 0) {
    process.exit(0);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  if (!line) { return; }
  let frame;
  try {
    frame = JSON.parse(line);
  } catch (error) {
    process.stderr.write("[pasty-bridge] malformed JSON line: " + String(line) + "\n");
    return;
  }

  if (frame.method !== undefined) {
    pendingHandlers++;
    try {
      const handler = ipcMethods.get(frame.method);
      if (!handler) {
        ipcWrite({ id: frame.id, error: `no handler for ${frame.method}` });
        return;
      }
      try {
        const result = await handler(frame.request);
        ipcWrite({ id: frame.id, response: result });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        ipcWrite({ id: frame.id, error: msg });
      }
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

  process.stderr.write("[pasty-bridge] Unknown frame: " + JSON.stringify(frame) + "\n");
});

rl.on("close", () => {
  stdinClosed = true;
  maybeExit();
});
