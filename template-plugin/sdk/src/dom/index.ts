// @pasty/plugin-sdk/dom — opt-in DOM utilities for browser UI entry points.
// These require a browser environment (window, document, ResizeObserver).
export { autoFit } from './autoFit.js';
export type { AutoFitOptions } from './autoFit.js';
export { patchConsole } from './consolePatch.js';
export { patchTextInputState } from './textInputState.js';
export { bindTopicTo } from './topicAdapter.js';
export type { TopicLike } from './topicAdapter.js';
