// Patch console.log/warn/error to forward to host console.log handler.
// Import and call patchConsole() explicitly at UI entry point.
// Moved from sdk/src/ui/internal/console.ts — same invariants apply.
import { callConsoleLog } from '../generated/capabilityClients.generated.js';
import type { PluginConsoleLogLevel } from '../generated/data.generated.js';
import { internalConsole } from '../internal/internalConsole.js';

let _patched = false;
let _inFlight = 0;

export function patchConsole(): void {
  if (_patched) return;
  _patched = true;

  const wrap = (level: PluginConsoleLogLevel, original: (...args: any[]) => void) => (...args: any[]) => {
    original(...args);
    if (_inFlight > 0) return;
    _inFlight++;
    Promise.resolve()
      .then(() => callConsoleLog({ level, message: args.map(String).join(' ') }))
      // Must swallow: this runs inside the patched console.log; letting the
      // throw propagate would break every plugin caller that uses console.log.
      // internalConsole is the frozen real console — safe to call here without
      // re-triggering this patch (no recursion).
      .catch((err: unknown) => {
        internalConsole.warn('[pasty-sdk] consolePatch: forward to host failed:', err);
      })
      .finally(() => { _inFlight--; });
  };

  console.log = wrap('info', internalConsole.log);
  console.warn = wrap('warn', internalConsole.warn);
  console.error = wrap('error', internalConsole.error);
}
