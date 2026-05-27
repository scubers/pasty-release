/**
 * Framework-agnostic helper for binding a SDK topic to any reactive state
 * system (Vue, React, Svelte, plain callbacks, …).
 *
 * `Topic<T>` is the interface from sdk/src/internal/topic.ts.
 * We intentionally replicate the minimal shape here (structural typing) so this
 * file has zero runtime imports — it works equally well in Node test runners and
 * browser bundles.
 */

/** Minimal structural shape satisfied by Topic<T>. */
export interface TopicLike<T> {
  current(): T | undefined;
  on(listener: (value: T) => void): () => void;
}

/**
 * Bind a topic to a setter function and return an unsubscribe handle.
 *
 * Calls `set` immediately with `topic.current()` (which may be `undefined` if
 * the topic has not yet received a value), then subscribes `set` as a listener
 * for future updates.
 *
 * Usage (Vue):
 * ```ts
 * const state = ref<T | undefined>(undefined);
 * const unsub = bindTopicTo(topic, (v) => { state.value = v; });
 * // later:
 * unsub();
 * ```
 */
export function bindTopicTo<T>(
  topic: TopicLike<T>,
  set: (value: T | undefined) => void,
): () => void {
  set(topic.current());
  return topic.on((value) => set(value));
}
