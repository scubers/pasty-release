<template>
  <main class="draft-shell">
    <header class="draft-shell__header">
      <p class="draft-shell__eyebrow">Gallery · draft action</p>
      <h1 class="draft-shell__title">Action-scope capability tour</h1>
      <p class="draft-shell__subtitle">
        Covers <code>pasty.action.setButtons</code> and the 3 <code>complete()</code> result kinds.
        Host-side buttons fire <code>pasty.action.onHostInvoke</code>.
      </p>
    </header>

    <section class="draft-shell__panel">
      <p class="draft-shell__section-label">draft (pasty.action.draft)</p>
      <div class="draft-shell__form">
        <label class="draft-shell__field">
          <span>scratchText</span>
          <textarea v-model="draft.scratchText" rows="2" class="draft-shell__input" />
        </label>
        <label class="draft-shell__field">
          <span>buttonsConfigVariant</span>
          <select v-model="draft.buttonsConfigVariant" class="draft-shell__input">
            <option value="default">default</option>
            <option value="compact">compact</option>
            <option value="verbose">verbose</option>
          </select>
        </label>
      </div>
      <pre class="draft-shell__snapshot">{{ formatJSON(draftSnapshot) }}</pre>
    </section>

    <section class="draft-shell__panel">
      <p class="draft-shell__section-label">UI-side capability catalog</p>
      <p class="draft-shell__hint">
        These are the action-scope verbs invokable from the draft UI. Clicking
        completes the draft (or cycles host buttons).
      </p>
      <div class="draft-shell__grid">
        <button
          v-for="button in galleryActionCapabilities"
          :key="button.id"
          class="draft-shell__btn"
          type="button"
          @click="handleClick(button)"
        >
          <strong class="draft-shell__btn-label">{{ button.label }}</strong>
          <code class="draft-shell__btn-api">{{ button.apiSignature }}</code>
          <span class="draft-shell__btn-desc">{{ button.description }}</span>
        </button>
      </div>
    </section>

    <section class="draft-shell__panel draft-shell__panel--log">
      <p class="draft-shell__section-label">log (host invokes + action.complete)</p>
      <ol class="draft-shell__log">
        <li v-for="(entry, idx) in logEntries" :key="idx" :class="{ 'draft-shell__log-entry--error': entry.error }">
          <span class="draft-shell__log-ts">{{ entry.ts }}</span>
          <span class="draft-shell__log-api">{{ entry.api }}</span>
          <span v-if="entry.detail" class="draft-shell__log-detail">{{ entry.detail }}</span>
        </li>
        <li v-if="logEntries.length === 0" class="draft-shell__log-empty">
          (no events yet — click a button or wait for host invoke)
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import type { PluginActionSetButtonsPayload } from "@pasty/plugin-sdk/ui";
import { pasty } from "@pasty/plugin-sdk/ui";
import { useTopicRef } from "../../../shared/composables/useTopicRef";
import { decodeGalleryDraft, type GalleryDraft } from "../runtime/draft";
import { GALLERY_RPC_KEYS } from "../runtime/messages";
import { galleryActionCapabilities, type GalleryActionButton } from "./catalog";

interface LogEntry {
  ts: string;
  api: string;
  detail?: string;
  error?: boolean;
}

const draftTopic = useTopicRef(pasty.action.draft);

const draft = reactive<GalleryDraft>({ scratchText: "", buttonsConfigVariant: "default" });

const initialRaw = pasty.action.draft.current();
if (initialRaw) {
  Object.assign(draft, decodeGalleryDraft(initialRaw));
}

watch(draftTopic, (raw) => {
  if (raw) Object.assign(draft, decodeGalleryDraft(raw));
});

const draftSnapshot = computed(() => ({ ...draft }));

const logEntries = ref<LogEntry[]>([]);

function pushLog(entry: LogEntry): void {
  const next = [{ ...entry }, ...logEntries.value];
  if (next.length > 30) next.length = 30;
  logEntries.value = next;
}

function formatJSON(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

const BUTTON_VARIANTS: Record<GalleryDraft["buttonsConfigVariant"], PluginActionSetButtonsPayload["buttons"]> = {
  default: [
    { id: "cycle-buttons", title: "Cycle setButtons", isEnabled: true },
    { id: "complete-text", title: "Complete (text)", isEnabled: true },
    { id: "complete-image", title: "Complete (image)", isEnabled: true },
    { id: "complete-none", title: "Complete (none)", isEnabled: true },
  ],
  compact: [
    { id: "cycle-buttons", title: "Cycle", isEnabled: true },
    { id: "complete-none", title: "Done", isEnabled: true },
  ],
  verbose: [
    { id: "cycle-buttons", title: "Cycle setButtons (compact)", isEnabled: true },
    { id: "complete-text", title: "Complete with text resultKind", isEnabled: true },
    { id: "complete-image", title: "Complete with image resultKind (needs image item)", isEnabled: true },
    { id: "complete-none", title: "Complete with none resultKind", isEnabled: true },
  ],
};

function nextVariant(current: GalleryDraft["buttonsConfigVariant"]): GalleryDraft["buttonsConfigVariant"] {
  if (current === "default") return "compact";
  if (current === "compact") return "verbose";
  return "default";
}

async function cycleButtons(): Promise<void> {
  const next = nextVariant(draft.buttonsConfigVariant);
  draft.buttonsConfigVariant = next;
  await pasty.action.setButtons({ buttons: BUTTON_VARIANTS[next] });
  pushLog({ ts: new Date().toISOString(), api: "pasty.action.setButtons", detail: `variant=${next}` });
}

async function completeText(): Promise<void> {
  const text = draft.scratchText.trim().length > 0
    ? draft.scratchText
    : `Gallery draft text result @ ${new Date().toLocaleString()}`;
  await pasty.action.complete({ result: { resultKind: "text", text }, userMessage: "Gallery: text complete" });
  pushLog({ ts: new Date().toISOString(), api: "pasty.action.complete", detail: "resultKind=text" });
}

async function completeImage(): Promise<void> {
  const ts = new Date().toISOString();
  try {
    const response = await pasty.runtime.invoke<{ imageTempPath: string; imageFormatHint: string }>({
      key: GALLERY_RPC_KEYS.copyImageFlow,
      payload: {},
    });
    pushLog({ ts, api: "pasty.runtime.invoke(copyImageFlow)", detail: response?.imageTempPath ?? "<no path>" });
    if (!response?.imageTempPath) {
      throw new Error("runtime returned no imageTempPath");
    }
    await pasty.action.complete({
      result: { resultKind: "image", imageTempPath: response.imageTempPath, imageFormatHint: response.imageFormatHint },
      userMessage: "Gallery: image complete",
    });
    pushLog({ ts: new Date().toISOString(), api: "pasty.action.complete", detail: "resultKind=image" });
  } catch (err) {
    pushLog({
      ts,
      api: "pasty.action.complete(image)",
      detail: err instanceof Error ? err.message : String(err),
      error: true,
    });
  }
}

async function completeNone(): Promise<void> {
  await pasty.action.complete({ result: { resultKind: "none" }, userMessage: "Gallery: none complete" });
  pushLog({ ts: new Date().toISOString(), api: "pasty.action.complete", detail: "resultKind=none" });
}

async function handleClick(button: GalleryActionButton): Promise<void> {
  if (button.id === "action-setButtons") return cycleButtons();
  if (button.id === "action-complete-text") return completeText();
  if (button.id === "action-complete-image") return completeImage();
  if (button.id === "action-complete-none") return completeNone();
}

let unsubHostInvoke: (() => void) | null = null;

async function handleHostInvoke(detail: { buttonID?: string } | null | undefined): Promise<void> {
  const buttonID = detail?.buttonID;
  pushLog({
    ts: new Date().toISOString(),
    api: "pasty.action.onHostInvoke",
    detail: `buttonID=${buttonID ?? "<none>"}`,
  });
  if (buttonID === "cycle-buttons") return cycleButtons();
  if (buttonID === "complete-text") return completeText();
  if (buttonID === "complete-image") return completeImage();
  if (buttonID === "complete-none") return completeNone();
}

onMounted(async () => {
  await pasty.action.setButtons({ buttons: BUTTON_VARIANTS[draft.buttonsConfigVariant] });
  unsubHostInvoke = pasty.action.onHostInvoke.on(handleHostInvoke);
});

onUnmounted(() => {
  if (typeof unsubHostInvoke === "function") {
    unsubHostInvoke();
    unsubHostInvoke = null;
  }
});
</script>

<style scoped>
.draft-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--pasty-surface, #ffffff);
  color: var(--pasty-text-primary, #0f172a);
  font-size: 12px;
}

.draft-shell__header {
  display: grid;
  gap: 4px;
}

.draft-shell__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.draft-shell__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--pasty-text-primary, #0f172a);
}

.draft-shell__subtitle {
  margin: 0;
  color: var(--pasty-text-secondary, #475569);
  font-size: 11px;
  line-height: 1.45;
}

.draft-shell__subtitle code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
}

.draft-shell__panel {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
  border-radius: 10px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
}

.draft-shell__panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.draft-shell__section-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.draft-shell__chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--pasty-accent, #2563EB);
  color: var(--pasty-accent-contrast, #ffffff);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.draft-shell__snapshot {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--pasty-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 140px;
  overflow: auto;
}

.draft-shell__form {
  display: grid;
  gap: 6px;
}

.draft-shell__field {
  display: grid;
  gap: 3px;
}

.draft-shell__field span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.draft-shell__input {
  width: 100%;
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.5));
  background: var(--pasty-surface, #ffffff);
  color: var(--pasty-text-primary, #0f172a);
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 6px;
}

.draft-shell__hint {
  margin: 0;
  color: var(--pasty-text-tertiary, #64748b);
  font-size: 10.5px;
}

.draft-shell__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px;
}

.draft-shell__btn {
  display: grid;
  gap: 2px;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.5));
  border-radius: 8px;
  background: var(--pasty-surface, #ffffff);
  cursor: pointer;
}

.draft-shell__btn:hover {
  background: var(--pasty-surface-elevated, #f1f5f9);
}

.draft-shell__btn:focus-visible {
  outline: 2px solid var(--pasty-accent, #2563EB);
  outline-offset: 2px;
}

.draft-shell__btn-label {
  font-size: 11px;
  color: var(--pasty-text-primary, #0f172a);
}

.draft-shell__btn-api {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 9.5px;
  color: var(--pasty-text-tertiary, #64748b);
}

.draft-shell__btn-desc {
  font-size: 10px;
  color: var(--pasty-text-secondary, #475569);
}

.draft-shell__panel--log {
  background: var(--pasty-surface, #ffffff);
}

.draft-shell__log {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: grid;
  gap: 2px;
  max-height: 160px;
  overflow: auto;
}

.draft-shell__log li {
  display: grid;
  grid-template-columns: 70px 220px 1fr;
  gap: 6px;
  align-items: baseline;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  color: var(--pasty-text-secondary, #475569);
}

.draft-shell__log-entry--error {
  color: #dc2626;
}

.draft-shell__log-ts {
  color: var(--pasty-text-tertiary, #64748b);
}

.draft-shell__log-api {
  color: var(--pasty-text-primary, #0f172a);
}

.draft-shell__log-empty {
  grid-column: 1 / -1;
  color: var(--pasty-text-tertiary, #64748b);
  font-style: italic;
}
</style>
