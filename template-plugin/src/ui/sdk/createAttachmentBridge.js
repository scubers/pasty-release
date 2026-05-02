export function createAttachmentBridge() {
  function readBootstrap() {
    return window.__PASTY_PLUGIN_BOOTSTRAP__ ?? null;
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
    onAttachmentUpdated(callback) {
      return subscribe("pasty-plugin-attachment-updated", callback);
    },
    onSearchUpdated(callback) {
      return subscribe("pasty-plugin-search-updated", callback);
    },
    onThemeUpdated(callback) {
      return subscribe("pasty-plugin-theme-updated", callback);
    },
    invokeOperation(buttonID, params = {}) {
      if (window.webkit?.messageHandlers?.pastyPluginAction) {
        window.webkit.messageHandlers.pastyPluginAction.postMessage({ actionID: buttonID, params });
        return;
      }
      console.info("attachment.invokeOperation", buttonID, params);
    }
  };
}
