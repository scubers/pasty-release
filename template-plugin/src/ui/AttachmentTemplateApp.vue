<template>
  <main class="shell attachment-shell">
    <section v-if="payload" class="preview-panel">
      <header class="preview-panel__header">
        <div class="preview-panel__heading">
          <p class="preview-panel__eyebrow">Attachment Preview</p>
          <h1 class="preview-panel__title">{{ payload.display.headline }}</h1>
        </div>
        <span class="preview-panel__kind">{{ payload.display.typeLabel }}</span>
      </header>

      <p class="preview-panel__summary">{{ payload.display.subheadline }}</p>

      <dl class="preview-panel__facts">
        <div
          v-for="fact in visibleFacts"
          :key="fact.label"
          class="preview-panel__fact"
        >
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>

      <p class="preview-panel__hint">
        {{ searchHint }}
      </p>
    </section>

    <div v-else class="empty-state">
      <p class="empty-state__title">Waiting for attachment preview</p>
      <p class="empty-state__body">Open the renderer from a detected attachment to inspect the live session.</p>
    </div>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { usePluginAttachmentSession } from "./composables/usePluginAttachmentSession";

const { payload, session } = usePluginAttachmentSession();

const visibleFacts = computed(() => Array.isArray(payload.value?.display?.facts)
  ? payload.value.display.facts.slice(0, 3)
  : []);

const searchHint = computed(() => {
  const terms = Array.isArray(session.searchTerms) ? session.searchTerms : [];
  if (terms.length > 0) {
    return `Search hits: ${terms.join(", ")}`;
  }
  return "Use the host action strip below for copy operations.";
});
</script>

<style scoped>
.attachment-shell {
  height: 100%;
  /* padding: 14px 16px 12px; */
  background: none;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
  height: 100%;
  min-height: 0;
  padding: 14px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.92));
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.preview-panel__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}

.preview-panel__heading {
  flex: 1 1 auto;
  min-width: 0;
}

.preview-panel__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.preview-panel__title {
  margin: 4px 0 0;
  font-size: 17px;
  line-height: 1.18;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-panel__kind {
  flex: 0 0 auto;
  max-width: 96px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(226, 232, 240, 0.88);
  color: #334155;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-panel__summary {
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}

.preview-panel__facts {
  display: grid;
  gap: 7px;
  margin: 0;
  min-height: 0;
}

.preview-panel__fact {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.78);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.preview-panel__fact dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.preview-panel__fact dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-panel__hint {
  margin: 0;
  padding-top: 2px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.empty-state {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 16px;
  text-align: center;
}

.empty-state__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.empty-state__body {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
</style>
