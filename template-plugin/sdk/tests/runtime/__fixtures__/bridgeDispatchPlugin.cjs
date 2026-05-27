"use strict";

// Minimal plugin fixture for bridgeModeDispatch tests.
// Exposes one attachmentRenderer + one auto-run action + one draft action.

let autoRunCallCount = 0;

module.exports = {
  setup(_init) {
    return {
      attachmentRenderers: {
        demoRenderer: {
          async resolveAttachment(input, _ctx) {
            return {
              displayName: "Demo",
              shouldDisplay: true,
              buttons: []
            };
          }
        }
      },
      actions: {
        autoRunAction: {
          async runAutoAction(input, _ctx) {
            autoRunCallCount += 1;
            return { resultKind: "none" };
          }
        },
        draftAction: {
          async resolveSession(_input, _ctx) {
            return { displayName: "Draft", buttons: [] };
          }
        }
      },
      detectors: {
        demoDetector: {
          async detect(input, _ctx) {
            return { artifacts: [] };
          }
        }
      },
      getAutoRunCallCount() { return autoRunCallCount; }
    };
  }
};
