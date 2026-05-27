<template>
  <section class="runtime-bridge-panel">
    <p class="runtime-bridge-panel__title">Runtime Bridge</p>
    <p class="runtime-bridge-panel__description">
      These buttons exercise the
      <code>pasty.runtime.invoke</code> path — messages travel from the UI
      WebView through the plugin runtime process, which then calls host.*
      APIs and returns the response. Compare results with the equivalent
      direct-UI buttons in the Capabilities board above.
    </p>
    <div v-if="bridgeSection" class="runtime-bridge-panel__buttons">
      <button
        v-for="button in bridgeSection.buttons"
        :key="button.id"
        type="button"
        class="runtime-bridge-panel__btn"
        @click="onInvoke(button)"
      >
        <span class="runtime-bridge-panel__btn-label">{{ button.label }}</span>
        <code class="runtime-bridge-panel__btn-sig">{{ button.apiSignature }}</code>
      </button>
    </div>
    <p v-else class="runtime-bridge-panel__empty">
      No runtime-bridge section found in catalog.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CapabilitySection, CapabilityButton } from "../catalog";

const props = defineProps<{
  sections: CapabilitySection[];
  onInvoke: (button: CapabilityButton) => void;
}>();

const bridgeSection = computed(() =>
  props.sections.find((s) => s.id === "runtime-bridge") ?? null
);
</script>

<style scoped>
.runtime-bridge-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: var(--pasty-surface, #ffffff);
  border: 2px solid var(--pasty-accent, #2563EB);
}

.runtime-bridge-panel__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-accent, #2563EB);
}

.runtime-bridge-panel__description {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--pasty-text-secondary, #475569);
}

.runtime-bridge-panel__description code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  color: var(--pasty-text-primary, #0f172a);
}

.runtime-bridge-panel__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.runtime-bridge-panel__btn {
  appearance: none;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--pasty-accent, #2563EB);
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  color: var(--pasty-text-primary, #0f172a);
  cursor: pointer;
  text-align: left;
}

.runtime-bridge-panel__btn:focus-visible {
  outline: 2px solid var(--pasty-accent, #2563EB);
  outline-offset: 2px;
}

.runtime-bridge-panel__btn:active {
  opacity: 0.7;
}

.runtime-bridge-panel__btn-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--pasty-text-primary, #0f172a);
}

.runtime-bridge-panel__btn-sig {
  font-size: 9px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  color: var(--pasty-accent, #2563EB);
}

.runtime-bridge-panel__empty {
  margin: 0;
  font-size: 11px;
  color: var(--pasty-text-tertiary, #64748b);
}
</style>
