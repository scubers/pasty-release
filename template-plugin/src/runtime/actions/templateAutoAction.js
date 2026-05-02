const { actionResult } = require("../sdk/results/actionResult");
const {
  buildActionExecutionSnapshot,
  buildItemDisplay,
  formatTemplateDebugJSON
} = require("../shared/templateCapabilityMetadata");

function summarizeExecution(input, ctx) {
  const display = buildItemDisplay(input?.item);
  const snapshot = buildActionExecutionSnapshot(input, ctx);
  return [
    "Template Auto Action",
    `${display.typeLabel}: ${display.headline}`,
    display.subheadline,
    "",
    formatTemplateDebugJSON(snapshot)
  ].join("\n").trim();
}

function createTemplateAutoAction() {
  return {
    async resolveSession() {
      return {
        displayName: "Template Auto Action",
        buttons: [],
        defaultButtonID: null,
        initialDraft: {}
      };
    },

    async invokeOperation(input, ctx) {
      return actionResult.text(summarizeExecution(input, ctx), {
        userMessage: "Template action context ready"
      });
    }
  };
}

module.exports = {
  createTemplateAutoAction
};
