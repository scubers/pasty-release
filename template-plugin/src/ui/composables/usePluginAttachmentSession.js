import { computed, onMounted, onUnmounted, reactive, readonly } from "vue";
import { createAttachmentBridge } from "../sdk/createAttachmentBridge";

function safeParsePayload(payloadJson) {
  try {
    return JSON.parse(payloadJson || "{}");
  } catch {
    return null;
  }
}

export function usePluginAttachmentSession() {
  const bridge = createAttachmentBridge();

  function readBootstrapFromWindow() {
    const bootstrap = bridge.getSession();
    if (!bootstrap) {
      return null;
    }

    return {
      session: bootstrap,
      item: bootstrap.item ?? null,
      attachment: bootstrap.attachment ?? null
    };
  }

  function applyBootstrap(bootstrap) {
    if (!bootstrap) {
      return false;
    }

    const session = bootstrap.session ?? bootstrap;
    state.session = session;
    state.item = bootstrap.item ?? session.item ?? null;
    state.attachment = bootstrap.attachment ?? session.attachment ?? null;
    return true;
  }

  const state = reactive({
    session: null,
    item: null,
    attachment: null,
    searchTerms: [],
    accentHex: null
  });

  applyBootstrap(readBootstrapFromWindow());

  function handleBootstrap(event) {
    applyBootstrap({
      session: event.detail,
      item: event.detail?.item ?? null,
      attachment: event.detail?.attachment ?? null
    });
  }

  function handleAttachmentUpdated(event) {
    state.item = event.detail?.item ?? state.item;
    state.attachment = event.detail?.attachment ?? state.attachment;
  }

  function handleSearchUpdated(event) {
    state.searchTerms = Array.isArray(event.detail?.searchTerms)
      ? event.detail.searchTerms
      : [];
  }

  function handleThemeUpdated(event) {
    state.accentHex = event.detail?.accentHex ?? null;
  }

  onMounted(() => {
    window.addEventListener("pasty-plugin-bootstrap", handleBootstrap);
    window.addEventListener("pasty-plugin-attachment-updated", handleAttachmentUpdated);
    window.addEventListener("pasty-plugin-search-updated", handleSearchUpdated);
    window.addEventListener("pasty-plugin-theme-updated", handleThemeUpdated);

    if (!applyBootstrap(readBootstrapFromWindow())) {
      window.requestAnimationFrame(() => {
        applyBootstrap(readBootstrapFromWindow());
      });
    }
  });

  onUnmounted(() => {
    window.removeEventListener("pasty-plugin-bootstrap", handleBootstrap);
    window.removeEventListener("pasty-plugin-attachment-updated", handleAttachmentUpdated);
    window.removeEventListener("pasty-plugin-search-updated", handleSearchUpdated);
    window.removeEventListener("pasty-plugin-theme-updated", handleThemeUpdated);
  });

  const payload = computed(() => safeParsePayload(state.attachment?.payloadJson));
  const actions = computed(() => state.session?.buttons ?? []);

  return {
    actions,
    payload,
    session: readonly(state),
    invokeAction: bridge.invokeOperation
  };
}
