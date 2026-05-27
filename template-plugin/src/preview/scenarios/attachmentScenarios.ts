interface AttachmentScenarioFact {
  label: string;
  value: string;
}

interface AttachmentScenarioButton {
  id: string;
  title: string;
  isEnabled: boolean;
}

interface AttachmentScenarioInput {
  id: string;
  label: string;
  headline: string;
  subheadline: string;
  typeLabel: string;
  facts: AttachmentScenarioFact[];
  text: string;
  searchTerms?: string[];
  accentHex?: string;
  rendererID?: string;
  rendererComponent?: "compact" | "expanded";
  attachmentType?: string;
  payloadKind?: string;
  extended?: Record<string, unknown> | null;
  buttons?: AttachmentScenarioButton[];
}

export interface AttachmentScenarioBootstrap {
  pluginID: string;
  rendererID: string;
  item: {
    id: string;
    type: string;
    text: string;
    tags: string[];
    sourceAppID: string;
  };
  attachment: {
    owner: string;
    attachmentType: string;
    attachmentKey: string;
    payloadJson: string;
  };
  buttons: AttachmentScenarioButton[];
}

export interface AttachmentScenario {
  id: string;
  label: string;
  rendererComponent: "compact" | "expanded";
  searchTerms: string[];
  accentHex: string;
  bootstrap: AttachmentScenarioBootstrap;
}

interface AttachmentScenarioPayload {
  kind: string;
  version: number;
  contentKind: string;
  display: {
    typeLabel: string;
    headline: string;
    subheadline: string;
    facts: AttachmentScenarioFact[];
  };
  extended?: Record<string, unknown>;
}

function createAttachmentScenario({
  id,
  label,
  headline,
  subheadline,
  typeLabel,
  facts,
  text,
  searchTerms = [],
  accentHex = "#0f766e",
  rendererID = "template-renderer",
  rendererComponent = "compact",
  attachmentType = "plugin.template.full.preview",
  payloadKind = "template_preview",
  extended = null,
  buttons = [
    { id: "copy-payload-json", title: "Copy Payload", isEnabled: true },
    { id: "copy-renderer-context", title: "Copy Context", isEnabled: true }
  ]
}: AttachmentScenarioInput): AttachmentScenario {
  const display = { typeLabel, headline, subheadline, facts };
  const payload: AttachmentScenarioPayload = {
    kind: payloadKind,
    version: 2,
    contentKind: "text",
    display
  };
  if (extended) {
    payload.extended = extended;
  }

  return {
    id,
    label,
    rendererComponent,
    searchTerms,
    accentHex,
    bootstrap: {
      pluginID: "plugin.template.full",
      rendererID,
      item: {
        id: `item-${id}`,
        type: "text",
        text,
        tags: ["template-plugin"],
        sourceAppID: "com.preview.editor"
      },
      attachment: {
        owner: "plugin.template.full",
        attachmentType,
        attachmentKey: `preview-${id}`,
        payloadJson: JSON.stringify(payload)
      },
      buttons
    }
  };
}

export const attachmentScenarios: AttachmentScenario[] = [
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
  }),
  createAttachmentScenario({
    id: "expanded-preview",
    label: "Expanded (Dynamic Height)",
    headline: "Template expanded preview",
    subheadline: "Toggle Debug below to see pasty.window.autoFit drive pasty.window.setHeight as content grows.",
    typeLabel: "Text",
    facts: [
      { label: "Lines", value: "3" },
      { label: "Chars", value: "118" },
      { label: "Source", value: "Preview.app" },
      { label: "Tags", value: "1" }
    ],
    text: "Template expanded preview\nDemonstrates {min,max} height policy and bridge.theme.onChange().",
    accentHex: "#2563eb",
    rendererID: "template-expanded-renderer",
    rendererComponent: "expanded",
    attachmentType: "plugin.template.full.expanded",
    payloadKind: "template_expanded",
    extended: {
      contentKind: "text",
      sourceAppID: "com.preview.editor",
      tags: ["template-plugin", "expanded-demo"],
      text: "Template expanded preview\nDemonstrates the {min,max} height policy together with bridge.theme.onChange()."
    },
    buttons: [
      { id: "toggle-debug", title: "Toggle Debug", isEnabled: true },
      { id: "copy-debug-json", title: "Copy Debug", isEnabled: true }
    ]
  })
];
