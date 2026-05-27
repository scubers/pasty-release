// Internal topic/stream factory helpers shared by generated bootstrap code.
// Implementations were previously in ui/internal/topic.ts; moved here so
// generated code can import from a single stable location.

export type Unsubscribe = () => void;

export interface Stream<T> {
  on(listener: (event: T) => void): Unsubscribe;
}

export interface Topic<T> extends Stream<T> {
  current(): T | undefined;
}

export interface MutableTopic<T> extends Topic<T> {
  set(value: T): void;
}

export interface MutableStream<T> extends Stream<T> {
  emit(event: T): void;
}

export function createTopic<T>(initial?: T): MutableTopic<T> {
  let value: T | undefined = initial;
  const listeners = new Set<(v: T) => void>();
  return {
    current: () => value,
    on(listener: (v: T) => void): Unsubscribe {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: T): void {
      value = next;
      for (const l of listeners) {
        try { l(value); } catch { /* isolate listener errors */ }
      }
    },
  };
}

export function createStream<T>(): MutableStream<T> {
  const listeners = new Set<(v: T) => void>();
  return {
    on(listener: (v: T) => void): Unsubscribe {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event: T): void {
      for (const l of listeners) {
        try { l(event); } catch { /* isolate listener errors */ }
      }
    },
  };
}

/**
 * Read a window global by name and return its value (or undefined in
 * non-browser environments such as Node test runners).
 */
export function readWindowGlobal<T = unknown>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as Record<string, T | undefined>)[key];
}
