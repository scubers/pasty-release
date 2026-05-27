<template>
  <section class="topic-monitor">
    <p class="topic-monitor__title">Topic Monitor</p>
    <details
      v-for="topic in topics"
      :key="topic.name"
      class="topic-monitor__item"
    >
      <summary class="topic-monitor__summary">
        <span class="topic-monitor__name">{{ topic.name }}</span>
        <span v-if="topic.updatedAt" class="topic-monitor__updated">
          updated {{ topic.updatedAt }}
        </span>
      </summary>
      <pre class="topic-monitor__body">{{ topic.serialized }}</pre>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";
import { useTopicRef } from "../../../../shared/composables/useTopicRef";

interface TopicState {
  serialized: string;
  updatedAt: string;
}

const pluginContext = useTopicRef(pasty.pluginContext);
const item = useTopicRef(pasty.item);
const attachment = useTopicRef(pasty.item.attachment);
const theme = useTopicRef(pasty.theme);

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "undefined";
}

function nowShort(): string {
  return new Date().toLocaleTimeString();
}

// Per-topic state keyed by display name. We dedupe re-emits with the same
// payload (e.g. the host re-broadcasting an unchanged theme snapshot) so the
// "updated" timestamp and the JSON body do not flicker.
const state = reactive<Record<string, TopicState>>({
  "pasty.pluginContext": { serialized: serialize(pluginContext.value), updatedAt: "" },
  "pasty.item": { serialized: serialize(item.value), updatedAt: "" },
  "pasty.item.attachment": { serialized: serialize(attachment.value), updatedAt: "" },
  "pasty.theme": { serialized: serialize(theme.value), updatedAt: "" },
});

function trackTopic(name: string, valueRef: Readonly<{ value: unknown }>): void {
  watch(valueRef, (next) => {
    const nextSerialized = serialize(next);
    if (nextSerialized === state[name].serialized) return;
    state[name] = { serialized: nextSerialized, updatedAt: nowShort() };
  });
}

trackTopic("pasty.pluginContext", pluginContext);
trackTopic("pasty.item", item);
trackTopic("pasty.item.attachment", attachment);
trackTopic("pasty.theme", theme);

// pasty.item.search topic was removed in plugin-api-shrink — search terms are
// no longer injected to attachment renderers; Node detectors handle filtering.
const topics = computed(() => [
  { name: "pasty.pluginContext", ...state["pasty.pluginContext"] },
  { name: "pasty.item", ...state["pasty.item"] },
  { name: "pasty.item.attachment", ...state["pasty.item.attachment"] },
  { name: "pasty.theme", ...state["pasty.theme"] },
]);
</script>

<style scoped>
.topic-monitor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: var(--pasty-surface, #ffffff);
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
}

.topic-monitor__title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.topic-monitor__item {
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
  border-radius: 8px;
  overflow: hidden;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
}

.topic-monitor__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.topic-monitor__summary::-webkit-details-marker {
  display: none;
}

.topic-monitor__name {
  font-size: 11px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-weight: 700;
  color: var(--pasty-text-primary, #0f172a);
  flex: 1;
}

.topic-monitor__updated {
  font-size: 10px;
  color: var(--pasty-text-tertiary, #64748b);
  white-space: nowrap;
}

.topic-monitor__body {
  margin: 0;
  padding: 6px 10px 8px;
  font-size: 10px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  line-height: 1.4;
  color: var(--pasty-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
  border-top: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}
</style>
