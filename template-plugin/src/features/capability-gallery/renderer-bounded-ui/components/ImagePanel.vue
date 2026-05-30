<template>
  <section class="image-panel">
    <p class="image-panel__title">Image Asset</p>

    <div class="image-panel__row">
      <p class="image-panel__label">Current item image (<code>pasty.asset.currentItemImageUrl</code>)</p>
      <img
        v-if="currentImageUrl"
        :src="currentImageUrl"
        alt="Current clipboard image"
        class="image-panel__img"
      />
      <p v-else class="image-panel__placeholder">not an image item</p>
    </div>

    <div class="image-panel__row">
      <button
        type="button"
        class="image-panel__btn"
        @click="generateSolidImage"
      >
        <span class="image-panel__btn-label">Generate solid image (Node)</span>
        <code class="image-panel__btn-sig">pasty.runtime.invoke(createSolidImage)</code>
      </button>
      <img
        v-if="generatedImageUrl"
        :src="generatedImageUrl"
        alt="Generated solid image"
        class="image-panel__img"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";
import { GALLERY_RPC_KEYS, type GallerySolidImageResponse } from "../../runtime/messages";

interface LogEntry {
  ts: string;
  api: string;
  args?: unknown;
  result?: unknown;
  error?: { message: string };
}

const emit = defineEmits<{
  log: [entry: LogEntry];
}>();

const currentImageUrl = ref<string | null>(null);
const generatedImageUrl = ref<string | null>(null);

onMounted(async () => {
  const ts = new Date().toISOString();
  try {
    const response = await pasty.asset.currentItemImageUrl();
    currentImageUrl.value = response.url ?? null;
    emit("log", {
      ts,
      api: "pasty.asset.currentItemImageUrl()",
      result: response,
    });
  } catch (err) {
    emit("log", {
      ts,
      api: "pasty.asset.currentItemImageUrl()",
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }
});

async function generateSolidImage(): Promise<void> {
  const ts = new Date().toISOString();
  try {
    const response = await pasty.runtime.invoke<GallerySolidImageResponse>({
      key: GALLERY_RPC_KEYS.createSolidImage,
      payload: {},
    });
    generatedImageUrl.value = response.url;
    emit("log", {
      ts,
      api: `pasty.runtime.invoke({ key: "${GALLERY_RPC_KEYS.createSolidImage}" })`,
      result: response,
    });
  } catch (err) {
    emit("log", {
      ts,
      api: `pasty.runtime.invoke({ key: "${GALLERY_RPC_KEYS.createSolidImage}" })`,
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}
</script>

<style scoped>
.image-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: var(--pasty-surface, #ffffff);
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
}

.image-panel__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.image-panel__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-panel__label {
  margin: 0;
  font-size: 11px;
  color: var(--pasty-text-secondary, #475569);
  line-height: 1.4;
}

.image-panel__label code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  color: var(--pasty-text-primary, #0f172a);
}

.image-panel__placeholder {
  margin: 0;
  font-size: 11px;
  font-style: italic;
  color: var(--pasty-text-tertiary, #64748b);
}

.image-panel__img {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
  align-self: flex-start;
}

.image-panel__btn {
  appearance: none;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  color: var(--pasty-text-primary, #0f172a);
  cursor: pointer;
  text-align: left;
}

.image-panel__btn:focus-visible {
  outline: 2px solid var(--pasty-accent, #2563EB);
  outline-offset: 2px;
}

.image-panel__btn:active {
  opacity: 0.7;
}

.image-panel__btn-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--pasty-text-primary, #0f172a);
}

.image-panel__btn-sig {
  font-size: 9px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  color: var(--pasty-text-tertiary, #64748b);
}
</style>
