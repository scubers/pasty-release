// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts
import type { PluginActionOperationResult, PluginActionResolveResult, PluginAttachmentResolveResult, PluginAutoRunActionInput, PluginDetectorArtifact, PluginDetectorInput, PluginResolveActionSessionInput, PluginResolveAttachmentInput } from './data.generated.js';
import type { HostClient } from './hostClients.generated.js';

export interface PluginAttachmentRendererHandler {
  resolveAttachment(input: PluginResolveAttachmentInput, ctx?: { host?: HostClient }): Promise<PluginAttachmentResolveResult>;
}

export interface PluginDetectorHandler {
  detect(input: PluginDetectorInput, ctx?: { host?: HostClient }): Promise<PluginDetectorArtifact[]>;
}

export interface PluginAutoRunActionHandler {
  resolveSession(input: PluginResolveActionSessionInput, ctx?: { host?: HostClient }): Promise<PluginActionResolveResult>;
  runAutoAction(input: PluginAutoRunActionInput, ctx?: { host?: HostClient }): Promise<PluginActionOperationResult>;
}
