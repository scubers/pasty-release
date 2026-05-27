// Listen to focus/composition events and post textInput.stateChanged to host.
// Import and call patchTextInputState() explicitly at UI entry point.
// Moved from sdk/src/ui/internal/textInputState.ts.
import { callTextInputStateChanged } from '../generated/capabilityClients.generated.js';
import { internalConsole } from '../internal/internalConsole.js';

let _patched = false;

export function patchTextInputState(): void {
  if (_patched || typeof window === 'undefined') return;
  _patched = true;

  let isFocused = false;
  let isComposing = false;

  // Fire-and-forget: runs from DOM focus/composition listeners. The previous
  // sync try/catch could not catch the async rejection — switch to .catch and
  // route failures through internalConsole so they surface in devtools.
  function post(): void {
    callTextInputStateChanged({ isFocused, isComposing }).catch((err: unknown) => {
      internalConsole.warn('[pasty-sdk] textInputState: dispatch failed:', err);
    });
  }

  document.addEventListener('focusin', () => { isFocused = true; post(); });
  document.addEventListener('focusout', () => { isFocused = false; post(); });
  document.addEventListener('compositionstart', () => { isComposing = true; post(); });
  document.addEventListener('compositionend', () => { isComposing = false; post(); });
}
