// src/features/expanded-renderer/payload.ts
// Single source of truth for the template expanded attachment payload.
// See: openspec/changes/plugin-sdk-template-opt §4b.10

import type { PluginContentEnvelope, PluginClipboardItem, PluginDetectorArtifact } from "@pasty/plugin-sdk/runtime";

// PathEntry mirrors the wire-side PluginPathEntry struct emitted by the host
// inside path_reference content envelopes.
interface PathEntry {
  kind: "file" | "folder";
  path: string;
  displayName?: string;
}
import type { DisplayInfo } from "../../shared/display.ts";
import { buildContentDisplay, buildSearchText, decodeDisplayInfo, mapContentKind, safeArray, truncateText } from "../../shared/display.ts";
import { cloneJSON } from "../../shared/debug.ts";

interface SearchProjection {
  scope: string;
  searchText: string;
  label: string;
}

function buildTemplateExpandedSearchProjection(payload: TemplateExpandedPayload): SearchProjection | null {
  const searchText = buildSearchText(payload);
  if (!searchText.trim()) return null;
  return { scope: "template_expanded", searchText, label: payload?.display?.typeLabel || "Template (Expanded)" };
}

export interface TemplateExpandedExtended {
  contentKind: PluginContentEnvelope["kind"];
  sourceAppID: string;
  tags: string[];
  // text branch
  text?: string;
  // image branch
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  // path_reference branch
  entries?: PathEntry[];
}

export interface TemplateExpandedPayload {
  kind: "template_expanded";
  version: 1;
  contentKind: PluginContentEnvelope["kind"];
  display: DisplayInfo;
  extended: TemplateExpandedExtended | null;
  debug: { item: unknown; content: unknown };
}

export interface BuildExpandedPayloadInput {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
}

// content is the FLAT PluginContentEnvelope: { kind, ...variantFields }
type RawInput = { item?: unknown; content?: Record<string, unknown> | null };

function buildExtendedExtras(
  contentKind: string,
  contentPayload: Record<string, unknown> | null,
  rawInput: RawInput
): TemplateExpandedExtended {
  const itemTags = safeArray((rawInput?.item as { tags?: unknown[] } | null)?.tags).map((tag) => String(tag));
  const sourceAppID = String((rawInput?.item as { sourceAppID?: string } | null)?.sourceAppID ?? "");
  const base = {
    contentKind: contentKind as PluginContentEnvelope["kind"],
    sourceAppID,
    tags: itemTags
  };

  if (contentKind === "text") {
    return {
      ...base,
      text: truncateText((contentPayload as { text?: string } | null)?.text ?? "", 480)
    };
  }
  if (contentKind === "image") {
    return {
      ...base,
      width: Number((contentPayload as { width?: number } | null)?.width) || 0,
      height: Number((contentPayload as { height?: number } | null)?.height) || 0,
      format: String((contentPayload as { format?: string } | null)?.format ?? ""),
      bytes: Number((contentPayload as { bytes?: number } | null)?.bytes) || 0
    };
  }
  return {
    ...base,
    entries: safeArray((contentPayload as { entries?: unknown[] } | null)?.entries)
      .slice(0, 10)
      .map((entry) => ({
        kind: String((entry as PathEntry)?.kind ?? "") as "file" | "folder",
        path: String((entry as PathEntry)?.path ?? ""),
        displayName: String((entry as PathEntry)?.displayName ?? (entry as PathEntry)?.path ?? "")
      }))
  };
}

export function createTemplateExpandedPayload(input: BuildExpandedPayloadInput): TemplateExpandedPayload | null {
  const rawInput = input as unknown as RawInput;
  const contentKind = mapContentKind(rawInput?.content?.kind);
  // Flat envelope: variant fields (text / width / entries / ...) are siblings
  // of `kind` on `content`. Hand the whole object to the display + extras builders.
  const contentPayload = (rawInput?.content ?? null) as Record<string, unknown> | null;
  const display = buildContentDisplay(contentKind, contentPayload as Parameters<typeof buildContentDisplay>[1]);
  if (!display?.headline) {
    return null;
  }

  return {
    kind: "template_expanded",
    version: 1,
    contentKind: (rawInput?.content?.kind ?? contentKind) as PluginContentEnvelope["kind"],
    display,
    extended: buildExtendedExtras(contentKind, contentPayload, rawInput),
    debug: {
      item: cloneJSON(rawInput?.item),
      content: cloneJSON(rawInput?.content)
    }
  };
}

export function decodeTemplateExpandedPayload(payloadJson: string | null | undefined): TemplateExpandedPayload | null {
  try {
    const parsed = JSON.parse(payloadJson || "{}") as Record<string, unknown>;
    if (
      parsed.kind !== "template_expanded" ||
      typeof parsed.contentKind !== "string" ||
      typeof parsed.display !== "object" ||
      parsed.display === null
    ) {
      return null;
    }

    return {
      kind: "template_expanded",
      version: 1,
      contentKind: parsed.contentKind as PluginContentEnvelope["kind"],
      display: decodeDisplayInfo(parsed.display),
      extended: typeof parsed.extended === "object" && parsed.extended !== null
        ? parsed.extended as TemplateExpandedExtended
        : null,
      debug: typeof parsed.debug === "object" && parsed.debug !== null
        ? parsed.debug as { item: unknown; content: unknown }
        : { item: null, content: null }
    };
  } catch {
    return null;
  }
}

export function buildExpandedArtifact(input: BuildExpandedPayloadInput): PluginDetectorArtifact | null {
  const payload = createTemplateExpandedPayload(input);
  if (!payload) return null;

  return {
    attachmentType: "plugin.template.full.expanded",
    attachmentKey: "expanded",
    payloadJson: JSON.stringify(payload),
    searchProjection: buildTemplateExpandedSearchProjection(payload) ?? undefined
  };
}
