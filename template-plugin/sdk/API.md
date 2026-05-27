<!-- AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
     Regenerate via `cd protocol/plugin && npm run codegen`.
     Source contract: protocol/plugin/src/catalog.ts -->

# Pasty Plugin API

Authoritative API reference, generated from `protocol/plugin/src/catalog.ts`.
Every entry below maps 1:1 to a catalog descriptor — there is no hidden surface.

## 1. Overview

- **Capabilities**: 23
- **Host events**: 7
- **Node IPC methods**: 6
- **Named types**: 22

## 2. Capabilities

### action

#### `action.allocateImageTempPath`

- **Side**: runtime
- **Context**: action
- **Path**: `action.allocateImageTempPath`
- **Payload**: { formatHint: `string` }
- **Response**: { path: `string` }

#### `action.setButtons`

- **Side**: ui
- **Context**: action
- **Path**: `action.setButtons`
- **Payload**: { buttons: { id: `string`, title: `string`, isEnabled?: `bool` }[] }
- **Response**: {  }

#### `action.complete`

- **Side**: ui
- **Context**: action
- **Path**: `action.complete`
- **Payload**: { result: [`PluginActionResult`](#pluginactionresult), userMessage?: `string` }
- **Response**: {  }

### attachmentRenderer

#### `attachmentRenderer.setButtons`

- **Side**: ui
- **Context**: attachmentRenderer
- **Path**: `attachmentRenderer.setButtons`
- **Payload**: { buttons: { id: `string`, title: `string`, isEnabled?: `bool` }[] }
- **Response**: {  }

### clipboard

#### `clipboard.copyText`

- **Side**: both
- **Context**: any
- **Path**: `clipboard.copyText`
- **Payload**: { text: `string` }
- **Response**: {  }

### console

#### `console.log`

- **Side**: both
- **Context**: any
- **Path**: `console.log`
- **Payload**: { level: [`PluginConsoleLogLevel`](#pluginconsoleloglevel), message: `string` }
- **Response**: {  }

### item

#### `item.setTags`

- **Side**: runtime
- **Context**: any
- **Path**: `item.setTags`
- **Payload**: { tags: `string`[] }
- **Response**: { tags: `string`[] }

#### `item.addTags`

- **Side**: runtime
- **Context**: any
- **Path**: `item.addTags`
- **Payload**: { tags: `string`[] }
- **Response**: { tags: `string`[] }

#### `item.removeTags`

- **Side**: runtime
- **Context**: any
- **Path**: `item.removeTags`
- **Payload**: { tags: `string`[] }
- **Response**: { tags: `string`[] }

#### `item.setPinned`

- **Side**: runtime
- **Context**: any
- **Path**: `item.setPinned`
- **Payload**: { pinned: `bool` }
- **Response**: { pinned: `bool` }

#### `item.setAttachments`

- **Side**: runtime
- **Context**: any
- **Path**: `item.setAttachments`
- **Payload**: { owner: `string`, attachmentType: `string`, attachments: [`PluginAttachmentMutationEntry`](#pluginattachmentmutationentry)[] }
- **Response**: {  }

#### `item.setSearchExtension`

- **Side**: runtime
- **Context**: any
- **Path**: `item.setSearchExtension`
- **Payload**: { scope: `string`, owner: `string`, entries: [`PluginSearchExtensionEntry`](#pluginsearchextensionentry)[] }
- **Response**: {  }

#### `item.materializeImagePath`

- **Side**: runtime
- **Context**: any
- **Path**: `item.materializeImagePath`
- **Payload**: {  }
- **Response**: { path: `string` }

#### `item.readAttachment`

- **Side**: both
- **Context**: any
- **Path**: `item.readAttachment`
- **Payload**: { attachmentType: `string`, attachmentKey: `string` }
- **Response**: { payloadJson?: `string` }

### navigation

#### `navigation.openUrl`

- **Side**: both
- **Context**: any
- **Path**: `navigation.openUrl`
- **Payload**: { url: `string` }
- **Response**: {  }

#### `navigation.revealInFinder`

- **Side**: both
- **Context**: any
- **Path**: `navigation.revealInFinder`
- **Payload**: { path: `string` }
- **Response**: {  }

#### `navigation.openFilePath`

- **Side**: both
- **Context**: any
- **Path**: `navigation.openFilePath`
- **Payload**: { path: `string` }
- **Response**: {  }

### runtime

#### `runtime.invoke`

- **Side**: ui
- **Context**: any
- **Path**: `runtime.invoke`
- **Payload**: { key: `string`, payload: `json`, timeoutMs?: `int` }
- **Response**: { response: `json` }

### settings

#### `settings.get`

- **Side**: both
- **Context**: any
- **Path**: `settings.get`
- **Payload**: { key: `string` }
- **Response**: { value: `json` \| `null` }

#### `settings.getAll`

- **Side**: both
- **Context**: any
- **Path**: `settings.getAll`
- **Payload**: {  }
- **Response**: { settings: record<`json`> }

### textInput

#### `textInput.stateChanged`

- **Side**: ui
- **Context**: any
- **Path**: `textInput.stateChanged`
- **Payload**: { isFocused: `bool`, isComposing: `bool` }
- **Response**: {  }

### window

#### `window.setHeight`

- **Side**: ui
- **Context**: any
- **Path**: `window.setHeight`
- **Payload**: { height: `int` }
- **Response**: {  }

#### `window.autoFit`

- **Side**: ui
- **Context**: any
- **Path**: `window.autoFit`
- **Payload**: {  }
- **Response**: {  }

## 3. Capability Matrix

| Capability | UI path | Runtime path | Context |
| --- | --- | --- | --- |
| `runtime.invoke` | `pasty.runtime.invoke` | — | any |
| `item.setTags` | — | `host.item.setTags` | any |
| `item.addTags` | — | `host.item.addTags` | any |
| `item.removeTags` | — | `host.item.removeTags` | any |
| `item.setPinned` | — | `host.item.setPinned` | any |
| `item.setAttachments` | — | `host.item.setAttachments` | any |
| `item.setSearchExtension` | — | `host.item.setSearchExtension` | any |
| `item.materializeImagePath` | — | `host.item.materializeImagePath` | any |
| `item.readAttachment` | `pasty.item.readAttachment` | `host.item.readAttachment` | any |
| `clipboard.copyText` | `pasty.clipboard.copyText` | `host.clipboard.copyText` | any |
| `navigation.openUrl` | `pasty.navigation.openUrl` | `host.navigation.openUrl` | any |
| `navigation.revealInFinder` | `pasty.navigation.revealInFinder` | `host.navigation.revealInFinder` | any |
| `navigation.openFilePath` | `pasty.navigation.openFilePath` | `host.navigation.openFilePath` | any |
| `action.allocateImageTempPath` | — | `host.action.allocateImageTempPath` | action |
| `action.setButtons` | `pasty.action.setButtons` | — | action |
| `action.complete` | `pasty.action.complete` | — | action |
| `attachmentRenderer.setButtons` | `pasty.attachmentRenderer.setButtons` | — | attachmentRenderer |
| `window.setHeight` | `pasty.window.setHeight` | — | any |
| `window.autoFit` | `pasty.window.autoFit` | — | any |
| `settings.get` | `pasty.settings.get` | `host.settings.get` | any |
| `settings.getAll` | `pasty.settings.getAll` | `host.settings.getAll` | any |
| `console.log` | `pasty.console.log` | `host.console.log` | any |
| `textInput.stateChanged` | `pasty.textInput.stateChanged` | — | any |

## 4. Host Events

### `pasty-plugin-context`

- **Window global**: `__PASTY_PLUGIN_CONTEXT__`
- **Topic**: `pluginContext`
- **Shape**: topic
- **Context**: any
- **Payload**: { mode: `'attachmentRenderer'` \| `'action'`, pluginID: `string` }

### `pasty-plugin-item`

- **Window global**: `__PASTY_PLUGIN_ITEM__`
- **Topic**: `item`
- **Shape**: topic
- **Context**: any
- **Payload**: [`PluginClipboardItem`](#pluginclipboarditem)

### `pasty-plugin-attachment`

- **Window global**: `__PASTY_PLUGIN_ATTACHMENT__`
- **Topic**: `item.attachment`
- **Shape**: topic
- **Context**: attachmentRenderer
- **Payload**: [`PluginAttachmentPayload`](#pluginattachmentpayload)

### `pasty-plugin-draft`

- **Window global**: `__PASTY_PLUGIN_DRAFT__`
- **Topic**: `action.draft`
- **Shape**: topic
- **Context**: action
- **Payload**: record<`json`>

### `pasty-plugin-theme`

- **Window global**: `__PASTY_PLUGIN_THEME__`
- **Topic**: `theme`
- **Shape**: topic
- **Context**: any
- **Payload**: [`PluginThemeTokenSnapshot`](#pluginthemetokensnapshot)

### `pasty-plugin-attachment-host-invoke`

- **Topic**: `attachmentRenderer.onHostInvoke`
- **Shape**: stream
- **Context**: attachmentRenderer
- **Payload**: { buttonID: `string` }

### `pasty-plugin-action-host-invoke`

- **Topic**: `action.onHostInvoke`
- **Shape**: stream
- **Context**: action
- **Payload**: { buttonID: `string` }

## 5. Host Event Matrix

| Event | Topic | Shape | Window global | Context |
| --- | --- | --- | --- | --- |
| `pasty-plugin-context` | pluginContext | topic | `__PASTY_PLUGIN_CONTEXT__` | any |
| `pasty-plugin-item` | item | topic | `__PASTY_PLUGIN_ITEM__` | any |
| `pasty-plugin-attachment` | item.attachment | topic | `__PASTY_PLUGIN_ATTACHMENT__` | attachmentRenderer |
| `pasty-plugin-draft` | action.draft | topic | `__PASTY_PLUGIN_DRAFT__` | action |
| `pasty-plugin-theme` | theme | topic | `__PASTY_PLUGIN_THEME__` | any |
| `pasty-plugin-attachment-host-invoke` | attachmentRenderer.onHostInvoke | stream | — | attachmentRenderer |
| `pasty-plugin-action-host-invoke` | action.onHostInvoke | stream | — | action |

## 6. Node IPC

### `runtime.userRPC`

- **Request**: { key: `string`, payload: `json` }
- **Response**: { result: `json` }

### `runtime.invokeRenderer`

- **Request**: { requestID: `string`, rendererID: `string`, input: [`PluginResolveAttachmentInput`](#pluginresolveattachmentinput) }
- **Response**: { requestID: `string`, result?: [`PluginAttachmentResolveResult`](#pluginattachmentresolveresult), errorMessage?: `string` }
- **Handler interface**: `PluginAttachmentRendererHandler.resolveAttachment`
- **Registry key**: `attachmentRenderers`

### `runtime.invokeDetector`

- **Request**: { requestID: `string`, detectorID: `string`, input: [`PluginDetectorInput`](#plugindetectorinput) }
- **Response**: { requestID: `string`, result?: [`PluginDetectorArtifact`](#plugindetectorartifact)[], errorMessage?: `string` }
- **Handler interface**: `PluginDetectorHandler.detect`
- **Registry key**: `detectors`

### `runtime.invokeAction`

- **Request**: { requestID: `string`, actionID: `string`, input: [`PluginResolveActionSessionInput`](#pluginresolveactionsessioninput) }
- **Response**: { requestID: `string`, result?: [`PluginActionResolveResult`](#pluginactionresolveresult), errorMessage?: `string` }
- **Handler interface**: `PluginAutoRunActionHandler.resolveSession`
- **Registry key**: `actions`

### `runtime.invokeActionAutoRun`

- **Request**: { requestID: `string`, actionID: `string`, input: [`PluginAutoRunActionInput`](#pluginautorunactioninput) }
- **Response**: { requestID: `string`, result?: [`PluginActionOperationResult`](#pluginactionoperationresult), errorMessage?: `string` }
- **Handler interface**: `PluginAutoRunActionHandler.runAutoAction`
- **Registry key**: `actions`

### `runtime.ready`

- **Request**: {  }
- **Response**: {  }

## 7. Plugin Registry

Plugins return a `PluginRegistry` object from `definePlugin`:

```ts
export interface PluginRegistry {
  attachmentRenderers?: Record<string, PluginAttachmentRendererHandler>;
  detectors?: Record<string, PluginDetectorHandler>;
  actions?: Record<string, PluginAutoRunActionHandler>;
  messageHandlers?: Record<string, MessageHandler>;
}
```

## 8. Named Types

### `PluginAttachmentMutationEntry`

- `attachmentKey`: `string`
- `payloadJson`: `string`
- `syncScope`: `string`
- `createdAtMs?`: `int`
- `updatedAtMs?`: `int`

### `PluginSearchExtensionEntry`

- `entryKey`: `string`
- `searchText`: `string`
- `label?`: `string`
- `updatedAtMs?`: `int`

### `PluginActionResult`

Discriminated union on `resultKind`: { resultKind: `'text'`, text: `string` } | { resultKind: `'image'`, imageTempPath: `string`, imageFormatHint?: `string` } | { resultKind: `'none'` }

### `PluginConsoleLogLevel`

Union: `'debug'` | `'info'` | `'warn'` | `'error'`

### `PluginClipboardItem`

- `id`: `string`
- `type`: `string`
- `tags`: `string`[]
- `sourceAppID`: `string`

### `PluginAttachmentEntry`

- `historyID`: `string`
- `owner`: `string`
- `attachmentType`: `string`
- `attachmentKey`: `string`
- `payloadJson`: `string`

### `PluginAttachmentPayload`

- `item`: [`PluginClipboardItem`](#pluginclipboarditem)
- `attachment`: [`PluginAttachmentEntry`](#pluginattachmententry)

### `PluginThemeTokens`

- `surface`: `string`
- `surfaceElevated`: `string`
- `textPrimary`: `string`
- `textSecondary`: `string`
- `textTertiary`: `string`
- `accent`: `string`
- `accentContrast`: `string`
- `border`: `string`
- `divider`: `string`
- `success`: `string`
- `warning`: `string`
- `danger`: `string`

### `PluginThemeTokenSnapshot`

- `scheme`: `string`
- `tokens`: [`PluginThemeTokens`](#pluginthemetokens)

### `PluginPathEntry`

- `kind`: `'file'` \| `'folder'`
- `path`: `string`
- `displayName`: `string`

### `PluginContentEnvelope`

Discriminated union on `kind`: { kind: `'text'`, text: `string` } | { kind: `'image'`, width: `int`, height: `int`, format: `string`, bytes: `int` } | { kind: `'path_reference'`, entries: [`PluginPathEntry`](#pluginpathentry)[] }

### `PluginAttachmentRef`

- `attachmentType`: `string`
- `attachmentKey`: `string`

### `PluginResolveAttachmentInput`

- `item`: [`PluginClipboardItem`](#pluginclipboarditem)
- `content`: [`PluginContentEnvelope`](#plugincontentenvelope)
- `attachments`: [`PluginAttachmentRef`](#pluginattachmentref)[]
- `attachment`: [`PluginAttachmentEntry`](#pluginattachmententry)

### `PluginActionButton`

- `id`: `string`
- `title`: `string`
- `isEnabled?`: `bool`

### `PluginAttachmentResolveResult`

- `shouldDisplay?`: `bool`
- `displayName?`: `string`
- `tintHex?`: `string`
- `buttons?`: [`PluginActionButton`](#pluginactionbutton)[]

### `PluginDetectorInput`

- `item`: [`PluginClipboardItem`](#pluginclipboarditem)
- `content`: [`PluginContentEnvelope`](#plugincontentenvelope)
- `attachments`: [`PluginAttachmentRef`](#pluginattachmentref)[]

### `PluginDetectorSearchProjection`

- `scope`: `string`
- `searchText`: `string`
- `label?`: `string`

### `PluginDetectorArtifact`

- `attachmentType`: `string`
- `attachmentKey`: `string`
- `payloadJson`: `string`
- `searchProjection?`: [`PluginDetectorSearchProjection`](#plugindetectorsearchprojection)
- `attachmentSyncScope?`: `string`
- `createdAtMs?`: `int`
- `updatedAtMs?`: `int`

### `PluginResolveActionSessionInput`

- `item`: [`PluginClipboardItem`](#pluginclipboarditem)
- `content`: [`PluginContentEnvelope`](#plugincontentenvelope)
- `attachments`: [`PluginAttachmentRef`](#pluginattachmentref)[]

### `PluginActionResolveResult`

- `displayName?`: `string`
- `buttons`: [`PluginActionButton`](#pluginactionbutton)[]
- `defaultButtonID?`: `string`
- `initialDraft`: record<`json`>

### `PluginAutoRunActionInput`

- `item`: [`PluginClipboardItem`](#pluginclipboarditem)
- `content`: [`PluginContentEnvelope`](#plugincontentenvelope)
- `attachments`: [`PluginAttachmentRef`](#pluginattachmentref)[]

### `PluginActionOperationResult`

- `result`: [`PluginActionResult`](#pluginactionresult)
- `userMessage?`: `string`

## 9. Wire Constants

- `__pasty_structured_error__:` — prefix used by the runtime error envelope.

## 10. Window Globals

| Window global | Source event |
| --- | --- |
| `__PASTY_PLUGIN_CONTEXT__` | `pasty-plugin-context` |
| `__PASTY_PLUGIN_ITEM__` | `pasty-plugin-item` |
| `__PASTY_PLUGIN_ATTACHMENT__` | `pasty-plugin-attachment` |
| `__PASTY_PLUGIN_DRAFT__` | `pasty-plugin-draft` |
| `__PASTY_PLUGIN_THEME__` | `pasty-plugin-theme` |

## 11. Generated Symbol Map

| Concept | Generated file (TS) | Generated file (Swift) |
| --- | --- | --- |
| Capability payload/response types | `capabilityClients.generated.ts` | `PluginCapabilityPayloads.generated.swift` |
| UI capability tree | `ui.pasty.generated.ts` | — |
| Runtime host tree | `runtime.host.generated.ts`, `hostClients.generated.ts` | — |
| Host event subscribers | `topicSubscribers.generated.ts` | `PluginHostTopicEmitter.generated.swift` |
| Node IPC server | `nodeIPCServer.generated.ts` | `PluginNodeIPCClient.generated.swift` |
| Named types | `data.generated.ts` | `PluginCommonTypes.generated.swift` |
| Handler interfaces | `runtime.handlers.generated.ts` | `PluginUIHostHandler.generated.swift`, `PluginRuntimeHostHandler.generated.swift` |
| `definePlugin` + registry | `runtime.definePlugin.generated.ts` | — |
