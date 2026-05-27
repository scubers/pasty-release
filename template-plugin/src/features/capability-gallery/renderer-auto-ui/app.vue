<template>
  <main class="auto-shell">
    <header class="auto-shell__header">
      <p class="auto-shell__eyebrow">Gallery · height="auto"</p>
      <h1 class="auto-shell__title">Content drives container</h1>
      <p class="auto-shell__subtitle">
        No <code>pasty.window.setHeight</code> calls — host sizes to content.
      </p>
    </header>

    <section class="auto-shell__panel">
      <p class="auto-shell__section-label">pluginContext</p>
      <pre class="auto-shell__snapshot">{{ formatJSON(pluginContextSnapshot) }}</pre>
    </section>

    <section class="auto-shell__panel">
      <p class="auto-shell__section-label">item</p>
      <pre class="auto-shell__snapshot">{{ formatJSON(itemSnapshot) }}</pre>
    </section>

    <section class="auto-shell__growable">
      <p class="auto-shell__section-label">growable content</p>
      <ol class="auto-shell__list">
        <li v-for="line in growLines" :key="line">{{ line }}</li>
      </ol>
      <button class="auto-shell__button" type="button" @click="appendLine">Append line</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";
import { useTopicRef } from "../../../shared/composables/useTopicRef";

const pluginContext = useTopicRef(pasty.pluginContext);
const itemTopic = useTopicRef(pasty.item);

const pluginContextSnapshot = computed(() => pluginContext.value ?? null);
const itemSnapshot = computed(() => itemTopic.value ?? null);

const growLines = ref<string[]>([
  "Initial line — observe the host shell grow as new lines are appended.",
]);

function appendLine(): void {
  growLines.value = [...growLines.value, `line @ ${new Date().toLocaleTimeString()}`];
}

function formatJSON(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}
</script>

<style scoped>
.auto-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--pasty-surface, #ffffff);
  color: var(--pasty-text-primary, #0f172a);
  font-size: 12px;
}

.auto-shell__header {
  display: grid;
  gap: 4px;
}

.auto-shell__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.auto-shell__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--pasty-text-primary, #0f172a);
}

.auto-shell__subtitle {
  margin: 0;
  font-size: 11px;
  color: var(--pasty-text-secondary, #475569);
}

.auto-shell__subtitle code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
}

.auto-shell__panel,
.auto-shell__growable {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
  border-radius: 8px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
}

.auto-shell__section-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.auto-shell__snapshot {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--pasty-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
}

.auto-shell__list {
  margin: 0;
  padding-left: 18px;
  font-size: 11px;
  color: var(--pasty-text-primary, #0f172a);
}

.auto-shell__list li {
  margin-bottom: 2px;
}

.auto-shell__button {
  appearance: none;
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.5));
  background: var(--pasty-surface-elevated, #f1f5f9);
  color: var(--pasty-text-primary, #0f172a);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  align-self: flex-start;
}

.auto-shell__button:focus-visible {
  outline: 2px solid var(--pasty-accent, #2563EB);
  outline-offset: 2px;
}
</style>
