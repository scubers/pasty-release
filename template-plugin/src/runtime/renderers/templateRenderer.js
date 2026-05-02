const { rendererResult } = require("../sdk/results/rendererResult");
const {
  decodeTemplateAttachmentPayload,
  formatTemplateAttachmentPayload
} = require("../shared/templateAttachmentPayload");
const {
  buildRendererCopySnapshot,
  formatTemplateDebugJSON
} = require("../shared/templateCapabilityMetadata");

function resolveAttachment(input) {
  const payload = decodeTemplateAttachmentPayload(input?.attachment?.payloadJson);
  if (!payload) {
    return {
      displayName: "Template Preview",
      tintHex: "#6B7280",
      buttons: [
        { id: "copy-payload-json", title: "Copy Payload", isEnabled: false },
        { id: "copy-renderer-context", title: "Copy Context", isEnabled: false }
      ]
    };
  }

  return {
    displayName: `Template Preview · ${payload.display.headline}`,
    tintHex: "#0F766E",
    buttons: [
      { id: "copy-payload-json", title: "Copy Payload", isEnabled: true },
      { id: "copy-renderer-context", title: "Copy Context", isEnabled: true }
    ]
  };
}

async function invokeOperation(input, ctx) {
  const payload = decodeTemplateAttachmentPayload(input?.attachment?.payloadJson);
  if (!payload) {
    return rendererResult.failure("Invalid template payload");
  }

  if (input.buttonID === "copy-payload-json") {
    await ctx.host.clipboard.copyText(formatTemplateAttachmentPayload(payload));
    return rendererResult.success({ userMessage: "Template payload copied" });
  }

  if (input.buttonID === "copy-renderer-context") {
    await ctx.host.clipboard.copyText(
      formatTemplateDebugJSON(
        buildRendererCopySnapshot(input, ctx, input?.params ?? {})
      )
    );
    return rendererResult.success({ userMessage: "Template renderer context copied" });
  }

  return rendererResult.success();
}

function createTemplateRenderer() {
  return {
    async resolveAttachment(input, ctx) {
      return resolveAttachment(input, ctx);
    },
    async invokeOperation(input, ctx) {
      return invokeOperation(input, ctx);
    }
  };
}

module.exports = {
  createTemplateRenderer,
  invokeOperation,
  resolveAttachment
};
