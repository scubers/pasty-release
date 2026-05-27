// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts

export interface PluginAttachmentMutationEntry {
  attachmentKey: string;
  payloadJson: string;
  syncScope: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface PluginSearchExtensionEntry {
  entryKey: string;
  searchText: string;
  label?: string;
  updatedAtMs?: number;
}

export interface PluginActionResultText {
  resultKind: 'text';
  text: string;
}

export interface PluginActionResultImage {
  resultKind: 'image';
  imageTempPath: string;
  imageFormatHint?: string;
}

export interface PluginActionResultNone {
  resultKind: 'none';
}

export type PluginActionResult = PluginActionResultText | PluginActionResultImage | PluginActionResultNone;

export type PluginConsoleLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface PluginClipboardItem {
  id: string;
  type: string;
  tags: string[];
  sourceAppID: string;
}

export interface PluginAttachmentEntry {
  historyID: string;
  owner: string;
  attachmentType: string;
  attachmentKey: string;
  payloadJson: string;
}

export interface PluginAttachmentPayload {
  item: PluginClipboardItem;
  attachment: PluginAttachmentEntry;
}

export interface PluginThemeTokens {
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentContrast: string;
  border: string;
  divider: string;
  success: string;
  warning: string;
  danger: string;
}

export interface PluginThemeTokenSnapshot {
  scheme: string;
  tokens: PluginThemeTokens;
}

export interface PluginPathEntry {
  kind: 'file' | 'folder';
  path: string;
  displayName: string;
}

export interface PluginContentEnvelopeText {
  kind: 'text';
  text: string;
}

export interface PluginContentEnvelopeImage {
  kind: 'image';
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface PluginContentEnvelopePath_reference {
  kind: 'path_reference';
  entries: PluginPathEntry[];
}

export type PluginContentEnvelope = PluginContentEnvelopeText | PluginContentEnvelopeImage | PluginContentEnvelopePath_reference;

export interface PluginAttachmentRef {
  attachmentType: string;
  attachmentKey: string;
}

export interface PluginResolveAttachmentInput {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
  attachments: PluginAttachmentRef[];
  attachment: PluginAttachmentEntry;
}

export interface PluginActionButton {
  id: string;
  title: string;
  isEnabled?: boolean;
}

export interface PluginAttachmentResolveResult {
  shouldDisplay?: boolean;
  displayName?: string;
  tintHex?: string;
  buttons?: PluginActionButton[];
}

export interface PluginDetectorInput {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
  attachments: PluginAttachmentRef[];
}

export interface PluginDetectorSearchProjection {
  scope: string;
  searchText: string;
  label?: string;
}

export interface PluginDetectorArtifact {
  attachmentType: string;
  attachmentKey: string;
  payloadJson: string;
  searchProjection?: PluginDetectorSearchProjection;
  attachmentSyncScope?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface PluginResolveActionSessionInput {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
  attachments: PluginAttachmentRef[];
}

export interface PluginActionResolveResult {
  displayName?: string;
  buttons: PluginActionButton[];
  defaultButtonID?: string;
  initialDraft: Record<string, unknown>;
}

export interface PluginAutoRunActionInput {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
  attachments: PluginAttachmentRef[];
}

export interface PluginActionOperationResult {
  result: PluginActionResult;
  userMessage?: string;
}
