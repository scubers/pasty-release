// src/shared/debug.ts
// Pure debug/snapshot utilities shared across features.
// See: openspec/changes/plugin-sdk-template-opt §3.2

export function formatTemplateDebugJSON(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

export function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

export function estimateBase64Bytes(base64Value: unknown): number {
  const normalized = String(base64Value ?? "").trim();
  if (!normalized) {
    return 0;
  }

  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

// ---- snapshot builders ----

interface CtxShape {
  request?: unknown;
  plugin?: unknown;
  capability?: unknown;
  host?: unknown;
}

interface InputShape {
  triggerSource?: unknown;
  buttonID?: unknown;
  item?: unknown;
  attachment?: unknown;
}

export function buildRendererCopySnapshot(
  input: InputShape,
  ctx: CtxShape,
  params: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    requestID: (ctx?.request as { id?: unknown } | null | undefined)?.id ?? null,
    pluginID: (ctx?.plugin as { id?: unknown } | null | undefined)?.id ?? null,
    capability: ctx?.capability ?? null,
    triggerSource: input?.triggerSource ?? null,
    buttonID: input?.buttonID ?? null,
    item: input?.item ?? null,
    attachment: input?.attachment ?? null,
    params: params ?? {},
    hostCapabilities: (ctx?.host as { capabilities?: unknown } | null | undefined)?.capabilities ?? {}
  };
}

export function buildActionExecutionSnapshot(
  input: InputShape,
  ctx: CtxShape
): Record<string, unknown> {
  return {
    requestID: (ctx?.request as { id?: unknown } | null | undefined)?.id ?? null,
    pluginID: (ctx?.plugin as { id?: unknown } | null | undefined)?.id ?? null,
    capability: ctx?.capability ?? null,
    triggerSource: input?.triggerSource ?? null,
    buttonID: input?.buttonID ?? null,
    item: input?.item ?? null,
    hostCapabilities: (ctx?.host as { capabilities?: unknown } | null | undefined)?.capabilities ?? {}
  };
}
