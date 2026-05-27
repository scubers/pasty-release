import type { PluginRuntimeInvokePayload, PluginRuntimeInvokeResponse } from '../generated/capabilityClients.generated.js';
import { STRUCTURED_ERROR_PREFIX } from '../generated/wireConstants.generated.js';

const HANDLER_NAME = 'pastyPluginCall';

export async function callRuntimeInvokeStrict(payload: PluginRuntimeInvokePayload): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (globalThis as any).webkit?.messageHandlers?.[HANDLER_NAME];
  if (!handler) {
    throw new Error('runtime.invoke is only available inside a Pasty plugin WebView');
  }
  const normalized = JSON.parse(JSON.stringify(payload));
  let reply: PluginRuntimeInvokeResponse;
  try {
    reply = (await handler.postMessage({ method: 'runtime.invoke', payload: normalized })) as PluginRuntimeInvokeResponse;
  } catch (err) {
    throw parseReplyError(err);
  }
  return reply?.response;
}

export function parseReplyError(raw: unknown): Error {
  const message = extractMessage(raw);
  if (message.startsWith(STRUCTURED_ERROR_PREFIX)) {
    const json = message.slice(STRUCTURED_ERROR_PREFIX.length);
    try {
      const parsed = JSON.parse(json) as { name?: unknown; message?: unknown; data?: unknown };
      const err = new Error(typeof parsed.message === 'string' ? parsed.message : '');
      if (typeof parsed.name === 'string' && parsed.name.length > 0) {
        err.name = parsed.name;
      }
      if (parsed.data !== undefined) {
        (err as Error & { data?: unknown }).data = parsed.data;
      }
      return err;
    } catch {
      // Malformed JSON after the prefix — fall through to plain message.
      return new Error(message);
    }
  }
  return new Error(message);
}

function extractMessage(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw instanceof Error) return raw.message;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    const m = (raw as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(raw);
}
