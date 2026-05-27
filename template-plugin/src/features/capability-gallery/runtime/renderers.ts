// Three gallery attachment renderers, one per height shape.
// Each handler simply validates and surfaces the attachment payload — the
// real demonstration logic lives in the matching UI entry point.

import type { PluginAttachmentRendererHandler, PluginResolveAttachmentInput, PluginAttachmentResolveResult } from "@pasty/plugin-sdk/runtime";
import { decodeGalleryPayload, type GalleryAttachmentKind } from "./payloads.ts";

const TINT_HEX: Record<GalleryAttachmentKind, string> = {
  fixed: "#0EA5E9",   // sky-500
  auto: "#22C55E",    // green-500
  bounded: "#F97316", // orange-500
};

const DISPLAY_NAME: Record<GalleryAttachmentKind, string> = {
  fixed: "Gallery (fixed 240)",
  auto: "Gallery (auto)",
  bounded: "Gallery (120–480)",
};

function resolveForKind(kind: GalleryAttachmentKind, input: PluginResolveAttachmentInput): PluginAttachmentResolveResult {
  const payload = decodeGalleryPayload(input?.attachment?.payloadJson);
  if (!payload || payload.kind !== kind) {
    return { shouldDisplay: false, displayName: DISPLAY_NAME[kind], tintHex: TINT_HEX[kind] };
  }
  return {
    displayName: DISPLAY_NAME[kind],
    tintHex: TINT_HEX[kind],
  };
}

export function createGalleryRendererFixed(): PluginAttachmentRendererHandler {
  return {
    async resolveAttachment(input: PluginResolveAttachmentInput) {
      return resolveForKind("fixed", input);
    },
  };
}

export function createGalleryRendererAuto(): PluginAttachmentRendererHandler {
  return {
    async resolveAttachment(input: PluginResolveAttachmentInput) {
      return resolveForKind("auto", input);
    },
  };
}

export function createGalleryRendererBounded(): PluginAttachmentRendererHandler {
  return {
    async resolveAttachment(input: PluginResolveAttachmentInput) {
      return resolveForKind("bounded", input);
    },
  };
}
