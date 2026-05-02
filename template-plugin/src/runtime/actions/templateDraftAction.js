const { actionResult } = require("../sdk/results/actionResult");
const {
  buildActionExecutionSnapshot,
  buildItemDisplay,
  formatTemplateDebugJSON
} = require("../shared/templateCapabilityMetadata");

function normalizeTag(value) {
  return String(value?.stringValue || value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveInitialTitle(item) {
  const display = buildItemDisplay(item);
  return display.headline || "Template draft title";
}

function buildTags(item, draft) {
  return Array.from(
    new Set([
      ...(Array.isArray(item?.tags) ? item.tags : []),
      "template-plugin",
      normalizeTag(draft?.templateTag)
    ].filter(Boolean))
  );
}

function buildSessionSnapshot(input) {
  return {
    pluginID: input?.pluginID ?? "",
    actionID: input?.action?.actionID ?? "",
    action: input?.action ?? null,
    item: input?.item ?? null,
    displayName: "Template Draft Action",
    buttons: [
      { id: "copy-item-json", title: "Copy Item JSON", isEnabled: true },
      { id: "copy-session-json", title: "Copy Session JSON", isEnabled: true },
      { id: "copy-draft-json", title: "Copy Draft JSON", isEnabled: true },
      { id: "apply-metadata", title: "Apply Metadata", isEnabled: true }
    ],
    defaultButtonID: "apply-metadata"
  };
}

function createTemplateDraftAction() {
  return {
    async resolveSession(input) {
      const item = input?.item || {};
      return {
        displayName: "Template Draft Action",
        buttons: [
          { id: "copy-item-json", title: "Copy Item JSON", isEnabled: true },
          { id: "copy-session-json", title: "Copy Session JSON", isEnabled: true },
          { id: "copy-draft-json", title: "Copy Draft JSON", isEnabled: true },
          { id: "apply-metadata", title: "Apply Metadata", isEnabled: true }
        ],
        defaultButtonID: "apply-metadata",
        initialDraft: {
          title: resolveInitialTitle(item),
          templateTag: "template-plugin",
          shouldPin: false,
          note: "",
          __templateDebug: {
            sessionSnapshot: buildSessionSnapshot(input)
          }
        }
      };
    },

    async invokeOperation(input, ctx) {
      const trigger = input?.buttonID || "apply-metadata";
      const host = ctx?.host || {};
      const draft = input?.draft || {};
      const snapshot = buildActionExecutionSnapshot(input, ctx);

      if (trigger === "copy-item-json") {
        await host.clipboard.copyText(formatTemplateDebugJSON(input?.item ?? null));
        return actionResult.none({ userMessage: "Template item snapshot copied" });
      }

      if (trigger === "copy-session-json") {
        const sessionSnapshot = draft?.__templateDebug?.sessionSnapshot ?? null;
        await host.clipboard.copyText(
          formatTemplateDebugJSON({
            session: sessionSnapshot,
            execution: snapshot
          })
        );
        return actionResult.none({ userMessage: "Template action session copied" });
      }

      if (trigger === "copy-draft-json") {
        await host.clipboard.copyText(formatTemplateDebugJSON(draft));
        return actionResult.none({ userMessage: "Template draft copied" });
      }

      if (!host.capabilities?.canSetTags) {
        return actionResult.none({ userMessage: "Tag capability unavailable" });
      }

      const tags = buildTags(input?.item || {}, draft);
      await host.item.setTags(tags);

      const shouldPin = Boolean(draft?.shouldPin);
      if (shouldPin && host.capabilities?.canSetPinned) {
        await host.item.setPinned(true);
      }

      return actionResult.none({
        userMessage: shouldPin
          ? "Template metadata applied and pinned"
          : "Template metadata applied"
      });
    }
  };
}

module.exports = {
  createTemplateDraftAction
};
