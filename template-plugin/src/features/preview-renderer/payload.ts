// src/features/preview-renderer/payload.ts
// Single source of truth for the template preview attachment payload.
// See: openspec/changes/plugin-sdk-template-opt §4.1

import type { PluginContentEnvelope, PluginClipboardItem, PluginDetectorArtifact } from "@pasty/plugin-sdk/runtime";
import type { DisplayInfo } from "../../shared/display.ts";
import { buildContentDisplay, buildSearchText, decodeDisplayInfo, mapContentKind } from "../../shared/display.ts";
import { cloneJSON } from "../../shared/debug.ts";

interface SearchProjection {
  scope: string;
  searchText: string;
  label: string;
}

function buildTemplateSearchProjection(payload: TemplatePreviewPayload): SearchProjection | null {
  const searchText = buildSearchText(payload);
  if (!searchText.trim()) return null;
  return { scope: "template_preview", searchText, label: payload?.display?.typeLabel || "Template" };
}

export interface TemplatePreviewPayload {
  kind: "template_preview";
  version: 2;
  contentKind: PluginContentEnvelope["kind"];
  display: DisplayInfo;
  debug: { item: unknown; content: unknown };
}

export interface BuildPreviewPayloadInput {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
}

export function createTemplatePreviewPayload(input: BuildPreviewPayloadInput): TemplatePreviewPayload | null {
  // Flat envelope: variant fields are siblings of `kind` on `content`.
  const rawInput = input as unknown as { item?: unknown; content?: Record<string, unknown> | null };
  const contentKind = mapContentKind(rawInput?.content?.kind);
  const contentPayload = (rawInput?.content ?? null) as Parameters<typeof buildContentDisplay>[1];
  const display = buildContentDisplay(contentKind, contentPayload);
  if (!display?.headline) {
    return null;
  }

  return {
    kind: "template_preview",
    version: 2,
    contentKind: (rawInput?.content?.kind ?? contentKind) as PluginContentEnvelope["kind"],
    display,
    debug: {
      item: cloneJSON(rawInput?.item),
      content: cloneJSON(rawInput?.content)
    }
  };
}

export function decodeTemplatePreviewPayload(payloadJson: string | null | undefined): TemplatePreviewPayload | null {
  try {
    const parsed = JSON.parse(payloadJson || "{}") as Record<string, unknown>;
    if (
      parsed.kind !== "template_preview" ||
      typeof parsed.contentKind !== "string" ||
      typeof parsed.display !== "object" ||
      parsed.display === null
    ) {
      return null;
    }

    return {
      kind: "template_preview",
      version: 2,
      contentKind: parsed.contentKind as PluginContentEnvelope["kind"],
      display: decodeDisplayInfo(parsed.display),
      debug: typeof parsed.debug === "object" && parsed.debug !== null
        ? parsed.debug as { item: unknown; content: unknown }
        : { item: null, content: null }
    };
  } catch {
    return null;
  }
}

export function buildPreviewArtifact(input: BuildPreviewPayloadInput): PluginDetectorArtifact | null {
  const payload = createTemplatePreviewPayload(input);
  if (!payload) return null;

  return {
    attachmentType: "plugin.template.full.preview",
    attachmentKey: "primary",
    payloadJson: JSON.stringify(payload),
    searchProjection: buildTemplateSearchProjection(payload) ?? undefined
  };
}
