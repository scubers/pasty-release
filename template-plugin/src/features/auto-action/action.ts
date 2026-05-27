// src/features/auto-action/action.ts
// Auto-run action variants for the template plugin.
// Migrated from src/runtime/actions/templateAutoAction.ts (§4d).

import { actionResult } from "@pasty/plugin-sdk/runtime";
import type {
  PluginAutoRunActionHandler,
  PluginAutoRunActionInput,
  PluginActionOperationResult,
  PluginActionResolveResult,
} from "@pasty/plugin-sdk/runtime";

// Template auto-run actions have no draft UI. After plugin-api-shrink (R13
// strict handler), PluginAutoRunActionHandler requires both methods; provide
// a minimal resolveSession stub the host never reads for auto-run lifecycle.
const autoRunResolveSessionStub = async (): Promise<PluginActionResolveResult> => ({
  buttons: [],
  initialDraft: {},
});
import {
  buildActionExecutionSnapshot,
  formatTemplateDebugJSON
} from "../../shared/debug.ts";
import { buildItemDisplay } from "../../shared/display.ts";

type CtxShape = Parameters<typeof buildActionExecutionSnapshot>[1];

function summarizeExecution(
  displayName: string,
  input: PluginAutoRunActionInput,
  ctx: unknown
): string {
  const display = buildItemDisplay(input?.item, input?.content);
  const snapshot = buildActionExecutionSnapshot(input as Parameters<typeof buildActionExecutionSnapshot>[0], ctx as CtxShape);
  return [
    displayName,
    `${display.typeLabel}: ${display.headline}`,
    display.subheadline,
    "",
    formatTemplateDebugJSON(snapshot)
  ].join("\n").trim();
}

function createAutoActionVariant({
  displayName,
  userMessage
}: {
  displayName: string;
  userMessage: string;
}): PluginAutoRunActionHandler {
  return {
    resolveSession: autoRunResolveSessionStub,
    async runAutoAction(input: PluginAutoRunActionInput, ctx: unknown): Promise<PluginActionOperationResult> {
      return actionResult.text(summarizeExecution(displayName, input, ctx), {
        userMessage
      });
    }
  };
}

export function createTemplateAutoAction(): PluginAutoRunActionHandler {
  return createAutoActionVariant({
    displayName: "Template Auto Action",
    userMessage: "Template action context ready"
  });
}

// Plugin Pro quota demo: paired with templateAutoActionTextOnly /
// templateAutoActionImageOnly, the manifest declares 4 actions in total. On
// free-tier hosts the action quota is 3, so PluginsSettingsView shows a 4/3
// chip and one action becomes gated — exercising the gating from commit
// 7b7bd286 ("Implement plugin pro quota gating").
export function createTemplateAutoActionTextOnly(): PluginAutoRunActionHandler {
  return createAutoActionVariant({
    displayName: "Template Auto Action (Text)",
    userMessage: "Template text-only action context ready"
  });
}

export function createTemplateAutoActionImageOnly(): PluginAutoRunActionHandler {
  return {
    resolveSession: autoRunResolveSessionStub,
    async runAutoAction(input: PluginAutoRunActionInput, ctx: unknown): Promise<PluginActionOperationResult> {
      const display = buildItemDisplay(input?.item, input?.content);
      const snapshot = buildActionExecutionSnapshot(input as Parameters<typeof buildActionExecutionSnapshot>[0], ctx as CtxShape);

      let imagePath: string | null = null;
      try {
        // P5: materializeImagePath returns { path: string } per catalog contract.
        const ctxAny = ctx as { host?: { item?: { materializeImagePath?: (p: Record<string, never>) => Promise<{ path: string }> } } } | null;
        const response = await ctxAny?.host?.item?.materializeImagePath?.({} as Record<string, never>);
        imagePath = typeof response?.path === "string" ? response.path : null;
      } catch {
        // host may not support verb — degrade gracefully
      }

      const lines = [
        "Template Auto Action (Image)",
        `${display.typeLabel}: ${display.headline}`,
        display.subheadline
      ];

      if (imagePath) {
        lines.push(`Image path: ${imagePath}`);
      }

      lines.push("", formatTemplateDebugJSON(snapshot));

      return actionResult.text(lines.join("\n").trim(), {
        userMessage: "Template image-only action context ready"
      });
    }
  };
}
