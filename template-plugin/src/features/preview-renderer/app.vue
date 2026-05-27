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

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";
import { useTopicRef } from "../../shared/composables/useTopicRef";
import { decodeTemplatePreviewPayload } from "./payload";
import type { TemplatePreviewPayload } from "./payload";
import type { PluginAttachmentPayload } from "@pasty/plugin-sdk/ui";

interface DisplayFact {
  label: string;
  value: string;
}

const attachmentPayload = useTopicRef(pasty.item.attachment);
const item = useTopicRef(pasty.item);

const payload = computed<TemplatePreviewPayload | null>(() =>
  decodeTemplatePreviewPayload((attachmentPayload.value as PluginAttachmentPayload | undefined)?.attachment?.payloadJson)
);

const visibleFacts = computed<DisplayFact[]>(() => Array.isArray(payload.value?.display?.facts)
  ? payload.value.display.facts.slice(0, 3)
  : []);

// pasty.item.search topic was removed in plugin-api-shrink; the renderer no
// longer receives search terms (Node detectors do the filtering instead).
const searchHint = computed<string>(() => "Use the host action strip below for copy operations.");

let unsubHostInvoke: (() => void) | null = null;

onMounted(async () => {
  try {
    await pasty.attachmentRenderer.setButtons({ buttons: [
      { id: "copy-payload-json", title: "Copy Payload JSON" },
      { id: "copy-renderer-context", title: "Copy Renderer Context" },
    ]});
  } catch {
    // Context guard rejection (running outside an attachment WebView)
    // is benign — skip button seeding and still register the listener so
    // the rest of the page works in mixed-context preview scenarios.
  }

  unsubHostInvoke = pasty.attachmentRenderer.onHostInvoke.on(async (detail) => {
    const buttonID = detail?.buttonID;
    if (buttonID === "copy-payload-json") {
      const text = JSON.stringify(payload.value ?? attachmentPayload.value, null, 2);
      await pasty.clipboard.copyText({ text });
    } else if (buttonID === "copy-renderer-context") {
      const ctx = {
        item: item.value,
        attachment: attachmentPayload.value,
      };
      await pasty.clipboard.copyText({ text: JSON.stringify(ctx, null, 2) });
    }
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
    linear-gradient(
      180deg,
      var(--pasty-surface, rgba(248, 250, 252, 0.96)),
      var(--pasty-surface-elevated, rgba(241, 245, 249, 0.92))
    );
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.22));
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
  color: var(--pasty-text-tertiary, #64748b);
}

.preview-panel__title {
  margin: 4px 0 0;
  font-size: 17px;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--pasty-text-primary, #0f172a);
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
  background: var(--pasty-surface-elevated, rgba(226, 232, 240, 0.88));
  color: var(--pasty-text-secondary, #334155);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-panel__summary {
  margin: 0;
  color: var(--pasty-text-secondary, #475569);
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
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}

.preview-panel__fact dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.preview-panel__fact dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--pasty-text-primary, #0f172a);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-panel__hint {
  margin: 0;
  padding-top: 2px;
  color: var(--pasty-text-tertiary, #64748b);
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
  color: var(--pasty-text-primary, #0f172a);
}

.empty-state__body {
  margin: 8px 0 0;
  color: var(--pasty-text-tertiary, #64748b);
  font-size: 13px;
  line-height: 1.45;
}
</style>
