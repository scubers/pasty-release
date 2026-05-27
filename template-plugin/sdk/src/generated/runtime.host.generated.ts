// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts
import type { PluginActionAllocateImageTempPathPayload, PluginActionAllocateImageTempPathResponse, PluginClipboardCopyTextPayload, PluginClipboardCopyTextResponse, PluginConsoleLogPayload, PluginConsoleLogResponse, PluginItemAddTagsPayload, PluginItemAddTagsResponse, PluginItemMaterializeImagePathResponse, PluginItemReadAttachmentPayload, PluginItemReadAttachmentResponse, PluginItemRemoveTagsPayload, PluginItemRemoveTagsResponse, PluginItemSetAttachmentsPayload, PluginItemSetAttachmentsResponse, PluginItemSetPinnedPayload, PluginItemSetPinnedResponse, PluginItemSetSearchExtensionPayload, PluginItemSetSearchExtensionResponse, PluginItemSetTagsPayload, PluginItemSetTagsResponse, PluginNavigationOpenFilePathPayload, PluginNavigationOpenFilePathResponse, PluginNavigationOpenUrlPayload, PluginNavigationOpenUrlResponse, PluginNavigationRevealInFinderPayload, PluginNavigationRevealInFinderResponse, PluginSettingsGetAllResponse, PluginSettingsGetPayload, PluginSettingsGetResponse } from './capabilityClients.generated.js';
import { ipcBus } from '../internal/ipcBus.js';

export const host = {
  item: {
    setTags: (payload: PluginItemSetTagsPayload): Promise<PluginItemSetTagsResponse> =>
      ipcBus.request('item.setTags', payload),
    addTags: (payload: PluginItemAddTagsPayload): Promise<PluginItemAddTagsResponse> =>
      ipcBus.request('item.addTags', payload),
    removeTags: (payload: PluginItemRemoveTagsPayload): Promise<PluginItemRemoveTagsResponse> =>
      ipcBus.request('item.removeTags', payload),
    setPinned: (payload: PluginItemSetPinnedPayload): Promise<PluginItemSetPinnedResponse> =>
      ipcBus.request('item.setPinned', payload),
    setAttachments: (payload: PluginItemSetAttachmentsPayload): Promise<PluginItemSetAttachmentsResponse> =>
      ipcBus.request('item.setAttachments', payload),
    setSearchExtension: (payload: PluginItemSetSearchExtensionPayload): Promise<PluginItemSetSearchExtensionResponse> =>
      ipcBus.request('item.setSearchExtension', payload),
    materializeImagePath: (): Promise<PluginItemMaterializeImagePathResponse> =>
      ipcBus.request('item.materializeImagePath', {}),
    readAttachment: (payload: PluginItemReadAttachmentPayload): Promise<PluginItemReadAttachmentResponse> =>
      ipcBus.request('item.readAttachment', payload),
  },
  clipboard: {
    copyText: (payload: PluginClipboardCopyTextPayload): Promise<PluginClipboardCopyTextResponse> =>
      ipcBus.request('clipboard.copyText', payload),
  },
  navigation: {
    openUrl: (payload: PluginNavigationOpenUrlPayload): Promise<PluginNavigationOpenUrlResponse> =>
      ipcBus.request('navigation.openUrl', payload),
    revealInFinder: (payload: PluginNavigationRevealInFinderPayload): Promise<PluginNavigationRevealInFinderResponse> =>
      ipcBus.request('navigation.revealInFinder', payload),
    openFilePath: (payload: PluginNavigationOpenFilePathPayload): Promise<PluginNavigationOpenFilePathResponse> =>
      ipcBus.request('navigation.openFilePath', payload),
  },
  action: {
    allocateImageTempPath: (payload: PluginActionAllocateImageTempPathPayload): Promise<PluginActionAllocateImageTempPathResponse> =>
      ipcBus.request('action.allocateImageTempPath', payload),
  },
  settings: {
    get: (payload: PluginSettingsGetPayload): Promise<PluginSettingsGetResponse> =>
      ipcBus.request('settings.get', payload),
    getAll: (): Promise<PluginSettingsGetAllResponse> =>
      ipcBus.request('settings.getAll', {}),
  },
  console: {
    log: (payload: PluginConsoleLogPayload): Promise<PluginConsoleLogResponse> =>
      ipcBus.request('console.log', payload),
  },
};
