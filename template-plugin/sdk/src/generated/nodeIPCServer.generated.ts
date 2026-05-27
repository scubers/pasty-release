// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate via `cd protocol/plugin && npm run codegen`.
// Source contract: protocol/plugin/src/catalog.ts

import { createInterface, type Interface } from 'node:readline';
import type { PluginActionOperationResult, PluginActionResolveResult, PluginAttachmentResolveResult, PluginAutoRunActionInput, PluginDetectorArtifact, PluginDetectorInput, PluginResolveActionSessionInput, PluginResolveAttachmentInput } from './data.generated.js';

export interface PluginRuntimeUserRPCRequest {
  key: string;
  payload: unknown;
}
export interface PluginRuntimeUserRPCResponse {
  result: unknown;
}
export interface PluginRuntimeInvokeRendererRequest {
  requestID: string;
  rendererID: string;
  input: PluginResolveAttachmentInput;
}
export interface PluginRuntimeInvokeRendererResponse {
  requestID: string;
  result?: PluginAttachmentResolveResult;
  errorMessage?: string;
}
export interface PluginRuntimeInvokeDetectorRequest {
  requestID: string;
  detectorID: string;
  input: PluginDetectorInput;
}
export interface PluginRuntimeInvokeDetectorResponse {
  requestID: string;
  result?: PluginDetectorArtifact[];
  errorMessage?: string;
}
export interface PluginRuntimeInvokeActionRequest {
  requestID: string;
  actionID: string;
  input: PluginResolveActionSessionInput;
}
export interface PluginRuntimeInvokeActionResponse {
  requestID: string;
  result?: PluginActionResolveResult;
  errorMessage?: string;
}
export interface PluginRuntimeInvokeActionAutoRunRequest {
  requestID: string;
  actionID: string;
  input: PluginAutoRunActionInput;
}
export interface PluginRuntimeInvokeActionAutoRunResponse {
  requestID: string;
  result?: PluginActionOperationResult;
  errorMessage?: string;
}
export interface PluginRuntimeReadyRequest {}
export interface PluginRuntimeReadyResponse {}

export interface NodeIPCHandler {
  runtimeUserRPC(req: PluginRuntimeUserRPCRequest): Promise<PluginRuntimeUserRPCResponse>;
  runtimeInvokeRenderer(req: PluginRuntimeInvokeRendererRequest): Promise<PluginRuntimeInvokeRendererResponse>;
  runtimeInvokeDetector(req: PluginRuntimeInvokeDetectorRequest): Promise<PluginRuntimeInvokeDetectorResponse>;
  runtimeInvokeAction(req: PluginRuntimeInvokeActionRequest): Promise<PluginRuntimeInvokeActionResponse>;
  runtimeInvokeActionAutoRun(req: PluginRuntimeInvokeActionAutoRunRequest): Promise<PluginRuntimeInvokeActionAutoRunResponse>;
  runtimeReady(req: PluginRuntimeReadyRequest): Promise<PluginRuntimeReadyResponse>;
}

export interface NodeIPCReadable {
  on(event: 'data', listener: (chunk: Buffer | string) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
  [Symbol.asyncIterator]?(): AsyncIterableIterator<Buffer | string>;
}
export interface NodeIPCWritable {
  write(chunk: string): boolean;
}
export interface NodeIPCServerIO {
  stdin: NodeIPCReadable;
  stdout: NodeIPCWritable;
}

interface IPCBusErrorFrame {
  name: string;
  message: string;
  data?: unknown;
}

// Structured error frame serializer (D6.1). Mirrors src/internal/ipcBus.ts.
function serializeError(err: unknown): IPCBusErrorFrame {
  if (err instanceof Error) {
    const out: IPCBusErrorFrame = { name: err.name || 'Error', message: err.message };
    const data = (err as Error & { data?: unknown }).data;
    if (data !== undefined) out.data = data;
    return out;
  }
  return { name: 'Error', message: String(err) };
}
function writeResponse(io: NodeIPCServerIO, id: unknown, response: unknown): void {
  io.stdout.write(JSON.stringify({ id, response }) + '\n');
}
function writeError(io: NodeIPCServerIO, id: unknown, err: unknown): void {
  io.stdout.write(JSON.stringify({ id, error: serializeError(err) }) + '\n');
}

export function startNodeIPCServer(handler: NodeIPCHandler, io: NodeIPCServerIO = { stdin: process.stdin as unknown as NodeIPCReadable, stdout: process.stdout as unknown as NodeIPCWritable }): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rl: Interface = createInterface({ input: io.stdin as any, crlfDelay: Infinity });
  rl.on('line', async (line: string) => {
    if (!line) return;
    let frame: { id: unknown; method: string; request: unknown } | undefined;
    try {
      frame = JSON.parse(line) as { id: unknown; method: string; request: unknown };
    } catch (err) {
      const parseErr = new Error('IPC frame parse failed: ' + (err instanceof Error ? err.message : String(err)));
      parseErr.name = 'PluginRuntimeFrameParseError';
      writeError(io, null, parseErr);
      return;
    }
    const method = frame.method;
    switch (method) {
        case 'runtime.userRPC': {
          try {
            const resp = await handler.runtimeUserRPC(frame.request as PluginRuntimeUserRPCRequest);
            writeResponse(io, frame.id, resp);
          } catch (handlerErr) {
            writeError(io, frame.id, handlerErr);
          }
          return;
        }
        case 'runtime.invokeRenderer': {
          try {
            const resp = await handler.runtimeInvokeRenderer(frame.request as PluginRuntimeInvokeRendererRequest);
            writeResponse(io, frame.id, resp);
          } catch (handlerErr) {
            writeError(io, frame.id, handlerErr);
          }
          return;
        }
        case 'runtime.invokeDetector': {
          try {
            const resp = await handler.runtimeInvokeDetector(frame.request as PluginRuntimeInvokeDetectorRequest);
            writeResponse(io, frame.id, resp);
          } catch (handlerErr) {
            writeError(io, frame.id, handlerErr);
          }
          return;
        }
        case 'runtime.invokeAction': {
          try {
            const resp = await handler.runtimeInvokeAction(frame.request as PluginRuntimeInvokeActionRequest);
            writeResponse(io, frame.id, resp);
          } catch (handlerErr) {
            writeError(io, frame.id, handlerErr);
          }
          return;
        }
        case 'runtime.invokeActionAutoRun': {
          try {
            const resp = await handler.runtimeInvokeActionAutoRun(frame.request as PluginRuntimeInvokeActionAutoRunRequest);
            writeResponse(io, frame.id, resp);
          } catch (handlerErr) {
            writeError(io, frame.id, handlerErr);
          }
          return;
        }
        case 'runtime.ready': {
          try {
            const resp = await handler.runtimeReady(frame.request as PluginRuntimeReadyRequest);
            writeResponse(io, frame.id, resp);
          } catch (handlerErr) {
            writeError(io, frame.id, handlerErr);
          }
          return;
        }
        default: {
          const unknownMethod = new Error('Unknown method: ' + method);
          unknownMethod.name = 'PluginRuntimeMethodNotFound';
          (unknownMethod as Error & { data?: unknown }).data = { method };
          writeError(io, frame.id ?? null, unknownMethod);
        }
    }
  });
}
