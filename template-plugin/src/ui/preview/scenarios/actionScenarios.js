function createActionScenario({
  id,
  label,
  title,
  itemText,
  draft,
  sourceAppID = "com.preview.editor"
}) {
  return {
    id,
    label,
    bootstrap: {
      pluginID: "plugin.template.full",
      actionID: "plugin.template.full.template-draft-action",
      item: {
        id: `action-item-${id}`,
        type: "text",
        text: itemText,
        tags: ["template-plugin"],
        sourceAppID
      },
      action: {
        id: "template-draft-action",
        actionID: "plugin.template.full.template-draft-action",
        title: "Template Draft Action",
        lifecycle: "draft",
        supportedItemTypes: ["text", "image", "path_reference"],
        keywords: ["template", "draft", "metadata", "copy"],
        uiEntry: "actions/template-draft-action/index.html",
        buttons: []
      },
      displayName: title,
      draft,
      buttons: [
        { id: "copy-item-json", title: "Copy Item JSON", isEnabled: true },
        { id: "copy-session-json", title: "Copy Session JSON", isEnabled: true },
        { id: "copy-draft-json", title: "Copy Draft JSON", isEnabled: true },
        { id: "apply-metadata", title: "Apply Metadata", isEnabled: true }
      ],
      defaultButtonID: "apply-metadata"
    }
  };
}

export const actionScenarios = [
  createActionScenario({
    id: "default-draft",
    label: "Default Draft",
    title: "Template Draft Action",
    itemText: "Template draft example",
    draft: {
      title: "Template draft example",
      templateTag: "template-plugin",
      note: "",
      shouldPin: false
    }
  }),
  createActionScenario({
    id: "prefilled-note",
    label: "Prefilled Note",
    title: "Release Metadata",
    itemText: "Release note snippet for plugin preview",
    draft: {
      title: "Release note snippet for plugin preview",
      templateTag: "release-note",
      note: "Carries the release summary into the tag workflow.",
      shouldPin: true
    }
  }),
  createActionScenario({
    id: "long-copy-buttons",
    label: "Long Content",
    title: "Template Draft Action",
    itemText: "This long item preview stresses the available vertical space in the draft action panel.",
    draft: {
      title: "This long item preview stresses the available vertical space in the draft action panel.",
      templateTag: "handoff-review",
      note: "Keep the draft readable even when the host chrome is present and the panel height stays fixed.",
      shouldPin: false
    }
  })
];
