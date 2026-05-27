// src/shared/display.ts
// Display utilities shared across features.
// Canonical home for DisplayFact, DisplayInfo, and build*Display helpers.
// See: openspec/changes/plugin-sdk-template-opt §3.1

export interface DisplayFact {
  label: string;
  value: string;
}

export interface DisplayInfo {
  typeLabel: string;
  headline: string;
  subheadline: string;
  facts: DisplayFact[];
}

/**
 * Decode a raw `unknown` (typically `parsed.display` from a payloadJson) into
 * a strict DisplayInfo. Used by feature payload.ts decoders to share the
 * boundary coercion logic instead of duplicating it.
 *
 * Uses `??` (nullish-coalescing) instead of `||` so falsy-but-valid values
 * (empty string, 0) survive coercion.
 */
export function decodeDisplayInfo(raw: unknown): DisplayInfo {
  const display = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const facts = Array.isArray(display.facts) ? display.facts : [];
  return {
    typeLabel: String(display.typeLabel ?? ""),
    headline: String(display.headline ?? ""),
    subheadline: String(display.subheadline ?? ""),
    facts: facts.map((fact) => {
      const f = (fact && typeof fact === "object" ? fact : {}) as Record<string, unknown>;
      return { label: String(f.label ?? ""), value: String(f.value ?? "") };
    }),
  };
}

// ---- internal payload shape types (kept local) ----

interface PathEntry {
  kind?: string;
  path?: string;
  displayName?: string;
}

interface ImagePayload {
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

interface PathRefPayload {
  entries?: unknown[];
}

interface TextPayload {
  text?: string;
}

export type ContentPayload = TextPayload | ImagePayload | PathRefPayload | null;

// ---- text helpers ----

export function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

export function truncateText(value: unknown, maxLength = 72): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function createFact(label: unknown, value: unknown): DisplayFact {
  return {
    label: String(label ?? ""),
    value: String(value ?? "")
  };
}

export function formatByteCount(byteCount: unknown): string {
  const normalized = Number(byteCount) || 0;
  if (normalized <= 0) {
    return "0 B";
  }
  if (normalized < 1024) {
    return `${normalized} B`;
  }
  if (normalized < 1024 * 1024) {
    return `${(normalized / 1024).toFixed(1)} KB`;
  }
  return `${(normalized / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- search text helper ----

interface PayloadWithDisplay {
  display?: {
    headline?: string;
    subheadline?: string;
    facts?: Array<{ label?: string; value?: string }>;
  };
}

export function buildSearchText(payload: PayloadWithDisplay): string {
  const facts = safeArray(payload?.display?.facts)
    .map((fact) => `${(fact as { label?: string })?.label ?? ""} ${(fact as { value?: string })?.value ?? ""}`.trim())
    .filter(Boolean);
  return [payload?.display?.headline, payload?.display?.subheadline, ...facts]
    .filter(Boolean)
    .join(" ");
}

// ---- private display builders ----

function buildTextDisplay(text: unknown): DisplayInfo {
  const normalized = normalizeText(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const headline = truncateText(lines[0] || "Text clipboard item");
  const subheadline = truncateText(lines[1] || "Supports text payload inspection and copy-ready debug JSON.");

  return {
    typeLabel: "Text",
    headline,
    subheadline,
    facts: [
      createFact("Lines", String(lines.length || 1)),
      createFact("Chars", String(normalized.length))
    ]
  };
}

function buildImageDisplay(payload: ImagePayload | null): DisplayInfo {
  const width = Number((payload as ImagePayload | null)?.width) || 0;
  const height = Number((payload as ImagePayload | null)?.height) || 0;
  const format = String((payload as ImagePayload | null)?.format || "image").toUpperCase();
  const byteCount = Number((payload as ImagePayload | null)?.bytes) || 0;

  return {
    typeLabel: "Image",
    headline: `${format} image`,
    subheadline: width > 0 && height > 0
      ? `${width} × ${height} pixels`
      : "Supports image payload inspection and copy-ready debug JSON.",
    facts: [
      createFact("Size", width > 0 && height > 0 ? `${width}×${height}` : "Unknown"),
      createFact("Bytes", formatByteCount(byteCount))
    ]
  };
}

function buildPathReferenceDisplay(entries: unknown): DisplayInfo {
  const normalizedEntries = safeArray(entries) as PathEntry[];
  const firstEntry = normalizedEntries[0] ?? null;
  const folderCount = normalizedEntries.filter((entry) => (entry as PathEntry)?.kind === "folder").length;
  const fileCount = normalizedEntries.filter((entry) => (entry as PathEntry)?.kind === "file").length;

  return {
    typeLabel: "Path",
    headline: truncateText((firstEntry as PathEntry)?.displayName || (firstEntry as PathEntry)?.path || "Path reference item"),
    subheadline: normalizedEntries.length > 1
      ? `${normalizedEntries.length} entries selected`
      : "Supports file and folder reference payload inspection.",
    facts: [
      createFact("Files", String(fileCount)),
      createFact("Folders", String(folderCount))
    ]
  };
}

// ---- public API ----

// Two-param signature kept (callers in feature payload.ts files use this).
// §4 will introduce ContentEnvelope overload when feature migration happens.
export type CanonicalContentKind = "text" | "image" | "path_reference";

export function buildContentDisplay(contentKind: CanonicalContentKind, payload: ContentPayload): DisplayInfo {
  if (contentKind === "image") {
    return buildImageDisplay(payload as ImagePayload | null);
  }
  if (contentKind === "path_reference") {
    return buildPathReferenceDisplay((payload as PathRefPayload | null)?.entries);
  }
  return buildTextDisplay((payload as TextPayload | null)?.text);
}

interface ItemShape {
  type?: string;
  sourceAppID?: string;
  tags?: unknown[];
}

interface ContentShape {
  // Flat PluginContentEnvelope (text variant) — text is a sibling of kind.
  text?: string;
}

export function buildItemDisplay(item: unknown, content: unknown): DisplayInfo {
  const type = (item as ItemShape)?.type;
  const canonicalType: CanonicalContentKind =
    type === "path_reference" ? "path_reference" :
    type === "image" ? "image" : "text";

  const sourceAppID = String((item as ItemShape)?.sourceAppID ?? "");
  const tags = safeArray((item as ItemShape)?.tags);
  const baseDisplay: DisplayInfo = canonicalType === "text"
    ? buildTextDisplay((content as ContentShape)?.text)
    : canonicalType === "image"
      ? {
          typeLabel: "Image",
          headline: "Image item",
          subheadline: "Action runtime receives item snapshot only.",
          facts: []
        }
      : {
          typeLabel: "Path",
          headline: "Path reference item",
          subheadline: "Action runtime does not expose path entries directly.",
          facts: []
        };

  return {
    typeLabel: baseDisplay.typeLabel,
    headline: baseDisplay.headline,
    subheadline: baseDisplay.subheadline,
    facts: [
      ...baseDisplay.facts.slice(0, 2),
      createFact("Tags", String(tags.length)),
      createFact("Source", sourceAppID || "Unknown")
    ].slice(0, 4)
  };
}

export function mapContentKind(kind: unknown): CanonicalContentKind {
  if (kind === "path_reference") {
    return "path_reference";
  }
  if (kind === "pathReference") {
    throw new Error("Legacy content kind 'pathReference' is not supported. Use 'path_reference'.");
  }
  if (kind === "image") {
    return "image";
  }
  return "text";
}

export function mapItemType(type: unknown): CanonicalContentKind {
  if (type === "path_reference") {
    return "path_reference";
  }
  if (type === "pathReference") {
    throw new Error("Legacy item type 'pathReference' is not supported. Use 'path_reference'.");
  }
  if (type === "image") {
    return "image";
  }
  return "text";
}
