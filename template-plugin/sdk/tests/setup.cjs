'use strict';
// Test environment polyfill for globalThis.addEventListener.
// The generated eventSubscribers use globalThis.addEventListener, which does not
// exist on Node's globalThis. Tests that assign global.window from a JSDOM instance
// still need globalThis.addEventListener to resolve. We patch it here so that
// addEventListener/removeEventListener on globalThis delegate to window when window
// is set, matching what browsers do (globalThis === window in browsers).

function forwardToWindow(method) {
  return function (...args) {
    if (typeof global.window !== 'undefined' && typeof global.window[method] === 'function') {
      return global.window[method](...args);
    }
  };
}

global.addEventListener = forwardToWindow('addEventListener');
global.removeEventListener = forwardToWindow('removeEventListener');
global.dispatchEvent = forwardToWindow('dispatchEvent');
