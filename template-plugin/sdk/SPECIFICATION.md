# Pasty Plugin SDK — Specification

## Chapter 1: Wire Shapes and Strict API Form

The SDK exposes API calls in strict wire shape (no sugar). Every public symbol belongs to exactly one of four shapes.

### 1.1 Topic\<T\>

A Topic holds a current value and notifies listeners when it changes.

```
topic.current()            → T          read current value synchronously
topic.on(listener)         → Unsubscribe  register a change listener; returns unsub fn
```

Use a Topic when the plugin needs to both read the current value and react to future changes (e.g. `pasty.item`, `pasty.theme`).

### 1.2 OptionalTopic\<T\>

Like Topic but the value may be absent until the host provides it.

```
topic.current()            → T | undefined
topic.on(listener)         → Unsubscribe
```

Use an OptionalTopic when a value is context-dependent and may never be set in the current run (e.g. `pasty.item.attachment` in an action context, `pasty.action` in an attachment renderer context).

### 1.3 Stream\<T\>

A Stream has no current value; it only fans out discrete events to listeners.

```
stream.on(listener)        → Unsubscribe
```

Use a Stream for one-shot or repeated events with no persistent state (e.g. `pasty.attachmentRenderer.onHostInvoke`).

### 1.4 Verb

A Verb is an async function that triggers a side-effect or host operation.

```
verb()                     → Promise<Result>
verb(args)                 → Promise<Result>
```

Verbs that are illegal in the current context (e.g. calling `pasty.action.complete` from an attachment renderer) reject immediately with `PluginContextError`.

### 1.5 Applicability Decision Flow

```
Does the value have persistent state the plugin can read synchronously?
  No  → Stream (events only)
  Yes → Does it exist in every context this module loads in?
          Yes → Topic
          No  → OptionalTopic

Is this a side-effect/operation rather than state?
  Yes → Verb
```

---

## Chapter 1.6: Shared Type Re-exports

The SDK runtime and UI modules re-export core data types for plugin author convenience:

### From `@pasty/plugin-sdk/runtime` and `@pasty/plugin-sdk/ui`

```ts
// Strong content and item types
export type { PluginContentEnvelope, TextContent, ImageContent, PathReferenceContent } from '@pasty/plugin-sdk/runtime';
export type { PluginClipboardItem, ItemContext, AttachmentRef } from '@pasty/plugin-sdk/runtime';
```

Use these directly in plugin payload and draft type definitions instead of declaring plugin-local wrapper types.

Note: The convenience aliases `ContentEnvelope`, `PathEntry`, `ClipboardItem`, and `DetectorArtifact`
were removed in the plugin-api-shrink rollout. Use the canonical `Plugin*`-prefixed names:
`PluginContentEnvelope`, `PluginClipboardItem`, `PluginDetectorArtifact`.
`PathEntry` has no replacement — decode `payload: unknown` directly from `path_reference` content.

---

## Chapter 1.7: Action Handler Shape and Typed Drafts

The SDK exposes a **single** action handler interface, generated from the catalog:

```ts
// Generated in runtime.handlers.generated.ts
export interface PluginAutoRunActionHandler {
  resolveSession(input: PluginResolveActionSessionInput, ctx?: { host?: HostClient }): Promise<PluginActionResolveResult>;
  runAutoAction(input: PluginAutoRunActionInput, ctx?: { host?: HostClient }): Promise<PluginActionOperationResult>;
}
```

Both methods are required on the type. The **lifecycle in `manifest.json`** decides which method the host actually calls:

- `lifecycle: 'auto-run'` → host calls `runAutoAction`; `resolveSession` is invoked once for session initialization if present
- `lifecycle: 'draft'` → host calls `resolveSession` to seed `initialDraft` + buttons; `runAutoAction` is never called for draft lifecycle (you can `throw` from it to make the contract explicit, or leave it as a no-op)

There is no `PluginDraftActionHandler` convenience type — both lifecycles use the same interface.

### Strongly typed drafts

`pasty.action.draft.current()` returns `Record<string, unknown> | undefined`. Cast at the call site:

```ts
import { pasty } from '@pasty/plugin-sdk/ui';

interface MyDraft {
  title: string;
  note: string;
}

const draft = pasty.action.draft.current() as MyDraft | undefined;
```

`pasty.action.draft` has **no `update()` verb** in the current SDK. The UI manages its own form state from `initialDraft`, then submits the final result via `pasty.action.complete({result, userMessage?})`. If a runtime-side step is required (e.g. allocating an image temp path), the UI calls `pasty.runtime.invoke(...)` against its own `messageHandlers`.

### Canonical type names

All publicly exported types carry the `Plugin` prefix. The pre-`plugin-api-shrink` aliases without the prefix (`DraftActionHandler`, `AutoRunActionHandler`, `DetectorHandler`, `AttachmentRendererHandler`, `ActionOperationResult`, `ResolveAttachmentInput`, etc.) **have been removed**. Use the canonical names:

| Use this | Not this (removed alias) |
|---|---|
| `PluginAutoRunActionHandler` | `AutoRunActionHandler` / `DraftActionHandler` |
| `PluginDetectorHandler` | `DetectorHandler` |
| `PluginAttachmentRendererHandler` | `AttachmentRendererHandler` |
| `PluginActionOperationResult` | `ActionOperationResult` |
| `PluginActionResolveResult` | `ActionResolveResult` |
| `PluginResolveAttachmentInput` | `ResolveAttachmentInput` |
| `PluginClipboardItem` | `ClipboardItem` |
| `PluginAttachmentPayload` | `AttachmentPayload` |
| `PluginContentEnvelope` | `ContentEnvelope` |
| `PluginPathEntry` | `PathEntry` |
| `PluginDetectorArtifact` | `DetectorArtifact` |

---

## Chapter 2: Capability Mirror Table

Capabilities are split by catalog `surface.side`: runtime capabilities are exposed through `ctx.host.*`, UI capabilities are exposed through `pasty.*`, and `side:'both'` capabilities appear in both trees. All calls use strict wire shape (no sugar).

> The **authoritative, auto-generated** list of every capability with its full payload / response shape lives in [API.md §2 Capabilities](./API.md#2-capabilities) and the alphabetical matrix in [§3 Capability Matrix](./API.md#3-capability-matrix). The mirror table below adds a "Notes" column with migration-related rationale (which APIs were removed, permission gates, etc.). If the two disagree, **API.md wins** — file a doc-fix PR.

| Capability | Wire method | Runtime (ctx.host) | UI (pasty) | Notes |
|---|---|---|---|---|
| Read clipboard item | — | `ctx.host` input param | `pasty.item.current()` | Topic |
| Subscribe item changes | — | — | `pasty.item.on(fn)` | Topic |
| Set tags | `item.setTags` | `ctx.host.item.setTags({tags})` | — | Verb; runtime-only via user RPC bridge; removed from UI in plugin-api-shrink |
| Add tags | `item.addTags` | `ctx.host.item.addTags({tags})` | — | Verb; runtime-only via user RPC bridge |
| Remove tags | `item.removeTags` | `ctx.host.item.removeTags({tags})` | — | Verb; runtime-only via user RPC bridge |
| Pin/unpin | `item.setPinned` | `ctx.host.item.setPinned({pinned})` | — | Verb; runtime-only via user RPC bridge |
| Set attachments | `item.setAttachments` | `ctx.host.item.setAttachments(p)` | — | Verb; runtime-only via user RPC bridge; `owner` and `attachmentType` now required |
| Set search extension | `item.setSearchExtension` | `ctx.host.item.setSearchExtension(p)` | — | Verb; runtime-only via user RPC bridge; `owner` now required |
| Materialize image | `item.materializeImagePath` | `ctx.host.item.materializeImagePath()` | — | Verb; runtime only; returns `{path}` |
| Read attachment | `item.readAttachment` | `ctx.host.item.readAttachment({type, key})` | `pasty.item.readAttachment({type, key})` | Verb; UI-callable; returns `{payloadJson?}` |
| Attachment payload | — | `input.attachment.payloadJson` | `pasty.item.attachment.current()` | OptionalTopic |
| Replace renderer button list | `attachmentRenderer.setButtons` | — | `pasty.attachmentRenderer.setButtons({buttons})` | Verb; buttons have `isEnabled?: boolean` field |
| Host-side renderer button click | `pasty-plugin-attachment-host-invoke` (host event) | — | `pasty.attachmentRenderer.onHostInvoke(fn)` | Stream; receives `{ buttonID }` |
| Theme snapshot | theme host event | via `__PASTY_PLUGIN_THEME__` | `pasty.theme.current()` | Topic |
| Theme change | `themeHostEvent` | — | `pasty.theme.on(fn)` | Topic (via host event) |
| Window height | `window.setHeight` | — | `pasty.window.setHeight({px})` | Verb; strict wire shape |
| Auto-fit height | `window.autoFit` | — | `pasty.window.autoFit()` | Verb |
| Draft | draftHostEvent | input param | `pasty.action.draft.current()` | OptionalTopic; UI is read-only — no `update()` verb |
| Replace action button list | `action.setButtons` | — | `pasty.action.setButtons({buttons})` | Verb; buttons have `isEnabled?: boolean` field |
| Submit draft result | `action.complete` | — | `pasty.action.complete({result, userMessage?})` | Verb; draft lifecycle only |
| Allocate image temp path | `action.allocateImageTempPath` | `ctx.host.action.allocateImageTempPath({formatHint?})` | — | Verb; runtime-only via user RPC bridge; removed from UI in plugin-api-shrink |
| UI → Runtime RPC | `runtime.invoke` | — (handler registered via `messageHandlers` in `definePlugin`) | `pasty.runtime.invoke(key, payload, {timeoutMs?})` | Verb; UI side only; routes to plugin's own Node runtime; default timeout 30 s |
| Host-side action button click | `pasty-plugin-action-host-invoke` (host event) | — | `pasty.action.onHostInvoke(fn)` | Stream; receives `{ buttonID }` |
| Copy text | `clipboard.copyText` | `ctx.host.clipboard.copyText({text})` | `pasty.clipboard.copyText({text})` | Verb; strict wire shape |
| Open URL | `navigation.openUrl` | `ctx.host.navigation.openUrl({url})` | `pasty.navigation.openUrl({url})` | Verb; strict wire shape |
| Reveal in Finder | `navigation.revealInFinder` | `ctx.host.navigation.revealInFinder({path})` | `pasty.navigation.revealInFinder({path})` | Verb; strict wire shape |
| Open file | `navigation.openFilePath` | `ctx.host.navigation.openFilePath({path})` | `pasty.navigation.openFilePath({path})` | Verb; strict wire shape |
| Settings get | `settings.get` | `ctx.host.settings.get({key})` | `pasty.settings.get({key})` | Verb; strict wire shape |
| Settings get all | `settings.getAll` | `ctx.host.settings.getAll()` | `pasty.settings.getAll()` | Verb |

### 2.1 `side:'both'` symmetry

Every capability whose catalog declares `surface: { side: 'both', ... }` is **callable from either process** with identical behavior:

- **Runtime side** — `ctx.host.<domain>.<verb>(payload)` (Node IPC wire). Returns `Promise<Response>`; permission errors reject.
- **UI side** — `pasty.<domain>.<verb>(payload)` (WebView Call wire). Same payload shape, same response, same permission gate.

Both sides go through the same base host bridge; there is no parallel runtime-only or UI-only code path.

**plugin-api-shrink changes**: `item.setTags`, `item.addTags`, `item.removeTags`, `item.setPinned`,
`item.setAttachments`, `item.setSearchExtension`, `item.materializeImagePath`, and
`action.allocateImageTempPath` were moved to **runtime-only** (`side:'runtime'`). Their UI-side
`pasty.*` wrappers were removed. Plugins that need to invoke these from a UI context must route
through `pasty.runtime.invoke(key, payload)` → their own Node runtime messageHandler.

The remaining UI-only capabilities are **surface-bound** to specific WebView panes and are exposed only on the UI tree (`pasty.*`):

| Wire method | UI path | Why UI-only |
|---|---|---|
| `runtime.invoke` | `pasty.runtime.invoke(key, payload, opts?)` | UI initiates a call to its own Node runtime; no runtime-side wire exposure needed |
| `action.setButtons` | `pasty.action.setButtons` | Targets action workspace native button bar |
| `action.complete` | `pasty.action.complete` | Submits draft lifecycle, action workspace only |
| `attachmentRenderer.setButtons` | `pasty.attachmentRenderer.setButtons` | Targets attachment renderer native button bar |
| `window.setHeight` | `pasty.window.setHeight` | WebView size only meaningful in WebView |
| `window.autoFit` | `pasty.window.autoFit` | Same |
| `textInput.stateChanged` | `pasty.textInput.stateChanged` | Notifies WebView native text-input focus chain |

Node IPC inbound router rejects any UI-only method names at `PluginRuntimeHostMethod(rawValue:)` parse time with reply `"Unknown method <name>"`; they cannot be dispatched even if a runtime entry attempts to invoke them by raw method name.

---

## Chapter 2.5: Host Events (the canonical 7)

Host events declared in the catalog drive every state Topic / Stream the SDK exposes to plugin authors. Each event optionally carries a `windowGlobal` (host injects JSON for synchronous `.current()` read at WebView startup) and a `surface.feed` with `topic` (SDK Topic key) + `shape` (`'topic'` for state, `'stream'` for fire-and-forget events) + `context`.

| Wire name | SDK Topic / Stream | Window global | Shape | Context | Payload |
|---|---|---|---|---|---|
| `pasty-plugin-context` | `pasty.pluginContext` | `__PASTY_PLUGIN_CONTEXT__` | topic | any | `{ mode: 'attachmentRenderer' \| 'action', pluginID: string }` |
| `pasty-plugin-item` | `pasty.item` | `__PASTY_PLUGIN_ITEM__` | topic | any | `PluginClipboardItem` |
| `pasty-plugin-attachment` | `pasty.item.attachment` | `__PASTY_PLUGIN_ATTACHMENT__` | topic | attachmentRenderer | `PluginAttachmentPayload` |
| `pasty-plugin-draft` | `pasty.action.draft` | `__PASTY_PLUGIN_DRAFT__` | topic | action | `Record<string, unknown>` |
| `pasty-plugin-theme` | `pasty.theme` | `__PASTY_PLUGIN_THEME__` | topic | any | `PluginThemeTokenSnapshot` |
| `pasty-plugin-attachment-host-invoke` | `pasty.attachmentRenderer.onHostInvoke` | — | stream | attachmentRenderer | `{ buttonID: string }` |
| `pasty-plugin-action-host-invoke` | `pasty.action.onHostInvoke` | — | stream | action | `{ buttonID: string }` |

The previous "bootstrap vs change-event" split was removed in plugin-api-shrink: every Topic now uses the same `windowGlobal` for synchronous initial read **and** a CustomEvent for subsequent updates. The SDK wires both ends — plugin authors only see Topic / OptionalTopic / Stream.

The canonical list is regenerated into [`API.md` §4 and §5](./API.md#4-host-events) from `protocol/plugin/src/catalog.ts` — if a name in this chapter ever diverges from API.md, API.md wins.

---

## Chapter 3: Process for Adding New Capabilities or Host Events

The plugin wire is fully codegen-driven. Choosing between `defineCapability` and `defineHostEvent`:

- **Use `defineCapability`** when the plugin requests an action from the host (e.g. set tags, copy text, open URL).
- **Use `defineHostEvent`** when the host pushes state or events to the plugin (e.g. theme tokens, button clicks, attachment updates). Decorate with `surface.feed` to wire 1:1 to SDK Topic.

### Adding a Capability

1. **Declare the contract** — add a `defineCapability({name, payload, response, surface})` call in `protocol/plugin/src/domains/<domain>.ts`. Choose a `<domain>.<verb>` name and describe payload / response via `t.*` schema primitives.
   - For typed maps, use `t.record(T)` (e.g. `t.record(t.json())` for `Record<string, JSONValue>`).
   - Prefer `t.object` and `t.discriminatedUnion` for nested structures; use `t.json()` only as an escape hatch.
   - Set `surface: {side: 'ui' | 'runtime' | 'both', path: '<domain>.<verb>', context?: 'any' | 'action' | 'attachment', optimisticUpdate?: {topic, fromPayload}}`

2. **Register in the catalog** — append the descriptor to `protocol/plugin/src/catalog.ts` (`capabilities` array).

3. **Regenerate** — `cd protocol/plugin && npm run codegen`. The host sync target and the SDK sync target under `plugins/template-plugin/sdk/src/generated/` are auto-updated. Generated call clients (`callItemSetTags`, etc.) and pasty tree are produced automatically.

4. **Implement the host method** — add the implementation on the host bridge per `surface.side`:
   - `'both'`: implement on the base host bridge (satisfies `PluginRuntimeHostHandler` and inherits into `PluginUIHostBridge`).
   - `'ui'`: implement on the UI host bridge (satisfies `PluginUIHostHandler`).
   - `'runtime'`: implement on the base host bridge (satisfies `PluginRuntimeHostHandler`).
   The host build will refuse to compile until the corresponding handler protocol is satisfied.

5. **Wire the SDK surface** — SDK surface is fully codegen-generated. No hand-wrapping needed; `pasty.<domain>.<verb>` and `ctx.host.<domain>.<verb>` automatically appear in the generated index files.

6. **Test** — add host bridge tests for the new method. Do not write pure UI unit tests; codegen snapshot tests cover the surface.

7. **Verify locally** — `./scripts/checks/check-plugin-contract.sh` and the host platform test flow must both exit 0.

8. **PR** — see Chapter 5 for the PR checklist.

### Adding a Host Event

1. **Declare the contract** — add a `defineHostEvent({name, payload, windowGlobal, surface})` call in `protocol/plugin/src/domains/<domain>.ts`. Specify:
   - `name`: plugin-internal identifier (mapped to wire `windowGlobal` name via codegen)
   - `payload`: shape via `t.*` schema primitives
   - `windowGlobal` (optional): if set, host injects JSON to this window global for sync read (e.g. `__PASTY_PLUGIN_ITEM__`)
   - `surface.feed`: `{topic: '<domain>' | '<domain>.<subdomain>', shape: 'topic' | 'stream', context?: 'any' | 'action' | 'attachment'}`

2. **Register in the catalog** — append the descriptor to `protocol/plugin/src/catalog.ts` (`hostEvents` array).

3. **Regenerate** — same as capability step 3.

4. **Implement host dispatch** — call the codegen-emitted emitter for the event's surface shape: `PluginHostBootstrapEmitter.generated.swift` for `windowGlobal` bootstrap and `PluginHostTopicEmitter.generated.swift` for topic/stream feeds. Codegen provides the `emitX(payload)` methods and payload types.

5. **Wire the SDK surface** — codegen automatically emits SDK bootstrap wiring. `pasty.<domain>.on(fn)`, `.current()` are generated; no hand-wrapping needed.

6. **Test** — add tests for event dispatch. Snapshot tests cover SDK wiring.

7. **Verify locally** — same as capability step 7.

8. **PR** — same as capability step 8.

---

## Chapter 4: Naming Rules

### 4.1 Plugin Type Prefix

All codegen-emitted type names carry the `Plugin` prefix:

**带 Plugin 前缀（仅 type 名）：**
- Wire payload / response interface: `PluginItemSetTagsPayload` / `PluginItemSetTagsResponse`
- `defineType` named types: `PluginAttachmentRef` / `PluginClipboardItem` / `PluginDetectorArtifact` / `PluginAttachmentMutationEntry` / `PluginSearchExtensionEntry` / `PluginConsoleLogLevel` / etc. (必须以 Plugin 开头，DSL validation 校验)
- Handler interfaces: `PluginDetectorHandler` / `PluginAttachmentRendererHandler` / `PluginAutoRunActionHandler` (the single action handler covers both `auto-run` and `draft` lifecycles; see Chapter 1.7)
- Host event payload alias: `PluginItemPayload` / `PluginAttachmentPayload` / `PluginThemeTokenSnapshot` / etc.
- Host-side Codable struct / enum: `PluginItemSetTagsPayload` / `PluginContentEnvelope` / etc. (已有，保持)

**已删除的 typeRef**（plugin-api-shrink）：
- `PluginActionSession` — 随 `pasty-plugin-action-session` host event 一起删除
- `PluginActionDescriptor` — 同上
- `PluginActionInvocationTrigger` — 同上

**不加 Plugin 前缀（动词 / 值命名空间）：**
- TS 函数名: `callItemSetTags` / `onItemEvent` / `guardContext` — 动词前缀足够区分
- 主机端 method 名: `emitItem` / `setBootstrap` — 同上
- TS 顶层值导出: `pasty` / `actionResult` — 是值不是类型
- 主机端 enum case 名: `itemSetTags`（在 `PluginUIHostMethod` / `PluginRuntimeHostMethod` enum 里）— enum 自身带 Plugin 前缀

### 4.2 Module namespaces

Top-level namespaces on `pasty.*` mirror the host capability domain:
- `pasty.item` — clipboard item data and mutations
- `pasty.theme` — appearance tokens
- `pasty.action` — draft action session and controls (optional topic in action context)
- `pasty.window` — WebView layout (height, auto-fit)
- `pasty.clipboard` — system clipboard write
- `pasty.navigation` — navigation and file operations
- `pasty.settings` — plugin settings read access

### 4.3 Method names

- Topics: `current()` to read, `on(fn)` to subscribe (matches Vue's reactive conventions)
- Verbs: strict wire shape with single object parameter: `setTags({tags})`, `addTags({tags})`, `update({draft?, defaultButtonID?})`
- Streams: `onHostInvoke` — `on` prefix + noun phrase

### 4.4 Forbidden patterns

- No `get` prefix on Topics (use `current()` instead)
- No `subscribe` — use `on()`
- No `dispatch` — use `emit()` internally, `invoke()` or named verbs externally
- No `bridge` in public names — that's an implementation detail
- No sugar wrapping (parameter unwrapping, response unwrapping) — strict wire shapes only

### 4.5 Error naming

Context errors throw `PluginContextError` (exported from `@pasty/plugin-sdk/ui`). All other SDK errors use `Error` with descriptive messages prefixed `[pasty-sdk]`.

---

## Chapter 5: PR Checklist

Before merging any PR that touches `sdk/`:

- [ ] New capability is documented in Chapter 2 mirror table
- [ ] TypeScript types added to `ctx.ts` and/or module interface
- [ ] Failing test written first (TDD), then implementation
- [ ] `npm run build` passes in `sdk/`
- [ ] `npm test` passes in `sdk/` (runtime + ui + surface)
- [ ] Surface snapshot updated with `SNAPSHOT_UPDATE=1` and golden files committed
- [ ] No references to host-internal paths, WebKit handler names, or host implementation class names in any `*.md` file under `sdk/` (run the doc-grep CI step to verify)
- [ ] PR description cites the SPECIFICATION.md chapter number justifying shape choice
- [ ] `npm test` passes in `plugins/template-plugin/` (template plugin integration tests)
- [ ] `./scripts/checks/check-plugin-contract.sh` exits 0
