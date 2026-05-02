function createAttachmentScenario({
  id,
  label,
  headline,
  subheadline,
  typeLabel,
  facts,
  text,
  searchTerms = [],
  accentHex = "#0f766e"
}) {
  return {
    id,
    label,
    searchTerms,
    accentHex,
    bootstrap: {
      pluginID: "plugin.template.full",
      rendererID: "template-renderer",
      item: {
        id: `item-${id}`,
        type: "text",
        text,
        tags: ["template-plugin"],
        sourceAppID: "com.preview.editor"
      },
      attachment: {
        owner: "plugin.template.full",
        attachmentType: "plugin.template.full.preview",
        attachmentKey: `preview-${id}`,
        payloadJson: JSON.stringify({
          kind: "template_preview",
          version: 2,
          contentKind: "text",
          display: {
            typeLabel,
            headline,
            subheadline,
            facts
          }
        })
      },
      buttons: [
        { id: "copy-payload-json", title: "Copy Payload", isEnabled: true },
        { id: "copy-renderer-context", title: "Copy Context", isEnabled: true }
      ]
    }
  };
}

export const attachmentScenarios = [
  createAttachmentScenario({
    id: "short-text",
    label: "Short Text",
    headline: "Template plugin preview",
    subheadline: "Supports compact payload inspection inside a fixed-height renderer.",
    typeLabel: "Text",
    facts: [
      { label: "Lines", value: "2" },
      { label: "Chars", value: "68" },
      { label: "Source", value: "Preview.app" }
    ],
    text: "Template plugin preview\nSupports compact payload inspection."
  }),
  createAttachmentScenario({
    id: "long-title",
    label: "Long Title",
    headline: "static func configure(_ webView: WKWebView) {",
    subheadline: "Stress-case for truncation, fixed facts, and stable action-strip ownership.",
    typeLabel: "Text",
    facts: [
      { label: "Lines", value: "1" },
      { label: "Chars", value: "45" },
      { label: "Scope", value: "Swift snippet" }
    ],
    text: "static func configure(_ webView: WKWebView) {",
    searchTerms: ["configure", "WKWebView"]
  }),
  createAttachmentScenario({
    id: "path-reference",
    label: "Path Reference",
    headline: "Quarterly Assets Bundle",
    subheadline: "Path reference payloads should still read clearly without requiring preview scrolling.",
    typeLabel: "Path",
    facts: [
      { label: "Entries", value: "4" },
      { label: "Folder", value: "/Users/demo/Desktop" },
      { label: "Source", value: "Finder" }
    ],
    text: "/Users/demo/Desktop/Quarterly Assets Bundle",
    accentHex: "#0f766e"
  })
];
