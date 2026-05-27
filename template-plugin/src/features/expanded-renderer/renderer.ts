// src/features/expanded-renderer/renderer.ts
// Expanded renderer handler for the template attachment type.
// See: openspec/changes/plugin-sdk-template-opt §4b.12

import type { PluginAttachmentRendererHandler, PluginResolveAttachmentInput, PluginAttachmentResolveResult } from "@pasty/plugin-sdk/runtime";
import { decodeTemplateExpandedPayload } from "./payload.ts";

function resolveAttachment(input: PluginResolveAttachmentInput): PluginAttachmentResolveResult {
  const payload = decodeTemplateExpandedPayload(input?.attachment?.payloadJson);
  if (!payload) {
    return {
      displayName: "Template Expanded",
      tintHex: "#2563EB",
      shouldDisplay: false
    };
  }
  return {
    displayName: "Template Expanded",
    tintHex: "#2563EB"
  };
}

export function createTemplateExpandedRenderer(): PluginAttachmentRendererHandler {
  return {
    async resolveAttachment(input: PluginResolveAttachmentInput): Promise<PluginAttachmentResolveResult> {
      return resolveAttachment(input);
    }
  };
}

export { resolveAttachment };
