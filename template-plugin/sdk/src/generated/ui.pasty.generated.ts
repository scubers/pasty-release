// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts
import { callActionComplete, callActionSetButtons, callAttachmentRendererSetButtons, callClipboardCopyText, callConsoleLog, callItemReadAttachment, callNavigationOpenFilePath, callNavigationOpenUrl, callNavigationRevealInFinder, callSettingsGet, callSettingsGetAll, callTextInputStateChanged, callWindowAutoFit, callWindowSetHeight } from './capabilityClients.generated.js';
import type { PluginActionCompletePayload, PluginActionCompleteResponse, PluginActionSetButtonsPayload, PluginActionSetButtonsResponse, PluginAttachmentRendererSetButtonsPayload, PluginAttachmentRendererSetButtonsResponse, PluginClipboardCopyTextPayload, PluginClipboardCopyTextResponse, PluginConsoleLogPayload, PluginConsoleLogResponse, PluginItemReadAttachmentPayload, PluginItemReadAttachmentResponse, PluginNavigationOpenFilePathPayload, PluginNavigationOpenFilePathResponse, PluginNavigationOpenUrlPayload, PluginNavigationOpenUrlResponse, PluginNavigationRevealInFinderPayload, PluginNavigationRevealInFinderResponse, PluginRuntimeInvokePayload, PluginSettingsGetAllResponse, PluginSettingsGetPayload, PluginSettingsGetResponse, PluginTextInputStateChangedPayload, PluginTextInputStateChangedResponse, PluginWindowAutoFitResponse, PluginWindowSetHeightPayload, PluginWindowSetHeightResponse } from './capabilityClients.generated.js';
import type { PluginAttachmentPayload, PluginClipboardItem, PluginThemeTokenSnapshot } from './data.generated.js';
import type { PluginActionHostInvokePayload, PluginAttachmentHostInvokePayload, PluginContextPayload } from './topicSubscribers.generated.js';
import { _actionDraftTopic, _actionOnHostInvokeStream, _attachmentRendererOnHostInvokeStream, _itemAttachmentTopic, _itemTopic, _pluginContextTopic, _themeTopic } from './ui.bootstrap.generated.js';
import { guardContext } from './ui.bootstrap.generated.js';
import { callRuntimeInvokeStrict } from '../internal/runtimeInvokeClient.js';

export const pasty = {
  runtime: {
    invoke: <TResp = unknown>(payload: PluginRuntimeInvokePayload): Promise<TResp> =>
      callRuntimeInvokeStrict(payload) as Promise<TResp>,
  },
  item: {
    current: (): PluginClipboardItem | undefined => _itemTopic.current(),
    on: (fn: (payload: PluginClipboardItem) => void) => _itemTopic.on(fn),
    readAttachment: (payload: PluginItemReadAttachmentPayload): Promise<PluginItemReadAttachmentResponse> =>
      callItemReadAttachment(payload),
    attachment: {
      current: (): PluginAttachmentPayload | undefined => _itemAttachmentTopic.current(),
      on: (fn: (payload: PluginAttachmentPayload) => void) => _itemAttachmentTopic.on(fn),
    },
  },
  clipboard: {
    copyText: (payload: PluginClipboardCopyTextPayload): Promise<PluginClipboardCopyTextResponse> =>
      callClipboardCopyText(payload),
  },
  navigation: {
    openUrl: (payload: PluginNavigationOpenUrlPayload): Promise<PluginNavigationOpenUrlResponse> =>
      callNavigationOpenUrl(payload),
    revealInFinder: (payload: PluginNavigationRevealInFinderPayload): Promise<PluginNavigationRevealInFinderResponse> =>
      callNavigationRevealInFinder(payload),
    openFilePath: (payload: PluginNavigationOpenFilePathPayload): Promise<PluginNavigationOpenFilePathResponse> =>
      callNavigationOpenFilePath(payload),
  },
  action: {
    setButtons: guardContext('action', (payload: PluginActionSetButtonsPayload): Promise<PluginActionSetButtonsResponse> =>
      callActionSetButtons(payload)),
    complete: guardContext('action', (payload: PluginActionCompletePayload): Promise<PluginActionCompleteResponse> =>
      callActionComplete(payload)),
    draft: {
      current: (): Record<string, unknown> | undefined => _actionDraftTopic.current(),
      on: (fn: (payload: Record<string, unknown>) => void) => _actionDraftTopic.on(fn),
    },
    onHostInvoke: {
      on: (fn: (payload: PluginActionHostInvokePayload) => void) => _actionOnHostInvokeStream.on(fn),
    },
  },
  attachmentRenderer: {
    setButtons: guardContext('attachmentRenderer', (payload: PluginAttachmentRendererSetButtonsPayload): Promise<PluginAttachmentRendererSetButtonsResponse> =>
      callAttachmentRendererSetButtons(payload)),
    onHostInvoke: {
      on: (fn: (payload: PluginAttachmentHostInvokePayload) => void) => _attachmentRendererOnHostInvokeStream.on(fn),
    },
  },
  window: {
    setHeight: (payload: PluginWindowSetHeightPayload): Promise<PluginWindowSetHeightResponse> =>
      callWindowSetHeight(payload),
    autoFit: (): Promise<PluginWindowAutoFitResponse> =>
      callWindowAutoFit(),
  },
  settings: {
    get: (payload: PluginSettingsGetPayload): Promise<PluginSettingsGetResponse> =>
      callSettingsGet(payload),
    getAll: (): Promise<PluginSettingsGetAllResponse> =>
      callSettingsGetAll(),
  },
  console: {
    log: (payload: PluginConsoleLogPayload): Promise<PluginConsoleLogResponse> =>
      callConsoleLog(payload),
  },
  textInput: {
    stateChanged: (payload: PluginTextInputStateChangedPayload): Promise<PluginTextInputStateChangedResponse> =>
      callTextInputStateChanged(payload),
  },
  pluginContext: {
    current: (): PluginContextPayload | undefined => _pluginContextTopic.current(),
    on: (fn: (payload: PluginContextPayload) => void) => _pluginContextTopic.on(fn),
  },
  theme: {
    current: (): PluginThemeTokenSnapshot | undefined => _themeTopic.current(),
    on: (fn: (payload: PluginThemeTokenSnapshot) => void) => _themeTopic.on(fn),
  },
};
