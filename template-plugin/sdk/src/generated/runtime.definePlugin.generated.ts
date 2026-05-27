// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts
import type { PluginAttachmentRendererHandler, PluginAutoRunActionHandler, PluginDetectorHandler } from './runtime.handlers.generated.js';
import type { HostClient } from './hostClients.generated.js';

export interface MessageHandlerContext {
  host: HostClient;
}

export type MessageHandler<TReq = unknown, TResp = unknown> =
  (request: TReq, ctx: MessageHandlerContext) => Promise<TResp> | TResp;

export interface PluginRegistry {
  attachmentRenderers?: Record<string, PluginAttachmentRendererHandler>;
  detectors?: Record<string, PluginDetectorHandler>;
  actions?: Record<string, PluginAutoRunActionHandler>;
  messageHandlers?: Record<string, MessageHandler>;
}

export interface PluginSetup {
  setup(): PluginRegistry;
}

export function definePlugin(definition: PluginRegistry | PluginSetup): PluginSetup {
  if ('setup' in definition) {
    return {
      setup() {
        const registry = definition.setup();
        validateRegistry(registry);
        return registry;
      },
    };
  }
  validateRegistry(definition);
  return { setup() { return definition; } };
}

function validateRegistry(registry: PluginRegistry): void {
  for (const [id, handler] of Object.entries(registry.attachmentRenderers ?? {})) {
    if (handler && typeof handler === 'object' && 'invokeOperation' in handler) {
      throw new Error(`attachmentRenderers["${id}"]: invokeOperation has been removed.`);
    }
  }
  for (const [id, handler] of Object.entries(registry.actions ?? {})) {
    if (handler && typeof handler === 'object' && 'invokeOperation' in handler) {
      throw new Error(`actions["${id}"]: invokeOperation has been removed.`);
    }
  }
}
