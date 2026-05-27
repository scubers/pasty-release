<template>
  <section class="capability-board">
    <p class="capability-board__title">Capabilities</p>
    <details
      v-for="section in sections"
      :key="section.id"
      class="capability-board__section"
      open
    >
      <summary class="capability-board__summary">
        <span class="capability-board__section-title">{{ section.title }}</span>
        <span class="capability-board__section-desc">{{ section.description }}</span>
      </summary>
      <div class="capability-board__buttons">
        <button
          v-for="button in section.buttons"
          :key="button.id"
          type="button"
          class="capability-board__btn"
          @click="onInvoke(button)"
        >
          <span class="capability-board__btn-label">{{ button.label }}</span>
          <code class="capability-board__btn-sig">{{ button.apiSignature }}</code>
          <span
            v-if="button.permissionRequired"
            class="capability-board__permission"
          >{{ button.permissionRequired }}</span>
        </button>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import type { CapabilitySection, CapabilityButton } from "../catalog";

defineProps<{
  sections: CapabilitySection[];
  onInvoke: (button: CapabilityButton) => void;
}>();
</script>

<style scoped>
.capability-board {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: var(--pasty-surface, #ffffff);
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
}

.capability-board__title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.capability-board__section {
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
  border-radius: 8px;
  overflow: hidden;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
}

.capability-board__summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.capability-board__summary::-webkit-details-marker {
  display: none;
}

.capability-board__section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--pasty-text-primary, #0f172a);
}

.capability-board__section-desc {
  font-size: 10px;
  color: var(--pasty-text-tertiary, #64748b);
  line-height: 1.4;
}

.capability-board__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px 8px;
  border-top: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}

.capability-board__btn {
  appearance: none;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
  background: var(--pasty-surface, #ffffff);
  color: var(--pasty-text-primary, #0f172a);
  cursor: pointer;
  text-align: left;
  min-width: 0;
}

.capability-board__btn:focus-visible {
  outline: 2px solid var(--pasty-accent, #2563EB);
  outline-offset: 2px;
}

.capability-board__btn:active {
  opacity: 0.7;
}

.capability-board__btn-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--pasty-text-primary, #0f172a);
}

.capability-board__btn-sig {
  font-size: 9px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  color: var(--pasty-text-tertiary, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.capability-board__permission {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--pasty-accent, #2563EB);
  color: var(--pasty-accent-contrast, #ffffff);
}
</style>
