const {
  buildTemplateAttachmentKey,
  buildTemplateSearchProjection,
  createTemplateAttachmentPayload
} = require("../shared/templateAttachmentPayload");

async function detectTemplateAttachment(input) {
  const payload = createTemplateAttachmentPayload(input);
  if (!payload) {
    return [];
  }

  return [
    {
      attachmentType: "plugin.template.full.preview",
      attachmentKey: 'primary',
      payloadJson: JSON.stringify(payload),
      searchProjection: buildTemplateSearchProjection(payload),
      attachmentSyncScope: "syncable"
    }
  ];
}

function createTemplateDetector() {
  return {
    async detect(input) {
      return {
        artifacts: await detectTemplateAttachment(input)
      };
    }
  };
}

module.exports = {
  createTemplateDetector,
  detectTemplateAttachment
};
