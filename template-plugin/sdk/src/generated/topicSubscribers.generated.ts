// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts
import type { PluginAttachmentPayload, PluginClipboardItem, PluginThemeTokenSnapshot } from './data.generated.js';

export interface PluginContextPayload {
  mode: 'attachmentRenderer' | 'action';
  pluginID: string;
}
export function onContext(listener: (payload: PluginContextPayload) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as PluginContextPayload);
  globalThis.addEventListener('pasty-plugin-context', handler);
  return () => globalThis.removeEventListener('pasty-plugin-context', handler);
}
export function getContextSnapshot(): PluginContextPayload | undefined {
  return (globalThis as any)['__PASTY_PLUGIN_CONTEXT__'] as PluginContextPayload | undefined;
}

export function onItem(listener: (payload: PluginClipboardItem) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as PluginClipboardItem);
  globalThis.addEventListener('pasty-plugin-item', handler);
  return () => globalThis.removeEventListener('pasty-plugin-item', handler);
}
export function getItemSnapshot(): PluginClipboardItem | undefined {
  return (globalThis as any)['__PASTY_PLUGIN_ITEM__'] as PluginClipboardItem | undefined;
}

export function onAttachment(listener: (payload: PluginAttachmentPayload) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as PluginAttachmentPayload);
  globalThis.addEventListener('pasty-plugin-attachment', handler);
  return () => globalThis.removeEventListener('pasty-plugin-attachment', handler);
}
export function getAttachmentSnapshot(): PluginAttachmentPayload | undefined {
  return (globalThis as any)['__PASTY_PLUGIN_ATTACHMENT__'] as PluginAttachmentPayload | undefined;
}

export function onDraft(listener: (payload: Record<string, unknown>) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as Record<string, unknown>);
  globalThis.addEventListener('pasty-plugin-draft', handler);
  return () => globalThis.removeEventListener('pasty-plugin-draft', handler);
}
export function getDraftSnapshot(): Record<string, unknown> | undefined {
  return (globalThis as any)['__PASTY_PLUGIN_DRAFT__'] as Record<string, unknown> | undefined;
}

export function onTheme(listener: (payload: PluginThemeTokenSnapshot) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as PluginThemeTokenSnapshot);
  globalThis.addEventListener('pasty-plugin-theme', handler);
  return () => globalThis.removeEventListener('pasty-plugin-theme', handler);
}
export function getThemeSnapshot(): PluginThemeTokenSnapshot | undefined {
  return (globalThis as any)['__PASTY_PLUGIN_THEME__'] as PluginThemeTokenSnapshot | undefined;
}

export interface PluginAttachmentHostInvokePayload {
  buttonID: string;
}
export function onAttachmentHostInvoke(listener: (payload: PluginAttachmentHostInvokePayload) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as PluginAttachmentHostInvokePayload);
  globalThis.addEventListener('pasty-plugin-attachment-host-invoke', handler);
  return () => globalThis.removeEventListener('pasty-plugin-attachment-host-invoke', handler);
}

export interface PluginActionHostInvokePayload {
  buttonID: string;
}
export function onActionHostInvoke(listener: (payload: PluginActionHostInvokePayload) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as PluginActionHostInvokePayload);
  globalThis.addEventListener('pasty-plugin-action-host-invoke', handler);
  return () => globalThis.removeEventListener('pasty-plugin-action-host-invoke', handler);
}
