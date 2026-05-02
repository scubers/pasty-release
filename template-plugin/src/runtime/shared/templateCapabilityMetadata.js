function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function truncateText(value, maxLength = 72) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createFact(label, value) {
  return {
    label: String(label ?? ""),
    value: String(value ?? "")
  };
}

function mapContentKind(kind) {
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

function mapItemType(type) {
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

function estimateBase64Bytes(base64Value) {
  const normalized = String(base64Value ?? "").trim();
  if (!normalized) {
    return 0;
  }

  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function formatByteCount(byteCount) {
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

function buildTextDisplay(text) {
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

function buildImageDisplay(payload) {
  const width = Number(payload?.width) || 0;
  const height = Number(payload?.height) || 0;
  const format = String(payload?.format || "image").toUpperCase();
  const byteCount = estimateBase64Bytes(payload?.dataBase64);

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

function buildPathReferenceDisplay(entries) {
  const normalizedEntries = safeArray(entries);
  const firstEntry = normalizedEntries[0] || null;
  const folderCount = normalizedEntries.filter((entry) => entry?.kind === "folder").length;
  const fileCount = normalizedEntries.filter((entry) => entry?.kind === "file").length;

  return {
    typeLabel: "Path",
    headline: truncateText(firstEntry?.displayName || firstEntry?.path || "Path reference item"),
    subheadline: normalizedEntries.length > 1
      ? `${normalizedEntries.length} entries selected`
      : "Supports file and folder reference payload inspection.",
    facts: [
      createFact("Files", String(fileCount)),
      createFact("Folders", String(folderCount))
    ]
  };
}

function buildContentDisplay(contentKind, payload) {
  const canonicalKind = mapContentKind(contentKind);
  if (canonicalKind === "image") {
    return buildImageDisplay(payload);
  }
  if (canonicalKind === "path_reference") {
    return buildPathReferenceDisplay(payload?.entries);
  }
  return buildTextDisplay(payload?.text);
}

function buildItemDisplay(item) {
  const canonicalType = mapItemType(item?.type);
  const sourceAppID = String(item?.sourceAppID || "");
  const tags = safeArray(item?.tags);
  const baseDisplay = canonicalType === "text"
    ? buildTextDisplay(item?.text)
    : canonicalType === "image"
      ? {
          typeLabel: "Image",
          headline: "Image item",
          subheadline: truncateText(item?.text || "Action runtime receives item snapshot only."),
          facts: []
        }
      : {
          typeLabel: "Path",
          headline: "Path reference item",
          subheadline: truncateText(item?.text || "Action runtime does not expose path entries directly."),
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

function formatTemplateDebugJSON(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function buildRendererCopySnapshot(input, ctx, params = {}) {
  return {
    requestID: ctx?.request?.id ?? null,
    pluginID: ctx?.plugin?.id ?? null,
    capability: ctx?.capability ?? null,
    triggerSource: input?.triggerSource ?? null,
    buttonID: input?.buttonID ?? null,
    item: input?.item ?? null,
    attachment: input?.attachment ?? null,
    params: params ?? {},
    hostCapabilities: ctx?.host?.capabilities ?? {}
  };
}

function buildActionExecutionSnapshot(input, ctx) {
  return {
    requestID: ctx?.request?.id ?? null,
    pluginID: ctx?.plugin?.id ?? null,
    capability: ctx?.capability ?? null,
    triggerSource: input?.triggerSource ?? null,
    buttonID: input?.buttonID ?? null,
    item: input?.item ?? null,
    draft: input?.draft ?? {},
    hostCapabilities: ctx?.host?.capabilities ?? {}
  };
}

function buildSearchText(payload) {
  const facts = safeArray(payload?.display?.facts)
    .map((fact) => `${fact?.label || ""} ${fact?.value || ""}`.trim())
    .filter(Boolean);
  return [payload?.display?.headline, payload?.display?.subheadline, ...facts]
    .filter(Boolean)
    .join(" ");
}

module.exports = {
  buildActionExecutionSnapshot,
  buildContentDisplay,
  buildItemDisplay,
  buildRendererCopySnapshot,
  buildSearchText,
  cloneJSON,
  formatByteCount,
  formatTemplateDebugJSON,
  mapContentKind,
  mapItemType,
  normalizeText
};
