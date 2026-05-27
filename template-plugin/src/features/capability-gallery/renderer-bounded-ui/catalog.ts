// Single source of truth for the bounded renderer capability gallery.
// Each button declares an apiSignature (used by tests/integration/galleryWiring.test.cjs
// to verify that every base-scope SDK verb has at least one demo button) and
// an invoke() function that drives the actual call.
//
// IMPORTANT: when the SDK adds a new base-scope capability verb,
//   1. Add a button entry below referencing it.
//   2. Update EXPECTED_BASE_VERBS in galleryWiring.test.cjs.
//
// Post plugin-api-shrink (commit cd2130cf):
//   - The 7 item.* write verbs and action.allocateImageTempPath are now
//     runtime-only (side: 'runtime'). They are NOT callable from UI; the
//     bounded renderer demonstrates one of them (item.setTags) via the
//     runtime-bridge pattern (pasty.runtime.invoke → Node messageHandler →
//     host.item.setTags). The remaining 6 mirror handlers live in
//     ../runtime/draft-action.ts:createGalleryMessageHandlers and can be
//     wired in additional bridge buttons if needed.
//   - item.readAttachment is still UI-callable (side: 'both').
//
// The bounded renderer cannot call action-scope verbs
// (pasty.action.{setButtons,complete}) — those live in
// draft-action-ui/catalog.ts.

import { pasty } from "@pasty/plugin-sdk/ui";
import { GALLERY_RPC_KEYS } from "../runtime/messages.ts";

export type GalleryPermissionID = "setTags" | "setPinned" | "setAttachment" | "setSearchExtension";

export interface CapabilityButton {
  id: string;
  label: string;
  apiSignature: string;
  permissionRequired?: GalleryPermissionID;
  invoke(): Promise<unknown>;
}

export interface CapabilitySection {
  id: string;
  title: string;
  description: string;
  buttons: CapabilityButton[];
}

function nowIsoTag(): string {
  return new Date().toISOString().replace(/[^0-9A-Za-z]/g, "").slice(8, 14);
}

const SETTINGS_KEY = "plugin.template.full.gallery.label";

export const galleryCapabilitySections: CapabilitySection[] = [
  {
    id: "item-read",
    title: "Item reads",
    description: "pasty.item.* (read) — UI-callable directly. Writes moved to runtime-bridge section.",
    buttons: [
      {
        id: "item-readAttachment",
        label: "readAttachment",
        apiSignature: "pasty.item.readAttachment({ attachmentType, attachmentKey })",
        // attachmentKey must match what the detector emits. The gallery detector
        // (runtime/detector.ts L59) emits `attachmentKey: kind` where `kind` is
        // the literal "bounded"/"auto"/"fixed". This card is in the bounded
        // renderer, so the matching key is "bounded". Passing "self" or any
        // other value makes the host return `payloadJson: nil` → log shows `{}`.
        invoke: () => pasty.item.readAttachment({
          attachmentType: "plugin.template.full.gallery.bounded",
          attachmentKey: "bounded",
        }),
      },
    ],
  },
  {
    id: "clipboard",
    title: "Clipboard",
    description: "pasty.clipboard.* — host writes to the user clipboard.",
    buttons: [
      {
        id: "clipboard-copyText",
        label: "copyText",
        apiSignature: "pasty.clipboard.copyText({ text })",
        invoke: () => pasty.clipboard.copyText({ text: `Gallery demo @ ${nowIsoTag()}` }),
      },
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    description: "pasty.navigation.* — open URLs and OS paths.",
    buttons: [
      {
        id: "navigation-openUrl",
        label: "openUrl",
        apiSignature: "pasty.navigation.openUrl({ url })",
        invoke: () => pasty.navigation.openUrl({ url: "https://pasty.app/" }),
      },
      {
        id: "navigation-revealInFinder",
        label: "revealInFinder",
        apiSignature: "pasty.navigation.revealInFinder({ path })",
        invoke: () => pasty.navigation.revealInFinder({ path: "/tmp" }),
      },
      {
        id: "navigation-openFilePath",
        label: "openFilePath",
        apiSignature: "pasty.navigation.openFilePath({ path })",
        invoke: () => pasty.navigation.openFilePath({ path: "/tmp" }),
      },
    ],
  },
  {
    id: "window",
    title: "Window sizing",
    description: "pasty.window.* — programmatic height control inside the bounded shape.",
    buttons: [
      {
        id: "window-setHeight-480",
        label: "setHeight(480)",
        apiSignature: "pasty.window.setHeight({ height })",
        invoke: () => pasty.window.setHeight({ height: 480 }),
      },
      {
        id: "window-setHeight-120",
        label: "setHeight(120)",
        apiSignature: "pasty.window.setHeight({ height })",
        invoke: () => pasty.window.setHeight({ height: 120 }),
      },
      {
        id: "window-autoFit",
        label: "autoFit()",
        apiSignature: "pasty.window.autoFit()",
        invoke: () => pasty.window.autoFit(),
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    description: "pasty.settings.* — read external settings JSON; plugin defaults to its own prefix.",
    buttons: [
      {
        id: "settings-get",
        label: "get(label)",
        apiSignature: "pasty.settings.get({ key })",
        invoke: () => pasty.settings.get({ key: SETTINGS_KEY }),
      },
      {
        id: "settings-getAll",
        label: "getAll()",
        apiSignature: "pasty.settings.getAll()",
        invoke: () => pasty.settings.getAll(),
      },
    ],
  },
  {
    id: "diagnostics",
    title: "Diagnostics",
    description: "pasty.console.log — surfaces to host logging at the requested level.",
    buttons: [
      {
        id: "console-log-info",
        label: "log(info)",
        apiSignature: "pasty.console.log({ level, message })",
        invoke: () => pasty.console.log({ level: "info", message: "[gallery] info entry" }),
      },
      {
        id: "console-log-warn",
        label: "log(warn)",
        apiSignature: "pasty.console.log({ level, message })",
        invoke: () => pasty.console.log({ level: "warn", message: "[gallery] warn entry" }),
      },
      {
        id: "console-log-error",
        label: "log(error)",
        apiSignature: "pasty.console.log({ level, message })",
        invoke: () => pasty.console.log({ level: "error", message: "[gallery] error entry" }),
      },
    ],
  },
  {
    id: "text-input",
    title: "Text-input state",
    description: "pasty.textInput.stateChanged — host hides global shortcuts while a probe is focused. The probe in this panel emits real focus/blur events; this button is the manual equivalent.",
    buttons: [
      {
        id: "textInput-stateChanged",
        label: "stateChanged(isFocused: true)",
        apiSignature: "pasty.textInput.stateChanged({ isFocused, isComposing })",
        invoke: () => pasty.textInput.stateChanged({ isFocused: true, isComposing: false }),
      },
    ],
  },
  {
    id: "runtime-bridge",
    title: "Runtime bridge",
    description: "pasty.runtime.invoke — round-trip UI → runtime handler → host.* → response. Use these to compare UI-scope vs runtime-scope identical capabilities.",
    buttons: [
      {
        id: "runtime-host-item-readAttachment",
        label: "host.item.readAttachment",
        apiSignature: "pasty.runtime.invoke({ key })",
        invoke: () => pasty.runtime.invoke({
          key: GALLERY_RPC_KEYS.itemReadAttachment,
          payload: { payload: { attachmentType: "plugin.template.full.gallery.bounded", attachmentKey: "bounded" } },
        }),
      },
      {
        id: "runtime-host-item-materializeImagePath",
        label: "host.item.materializeImagePath",
        apiSignature: "pasty.runtime.invoke({ key })",
        invoke: () => pasty.runtime.invoke({
          key: GALLERY_RPC_KEYS.itemMaterializeImagePath,
          payload: { payload: {} },
        }),
      },
      {
        id: "runtime-host-settings-getAll",
        label: "host.settings.getAll",
        apiSignature: "pasty.runtime.invoke({ key })",
        invoke: () => pasty.runtime.invoke({
          key: GALLERY_RPC_KEYS.settingsGetAll,
          payload: { payload: {} },
        }),
      },
      {
        id: "runtime-host-console-log",
        label: "host.console.log",
        apiSignature: "pasty.runtime.invoke({ key })",
        invoke: () => pasty.runtime.invoke({
          key: GALLERY_RPC_KEYS.consoleLog,
          payload: { payload: { level: "info", message: "[gallery/runtime-bridge] hello from UI" } },
        }),
      },
      // The canonical post-shrink demo: item.setTags moved to side: 'runtime',
      // so UI invokes it through the user RPC bridge. Mirror handlers for the
      // other 5 item write verbs (addTags / removeTags / setPinned /
      // setAttachments / setSearchExtension) are registered in
      // ../runtime/draft-action.ts:createGalleryMessageHandlers and can be
      // exposed here by adding similar buttons when needed.
      {
        id: "runtime-host-item-setTags",
        label: "host.item.setTags (runtime-bridge demo)",
        apiSignature: "pasty.runtime.invoke({ key })",
        permissionRequired: "setTags",
        invoke: () => pasty.runtime.invoke({
          key: GALLERY_RPC_KEYS.itemSetTags,
          payload: { payload: { tags: [`gallery-bridge-${nowIsoTag()}`] } },
        }),
      },
    ],
  },
];
