// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts

import type {
  PluginActionAllocateImageTempPathPayload,
  PluginActionAllocateImageTempPathResponse,
  PluginClipboardCopyTextPayload,
  PluginClipboardCopyTextResponse,
  PluginConsoleLogPayload,
  PluginConsoleLogResponse,
  PluginItemAddTagsPayload,
  PluginItemAddTagsResponse,
  PluginItemMaterializeImagePathResponse,
  PluginItemReadAttachmentPayload,
  PluginItemReadAttachmentResponse,
  PluginItemRemoveTagsPayload,
  PluginItemRemoveTagsResponse,
  PluginItemSetAttachmentsPayload,
  PluginItemSetAttachmentsResponse,
  PluginItemSetPinnedPayload,
  PluginItemSetPinnedResponse,
  PluginItemSetSearchExtensionPayload,
  PluginItemSetSearchExtensionResponse,
  PluginItemSetTagsPayload,
  PluginItemSetTagsResponse,
  PluginNavigationOpenFilePathPayload,
  PluginNavigationOpenFilePathResponse,
  PluginNavigationOpenUrlPayload,
  PluginNavigationOpenUrlResponse,
  PluginNavigationRevealInFinderPayload,
  PluginNavigationRevealInFinderResponse,
  PluginSettingsGetAllResponse,
  PluginSettingsGetPayload,
  PluginSettingsGetResponse,
} from './capabilityClients.generated.js';

export interface IPCBus {
  request<Req, Resp>(method: string, payload: Req): Promise<Resp>;
}

export interface HostClient {
  action: {
    allocateImageTempPath(payload: PluginActionAllocateImageTempPathPayload): Promise<PluginActionAllocateImageTempPathResponse>;
  };
  clipboard: {
    copyText(payload: PluginClipboardCopyTextPayload): Promise<PluginClipboardCopyTextResponse>;
  };
  console: {
    log(payload: PluginConsoleLogPayload): Promise<PluginConsoleLogResponse>;
  };
  item: {
    setTags(payload: PluginItemSetTagsPayload): Promise<PluginItemSetTagsResponse>;
    addTags(payload: PluginItemAddTagsPayload): Promise<PluginItemAddTagsResponse>;
    removeTags(payload: PluginItemRemoveTagsPayload): Promise<PluginItemRemoveTagsResponse>;
    setPinned(payload: PluginItemSetPinnedPayload): Promise<PluginItemSetPinnedResponse>;
    setAttachments(payload: PluginItemSetAttachmentsPayload): Promise<PluginItemSetAttachmentsResponse>;
    setSearchExtension(payload: PluginItemSetSearchExtensionPayload): Promise<PluginItemSetSearchExtensionResponse>;
    materializeImagePath(): Promise<PluginItemMaterializeImagePathResponse>;
    readAttachment(payload: PluginItemReadAttachmentPayload): Promise<PluginItemReadAttachmentResponse>;
  };
  navigation: {
    openUrl(payload: PluginNavigationOpenUrlPayload): Promise<PluginNavigationOpenUrlResponse>;
    revealInFinder(payload: PluginNavigationRevealInFinderPayload): Promise<PluginNavigationRevealInFinderResponse>;
    openFilePath(payload: PluginNavigationOpenFilePathPayload): Promise<PluginNavigationOpenFilePathResponse>;
  };
  settings: {
    get(payload: PluginSettingsGetPayload): Promise<PluginSettingsGetResponse>;
    getAll(): Promise<PluginSettingsGetAllResponse>;
  };
}

export function createHostClient(bus: IPCBus): HostClient {
  return {
    action: {
      allocateImageTempPath: (payload) => bus.request<PluginActionAllocateImageTempPathPayload, PluginActionAllocateImageTempPathResponse>('action.allocateImageTempPath', payload),
    },
    clipboard: {
      copyText: (payload) => bus.request<PluginClipboardCopyTextPayload, PluginClipboardCopyTextResponse>('clipboard.copyText', payload),
    },
    console: {
      log: (payload) => bus.request<PluginConsoleLogPayload, PluginConsoleLogResponse>('console.log', payload),
    },
    item: {
      setTags: (payload) => bus.request<PluginItemSetTagsPayload, PluginItemSetTagsResponse>('item.setTags', payload),
      addTags: (payload) => bus.request<PluginItemAddTagsPayload, PluginItemAddTagsResponse>('item.addTags', payload),
      removeTags: (payload) => bus.request<PluginItemRemoveTagsPayload, PluginItemRemoveTagsResponse>('item.removeTags', payload),
      setPinned: (payload) => bus.request<PluginItemSetPinnedPayload, PluginItemSetPinnedResponse>('item.setPinned', payload),
      setAttachments: (payload) => bus.request<PluginItemSetAttachmentsPayload, PluginItemSetAttachmentsResponse>('item.setAttachments', payload),
      setSearchExtension: (payload) => bus.request<PluginItemSetSearchExtensionPayload, PluginItemSetSearchExtensionResponse>('item.setSearchExtension', payload),
      materializeImagePath: () => bus.request<Record<string, never>, PluginItemMaterializeImagePathResponse>('item.materializeImagePath', {}),
      readAttachment: (payload) => bus.request<PluginItemReadAttachmentPayload, PluginItemReadAttachmentResponse>('item.readAttachment', payload),
    },
    navigation: {
      openUrl: (payload) => bus.request<PluginNavigationOpenUrlPayload, PluginNavigationOpenUrlResponse>('navigation.openUrl', payload),
      revealInFinder: (payload) => bus.request<PluginNavigationRevealInFinderPayload, PluginNavigationRevealInFinderResponse>('navigation.revealInFinder', payload),
      openFilePath: (payload) => bus.request<PluginNavigationOpenFilePathPayload, PluginNavigationOpenFilePathResponse>('navigation.openFilePath', payload),
    },
    settings: {
      get: (payload) => bus.request<PluginSettingsGetPayload, PluginSettingsGetResponse>('settings.get', payload),
      getAll: () => bus.request<Record<string, never>, PluginSettingsGetAllResponse>('settings.getAll', {}),
    },
  };
}
