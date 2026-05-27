<template>
  <main class="workbench" :data-theme="selectedTheme">
    <section class="workbench__controls">
      <label class="workbench__control">
        <span>View</span>
        <select v-model="selectedView">
          <option value="renderer">Renderer</option>
          <option value="action">Action</option>
        </select>
      </label>

      <label class="workbench__control">
        <span>Scenario</span>
        <select v-model="selectedScenarioID">
          <option
            v-for="scenario in activeScenarioOptions"
            :key="scenario.id"
            :value="scenario.id"
          >
            {{ scenario.label }}
          </option>
        </select>
      </label>

      <label class="workbench__control">
        <span>Theme</span>
        <select v-model="selectedTheme">
          <option value="dark">Dark Host</option>
          <option value="light">Light Host</option>
        </select>
      </label>
    </section>

    <section class="workbench__canvas">
      <div
        class="host-frame"
        :class="selectedView === 'renderer' ? 'host-frame--renderer' : 'host-frame--action'"
      >
        <div class="host-frame__title">
          <span>{{ selectedView === "renderer" ? "Attachment Renderer" : "Draft Action" }}</span>
          <span>{{ frameSizeLabel }}</span>
        </div>

        <div class="host-frame__surface">
          <div class="host-frame__viewport-shell">
            <div class="host-frame__viewport" :style="viewportStyle">
              <div class="host-frame__webview">
                <component :is="activeComponent" :key="componentKey" />
              </div>
            </div>

            <div class="host-frame__chrome">
              <span class="host-frame__chrome-label">Host resize</span>
              <button
                class="host-frame__resize-handle"
                type="button"
                aria-label="Resize host preview viewport"
                @pointerdown="startResize"
              />
            </div>
          </div>

          <div class="host-frame__strip">
            <button
              v-for="button in activeButtons"
              :key="button.id"
              class="host-frame__button"
              type="button"
              :class="button.id === activeDefaultButtonID ? 'host-frame__button--primary' : ''"
              @click="previewHostButton(button)"
            >
              {{ button.title }}
            </button>
          </div>
        </div>
      </div>

      <aside class="workbench__notes">
        <p class="workbench__notes-title">Preview Notes</p>
        <p class="workbench__notes-body">
          This workbench simulates host chrome, theme changes, and bootstrap/search/theme events.
        </p>
        <p class="workbench__notes-body">
          Use the host resize control below the preview viewport. In local preview, bridge calls fall back to console logging.
        </p>
        <p class="workbench__notes-status">{{ statusMessage }}</p>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Component } from "vue";
import AttachmentTemplateApp from "../features/preview-renderer/app.vue";
import ExpandedAttachmentTemplateApp from "../features/expanded-renderer/app.vue";
// features/draft-action/ was deleted as part of the plugin-api-shrink follow-up
// (template-draft-action action removed from manifest). The preview shell now
// hosts the capability-gallery draft-action UI as the action-mode component.
import DraftActionTemplateApp from "../features/capability-gallery/draft-action-ui/app.vue";
import { attachmentScenarios } from "./scenarios/attachmentScenarios";
import { actionScenarios } from "./scenarios/actionScenarios";

type ViewKey = "renderer" | "action";
type ThemeKey = "light" | "dark";
type AttachmentVariantKey = "compact" | "expanded";

const attachmentComponentMap: Record<AttachmentVariantKey, Component> = {
  compact: AttachmentTemplateApp,
  expanded: ExpandedAttachmentTemplateApp
};

const query = new URLSearchParams(window.location.search);
const initialView: ViewKey = query.get("view") === "action" ? "action" : "renderer";
const selectedView = ref<ViewKey>(initialView);
const selectedTheme = ref<ThemeKey>(query.get("theme") === "light" ? "light" : "dark");
const statusMessage = ref<string>("Ready for local UI iteration.");

interface HostButton { id: string; title: string; isEnabled?: boolean }
const activeButtons = ref<HostButton[]>([]);
const activeDefaultButtonID = ref<string | null>(null);

function previewHostButton(button: HostButton): void {
  // Post-shrink wire splits host-invoke into two streams keyed by context:
  //   - action mode      → pasty-plugin-action-host-invoke
  //   - attachmentRenderer mode → pasty-plugin-attachment-host-invoke
  // Both carry `{ buttonID }` (the `source: 'host'` field was removed in R10).
  const eventName = selectedView.value === "action"
    ? "pasty-plugin-action-host-invoke"
    : "pasty-plugin-attachment-host-invoke";
  window.dispatchEvent(new CustomEvent(eventName, { detail: { buttonID: button.id } }));
}

onMounted(() => {
  window.addEventListener("pasty-plugin-set-buttons", (e) => {
    const ev = e as CustomEvent<{ buttons?: HostButton[]; defaultButtonID?: string | null }>;
    activeButtons.value = Array.isArray(ev.detail?.buttons) ? ev.detail.buttons : [];
    activeDefaultButtonID.value = ev.detail?.defaultButtonID ?? null;
  });
});

const activeScenarioOptions = computed(() => selectedView.value === "renderer"
  ? attachmentScenarios
  : actionScenarios);

const selectedScenarioID = ref<string>(resolveInitialScenarioID(initialView));

const activeScenario = computed(() => activeScenarioOptions.value.find(
  (scenario) => scenario.id === selectedScenarioID.value
) || activeScenarioOptions.value[0]);

const activeComponent = computed<Component>(() => {
  if (selectedView.value !== "renderer") {
    return DraftActionTemplateApp;
  }
  const variant = ((activeScenario.value as { rendererComponent?: AttachmentVariantKey } | undefined)?.rendererComponent ?? "compact");
  return attachmentComponentMap[variant] ?? AttachmentTemplateApp;
});

const componentKey = computed<string>(() => `${selectedView.value}:${activeScenario.value?.id ?? "unknown"}`);

interface ViewportSize { width: number; height: number; }

const minimumViewportSizes: Record<ViewKey, ViewportSize> = {
  renderer: { width: 320, height: 220 },
  action: { width: 320, height: 220 }
};

const viewportSizes = reactive<Record<ViewKey, ViewportSize>>({
  renderer: { width: 560, height: 320 },
  action: { width: 350, height: 250 }
});

const viewportStyle = computed(() => {
  const size = viewportSizes[selectedView.value];
  return {
    width: `${size.width}px`,
    height: `${size.height}px`
  };
});

const frameSizeLabel = computed<string>(() => {
  const size = viewportSizes[selectedView.value];
  return `${size.width} × ${size.height}`;
});

interface ResizeSession {
  view: ViewKey;
  startPointerX: number;
  startPointerY: number;
  startWidth: number;
  startHeight: number;
}

let resizeSession: ResizeSession | null = null;

watch(selectedView, (view) => {
  selectedScenarioID.value = resolveInitialScenarioID(view);
});

watch(
  [selectedView, selectedScenarioID, selectedTheme],
  () => {
    applyPreviewState();
    syncQuery();
  },
  { immediate: true }
);

function resolveInitialScenarioID(view: ViewKey): string {
  const requestedScenarioID = query.get("scenario");
  const options = view === "renderer" ? attachmentScenarios : actionScenarios;
  return options.some((scenario) => scenario.id === requestedScenarioID)
    ? (requestedScenarioID as string)
    : options[0].id;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function dispatchEvent(name: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// Post-shrink theme tokens fixture (matches generated PluginThemeTokenSnapshot
// shape: { scheme, tokens: PluginThemeTokens }). The preview shell ships a
// minimal token set; real host injects the full palette.
function buildThemeSnapshot(accentHex: string): { scheme: string; tokens: Record<string, string> } {
  return {
    scheme: "light",
    tokens: {
      surface: "#ffffff",
      surfaceElevated: "#f8fafc",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textTertiary: "#64748b",
      accent: accentHex,
      accentContrast: "#ffffff",
      border: "rgba(226, 232, 240, 0.9)",
      divider: "rgba(148, 163, 184, 0.4)",
      success: "#16a34a",
      warning: "#f59e0b",
      danger: "#dc2626",
    },
  };
}

function applyPreviewState(): void {
  const scenario = activeScenario.value;
  if (!scenario) {
    return;
  }

  const bootstrap = clone(scenario.bootstrap) as unknown as Record<string, unknown>;

  // Reset all post-shrink topic globals. The plugin-api-shrink change
  // (commit cd2130cf) replaced the unified __PASTY_PLUGIN_BOOTSTRAP__ /
  // __PASTY_PLUGIN_ACTION_BOOTSTRAP__ with one global per topic:
  //   - __PASTY_PLUGIN_CONTEXT__   { mode, pluginID }
  //   - __PASTY_PLUGIN_ITEM__      PluginClipboardItem
  //   - __PASTY_PLUGIN_ATTACHMENT__ PluginAttachmentPayload     (attachmentRenderer mode only)
  //   - __PASTY_PLUGIN_THEME__     PluginThemeTokenSnapshot
  //   - __PASTY_PLUGIN_DRAFT__     Record<string, unknown>      (action mode only)
  // (pasty-plugin-search and pasty-plugin-action-session were both deleted.)
  window.__PASTY_PLUGIN_CONTEXT__ = null;
  window.__PASTY_PLUGIN_ITEM__ = null;
  window.__PASTY_PLUGIN_ATTACHMENT__ = null;
  window.__PASTY_PLUGIN_THEME__ = null;
  window.__PASTY_PLUGIN_DRAFT__ = null;

  const pluginID = String(bootstrap.pluginID ?? "plugin.template.full");
  const themeSnapshot = buildThemeSnapshot(
    (scenario as { accentHex?: string }).accentHex ?? "#2563EB",
  );

  if (selectedView.value === "renderer") {
    const context = { mode: "attachmentRenderer", pluginID };
    const itemPayload = bootstrap.item;
    const attachmentPayload = {
      item: bootstrap.item,
      attachment: bootstrap.attachment,
    };
    window.__PASTY_PLUGIN_CONTEXT__ = context;
    window.__PASTY_PLUGIN_ITEM__ = itemPayload;
    window.__PASTY_PLUGIN_ATTACHMENT__ = attachmentPayload;
    window.__PASTY_PLUGIN_THEME__ = themeSnapshot;
    dispatchEvent("pasty-plugin-context", context);
    dispatchEvent("pasty-plugin-item", itemPayload);
    dispatchEvent("pasty-plugin-attachment", attachmentPayload);
    dispatchEvent("pasty-plugin-theme", themeSnapshot);
    statusMessage.value = `Renderer preview loaded: ${scenario.label}`;
    return;
  }

  // Action view — no more PluginActionSession injection. Wire only carries
  // context + item + draft + theme; the action plugin self-renders its title
  // and button strip via pasty.action.setButtons after load.
  const context = { mode: "action", pluginID };
  const itemPayload = bootstrap.item;
  const draftPayload = bootstrap.draft ?? {};
  window.__PASTY_PLUGIN_CONTEXT__ = context;
  window.__PASTY_PLUGIN_ITEM__ = itemPayload;
  window.__PASTY_PLUGIN_DRAFT__ = draftPayload;
  window.__PASTY_PLUGIN_THEME__ = themeSnapshot;
  dispatchEvent("pasty-plugin-context", context);
  dispatchEvent("pasty-plugin-item", itemPayload);
  dispatchEvent("pasty-plugin-draft", draftPayload);
  dispatchEvent("pasty-plugin-theme", themeSnapshot);
  statusMessage.value = `Action preview loaded: ${scenario.label}`;
}

function syncQuery(): void {
  const next = new URL(window.location.href);
  next.searchParams.set("view", selectedView.value);
  next.searchParams.set("scenario", selectedScenarioID.value);
  next.searchParams.set("theme", selectedTheme.value);
  window.history.replaceState({}, "", next);
}

function startResize(event: PointerEvent): void {
  event.preventDefault();
  stopResize();

  const view = selectedView.value;
  resizeSession = {
    view,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startWidth: viewportSizes[view].width,
    startHeight: viewportSizes[view].height
  };

  window.addEventListener("pointermove", handleResizePointerMove);
  window.addEventListener("pointerup", stopResize);
  window.addEventListener("pointercancel", stopResize);
}

function stopResize(): void {
  resizeSession = null;
  window.removeEventListener("pointermove", handleResizePointerMove);
  window.removeEventListener("pointerup", stopResize);
  window.removeEventListener("pointercancel", stopResize);
}

function handleResizePointerMove(event: PointerEvent): void {
  if (!resizeSession) {
    return;
  }

  const { view, startPointerX, startPointerY, startWidth, startHeight } = resizeSession;
  const minimumSize = minimumViewportSizes[view];

  viewportSizes[view].width = Math.max(
    minimumSize.width,
    Math.round(startWidth + (event.clientX - startPointerX))
  );
  viewportSizes[view].height = Math.max(
    minimumSize.height,
    Math.round(startHeight + (event.clientY - startPointerY))
  );
}

onBeforeUnmount(() => {
  stopResize();
});
</script>

<style scoped>
.workbench {
  min-height: 100%;
  padding: 24px;
  color: #e2e8f0;
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.22), transparent 24%),
    linear-gradient(180deg, #111827, #0f172a);
}

.workbench[data-theme="light"] {
  color: #0f172a;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 24%),
    linear-gradient(180deg, #e2e8f0, #cbd5e1);
}

.workbench__controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.workbench__control {
  display: grid;
  gap: 6px;
}

.workbench__control span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.72);
}

.workbench[data-theme="light"] .workbench__control span {
  color: rgba(15, 23, 42, 0.62);
}

.workbench__control select {
  min-width: 170px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(15, 23, 42, 0.48);
  color: inherit;
}

.workbench[data-theme="light"] .workbench__control select {
  background: rgba(255, 255, 255, 0.82);
}

.workbench__canvas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 20px;
  align-items: start;
}

.host-frame {
  padding: 18px;
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.34);
  border: 1px solid rgba(45, 212, 191, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: auto;
}

.workbench[data-theme="light"] .host-frame {
  background: rgba(248, 250, 252, 0.52);
  border-color: rgba(148, 163, 184, 0.28);
}

.host-frame__title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(226, 232, 240, 0.8);
}

.workbench[data-theme="light"] .host-frame__title {
  color: rgba(15, 23, 42, 0.7);
}

.host-frame__surface {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.host-frame__viewport-shell {
  display: grid;
  gap: 8px;
  justify-items: start;
}

.host-frame__viewport {
  flex: none;
}

.host-frame__webview {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
}

.host-frame__chrome {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding-right: 4px;
}

.host-frame__chrome-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.88);
}

.host-frame__resize-handle {
  width: 20px;
  height: 20px;
  border: 0;
  padding: 0;
  border-radius: 999px;
  background:
    linear-gradient(135deg, transparent 0 48%, rgba(148, 163, 184, 0.82) 48% 56%, transparent 56% 100%),
    rgba(15, 23, 42, 0.78);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.22);
  cursor: nwse-resize;
}

.host-frame__resize-handle:hover {
  background:
    linear-gradient(135deg, transparent 0 48%, rgba(226, 232, 240, 0.96) 48% 56%, transparent 56% 100%),
    rgba(15, 23, 42, 0.92);
}

.host-frame__strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.host-frame__button {
  appearance: none;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(30, 41, 59, 0.54);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.host-frame__button--primary {
  background: rgba(15, 23, 42, 0.9);
  color: #f8fafc;
}

.workbench[data-theme="light"] .host-frame__button {
  background: rgba(255, 255, 255, 0.82);
  color: #334155;
}

.workbench[data-theme="light"] .host-frame__button--primary {
  background: #0f172a;
  color: #f8fafc;
}

.workbench[data-theme="light"] .host-frame__chrome-label {
  color: rgba(71, 85, 105, 0.92);
}

.workbench[data-theme="light"] .host-frame__resize-handle {
  background:
    linear-gradient(135deg, transparent 0 48%, rgba(71, 85, 105, 0.82) 48% 56%, transparent 56% 100%),
    rgba(255, 255, 255, 0.92);
}

.workbench__notes {
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.42);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.workbench[data-theme="light"] .workbench__notes {
  background: rgba(255, 255, 255, 0.76);
}

.workbench__notes-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workbench__notes-body,
.workbench__notes-status {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(226, 232, 240, 0.78);
}

.workbench[data-theme="light"] .workbench__notes-body,
.workbench[data-theme="light"] .workbench__notes-status {
  color: rgba(15, 23, 42, 0.72);
}

.workbench__notes-status {
  font-weight: 600;
}

@media (max-width: 980px) {
  .workbench__canvas {
    grid-template-columns: minmax(0, 1fr);
  }

  .workbench__notes {
    order: -1;
  }
}
</style>
