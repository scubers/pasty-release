# capability-gallery

`capability-gallery` is the template-plugin's **full-coverage capability
reference**. It exists alongside the four minimal sample features
(`preview-renderer`, `expanded-renderer`, `auto-action`, `draft-action`) and
complements them: the samples remain the minimal "this is what a real plugin
looks like" starting point, while this directory demonstrates **every** SDK
capability — including the corners not covered by the samples — in code you
can run, click, and watch.

If you are new to writing plugins, read the four sample features first. If you
already know the basics and want to see what the SDK can do end-to-end, open
this directory.

## Directory layout

```
capability-gallery/
├── README.md                       — this file (capability matrix + how to run)
├── runtime/                        — Node-side handlers
│   ├── payloads.ts                   GalleryAttachmentPayload + encode/decode
│   ├── detector.ts                   gallery-detector: 3 artifacts per input
│   ├── auto-actions.ts               3 auto-run actions (text / image / none)
│   ├── draft-action.ts               draft-action handler + RPC message bridge
│   ├── renderers.ts                  3 attachmentRenderer resolvers
│   └── messages.ts                   GALLERY_RPC_KEYS — keys shared with UI
├── renderer-fixed-ui/              — height: 240 (compact, read-only)
├── renderer-auto-ui/               — height: "auto" (content-driven)
├── renderer-bounded-ui/            — height: { min: 120, max: 480 } (MAIN STAGE)
│   ├── catalog.ts                    galleryCapabilitySections — single
│   │                                 source of truth for the button grid
│   └── components/                   LogPanel, TopicMonitor, CapabilityBoard,
│                                     RuntimeBridgePanel, TextInputProbe
└── draft-action-ui/                — action-scope capability tour
    ├── catalog.ts                    galleryActionCapabilities — action-scope
    └── app.vue                       action.{setButtons,complete×3,allocate…}
```

## Capability coverage matrix (UI scope)

Every capability verb visible to a UI runtime is wired below. The "where"
column points to the demo button or component you click in the running plugin.

| domain | verb | where | scope |
|---|---|---|---|
| runtime | `runtime.invoke` | bounded-ui · Runtime bridge panel | base |
| item | `item.setTags` | bounded-ui · Item mutations | base (perm: setTags) |
| item | `item.addTags` | bounded-ui · Item mutations | base (perm: setTags) |
| item | `item.removeTags` | bounded-ui · Item mutations | base (perm: setTags) |
| item | `item.setPinned` | bounded-ui · Item mutations | base (perm: setPinned) |
| item | `item.setAttachments` | bounded-ui · Item mutations | base (perm: setAttachment) |
| item | `item.setSearchExtension` | bounded-ui · Item mutations | base (perm: setSearchExtension) |
| item | `item.materializeImagePath` | bounded-ui · Item reads | base |
| item | `item.readAttachment` | bounded-ui · Item reads | base |
| clipboard | `clipboard.copyText` | bounded-ui · Clipboard | base |
| navigation | `navigation.openUrl` | bounded-ui · Navigation | base |
| navigation | `navigation.revealInFinder` | bounded-ui · Navigation | base |
| navigation | `navigation.openFilePath` | bounded-ui · Navigation | base |
| window | `window.setHeight` | bounded-ui · Window sizing | base |
| window | `window.autoFit` | bounded-ui · Window sizing | base |
| settings | `settings.get` | bounded-ui · Settings | base |
| settings | `settings.getAll` | bounded-ui · Settings | base |
| console | `console.log` | bounded-ui · Diagnostics | base |
| textInput | `textInput.stateChanged` | bounded-ui · TextInputProbe (focus/blur) | base |
| attachmentRenderer | `attachmentRenderer.setButtons` | bounded-ui app onMounted; fixed-ui app onMounted | attachment |
| action | `action.allocateImageTempPath` | draft-action-ui · catalog button | action |
| action | `action.setButtons` | draft-action-ui · cycle-buttons | action |
| action | `action.complete` (×3 resultKinds) | draft-action-ui · complete-text / -image / -none | action |

That's **23 verbs total**: 19 base + 1 attachment + 3 action. The contract
test at `tests/integration/galleryWiring.test.cjs` enforces that every entry
above appears as a button (or programmatic call) in the gallery catalogs.

### Host-event coverage

| # | host event | where it shows up |
|---|---|---|
| 1 | `pluginContext` | bounded-ui · TopicMonitor; auto-ui · header snapshot |
| 2 | `item` | bounded-ui · TopicMonitor; auto-ui · header snapshot |
| 3 | `item.attachment` | bounded-ui · TopicMonitor; fixed-ui snapshot |
| 4 | `item.search` | bounded-ui · TopicMonitor; fixed-ui snapshot |
| 5 | `actionSession` (`pasty.action`) | draft-action-ui · actionSession panel |
| 6 | `action.draft` | draft-action-ui · draft form + JSON snapshot |
| 7 | `theme` | bounded-ui · TopicMonitor; fixed-ui snapshot |
| 8 | `attachmentRenderer.onHostInvoke` (stream) | bounded-ui · log panel (expand/compact/reset-height triggers) |
| 9 | `action.onHostInvoke` (stream) | draft-action-ui · log panel (host-strip clicks) |

## How to run

1. Build the plugin: `npm run build`.
2. Install via your usual host flow (the gallery is part of the same
   template-plugin manifest — it ships alongside the four sample features).
3. Copy any **text**, **image**, or **file path** to the Pasty clipboard.
4. The gallery detector emits three attachments — `Gallery: fixed`,
   `Gallery: auto`, `Gallery: bounded` — onto the same item. Each opens a
   different renderer demonstrating a height shape.
5. The bounded renderer is the main stage: click the buttons in each section
   and watch the log panel. The Runtime bridge panel proves that the same
   capability surface exists on the Node runtime side and is callable from
   the UI via `pasty.runtime.invoke`.
6. From the host action menu, four new actions appear under "Gallery":
   - **Gallery Auto (text / image / none)** — auto-run actions that emit one
     of the three `actionResult` shapes.
   - **Gallery Draft** — opens the draft-action UI for the action-scope verbs.

## Why this is separate from the sample features

The four sample features carry the "minimal, self-contained, real" definition.
If you add buttons or topics to them, new plugin authors copy the kitchen
sink along with the basics. The gallery solves the inverse problem: showing
every SDK affordance in one place, even the ones you rarely use in a real
plugin.

## Notes & non-goals

- **Permission rejection paths are not demonstrated.** `manifest.json`
  declares all four permissions (`setAttachment`, `setSearchExtension`,
  `setTags`, `setPinned`), so the gated buttons all succeed. To see a
  rejection path, remove a permission from the manifest, rebuild, and
  re-trigger the relevant button.
- **Pro quota chip appears naturally.** Adding three auto-run actions plus
  one draft action brings the manifest to 8 declared actions, which sits
  above the free-tier quota (3). The host surfaces an 8/3 chip in plugin
  settings — that's pre-existing host behaviour, not a gallery feature.
- **Three attachments per item is intentional excess.** Real plugins should
  produce one attachment per real intent. The gallery emits three only to
  exercise all three height shapes side-by-side.
