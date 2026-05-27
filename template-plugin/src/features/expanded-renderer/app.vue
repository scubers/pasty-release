<template>
  <main class="shell expanded-shell">
    <section v-if="payload" class="expanded-panel">
      <!--
        Accent strip uses an inline style driven by tokenSnapshot.accent. CSS
        var() would normally be enough, but this single decoration demonstrates
        the pasty.theme.on() API for cases (canvas, JS-computed colors)
        where CSS var() is not enough.
      -->
      <div
        class="expanded-panel__accent"
        :style="{ backgroundColor: accentHex || 'var(--pasty-accent, #2563EB)' }"
        aria-hidden="true"
      />

      <header class="expanded-panel__header">
        <p class="expanded-panel__eyebrow">Expanded Preview</p>
        <h1 class="expanded-panel__title">{{ payload.display.headline }}</h1>
        <p class="expanded-panel__subtitle">{{ payload.display.subheadline }}</p>
      </header>

      <dl class="expanded-panel__facts">
        <div
          v-for="fact in payload.display.facts"
          :key="fact.label"
          class="expanded-panel__fact"
        >
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>

      <section v-if="extendedInfo" class="expanded-panel__extended">
        <p class="expanded-panel__section-label">Item Metadata</p>
        <div class="expanded-panel__meta-row">
          <span class="expanded-panel__meta-key">Source</span>
          <span class="expanded-panel__meta-value">
            {{ extendedInfo.sourceAppID || "Unknown" }}
          </span>
        </div>
        <div v-if="extendedInfo.tags?.length" class="expanded-panel__chips">
          <span
            v-for="tag in extendedInfo.tags"
            :key="tag"
            class="expanded-panel__chip"
          >{{ tag }}</span>
        </div>
      </section>

      <section v-if="showDebug" class="expanded-panel__debug">
        <p class="expanded-panel__section-label">Debug Payload</p>
        <pre class="expanded-panel__debug-body">{{ debugBlock }}</pre>
      </section>

      <footer class="expanded-panel__footer">
        <button
          class="expanded-panel__toggle"
          type="button"
          @click="toggleDebug"
        >
          {{ showDebug ? "Hide Debug" : "Show Debug" }}
        </button>
        <span class="expanded-panel__hint">
          Card height follows content. Toggle Debug to see autoFit drive pasty.window.setHeight.
        </span>
      </footer>
    </section>

    <div v-else class="empty-state">
      <p class="empty-state__title">Waiting for expanded preview</p>
      <p class="empty-state__body">
        Open the expanded renderer from a detected attachment to inspect the live session.
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";
import { autoFit } from "@pasty/plugin-sdk/dom";
import { useTopicRef } from "../../shared/composables/useTopicRef";
import { decodeTemplateExpandedPayload } from "./payload";
import type { TemplateExpandedPayload, TemplateExpandedExtended } from "./payload";
import type { PluginAttachmentPayload } from "@pasty/plugin-sdk/ui";

const attachmentPayload = useTopicRef(pasty.item.attachment);
const themeTopic = useTopicRef(pasty.theme);

const payload = computed<TemplateExpandedPayload | null>(() =>
  decodeTemplateExpandedPayload((attachmentPayload.value as PluginAttachmentPayload | undefined)?.attachment?.payloadJson)
);

const accentHex = computed<string | null>(() => {
  const tokens = (themeTopic.value as any)?.tokens as Record<string, string> | undefined;
  return tokens?.["--pasty-accent"] ?? null;
});

const showDebug = ref<boolean>(false);

let disconnectAutoFit: (() => void) | null = null;
let unsubHostInvoke: (() => void) | null = null;

async function handleRendererAction(detail: { buttonID?: string } | null | undefined): Promise<void> {
  const buttonID = detail?.buttonID;
  if (buttonID === "toggle-debug") {
    toggleDebug();
  } else if (buttonID === "copy-debug-json") {
    await pasty.clipboard.copyText({ text: debugBlock.value });
  }
}

function toggleDebug(): void {
  showDebug.value = !showDebug.value;
}

// AutoFit must observe `.expanded-panel` (content-sized — no `height: 100%`)
// rather than `document.body` so scrollHeight tracks growth AND shrink. But
// `.expanded-panel` is rendered with `v-if="payload"` — and the host normally
// pushes the bootstrap event AFTER onMounted, so payload is null when
// onMounted runs and the element doesn't exist yet. Watch `payload` and
// attach on the first transition to truthy. Numbers here MUST stay in sync
// with manifest.json — covered by a unit test.
async function attachAutoFitIfReady(): Promise<void> {
  if (disconnectAutoFit || !payload.value) {
    return;
  }
  await nextTick();
  const target = document.querySelector(".expanded-panel") as HTMLElement | null;
  if (!target) {
    return;
  }
  disconnectAutoFit = autoFit({ min: 120, max: 480, target });
}

onMounted(async () => {
  await pasty.attachmentRenderer.setButtons({ buttons: [
    { id: "toggle-debug", title: showDebug.value ? "Hide Debug" : "Show Debug", isEnabled: true },
    { id: "copy-debug-json", title: "Copy Debug JSON", isEnabled: true },
  ]});

  watch(showDebug, async (visible) => {
    await pasty.attachmentRenderer.setButtons({ buttons: [
      { id: "toggle-debug", title: visible ? "Hide Debug" : "Show Debug", isEnabled: true },
      { id: "copy-debug-json", title: "Copy Debug JSON", isEnabled: true },
    ]});
  });

  // Subscribe to host action invocations (e.g. "toggle-debug" button)
  unsubHostInvoke = pasty.attachmentRenderer.onHostInvoke.on(handleRendererAction);

  // Fires immediately for sync-available bootstrap; otherwise fires when the
  // attachment topic fires after didFinish.
  watch(payload, attachAutoFitIfReady, { immediate: true });
});

onUnmounted(() => {
  if (typeof unsubHostInvoke === "function") {
    unsubHostInvoke();
    unsubHostInvoke = null;
  }
  if (typeof disconnectAutoFit === "function") {
    disconnectAutoFit();
    disconnectAutoFit = null;
  }
});

const extendedInfo = computed<TemplateExpandedExtended | null>(() => payload.value?.extended ?? null);

const debugBlock = computed<string>(() => {
  if (!payload.value) {
    return "";
  }
  return JSON.stringify(
    {
      kind: payload.value.kind,
      extended: payload.value.extended,
      debug: payload.value.debug
    },
    null,
    2
  );
});
</script>

<style scoped>
.expanded-shell {
  height: 100%;
  background: none;
}

.expanded-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 14px 14px 14px 22px;
  border-radius: 18px;
  background: linear-gradient(
    180deg,
    var(--pasty-surface, #ffffff),
    var(--pasty-surface-elevated, #f5f5f5)
  );
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.expanded-panel__accent {
  position: absolute;
  top: 14px;
  left: 6px;
  bottom: 14px;
  width: 4px;
  border-radius: 999px;
}

.expanded-panel__header {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.expanded-panel__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.expanded-panel__title {
  margin: 0;
  font-size: 17px;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--pasty-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expanded-panel__subtitle {
  margin: 0;
  color: var(--pasty-text-secondary, #475569);
  font-size: 12px;
  line-height: 1.4;
}

.expanded-panel__facts {
  display: grid;
  gap: 6px;
  margin: 0;
}

.expanded-panel__fact {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  margin: 0;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}

.expanded-panel__fact dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.expanded-panel__fact dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--pasty-text-primary, #0f172a);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expanded-panel__extended {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}

.expanded-panel__section-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.expanded-panel__meta-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}

.expanded-panel__meta-key {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--pasty-text-tertiary, #64748b);
}

.expanded-panel__meta-value {
  color: var(--pasty-text-primary, #0f172a);
  font-weight: 600;
}

.expanded-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.expanded-panel__chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--pasty-accent, #2563EB);
  color: var(--pasty-accent-contrast, #ffffff);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.expanded-panel__debug {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px dashed var(--pasty-border, rgba(148, 163, 184, 0.5));
  background: var(--pasty-surface, transparent);
}

.expanded-panel__debug-body {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--pasty-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow: auto;
}

.expanded-panel__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.expanded-panel__toggle {
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
}

.expanded-panel__toggle:focus-visible {
  outline: 2px solid var(--pasty-accent, #2563EB);
  outline-offset: 2px;
}

.expanded-panel__hint {
  flex: 1 1 220px;
  color: var(--pasty-text-tertiary, #64748b);
  font-size: 11px;
  line-height: 1.4;
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
  color: var(--pasty-text-secondary, #475569);
  font-size: 13px;
  line-height: 1.45;
}
</style>
