// DOM-only autoFit helper: observes element size and posts window.setHeight to host.
// Must be imported explicitly from '@pasty/plugin-sdk/dom' — not bundled in /ui.
import { callWindowSetHeight } from '../generated/capabilityClients.generated.js';
import { internalConsole } from '../internal/internalConsole.js';

export interface AutoFitOptions {
  /** Minimum height in px (default: 0). */
  min?: number;
  /** Maximum height in px (default: Infinity). */
  max?: number;
  /** Element to observe. Defaults to document.body. */
  target?: HTMLElement | null;
}

/**
 * Attach ResizeObserver + MutationObserver to track content height and
 * call window.setHeight automatically.
 *
 * @returns A disconnect function. Call it in onUnmounted to clean up.
 */
export function autoFit(options?: AutoFitOptions): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const min = options?.min ?? 0;
  const max = options?.max ?? Infinity;
  const target: HTMLElement = options?.target ?? document.body;

  let pending = false;

  function post(): void {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const raw = target.scrollHeight;
      const clamped = Math.min(max, Math.max(min, raw));
      // Fire-and-forget: autoFit runs from ResizeObserver/MutationObserver
      // callbacks, so we must not let host bridge failures propagate as
      // unhandled rejections. Log via internalConsole so devtools still
      // shows why heights stopped syncing.
      callWindowSetHeight({ height: clamped }).catch((err: unknown) => {
        internalConsole.warn('[pasty-sdk] autoFit: window.setHeight failed:', err);
      });
    });
  }

  const ro = new ResizeObserver(post);
  ro.observe(target);

  const mo = new MutationObserver(post);
  mo.observe(target, { childList: true, subtree: true, characterData: true, attributes: true });

  // Initial call
  post();

  return () => {
    ro.disconnect();
    mo.disconnect();
  };
}
