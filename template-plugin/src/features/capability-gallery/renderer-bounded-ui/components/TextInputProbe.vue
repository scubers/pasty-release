<template>
  <section class="text-input-probe">
    <p class="text-input-probe__title">Text Input Probe</p>
    <label class="text-input-probe__label" for="probe-input">
      Focus / blur this input to signal text-input state to the host:
    </label>
    <input
      id="probe-input"
      v-model="inputValue"
      class="text-input-probe__input"
      type="text"
      placeholder="Type here to test focus signaling"
      @focus="handleFocus"
      @blur="handleBlur"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
    />
    <div class="text-input-probe__status">
      <span
        class="text-input-probe__badge"
        :class="isFocused ? 'text-input-probe__badge--focused' : 'text-input-probe__badge--blurred'"
      >{{ isFocused ? "focused" : "blurred" }}</span>
      <span v-if="isComposing" class="text-input-probe__badge text-input-probe__badge--composing">composing</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { pasty } from "@pasty/plugin-sdk/ui";

const emit = defineEmits<{
  log: [payload: { ts: string; api: string; args: unknown }];
}>();

const inputValue = ref<string>("");
const isFocused = ref<boolean>(false);
const isComposing = ref<boolean>(false);

async function signal(state: { isFocused: boolean; isComposing: boolean }): Promise<void> {
  const ts = new Date().toISOString();
  await pasty.textInput.stateChanged(state);
  emit("log", {
    ts,
    api: "pasty.textInput.stateChanged({ isFocused, isComposing })",
    args: state,
  });
}

async function handleFocus(): Promise<void> {
  isFocused.value = true;
  await signal({ isFocused: true, isComposing: isComposing.value });
}

async function handleBlur(): Promise<void> {
  isFocused.value = false;
  isComposing.value = false;
  await signal({ isFocused: false, isComposing: false });
}

async function handleCompositionStart(): Promise<void> {
  isComposing.value = true;
  await signal({ isFocused: isFocused.value, isComposing: true });
}

async function handleCompositionEnd(): Promise<void> {
  isComposing.value = false;
  await signal({ isFocused: isFocused.value, isComposing: false });
}
</script>

<style scoped>
.text-input-probe {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: var(--pasty-surface, #ffffff);
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
}

.text-input-probe__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pasty-text-tertiary, #64748b);
}

.text-input-probe__label {
  font-size: 11px;
  color: var(--pasty-text-secondary, #475569);
  line-height: 1.4;
}

.text-input-probe__input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--pasty-border, rgba(148, 163, 184, 0.3));
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.88));
  padding: 8px 10px;
  font-size: 12px;
  color: var(--pasty-text-primary, #0f172a);
  outline: none;
}

.text-input-probe__input:focus {
  border-color: var(--pasty-accent, #0f172a);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.text-input-probe__status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-input-probe__badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.text-input-probe__badge--focused {
  background: rgba(37, 99, 235, 0.12);
  color: var(--pasty-accent, #2563EB);
  border: 1px solid rgba(37, 99, 235, 0.3);
}

.text-input-probe__badge--blurred {
  background: var(--pasty-surface-elevated, rgba(248, 250, 252, 0.78));
  color: var(--pasty-text-tertiary, #64748b);
  border: 1px solid var(--pasty-border, rgba(226, 232, 240, 0.9));
}

.text-input-probe__badge--composing {
  background: rgba(234, 179, 8, 0.12);
  color: #92400e;
  border: 1px solid rgba(234, 179, 8, 0.3);
}
</style>
