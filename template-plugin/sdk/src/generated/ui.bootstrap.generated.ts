// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts
import { createStream, createTopic, readWindowGlobal } from '../internal/topic.js';
import type { PluginAttachmentPayload, PluginClipboardItem, PluginThemeTokenSnapshot } from './data.generated.js';
import type { PluginActionHostInvokePayload, PluginAttachmentHostInvokePayload, PluginContextPayload } from './topicSubscribers.generated.js';
import { onActionHostInvoke, onAttachment, onAttachmentHostInvoke, onContext, onDraft, onItem, onTheme } from './topicSubscribers.generated.js';

export const _pluginContextTopic = createTopic<PluginContextPayload>(readWindowGlobal('__PASTY_PLUGIN_CONTEXT__'));

onContext((p) => _pluginContextTopic.set(p));

export const _itemTopic = createTopic<PluginClipboardItem>(readWindowGlobal('__PASTY_PLUGIN_ITEM__'));

onItem((p) => _itemTopic.set(p));

export const _itemAttachmentTopic = createTopic<PluginAttachmentPayload>(readWindowGlobal('__PASTY_PLUGIN_ATTACHMENT__'));

onAttachment((p) => _itemAttachmentTopic.set(p));

export const _actionDraftTopic = createTopic<Record<string, unknown>>(readWindowGlobal('__PASTY_PLUGIN_DRAFT__'));

onDraft((p) => _actionDraftTopic.set(p));

export const _themeTopic = createTopic<PluginThemeTokenSnapshot>(readWindowGlobal('__PASTY_PLUGIN_THEME__'));

onTheme((p) => _themeTopic.set(p));

export const _attachmentRendererOnHostInvokeStream = createStream<PluginAttachmentHostInvokePayload>();

onAttachmentHostInvoke((p) => _attachmentRendererOnHostInvokeStream.emit(p));

export const _actionOnHostInvokeStream = createStream<PluginActionHostInvokePayload>();

onActionHostInvoke((p) => _actionOnHostInvokeStream.emit(p));

export class PluginContextError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PluginContextError';
    }
}

export function guardContext<A extends unknown[], R>(
    expected: 'attachmentRenderer' | 'action',
    run: (...args: A) => R,
): (...args: A) => R {
    return (...args: A): R => {
        const current = _pluginContextTopic.current()?.mode;
        if (current !== expected) {
            throw new PluginContextError(
                `This verb is not available in the current plugin context ` +
                `(expected: ${expected}, got: ${current || 'unknown'})`
            );
        }
        return run(...args);
    };
}
