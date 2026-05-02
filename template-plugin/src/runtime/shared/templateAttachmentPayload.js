const {
  buildContentDisplay,
  buildSearchText,
  cloneJSON,
  mapContentKind
} = require("./templateCapabilityMetadata");

function buildTemplateAttachmentKey(payload) {
  const slug = String(payload?.display?.headline || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `template-preview-${slug || "item"}`;
}

function createTemplateAttachmentPayload(input) {
  const contentKind = mapContentKind(input?.content?.kind);
  const contentPayload = input?.content?.payload ?? null;
  const display = buildContentDisplay(contentKind, contentPayload);
  if (!display?.headline) {
    return null;
  }

  return {
    kind: "template_preview",
    version: 2,
    contentKind,
    display,
    debug: {
      item: cloneJSON(input?.item),
      content: cloneJSON(input?.content)
    }
  };
}

function decodeTemplateAttachmentPayload(payloadJson) {
  try {
    const parsed = JSON.parse(payloadJson || "{}");
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
      version: Number(parsed.version) || 1,
      contentKind: parsed.contentKind,
      display: {
        typeLabel: String(parsed.display.typeLabel || ""),
        headline: String(parsed.display.headline || ""),
        subheadline: String(parsed.display.subheadline || ""),
        facts: Array.isArray(parsed.display.facts)
          ? parsed.display.facts.map((fact) => ({
              label: String(fact?.label || ""),
              value: String(fact?.value || "")
            }))
          : []
      },
      debug: typeof parsed.debug === "object" && parsed.debug !== null
        ? parsed.debug
        : {
            item: null,
            content: null
          }
    };
  } catch {
    return null;
  }
}

function formatTemplateAttachmentPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

function buildTemplateSearchProjection(payload) {
  const searchText = buildSearchText(payload);
  if (!searchText.trim()) {
    return null;
  }

  return {
    scope: "template_preview",
    searchText,
    label: payload?.display?.typeLabel || "Template"
  };
}

module.exports = {
  buildTemplateSearchProjection,
  buildTemplateAttachmentKey,
  createTemplateAttachmentPayload,
  decodeTemplateAttachmentPayload,
  formatTemplateAttachmentPayload
};
