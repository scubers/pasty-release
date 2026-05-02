<template>
  <main class="shell action-shell">
    <section v-if="sessionState.action" class="editor-panel">
      <header class="editor-panel__header">
        <div class="editor-panel__heading">
          <p class="editor-panel__eyebrow">Action</p>
          <h1 class="editor-panel__title">
            {{ sessionState.displayName || sessionState.action.title }}
          </h1>
        </div>
        <label class="editor-panel__toggle" aria-label="Pin item when applying metadata">
          <input v-model="shouldPin" type="checkbox" />
          <span>Pin</span>
        </label>
      </header>

      <div class="editor-panel__fields">
        <label class="editor-panel__field">
          <span class="editor-panel__label">Tag</span>
          <input
            v-model="templateTag"
            class="editor-panel__input"
            type="text"
            placeholder="Add a short tag"
          />
        </label>

        <label class="editor-panel__field">
          <span class="editor-panel__label">Note</span>
          <textarea
            v-model="note"
            class="editor-panel__textarea"
            placeholder="Optional note"
          />
        </label>
      </div>

      <p class="editor-panel__hint">
        Draft updates sync live. Use the host action strip to copy or submit.
      </p>
    </section>

    <div v-else class="empty-state">
      <p class="empty-state__title">Waiting for action session</p>
      <p class="empty-state__body">Open the template draft action from Action Panel to inspect the live input.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, watch } from "vue";
import { usePluginActionSession } from "./composables/usePluginActionSession";

const {
  session,
  syncDraft
} = usePluginActionSession();

const sessionState = session;
const templateTag = ref("");
const note = ref("");
const shouldPin = ref(false);

watch(
  () => sessionState.draft,
  (draft) => {
    templateTag.value = String(draft?.templateTag ?? "");
    note.value = String(draft?.note ?? "");
    shouldPin.value = Boolean(draft?.shouldPin);
  },
  { immediate: true, deep: true }
);

function buildDraftPayload() {
  return {
    title: sessionState.draft?.title ?? "",
    templateTag: templateTag.value,
    note: note.value,
    shouldPin: shouldPin.value,
    __templateDebug: {
      sessionSnapshot: {
        pluginID: sessionState.pluginID,
        actionID: sessionState.actionID,
        action: sessionState.action,
        item: sessionState.item,
        displayName: sessionState.displayName,
        buttons: sessionState.buttons,
        defaultButtonID: sessionState.defaultButtonID
      }
    }
  };
}

watch(
  [templateTag, note, shouldPin],
  () => {
    syncDraft(buildDraftPayload());
  },
  { immediate: true }
);
</script>

<style scoped>
.action-shell {
  height: 100%;
  /* padding: 14px 16px 12px; */
  background: none;
}

.editor-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: flex-start;
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

.editor-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.editor-panel__heading {
  min-width: 0;
}

.editor-panel__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.editor-panel__title {
  margin: 4px 0 0;
  font-size: 17px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-panel__fields {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.editor-panel__field {
  min-width: 0;
}

.editor-panel__label {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
}

.editor-panel__input,
.editor-panel__textarea {
  width: 100%;
  border-radius: 11px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(248, 250, 252, 0.88);
  padding: 9px 10px;
  font-size: 12px;
  color: #0f172a;
  outline: none;
}

.editor-panel__textarea {
  min-height: 58px;
  max-height: 58px;
  resize: none;
}

.editor-panel__input:focus,
.editor-panel__textarea:focus {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.editor-panel__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.92);
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.editor-panel__hint {
  margin: auto 0 0;
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
