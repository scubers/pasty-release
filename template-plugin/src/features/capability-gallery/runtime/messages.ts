// RPC message contract for gallery UI ↔ runtime bridge.
// Each key corresponds to a host.* method we want to demonstrate at runtime
// scope (so the bounded-ui RuntimeBridgePanel can drive it via
// pasty.runtime.invoke({ key, payload })).

export const GALLERY_RPC_KEYS = {
  itemReadAttachment: "gallery.host.item.readAttachment",
  itemMaterializeImagePath: "gallery.host.item.materializeImagePath",
  itemSetTags: "gallery.host.item.setTags",
  itemAddTags: "gallery.host.item.addTags",
  itemRemoveTags: "gallery.host.item.removeTags",
  itemSetPinned: "gallery.host.item.setPinned",
  itemSetAttachments: "gallery.host.item.setAttachments",
  itemSetSearchExtension: "gallery.host.item.setSearchExtension",
  clipboardCopyText: "gallery.host.clipboard.copyText",
  navigationOpenUrl: "gallery.host.navigation.openUrl",
  navigationRevealInFinder: "gallery.host.navigation.revealInFinder",
  navigationOpenFilePath: "gallery.host.navigation.openFilePath",
  settingsGet: "gallery.host.settings.get",
  settingsGetAll: "gallery.host.settings.getAll",
  consoleLog: "gallery.host.console.log",
  copyImageFlow: "gallery.host.copyImageFlow",
} as const;

export type GalleryRpcKey = (typeof GALLERY_RPC_KEYS)[keyof typeof GALLERY_RPC_KEYS];

export interface GalleryRpcRequest {
  payload?: Record<string, unknown>;
}

export interface GalleryRpcResponse {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface GalleryCopyImageResponse {
  imageTempPath: string;
  imageFormatHint: string;
}
