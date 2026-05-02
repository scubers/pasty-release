export function createActionBridge() {
  function readBootstrap() {
    return window.__PASTY_PLUGIN_ACTION_BOOTSTRAP__ ?? null;
  }

  function subscribe(eventName, callback) {
    const handler = (event) => callback(event.detail ?? null);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }

  return {
    getSession() {
      return readBootstrap();
    },
    onBootstrap(callback) {
      return subscribe("pasty-plugin-action-bootstrap", callback);
    },
    onDraftUpdated(callback) {
      return subscribe("pasty-plugin-action-bootstrap", callback);
    },
    updateDraft({ draft, disabledButtonIDs = [], defaultButtonID = null }) {
      if (window.webkit?.messageHandlers?.pastyPluginActionDraft) {
        window.webkit.messageHandlers.pastyPluginActionDraft.postMessage({
          draft,
          disabledButtonIDs: disabledButtonIDs,
          defaultButtonID: defaultButtonID
        });
        return;
      }
      console.info("action.updateDraft", draft, disabledButtonIDs, defaultButtonID);
    },
    invokeOperation(buttonID, { draft } = {}) {
      if (window.webkit?.messageHandlers?.pastyPluginActionRun) {
        window.webkit.messageHandlers.pastyPluginActionRun.postMessage({
          buttonID,
          buttonTitle: buttonID,
          draft: draft || {}
        });
        return;
      }
      console.info("action.invokeOperation", buttonID, draft || {});
    }
  };
}
