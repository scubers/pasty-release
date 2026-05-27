import { definePlugin } from "@pasty/plugin-sdk/runtime";
import type { PluginDetectorHandler, PluginDetectorInput, PluginDetectorArtifact } from "@pasty/plugin-sdk/runtime";
import { buildPreviewArtifact } from "./features/preview-renderer/detector";
import { createTemplatePreviewRenderer } from "./features/preview-renderer/renderer";
import { buildExpandedArtifact } from "./features/expanded-renderer/detector";
import { createTemplateExpandedRenderer } from "./features/expanded-renderer/renderer";
import {
  createTemplateAutoAction,
  createTemplateAutoActionTextOnly,
  createTemplateAutoActionImageOnly,
} from "./features/auto-action/action";
import { createGalleryDetector } from "./features/capability-gallery/runtime/detector";
import {
  createGalleryRendererFixed,
  createGalleryRendererAuto,
  createGalleryRendererBounded,
} from "./features/capability-gallery/runtime/renderers";
import {
  createAutoActionText,
  createAutoActionImage,
  createAutoActionNone,
} from "./features/capability-gallery/runtime/auto-actions";
import { createGalleryDraftAction, createGalleryMessageHandlers } from "./features/capability-gallery/runtime/draft-action";

function createCompositeDetector(): PluginDetectorHandler {
  return {
    async detect(input: PluginDetectorInput): Promise<PluginDetectorArtifact[]> {
      const out: PluginDetectorArtifact[] = [];
      // content is typed as unknown in DetectorInput (the catalog uses t.json() for
      // content fields). Cast to the concrete shape the payload builders expect.
      const typedInput = input as Parameters<typeof buildPreviewArtifact>[0];
      const a = buildPreviewArtifact(typedInput);
      if (a) out.push(a);
      const b = buildExpandedArtifact(typedInput);
      if (b) out.push(b);
      return out;
    },
  };
}

export default definePlugin({
  setup() {
    return {
      attachmentRenderers: {
        "template-renderer": createTemplatePreviewRenderer(),
        "template-expanded-renderer": createTemplateExpandedRenderer(),
        "gallery-renderer-fixed": createGalleryRendererFixed(),
        "gallery-renderer-auto": createGalleryRendererAuto(),
        "gallery-renderer-bounded": createGalleryRendererBounded(),
      },
      detectors: {
        "template-detector": createCompositeDetector(),
        "gallery-detector": createGalleryDetector(),
      },
      actions: {
        "template-auto-action": createTemplateAutoAction(),
        "template-auto-action-text": createTemplateAutoActionTextOnly(),
        "template-auto-action-image": createTemplateAutoActionImageOnly(),
        "gallery-auto-text": createAutoActionText(),
        "gallery-auto-image": createAutoActionImage(),
        "gallery-auto-none": createAutoActionNone(),
        "gallery-draft": createGalleryDraftAction(),
      },
      messageHandlers: {
        ...createGalleryMessageHandlers(),
      },
    };
  },
});
