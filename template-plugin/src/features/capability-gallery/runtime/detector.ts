// Gallery detector — emits 3 attachments per supported input kind so the
// host stage simultaneously surfaces all 3 attachmentRenderer height shapes
// (fixed / auto / bounded).
//
// IMPORTANT: the host treats (attachmentType, attachmentKey, payloadJson) as
// the identity for an attachment. Anything that varies between detector runs
// on the same item will look like "new data" to the host and re-trigger
// `detectUpdated`, which on this host implementation cascades into
// `syncAttachmentRenderArea` and wipes the renderer's UI-side
// `setButtons` override. Keep keys and payload fields stable per (item, kind).

import type { PluginDetectorHandler, PluginDetectorInput, PluginDetectorArtifact } from "@pasty/plugin-sdk/runtime";
import {
  GALLERY_ATTACHMENT_TYPES,
  encodeGalleryPayload,
  type GalleryAttachmentKind,
  type GalleryAttachmentPayload,
  type GalleryInputKind,
} from "./payloads.ts";

const CAPABILITY_LABELS: Record<GalleryAttachmentKind, string> = {
  fixed: "Gallery: fixed",
  auto: "Gallery: auto",
  bounded: "Gallery: bounded",
};

const CAPABILITY_SUMMARY: Record<GalleryAttachmentKind, string[]> = {
  fixed: ["item.attachment", "item.search", "theme", "attachmentRenderer.setButtons"],
  auto: ["pluginContext", "item", "no setHeight"],
  bounded: [
    "item.addTags", "item.setTags", "item.setPinned", "item.setAttachments",
    "item.setSearchExtension", "item.readAttachment", "item.materializeImagePath",
    "clipboard.copyText",
    "navigation.openUrl", "navigation.revealInFinder", "navigation.openFilePath",
    "window.setHeight", "window.autoFit",
    "settings.get", "settings.getAll",
    "console.log",
    "textInput.stateChanged",
    "runtime.invoke",
    "attachmentRenderer.setButtons",
  ],
};

function isSupported(contentKind: unknown): contentKind is GalleryInputKind {
  return contentKind === "text" || contentKind === "image" || contentKind === "path_reference";
}

function buildArtifact(kind: GalleryAttachmentKind, inputKind: GalleryInputKind): PluginDetectorArtifact {
  const capabilitiesShown = CAPABILITY_SUMMARY[kind];
  const payload: GalleryAttachmentPayload = {
    kind,
    title: CAPABILITY_LABELS[kind],
    inputKindSeen: inputKind,
    capabilityCount: capabilitiesShown.length,
    capabilitiesShown,
  };
  return {
    attachmentType: GALLERY_ATTACHMENT_TYPES[kind],
    attachmentKey: kind,
    payloadJson: encodeGalleryPayload(payload),
    searchProjection: {
      scope: `gallery_${kind}`,
      searchText: [CAPABILITY_LABELS[kind], inputKind, ...capabilitiesShown].join(" "),
      label: CAPABILITY_LABELS[kind],
    },
  };
}

export function createGalleryDetector(): PluginDetectorHandler {
  return {
    async detect(input: PluginDetectorInput): Promise<PluginDetectorArtifact[]> {
      const contentKind = (input?.content as { kind?: unknown } | null | undefined)?.kind;
      if (!isSupported(contentKind)) return [];
      return [
        buildArtifact("fixed", contentKind),
        buildArtifact("auto", contentKind),
        buildArtifact("bounded", contentKind),
      ];
    },
  };
}
