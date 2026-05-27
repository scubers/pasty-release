<template>
  <section class="log-panel">
    <p class="log-panel__title">Log</p>
    <div v-if="displayEntries.length === 0" class="log-panel__empty">No entries yet.</div>
    <ul v-else class="log-panel__list">
      <li
        v-for="(entry, i) in displayEntries"
        :key="i"
        class="log-entry"
        :class="{ 'log-entry--error': entry.error }"
      >
        <div class="log-entry__header">
          <span class="log-entry__ts">{{ entry.ts }}</span>
          <code class="log-entry__api">{{ entry.api }}</code>
        </div>
        <pre v-if="entry.args !== undefined" class="log-entry__pre">{{ serialize(entry.args) }}</pre>
        <pre v-if="entry.result !== undefined" class="log-entry__pre log-entry__pre--result">{{ serialize(entry.result) }}</pre>
        <pre v-if="entry.error" class="log-entry__pre log-entry__pre--error">{{ entry.error.message }}</pre>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface LogEntry {
  ts: string;
  api: string;
  args?: unknown;
  result?: unknown;
  error?: { message: string };
}

const props = withDefaults(defineProps<{
  entries: LogEntry[];
  maxEntries?: number;
}>(), {
  maxEntries: 50,
});

const displayEntries = computed(() => props.entries.slice(0, props.maxEntries));

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
</script>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: var(--pasty-surface, #ffffff);
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
}

.log-panel__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.log-panel__empty {
  font-size: 11px;
  color: var(--pasty-text-tertiary, #64748b);
}

.log-panel__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}

.log-entry--error {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(254, 242, 242, 0.8);
}

.log-entry__header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.log-entry__ts {
  font-size: 10px;
  color: var(--pasty-text-tertiary, #64748b);
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  white-space: nowrap;
}

.log-entry__api {
  font-size: 10px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  color: var(--pasty-text-primary, #0f172a);
  font-weight: 700;
}

.log-entry__pre {
  margin: 0;
  font-size: 10px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  line-height: 1.4;
  color: var(--pasty-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
}

.log-entry__pre--result {
  color: var(--pasty-text-primary, #0f172a);
}

.log-entry__pre--error {
  color: #dc2626;
}
</style>
