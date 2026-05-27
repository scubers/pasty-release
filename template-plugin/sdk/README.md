# @pasty/plugin-sdk

Embedded SDK for Pasty plugins. Provides typed helpers for the runtime (Node.js) and UI (WebView) sides of a plugin.

## Installation

The SDK ships pre-built inside `plugins/template-plugin/sdk/`. It is referenced as a `file:` dependency — no separate install step needed when working from within `plugins/template-plugin/`.

```json
{
  "dependencies": {
    "@pasty/plugin-sdk": "file:./sdk"
  }
}
```

## Runtime entry (`@pasty/plugin-sdk/runtime`)

Used in Node.js plugin code to define capabilities and return results.

### `definePlugin(definition)`

Validates and returns a plugin definition object. Throws if `setup` is not a function.

```js
const { definePlugin } = require('@pasty/plugin-sdk/runtime');

module.exports = definePlugin({
  setup(init) {
    return {
      detectors: { 'my-detector': { detect(input, ctx) { /* ... */ } } },
      attachmentRenderers: { 'my-renderer': { resolveAttachment(input, ctx) { /* ... */ } } },
      actions: { 'my-action': { resolveSession(input, ctx) { /* ... */ } } }
    };
  }
});
```

### `actionResult.text(value, options?)`

Returns a locked `{ result: { resultKind: 'text', text }, userMessage }` shape.

| Param | Type | Description |
|---|---|---|
| `value` | `unknown` | Coerced to string. `null`/`undefined` → `""`. |
| `options.userMessage` | `string?` | Optional message shown to the user. |

### `actionResult.none(options?)`

Returns `{ result: { resultKind: 'none', text: null }, userMessage }`.

### `actionResult.image(value, options?)`

Returns a locked `{ result: { resultKind: 'image', imageTempPath, imageFormatHint }, userMessage }` shape. Use this when an action produces an image result written to a temp path allocated via `ctx.host.action.allocateImageTempPath()`.

| Param | Type | Description |
|---|---|---|
| `value.imageTempPath` | `string` | Path returned by `allocateImageTempPath`. |
| `value.imageFormatHint` | `string?` | Optional format hint (e.g. `"png"`, `"jpeg"`). |
| `options.userMessage` | `string?` | Optional message shown to the user. |

---

### `messageHandlers` — handle UI → Runtime RPC calls

Register handlers that respond to calls made from UI via `pasty.runtime.invoke`. Each key is a string; the value is an async function receiving `(request, ctx)`.

```js
const { definePlugin } = require('@pasty/plugin-sdk/runtime');

module.exports = definePlugin({
  messageHandlers: {
    'generate-image': async (req, ctx) => {
      const { path } = await ctx.host.action.allocateImageTempPath({ formatHint: 'png' });
      // ... write bytes to path ...
      return { imageTempPath: path };
    },
  },
});
```

### `defineMessage(key)` — shared type contract for UI ↔ Runtime RPC

Creates a typed contract object. Import from `@pasty/plugin-sdk/runtime` on the runtime side (gives `.handle()`) or from `@pasty/plugin-sdk/ui` on the UI side (gives `.invoke()`).

```ts
// shared/contracts.ts (imported by both runtime and UI)
import { defineMessage } from '@pasty/plugin-sdk/runtime';

export const GenerateImage = defineMessage<
  { prompt: string },
  { imageTempPath: string }
>('generate-image');

// runtime/index.ts
definePlugin({
  messageHandlers: Object.fromEntries([
    GenerateImage.handle(async (req, ctx) => {
      const { path } = await ctx.host.action.allocateImageTempPath({ formatHint: 'png' });
      return { imageTempPath: path };
    }),
  ]),
});
```

---

### Host verbs (`ctx.host.*`) — runtime context only

These verbs are available on the `ctx.host` object passed to every runtime handler. All calls go through real Node IPC and return typed responses.

#### `ctx.host.item`

| Method | Returns | Description |
|---|---|---|
| `setTags({tags})` | `Promise<{tags: string[]}>` | Replace item tags (requires `setTags` permission) |
| `addTags({tags})` | `Promise<{tags: string[]}>` | Add tags to item |
| `removeTags({tags})` | `Promise<{tags: string[]}>` | Remove tags from item |
| `setPinned({pinned})` | `Promise<{pinned: boolean}>` | Pin or unpin the item |
| `setAttachments(payload)` | `Promise<{}>` | Replace attachments (requires `setAttachment` permission) |
| `setSearchExtension(payload)` | `Promise<{}>` | Replace search extension entries |
| `materializeImagePath()` | `Promise<{path: string}>` | Copies the item's image to a stable temp file. Idempotent across invocation. Only valid for `image`-type items. |
| `readAttachment({attachmentType, attachmentKey})` | `Promise<{payloadJson?: string}>` | Returns the `payloadJson` string for the named attachment, or `null` if absent. |

#### `ctx.host.action`

| Method | Returns | Description |
|---|---|---|
| `allocateImageTempPath({formatHint?})` | `Promise<{path: string}>` | Allocates a unique writable path for an image result. Consumed by `actionResult.image({imageTempPath})`. Cleaned up when invocation scope closes. |

#### `ctx.host.clipboard`, `ctx.host.navigation`, `ctx.host.settings`

| Method | Returns | Description |
|---|---|---|
| `clipboard.copyText({text})` | `Promise<void>` | Copy text to system clipboard |
| `navigation.openUrl({url})` | `Promise<void>` | Open a URL |
| `navigation.revealInFinder({path})` | `Promise<void>` | Show file path in Finder |
| `navigation.openFilePath({path})` | `Promise<void>` | Open a file by path with default app |
| `settings.get({key})` | `Promise<{value: string \| null}>` | Read a single plugin setting |
| `settings.getAll()` | `Promise<{settings: Record<string, string>}>` | Read all plugin settings |

---

## DOM utilities (`@pasty/plugin-sdk/dom`)

Optional sub-package for WebView plugins that need DOM manipulation utilities.

```js
import { patchConsole, patchTextInputState, autoFit } from '@pasty/plugin-sdk/dom';

// Patch console and text input state (call once at module load)
patchConsole();
patchTextInputState();

// Auto-fit WebView height with ResizeObserver
const dispose = await autoFit({ min: 120, max: 480, target: containerEl });
dispose(); // stop monitoring
```

---

## UI entry (`@pasty/plugin-sdk/ui`)

Used in WebView plugin code (ES modules, Vite build). Exposes a single `pasty` object.

```js
import { pasty } from '@pasty/plugin-sdk/ui';

// No async ready() call needed — subscribers can be registered immediately.
const item = pasty.item.current(); // may be undefined if bootstrap hasn't arrived yet
pasty.item.on(next => { /* always fires once host pushes bootstrap */ });
```

### No `pasty.ready()`

The SDK does **not** export `pasty.ready()`. Observers (`pasty.<domain>.on(fn)`) are context-neutral: register them at module load and the host's bootstrap push will trigger them. Use `.current()` for a synchronous snapshot; defend against `undefined` with `?.` / `??` / early-return.

---

### `pasty.item` — Topic\<PluginClipboardItem\>

| Member | Shape | Description |
|---|---|---|
| `pasty.item.current()` | `() → PluginClipboardItem \| undefined` | Read current item snapshot (may be `undefined` before bootstrap arrives) |
| `pasty.item.on(fn)` | `(fn) → Unsubscribe` | Subscribe to item changes |
| `pasty.item.readAttachment({attachmentType, attachmentKey})` | `Verb → {payloadJson?: string}` | Read an attachment payload for the current item |

#### `pasty.item.attachment` — OptionalTopic\<PluginAttachmentPayload\> (data layer; attachment context)

| Member | Shape | Description |
|---|---|---|
| `pasty.item.attachment.current()` | `() → PluginAttachmentPayload \| undefined` | Current attachment payload |
| `pasty.item.attachment.on(fn)` | `(fn) → Unsubscribe` | Subscribe to payload changes |

#### `pasty.attachmentRenderer` — renderer operations (attachment context)

| Member | Shape | Description |
|---|---|---|
| `pasty.attachmentRenderer.setButtons({buttons})` | `Verb` | Replace native renderer button list (whole-list replace; first call overrides resolveAttachment seed). Strict wire shape — pass `{buttons: [...]}`. |
| `pasty.attachmentRenderer.onHostInvoke(fn)` | `Stream` | Subscribe to host-dispatched button clicks; callback receives `{ buttonID }` |

### `pasty.theme` — Topic\<PluginThemeTokenSnapshot\>

| Member | Shape | Description |
|---|---|---|
| `pasty.theme.current()` | `() → PluginThemeTokenSnapshot \| undefined` | Read current theme tokens. The host injects `__PASTY_PLUGIN_THEME__` at WebView startup, so this is synchronously available in practice. |
| `pasty.theme.on(fn)` | `(fn) → Unsubscribe` | Subscribe to theme updates via the `pasty-plugin-theme` host event |

There is **no** `pasty.theme.refresh()` or `pasty.theme.getThemeSnapshot()` — the unified topic replaces both.

---

### `pasty.runtime`

| Member | Shape | Description |
|---|---|---|
| `pasty.runtime.invoke<TResp>({key, payload, timeoutMs?})` | `Verb → TResp` | Call a handler registered in the plugin's own Node runtime via `messageHandlers`. Strict wire shape — single object parameter. Default timeout: 30 s. Returns the handler's value directly (the SDK auto-unwraps the IPC envelope). Throws on handler error; `err.name` and `err.data` are preserved across the process boundary. |

```ts
import { pasty, defineMessage } from '@pasty/plugin-sdk/ui';

// Recommended: type-safe via defineMessage (shared with the runtime side)
const GenerateImage = defineMessage<{ prompt: string }, { imageTempPath: string }>('generate-image');
const { imageTempPath } = await GenerateImage.invoke({ prompt: 'a cat' }, { timeoutMs: 60_000 });

// Or bare interface — returns TResp directly (no { response } wrapper)
const { imageTempPath: path2 } = await pasty.runtime.invoke<{ imageTempPath: string }>({
  key: 'generate-image',
  payload: { prompt: 'a cat' },
  timeoutMs: 60_000,
});
```

---

### `pasty.action` (action context only)

Namespace of verbs and sub-topics scoped to the action WebView. `pasty.action` itself is not a Topic — it's a grouping. The mutation verbs below require the WebView to be in action context (`pasty.pluginContext.current()?.mode === 'action'`) and reject otherwise with `PluginContextError`.

| Member | Shape | Description |
|---|---|---|
| `pasty.action.setButtons({buttons})` | `Verb` | Replace native action button list (whole-list replace; first call overrides `resolveSession` seed). Strict wire shape — pass `{buttons: [...]}`. |
| `pasty.action.complete({result, userMessage?})` | `Verb` | Submit draft action result to host; triggers phase transition to `.success` |
| `pasty.action.onHostInvoke(fn)` | `Stream` | Subscribe to host-dispatched button clicks; callback receives `{ buttonID }` |

#### `pasty.action.draft` — OptionalTopic\<Record\<string, unknown\>\>

Draft is **read-only** from the UI. The host pushes `initialDraft` (returned by `resolveSession`) as the topic value; the UI keeps form state locally and submits the final result via `pasty.action.complete(...)`.

| Member | Shape | Description |
|---|---|---|
| `pasty.action.draft.current()` | `() → Record<string, unknown> \| undefined` | Current draft state pushed by host. Cast to your draft type at the call site. |
| `pasty.action.draft.on(fn)` | `(fn) → Unsubscribe` | Subscribe to draft updates (rare — `initialDraft` is usually all the UI consumes). |

There is **no** `pasty.action.draft.update(...)` or `pasty.action.draft.getDraftSnapshot()`. To run runtime-side logic from the UI mid-edit (allocate image temp path, fetch external data), use `pasty.runtime.invoke(...)` against your own `messageHandlers`.

#### `PluginContextError`

Context-bound verbs (e.g. `pasty.action.complete`, `pasty.action.setButtons`, `pasty.attachmentRenderer.setButtons`) reject with `PluginContextError` when called from the wrong WebView pane:

```js
import { pasty, PluginContextError } from '@pasty/plugin-sdk/ui';

try {
  await pasty.action.complete({ result: { resultKind: 'none' } });
} catch (e) {
  if ((e as Error).name === 'PluginContextError') {
    // current WebView is not an action context
  }
}
```

---

### `pasty.window`

| Member | Shape | Description |
|---|---|---|
| `pasty.window.setHeight({height})` | `Verb` | Report current WebView height (integer pixels). Strict wire shape — pass `{height: number}`, not a bare number. |
| `pasty.window.autoFit()` | `Verb` | Tell the host to enter auto-fit mode for this WebView. Bounds come from `manifest.attachmentRenderers[].height` (`"auto"` or `{min, max}`). No options. |

For convenience, `@pasty/plugin-sdk/dom` also exports an `autoFit({min, max, target})` helper that wires up a `ResizeObserver` and calls `pasty.window.setHeight(...)` on every layout change — see the DOM utilities section above.

---

### `pasty.clipboard`

| Member | Shape | Description |
|---|---|---|
| `pasty.clipboard.copyText({text})` | `Verb` | Copy text to system clipboard |

---

### `pasty.navigation`

| Member | Shape | Description |
|---|---|---|
| `pasty.navigation.openUrl({url})` | `Verb` | Open a URL |
| `pasty.navigation.revealInFinder({path})` | `Verb` | Reveal file path in Finder |
| `pasty.navigation.openFilePath({path})` | `Verb` | Open a file by path |

---

### `pasty.settings`

| Member | Shape | Description |
|---|---|---|
| `pasty.settings.get({key})` | `Verb → {value: unknown \| null}` | Read a plugin setting by key |
| `pasty.settings.getAll()` | `Verb → {settings: Record<string, unknown>}` | Read all plugin settings |

---

### `pasty.console` / `pasty.textInput` / `pasty.pluginContext`

| Member | Shape | Description |
|---|---|---|
| `pasty.console.log({level, message})` | `Verb` | Write a log line to the host log (`level: 'debug' \| 'info' \| 'warn' \| 'error'`) |
| `pasty.textInput.stateChanged({isFocused, isComposing})` | `Verb` | Notify host that a text input's focus / IME state changed |
| `pasty.pluginContext.current()` | Topic | `{ mode: 'attachmentRenderer' \| 'action', pluginID }` — read which kind of WebView this code is running in |
| `pasty.pluginContext.on(fn)` | Topic | Subscribe (rare; context doesn't normally change after bootstrap) |

> Strict wire shape: every verb takes a single object parameter (`{text}`, `{url}`, etc.), never a bare value. The single source of truth for every payload / response shape is [API.md](./API.md), generated from `protocol/plugin/src/catalog.ts`.

---

## Types

All public types live in the generated `data.generated.ts` / `capabilityClients.generated.ts` and carry the `Plugin` prefix. The pre-`plugin-api-shrink` aliases without the prefix have been removed.

```ts
// Data types — re-exported from both /runtime and /ui
import type {
  PluginClipboardItem,
  PluginAttachmentPayload,
  PluginAttachmentEntry,
  PluginAttachmentRef,
  PluginAttachmentMutationEntry,
  PluginSearchExtensionEntry,
  PluginContentEnvelope,           // discriminated union: text | image | path_reference
  PluginPathEntry,                 // { kind: 'file' | 'folder', path, displayName }
  PluginDetectorArtifact,
  PluginDetectorInput,
  PluginResolveAttachmentInput,
  PluginAttachmentResolveResult,
  PluginResolveActionSessionInput,
  PluginActionResolveResult,
  PluginAutoRunActionInput,
  PluginActionOperationResult,
  PluginActionResult,              // discriminated union: text | image | none
  PluginActionButton,
  PluginThemeTokens,
  PluginThemeTokenSnapshot,
  PluginConsoleLogLevel,
} from '@pasty/plugin-sdk/runtime';

// Handler interfaces — runtime side only
import type {
  PluginDetectorHandler,
  PluginAttachmentRendererHandler,
  PluginAutoRunActionHandler,      // covers both auto-run and draft lifecycles
} from '@pasty/plugin-sdk/runtime';

// definePlugin types — runtime side only
import type {
  PluginRegistry,
  MessageHandler,
  MessageHandlerContext,
} from '@pasty/plugin-sdk/runtime';
```

For the exhaustive type list, run `cd protocol/plugin && npm run codegen` and read the synced `data.generated.ts` next to this file.

## See also

- [API.md](./API.md) — autoritative API reference, regenerated from `protocol/plugin/src/catalog.ts`
- [SPECIFICATION.md](./SPECIFICATION.md) — API shape rules, mirror table, naming conventions, PR checklist
