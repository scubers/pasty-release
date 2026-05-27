// src/features/preview-renderer/renderer.ts
// Preview renderer handler for the template attachment type.
// See: openspec/changes/plugin-sdk-template-opt §4.3

import type { PluginAttachmentRendererHandler, PluginResolveAttachmentInput, PluginAttachmentResolveResult } from "@pasty/plugin-sdk/runtime";
import { decodeTemplatePreviewPayload } from "./payload.ts";

function resolveAttachment(input: PluginResolveAttachmentInput): PluginAttachmentResolveResult {
  const payload = decodeTemplatePreviewPayload(input?.attachment?.payloadJson);
  if (!payload) {
    return {
      displayName: "Template Preview",
      tintHex: "#0F766E",
      shouldDisplay: false
    };
  }
  return {
    displayName: "Template Preview",
    tintHex: "#0F766E"
  };
}

export function createTemplatePreviewRenderer(): PluginAttachmentRendererHandler {
  return {
    async resolveAttachment(input: PluginResolveAttachmentInput): Promise<PluginAttachmentResolveResult> {
      return resolveAttachment(input);
    }
  };
}

export { resolveAttachment };
