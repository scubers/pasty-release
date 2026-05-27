<template>
  <main class="fixed-shell">
    <header class="fixed-shell__header">
      <p class="fixed-shell__eyebrow">Gallery · fixed 240px</p>
      <h1 class="fixed-shell__title">{{ title }}</h1>
    </header>
    <section class="fixed-shell__panel">
      <p class="fixed-shell__section-label">item.attachment</p>
      <pre class="fixed-shell__snapshot">{{ formatJSON(attachmentSnapshot) }}</pre>
    </section>
    <section class="fixed-shell__panel">
      <p class="fixed-shell__section-label">theme tokens</p>
      <pre class="fixed-shell__snapshot">{{ formatJSON(themeSnapshot) }}</pre>
    </section>
    <p v-if="lastHostInvoke" class="fixed-shell__footer">
      last host invoke: <strong>{{ lastHostInvoke }}</strong>
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";
import { useTopicRef } from "../../../shared/composables/useTopicRef";
import { decodeGalleryPayload } from "../runtime/payloads";

const attachmentPayload = useTopicRef(pasty.item.attachment);
const themePayload = useTopicRef(pasty.theme);

const lastHostInvoke = ref<string>("");

const decoded = computed(() => decodeGalleryPayload(attachmentPayload.value?.attachment?.payloadJson));

const title = computed(() => decoded.value?.title ?? "Gallery (fixed)");

const attachmentSnapshot = computed(() => decoded.value ?? null);
const themeSnapshot = computed(() => themePayload.value ?? null);

function formatJSON(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

let unsubHostInvoke: (() => void) | null = null;

onMounted(async () => {
  await pasty.attachmentRenderer.setButtons({
    buttons: [
      { id: "ping-fixed", title: "Ping", isEnabled: true },
    ],
  });
  unsubHostInvoke = pasty.attachmentRenderer.onHostInvoke.on((detail) => {
    lastHostInvoke.value = `${detail?.buttonID ?? "<unknown>"} @ ${new Date().toLocaleTimeString()}`;
  });
});

onUnmounted(() => {
  if (typeof unsubHostInvoke === "function") {
    unsubHostInvoke();
    unsubHostInvoke = null;
  }
});
</script>

<style scoped>
.fixed-shell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--pasty-surface, #ffffff);
  color: var(--pasty-text-primary, #0f172a);
  font-size: 11px;
}

.fixed-shell__header {
  display: grid;
  gap: 2px;
}

.fixed-shell__eyebrow {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.fixed-shell__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--pasty-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fixed-shell__panel {
  display: grid;
  gap: 2px;
  padding: 4px 6px;
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
  border-radius: 6px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  overflow: hidden;
}

.fixed-shell__section-label {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.fixed-shell__snapshot {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 9.5px;
  line-height: 1.3;
  color: var(--pasty-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 60px;
  overflow: auto;
}

.fixed-shell__footer {
  margin: auto 0 0;
  font-size: 10px;
  color: var(--pasty-text-tertiary, #64748b);
}
</style>
