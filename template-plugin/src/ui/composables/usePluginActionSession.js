import { onMounted, onUnmounted, reactive, readonly } from "vue";
import { createActionBridge } from "../sdk/createActionBridge";

export function usePluginActionSession() {
  const bridge = createActionBridge();
  const state = reactive({
    pluginID: "",
    actionID: "",
    action: null,
    item: null,
    displayName: null,
    draft: {},
    buttons: [],
    defaultButtonID: null
  });

  function applyBootstrap(bootstrap) {
    if (!bootstrap) {
      return;
    }

    state.pluginID = bootstrap.pluginID || "";
    state.actionID = bootstrap.actionID || "";
    state.action = bootstrap.action || null;
    state.item = bootstrap.item || null;
    state.displayName = bootstrap.displayName || null;
    state.draft = bootstrap.draft || {};
    state.buttons = bootstrap.buttons || [];
    state.defaultButtonID = bootstrap.defaultButtonID || null;
  }

  function handleBootstrap(event) {
    applyBootstrap(event.detail);
  }

  onMounted(() => {
    applyBootstrap(bridge.getSession());
    window.addEventListener("pasty-plugin-action-bootstrap", handleBootstrap);
  });

  onUnmounted(() => {
    window.removeEventListener("pasty-plugin-action-bootstrap", handleBootstrap);
  });

  return {
    session: readonly(state),
    syncDraft(updateDraft) {
      state.draft = { ...updateDraft };
      bridge.updateDraft({
        draft: state.draft,
        disabledButtonIDs: [],
        defaultButtonID: state.defaultButtonID
      });
    },
    runAction(request) {
      bridge.invokeOperation(request.buttonID, { draft: request.draft });
    }
  };
}
