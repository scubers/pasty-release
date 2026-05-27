// Frozen snapshots of the real console, captured at module-load time.
//
// SDK internal error reporting MUST route through this module so that a
// dispatcher failure on the console.log capability never recurses through
// the patched globalThis.console (see docs/specs/2026-05-16-sdk-internal-
// console-isolation-design.md).
//
// Load-order invariant: any consumer that imports `internalConsole` causes
// this module's top-level body to evaluate first, before the patcher (in
// sdk/src/ui/internal/console.ts) replaces `globalThis.console.{log,warn,
// error}`. The bound functions captured here are therefore always the real
// console implementations.

type LogFn = (...args: unknown[]) => void;

function pick(method: 'log' | 'warn' | 'error'): LogFn {
  if (typeof globalThis === 'undefined') return () => {};
  const g = globalThis as { console?: Console };
  const fn = g.console?.[method];
  if (typeof fn !== 'function') return () => {};
  return fn.bind(g.console);
}

export const internalConsole = Object.freeze({
  log: pick('log'),
  warn: pick('warn'),
  error: pick('error'),
});
