// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts

import type { PluginActionResult, PluginAttachmentMutationEntry, PluginConsoleLogLevel, PluginSearchExtensionEntry } from './data.generated.js';

export interface PluginRuntimeInvokePayload {
  key: string;
  payload: unknown;
  timeoutMs?: number;
}
export interface PluginRuntimeInvokeResponse {
  response: unknown;
}
export interface PluginItemSetTagsPayload {
  tags: string[];
}
export interface PluginItemSetTagsResponse {
  tags: string[];
}
export interface PluginItemAddTagsPayload {
  tags: string[];
}
export interface PluginItemAddTagsResponse {
  tags: string[];
}
export interface PluginItemRemoveTagsPayload {
  tags: string[];
}
export interface PluginItemRemoveTagsResponse {
  tags: string[];
}
export interface PluginItemSetPinnedPayload {
  pinned: boolean;
}
export interface PluginItemSetPinnedResponse {
  pinned: boolean;
}
export interface PluginItemSetAttachmentsPayload {
  owner: string;
  attachmentType: string;
  attachments: PluginAttachmentMutationEntry[];
}
export interface PluginItemSetAttachmentsResponse {}
export interface PluginItemSetSearchExtensionPayload {
  scope: string;
  owner: string;
  entries: PluginSearchExtensionEntry[];
}
export interface PluginItemSetSearchExtensionResponse {}
export interface PluginItemMaterializeImagePathPayload {}
export interface PluginItemMaterializeImagePathResponse {
  path: string;
}
export interface PluginItemReadAttachmentPayload {
  attachmentType: string;
  attachmentKey: string;
}
export interface PluginItemReadAttachmentResponse {
  payloadJson?: string;
}
export interface PluginClipboardCopyTextPayload {
  text: string;
}
export interface PluginClipboardCopyTextResponse {}
export interface PluginNavigationOpenUrlPayload {
  url: string;
}
export interface PluginNavigationOpenUrlResponse {}
export interface PluginNavigationRevealInFinderPayload {
  path: string;
}
export interface PluginNavigationRevealInFinderResponse {}
export interface PluginNavigationOpenFilePathPayload {
  path: string;
}
export interface PluginNavigationOpenFilePathResponse {}
export interface PluginActionAllocateImageTempPathPayload {
  formatHint: string;
}
export interface PluginActionAllocateImageTempPathResponse {
  path: string;
}
export interface PluginActionSetButtonsPayload {
  buttons: { id: string; title: string; isEnabled?: boolean }[];
}
export interface PluginActionSetButtonsResponse {}
export interface PluginActionCompletePayload {
  result: PluginActionResult;
  userMessage?: string;
}
export interface PluginActionCompleteResponse {}
export interface PluginAttachmentRendererSetButtonsPayload {
  buttons: { id: string; title: string; isEnabled?: boolean }[];
}
export interface PluginAttachmentRendererSetButtonsResponse {}
export interface PluginWindowSetHeightPayload {
  height: number;
}
export interface PluginWindowSetHeightResponse {}
export interface PluginWindowAutoFitPayload {}
export interface PluginWindowAutoFitResponse {}
export interface PluginSettingsGetPayload {
  key: string;
}
export interface PluginSettingsGetResponse {
  value: unknown | null;
}
export interface PluginSettingsGetAllPayload {}
export interface PluginSettingsGetAllResponse {
  settings: Record<string, unknown>;
}
export interface PluginConsoleLogPayload {
  level: PluginConsoleLogLevel;
  message: string;
}
export interface PluginConsoleLogResponse {}
export interface PluginTextInputStateChangedPayload {
  isFocused: boolean;
  isComposing: boolean;
}
export interface PluginTextInputStateChangedResponse {}

export const CAPABILITY_METHOD_NAMES = [
  'runtime.invoke',
  'item.setTags',
  'item.addTags',
  'item.removeTags',
  'item.setPinned',
  'item.setAttachments',
  'item.setSearchExtension',
  'item.materializeImagePath',
  'item.readAttachment',
  'clipboard.copyText',
  'navigation.openUrl',
  'navigation.revealInFinder',
  'navigation.openFilePath',
  'action.allocateImageTempPath',
  'action.setButtons',
  'action.complete',
  'attachmentRenderer.setButtons',
  'window.setHeight',
  'window.autoFit',
  'settings.get',
  'settings.getAll',
  'console.log',
  'textInput.stateChanged',
] as const;
export type CapabilityMethodName = (typeof CAPABILITY_METHOD_NAMES)[number];

// NOTE: import path is anchored at the SDK consumer location
// (plugins/template-plugin/sdk/src/generated/). The mirrored copy in
// protocol/plugin/generated/ts/ is a diff-only artifact, not compiled in
// isolation.
import { parseReplyError } from '../internal/runtimeInvokeClient.js';

// Private helper
const HANDLER_NAME = 'pastyPluginCall';

// Fails loud: throws on missing handler ('PluginHostBridgeUnavailable') and
// on bridge-side rejections (decoded via parseReplyError, which restores the
// host's structured error name + data when wire uses STRUCTURED_ERROR_PREFIX).
// Callers that genuinely want fire-and-forget must catch explicitly.
async function callPluginMethod<T>(method: CapabilityMethodName, payload: unknown): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (globalThis as any).webkit?.messageHandlers?.[HANDLER_NAME];
  if (!handler) {
    const err = new Error('pasty.' + method + ' is only available inside a Pasty plugin WebView');
    err.name = 'PluginHostBridgeUnavailable';
    throw err;
  }
  const normalized = JSON.parse(JSON.stringify(payload));
  let reply: unknown;
  try {
    reply = await handler.postMessage({ method, payload: normalized });
  } catch (err) {
    throw parseReplyError(err);
  }
  return reply as T;
}

export const callRuntimeInvoke = (payload: PluginRuntimeInvokePayload): Promise<PluginRuntimeInvokeResponse> =>
  callPluginMethod<PluginRuntimeInvokeResponse>('runtime.invoke', payload);
export const callItemSetTags = (payload: PluginItemSetTagsPayload): Promise<PluginItemSetTagsResponse> =>
  callPluginMethod<PluginItemSetTagsResponse>('item.setTags', payload);
export const callItemAddTags = (payload: PluginItemAddTagsPayload): Promise<PluginItemAddTagsResponse> =>
  callPluginMethod<PluginItemAddTagsResponse>('item.addTags', payload);
export const callItemRemoveTags = (payload: PluginItemRemoveTagsPayload): Promise<PluginItemRemoveTagsResponse> =>
  callPluginMethod<PluginItemRemoveTagsResponse>('item.removeTags', payload);
export const callItemSetPinned = (payload: PluginItemSetPinnedPayload): Promise<PluginItemSetPinnedResponse> =>
  callPluginMethod<PluginItemSetPinnedResponse>('item.setPinned', payload);
export const callItemSetAttachments = (payload: PluginItemSetAttachmentsPayload): Promise<PluginItemSetAttachmentsResponse> =>
  callPluginMethod<PluginItemSetAttachmentsResponse>('item.setAttachments', payload);
export const callItemSetSearchExtension = (payload: PluginItemSetSearchExtensionPayload): Promise<PluginItemSetSearchExtensionResponse> =>
  callPluginMethod<PluginItemSetSearchExtensionResponse>('item.setSearchExtension', payload);
export const callItemMaterializeImagePath = (): Promise<PluginItemMaterializeImagePathResponse> =>
  callPluginMethod<PluginItemMaterializeImagePathResponse>('item.materializeImagePath', {});
export const callItemReadAttachment = (payload: PluginItemReadAttachmentPayload): Promise<PluginItemReadAttachmentResponse> =>
  callPluginMethod<PluginItemReadAttachmentResponse>('item.readAttachment', payload);
export const callClipboardCopyText = (payload: PluginClipboardCopyTextPayload): Promise<PluginClipboardCopyTextResponse> =>
  callPluginMethod<PluginClipboardCopyTextResponse>('clipboard.copyText', payload);
export const callNavigationOpenUrl = (payload: PluginNavigationOpenUrlPayload): Promise<PluginNavigationOpenUrlResponse> =>
  callPluginMethod<PluginNavigationOpenUrlResponse>('navigation.openUrl', payload);
export const callNavigationRevealInFinder = (payload: PluginNavigationRevealInFinderPayload): Promise<PluginNavigationRevealInFinderResponse> =>
  callPluginMethod<PluginNavigationRevealInFinderResponse>('navigation.revealInFinder', payload);
export const callNavigationOpenFilePath = (payload: PluginNavigationOpenFilePathPayload): Promise<PluginNavigationOpenFilePathResponse> =>
  callPluginMethod<PluginNavigationOpenFilePathResponse>('navigation.openFilePath', payload);
export const callActionAllocateImageTempPath = (payload: PluginActionAllocateImageTempPathPayload): Promise<PluginActionAllocateImageTempPathResponse> =>
  callPluginMethod<PluginActionAllocateImageTempPathResponse>('action.allocateImageTempPath', payload);
export const callActionSetButtons = (payload: PluginActionSetButtonsPayload): Promise<PluginActionSetButtonsResponse> =>
  callPluginMethod<PluginActionSetButtonsResponse>('action.setButtons', payload);
export const callActionComplete = (payload: PluginActionCompletePayload): Promise<PluginActionCompleteResponse> =>
  callPluginMethod<PluginActionCompleteResponse>('action.complete', payload);
export const callAttachmentRendererSetButtons = (payload: PluginAttachmentRendererSetButtonsPayload): Promise<PluginAttachmentRendererSetButtonsResponse> =>
  callPluginMethod<PluginAttachmentRendererSetButtonsResponse>('attachmentRenderer.setButtons', payload);
export const callWindowSetHeight = (payload: PluginWindowSetHeightPayload): Promise<PluginWindowSetHeightResponse> =>
  callPluginMethod<PluginWindowSetHeightResponse>('window.setHeight', payload);
export const callWindowAutoFit = (): Promise<PluginWindowAutoFitResponse> =>
  callPluginMethod<PluginWindowAutoFitResponse>('window.autoFit', {});
export const callSettingsGet = (payload: PluginSettingsGetPayload): Promise<PluginSettingsGetResponse> =>
  callPluginMethod<PluginSettingsGetResponse>('settings.get', payload);
export const callSettingsGetAll = (): Promise<PluginSettingsGetAllResponse> =>
  callPluginMethod<PluginSettingsGetAllResponse>('settings.getAll', {});
export const callConsoleLog = (payload: PluginConsoleLogPayload): Promise<PluginConsoleLogResponse> =>
  callPluginMethod<PluginConsoleLogResponse>('console.log', payload);
export const callTextInputStateChanged = (payload: PluginTextInputStateChangedPayload): Promise<PluginTextInputStateChangedResponse> =>
  callPluginMethod<PluginTextInputStateChangedResponse>('textInput.stateChanged', payload);
