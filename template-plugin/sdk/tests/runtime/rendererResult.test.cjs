'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// rendererResult was removed from the public runtime export when invokeOperation was
// removed from AttachmentRendererHandler. Button side effects now live in the WebView
// UI using pasty.* verbs. This test verifies the symbol is no longer on the public surface.
describe('rendererResult', () => {
  it('rendererResult is no longer exported from the public runtime surface', () => {
    const runtimeExports = require('../../dist/runtime/index.cjs');
    assert.equal(
      runtimeExports.rendererResult,
      undefined,
      'rendererResult must not be exported after invokeOperation removal'
    );
  });
});
