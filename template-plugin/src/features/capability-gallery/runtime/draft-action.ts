// Gallery draft action — provides 4 stable buttons covering:
//   cycle-buttons     → dynamic pasty.action.setButtons demo
//   complete-text     → actionResult-equivalent via pasty.action.complete
//   complete-image    → image resultKind via runtime RPC bridge
//   complete-none     → none resultKind
// The UI (draft-action-ui/app.vue) drives all four behaviours; runtime only
// shapes the initial session.

import { defineMessage, actionResult } from "@pasty/plugin-sdk/runtime";
import type {
  PluginAutoRunActionHandler,
  PluginActionOperationResult,
  PluginAutoRunActionInput,
  RuntimeMessageContract,
} from "@pasty/plugin-sdk/runtime";
import { promises as fs } from "node:fs";
import path from "node:path";
import { GALLERY_RPC_KEYS, type GalleryCopyImageResponse, type GalleryRpcRequest, type GalleryRpcResponse } from "./messages.ts";
import { createInitialGalleryDraft } from "./draft.ts";

export type { GalleryDraft } from "./draft.ts";
export { createInitialGalleryDraft, decodeGalleryDraft } from "./draft.ts";

type ResolveSessionCtx = Parameters<PluginAutoRunActionHandler["resolveSession"]>[1];

async function readConfiguredLabel(ctx: ResolveSessionCtx): Promise<string> {
  const ctxAny = ctx as { host?: { settings?: { get?: (p: { key: string }) => Promise<{ value: unknown }> } } } | null;
  try {
    const response = await ctxAny?.host?.settings?.get?.({
      key: "plugin.template.full.gallery.label",
    });
    const raw = response?.value;
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  } catch {
    // setting may be absent; fall through to default
  }
  return "Capability Gallery Draft";
}

export function createGalleryDraftAction(): PluginAutoRunActionHandler {
  return {
    async resolveSession(_input, ctx) {
      const displayName = await readConfiguredLabel(ctx);
      const buttons = [
        { id: "cycle-buttons", title: "Cycle setButtons", isEnabled: true },
        { id: "complete-text", title: "Complete (text)", isEnabled: true },
        { id: "complete-image", title: "Complete (image)", isEnabled: true },
        { id: "complete-none", title: "Complete (none)", isEnabled: true },
      ];
      // initialDraft is wire-typed as Record<string, unknown> after R13 (the
      // typed-draft generic alias was removed). The GalleryDraft shape lives
      // purely on the UI side; we cast at the boundary.
      return {
        displayName,
        buttons,
        defaultButtonID: "complete-text",
        initialDraft: createInitialGalleryDraft() as unknown as Record<string, unknown>,
      };
    },
    // Draft-lifecycle actions don't auto-run; the host only invokes
    // `resolveSession` for them. We keep `runAutoAction` as a guarded stub so
    // the strict PluginAutoRunActionHandler interface is satisfied without
    // silently succeeding if it ever gets called by mistake.
    async runAutoAction(_input: PluginAutoRunActionInput): Promise<PluginActionOperationResult> {
      return actionResult.none({
        userMessage: "gallery-draft is a draft-lifecycle action; runAutoAction is not used",
      });
    },
  };
}

// --- RPC handlers exposed to UI via pasty.runtime.invoke({ key }) -----------
//
// Each handler wraps one host.* method in a uniform { ok, result?, error? }
// response so the UI's RuntimeBridgePanel can render a consistent log entry.

type RpcCtx = {
  host?: {
    item?: Record<string, (payload: unknown) => Promise<unknown>>;
    clipboard?: Record<string, (payload: unknown) => Promise<unknown>>;
    navigation?: Record<string, (payload: unknown) => Promise<unknown>>;
    settings?: Record<string, (payload: unknown) => Promise<unknown>>;
    console?: Record<string, (payload: unknown) => Promise<unknown>>;
    action?: Record<string, (payload: unknown) => Promise<unknown>>;
  };
};

function makeHostBridge(
  hostDomain: "item" | "clipboard" | "navigation" | "settings" | "console" | "action",
  method: string,
) {
  return async (req: GalleryRpcRequest, ctx: unknown): Promise<GalleryRpcResponse> => {
    const ctxAny = ctx as RpcCtx | null | undefined;
    const domain = ctxAny?.host?.[hostDomain];
    const fn = domain?.[method];
    if (typeof fn !== "function") {
      return { ok: false, error: `host.${hostDomain}.${method} unavailable` };
    }
    try {
      const result = await fn(req.payload ?? {});
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

// Each `defineMessage<TReq, TResp>().handle(fn)` returns a tuple invariant on
// its own TReq/TResp pair, which would block an array literal that mixes
// multiple contract types. Widening to <unknown, unknown> via
// RuntimeMessageContract gives us a common tuple shape for the array while
// each individual handler keeps its real types at the call site.
type MessageTuple = ReturnType<RuntimeMessageContract<unknown, unknown>["handle"]>;

export function createGalleryMessageHandlers(): Record<string, MessageTuple[1]> {
  const bridges: ReadonlyArray<MessageTuple> = [
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemReadAttachment).handle(makeHostBridge("item", "readAttachment")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemMaterializeImagePath).handle(makeHostBridge("item", "materializeImagePath")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemSetTags).handle(makeHostBridge("item", "setTags")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemAddTags).handle(makeHostBridge("item", "addTags")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemRemoveTags).handle(makeHostBridge("item", "removeTags")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemSetPinned).handle(makeHostBridge("item", "setPinned")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemSetAttachments).handle(makeHostBridge("item", "setAttachments")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.itemSetSearchExtension).handle(makeHostBridge("item", "setSearchExtension")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.clipboardCopyText).handle(makeHostBridge("clipboard", "copyText")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.navigationOpenUrl).handle(makeHostBridge("navigation", "openUrl")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.navigationRevealInFinder).handle(makeHostBridge("navigation", "revealInFinder")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.navigationOpenFilePath).handle(makeHostBridge("navigation", "openFilePath")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.settingsGet).handle(makeHostBridge("settings", "get")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.settingsGetAll).handle(makeHostBridge("settings", "getAll")),
    defineMessage<GalleryRpcRequest, GalleryRpcResponse>(GALLERY_RPC_KEYS.consoleLog).handle(makeHostBridge("console", "log")),
    defineMessage<Record<string, never>, GalleryCopyImageResponse>(GALLERY_RPC_KEYS.copyImageFlow).handle(
      async (_req, ctx) => {
        const ctxAny = ctx as {
          host?: {
            item?: { materializeImagePath?: (p: Record<string, never>) => Promise<{ path: string }> };
            action?: { allocateImageTempPath?: (p: { formatHint: string }) => Promise<{ path: string }> };
          };
        };
        const materialized = await ctxAny?.host?.item?.materializeImagePath?.({} as Record<string, never>);
        const sourcePath = materialized?.path;
        if (typeof sourcePath !== "string" || sourcePath.length === 0) {
          throw new Error("materializeImagePath returned no path; item may not be an image");
        }
        const ext = path.extname(sourcePath).toLowerCase().replace(/^\./, "");
        const imageFormatHint = ext || "png";
        const allocated = await ctxAny?.host?.action?.allocateImageTempPath?.({ formatHint: imageFormatHint });
        const tempPath = allocated?.path;
        if (typeof tempPath !== "string" || tempPath.length === 0) {
          throw new Error("allocateImageTempPath returned no path");
        }
        await fs.copyFile(sourcePath, tempPath);
        return { imageTempPath: tempPath, imageFormatHint };
      },
    ),
  ];
  return Object.fromEntries(bridges);
}
