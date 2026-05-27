/// <reference types="vite/client" />

// File is intentionally a SCRIPT (no `export {}`) so the ambient `*.vue`
// module declaration and the top-level `interface Window` merge with the
// global scope. Adding `export {}` would scope these to a module and break
// resolution of `import X from "*.vue"` across the project.

// Shim Single-File Vue components so TS resolves their default export type.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

// Preview-host (src/preview/) writes the post-shrink window globals onto
// `window` to simulate what Pasty does at WebView load. The wire after
// plugin-api-shrink uses one global per topic (context / item / attachment /
// theme / draft); the legacy unified __PASTY_PLUGIN_BOOTSTRAP__ /
// __PASTY_PLUGIN_ACTION_BOOTSTRAP__ globals are gone.
interface Window {
  __PASTY_PLUGIN_CONTEXT__?: unknown;
  __PASTY_PLUGIN_ITEM__?: unknown;
  __PASTY_PLUGIN_ATTACHMENT__?: unknown;
  __PASTY_PLUGIN_THEME__?: unknown;
  __PASTY_PLUGIN_DRAFT__?: unknown;
}
