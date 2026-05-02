const { definePlugin } = require("./sdk/definePlugin");
const { createTemplateDetector } = require("./detectors/templateDetector");
const { createTemplateRenderer } = require("./renderers/templateRenderer");
const { createTemplateAutoAction } = require("./actions/templateAutoAction");
const { createTemplateDraftAction } = require("./actions/templateDraftAction");

module.exports = definePlugin({
  setup() {
    return {
      attachmentRenderers: {
        "template-renderer": createTemplateRenderer()
      },
      detectors: {
        "template-detector": createTemplateDetector()
      },
      actions: {
        "template-auto-action": createTemplateAutoAction(),
        "template-draft-action": createTemplateDraftAction()
      }
    };
  }
});
