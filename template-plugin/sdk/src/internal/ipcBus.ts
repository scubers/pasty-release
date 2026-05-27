// Singleton IPC bus used by generated runtime code (runtime.host.generated.ts,
// runtime.definePlugin.generated.ts).
//
// Full implementation previously in runtime/internal/ipcBus.ts; moved here so
// generated code can import from a stable location.
//
// The bus instance is configured at startup by the plugin runtime entry point
// via configureIpcBus().  Generated code calls ipcBus.request() and
// ipcBus.onMethod() — those calls are safe after configuration.

import { internalConsole } from './internalConsole.js';

export interface IPCBusIO {
  write(line: string): void;
  onLine(handler: (line: string) => void): void;
}

export interface InboundHandler<Req, Resp> {
  (request: Req): Promise<Resp> | Resp;
}

export interface IPCBus {
  request<Req, Resp>(method: string, payload: Req): Promise<Resp>;
  onMethod<Req, Resp>(method: string, handler: InboundHandler<Req, Resp>): void;
  start(): void;
}

interface PendingEntry {
  resolve(value: unknown): void;
  reject(reason: unknown): void;
}

/**
 * Structured error frame shape (D6.1 upgrade). Old wire shape was `error: string`;
 * the bus now emits `error: { name, message, data? }` and accepts both shapes on
 * the inbound path. See docs/specs/2026-05-19-plugin-ui-to-runtime-rpc-design.md §7.
 */
export interface IPCBusErrorFrame {
  name: string;
  message: string;
  data?: unknown;
}

interface InboundFrame {
  id: string;
  method?: string;
  request?: unknown;
  response?: unknown;
  /** Legacy: bare string. New: structured `{name, message, data?}` object. */
  error?: string | IPCBusErrorFrame;
}

/**
 * Serialize a thrown value into the structured wire shape `{name, message, data?}`.
 * Preserves Error subclass `.name` and any `.data` payload custom Error
 * subclasses may carry. Non-Error throws collapse to `name: 'Error'`.
 */
export function serializeError(err: unknown): IPCBusErrorFrame {
  if (err instanceof Error) {
    const out: IPCBusErrorFrame = {
      name: err.name || 'Error',
      message: err.message,
    };
    const data = (err as Error & { data?: unknown }).data;
    if (data !== undefined) out.data = data;
    return out;
  }
  return { name: 'Error', message: String(err) };
}

/**
 * Reconstruct an Error from a wire-side error field. Accepts both the legacy
 * bare-string shape (older native runtime) and the new structured shape
 * (D6.1+). Custom Error subclass prototypes cannot be restored across the bus
 * — callers should branch on `err.name` and read `(err as any).data` for
 * business fields.
 */
export function deserializeError(raw: unknown): Error {
  // Legacy frame: error is a bare string.
  if (typeof raw === 'string') {
    return new Error(raw);
  }
  // New frame: { name, message, data? } object.
  if (raw && typeof raw === 'object') {
    const obj = raw as { name?: string; message?: string; data?: unknown };
    const err = new Error(obj.message ?? '');
    if (obj.name) err.name = obj.name;
    if (obj.data !== undefined) (err as Error & { data?: unknown }).data = obj.data;
    return err;
  }
  return new Error(String(raw));
}

export function createIPCBus(io: IPCBusIO): IPCBus {
  let counter = 0;
  let started = false;
  const pending = new Map<string, PendingEntry>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = new Map<string, InboundHandler<any, any>>();

  async function handleLine(line: string): Promise<void> {
    let frame: InboundFrame;
    try {
      frame = JSON.parse(line) as InboundFrame;
    } catch {
      internalConsole.error('[ipcBus] malformed JSON line:', line);
      return;
    }

    if (frame.method !== undefined) {
      // Inbound request from host
      const handler = methods.get(frame.method);
      if (!handler) {
        internalConsole.error('[ipcBus] no handler registered for method:', frame.method);
        const notFound = new Error(`no handler for ${frame.method}`);
        notFound.name = 'PluginRuntimeMethodNotFound';
        io.write(JSON.stringify({ id: frame.id, error: serializeError(notFound) }) + '\n');
        return;
      }
      try {
        const result = await handler(frame.request);
        io.write(JSON.stringify({ id: frame.id, response: result }) + '\n');
      } catch (err) {
        io.write(JSON.stringify({ id: frame.id, error: serializeError(err) }) + '\n');
      }
    } else {
      // Response to our outbound request
      const entry = pending.get(frame.id);
      if (!entry) {
        internalConsole.error('[ipcBus] unknown response id:', frame.id);
        return;
      }
      pending.delete(frame.id);
      if (frame.error !== undefined) {
        entry.reject(deserializeError(frame.error));
      } else {
        entry.resolve(frame.response);
      }
    }
  }

  return {
    request<Req, Resp>(method: string, payload: Req): Promise<Resp> {
      const id = `req-${++counter}`;
      return new Promise<Resp>((resolve, reject) => {
        pending.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });
        io.write(JSON.stringify({ id, method, request: payload }) + '\n');
      });
    },

    onMethod<Req, Resp>(method: string, handler: InboundHandler<Req, Resp>): void {
      if (methods.has(method)) {
        throw new Error(`[ipcBus] method already registered: ${method}`);
      }
      methods.set(method, handler);
    },

    start(): void {
      if (started) return;
      started = true;
      io.onLine((line) => {
        void handleLine(line);
      });
    },
  };
}

// eslint-disable-next-line prefer-const
let _instance: IPCBus | null = null;

/**
 * Configure the global IPC bus singleton.
 * Must be called once by the plugin runtime before any generated code runs.
 */
export function configureIpcBus(bus: IPCBus): void {
  _instance = bus;
}

/**
 * The global IPC bus singleton.
 * Access is proxied so callers can import `ipcBus` at module evaluation time
 * without requiring the bus to be configured yet.
 */
export const ipcBus: IPCBus = new Proxy({} as IPCBus, {
  get(_target, prop) {
    if (!_instance) {
      throw new Error('[pasty-plugin] ipcBus accessed before configureIpcBus() was called.');
    }
    return (_instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});
