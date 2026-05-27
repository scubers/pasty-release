'use strict';
// Contract tests for internal topic/stream factories.
// Node 25+ supports require()ing .ts files directly (strip-types built-in).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  createTopic,
  createStream,
} = require('../../src/internal/topic.ts');

describe('createTopic', () => {
  test('current() returns the initial value', () => {
    const t = createTopic(42);
    assert.equal(t.current(), 42);
  });

  test('createTopic() with no initial: current() returns undefined', () => {
    const t = createTopic();
    assert.equal(t.current(), undefined);
  });

  test('createTopic(v): current() returns v', () => {
    const t = createTopic('hello');
    assert.equal(t.current(), 'hello');
  });

  test('set() updates current()', () => {
    const t = createTopic('a');
    t.set('b');
    assert.equal(t.current(), 'b');
  });

  test('set() triggers registered listener and updates current()', () => {
    const t = createTopic(0);
    const received = [];
    t.on((v) => received.push(v));
    t.set(99);
    assert.deepEqual(received, [99]);
    assert.equal(t.current(), 99);
  });

  test('multi-subscribe: all listeners receive the new value', () => {
    const t = createTopic(0);
    const received1 = [];
    const received2 = [];
    t.on((v) => received1.push(v));
    t.on((v) => received2.push(v));
    t.set(1);
    t.set(2);
    assert.deepEqual(received1, [1, 2]);
    assert.deepEqual(received2, [1, 2]);
  });

  test('unsubscribe: listener not called after unsubscribe()', () => {
    const t = createTopic(0);
    const received = [];
    const unsub = t.on((v) => received.push(v));
    t.set(1);
    unsub();
    t.set(2);
    assert.deepEqual(received, [1]);
  });

  test('listener throw is isolated: other listeners still fire', () => {
    const t = createTopic(0);
    const received = [];
    t.on(() => { throw new Error('bad listener'); });
    t.on((v) => received.push(v));
    t.set(99);
    assert.deepEqual(received, [99]);
  });

  test('unsubscribe is idempotent: calling twice does not throw', () => {
    const t = createTopic(0);
    const unsub = t.on(() => {});
    unsub();
    assert.doesNotThrow(() => unsub());
  });
});

describe('createStream', () => {
  test('on() + emit(): listener receives emitted values', () => {
    const s = createStream();
    const received = [];
    s.on((v) => received.push(v));
    s.emit('a');
    s.emit('b');
    assert.deepEqual(received, ['a', 'b']);
  });

  test('unsubscribe stops the listener', () => {
    const s = createStream();
    const received = [];
    const unsub = s.on((v) => received.push(v));
    s.emit(1);
    unsub();
    s.emit(2);
    assert.deepEqual(received, [1]);
  });

  test('multi-subscribe: all listeners receive each emit', () => {
    const s = createStream();
    const a = [];
    const b = [];
    s.on((v) => a.push(v));
    s.on((v) => b.push(v));
    s.emit(42);
    assert.deepEqual(a, [42]);
    assert.deepEqual(b, [42]);
  });

  test('listener throw is isolated: subsequent listeners still fire', () => {
    const s = createStream();
    const received = [];
    s.on(() => { throw new Error('stream bad listener'); });
    s.on((v) => received.push(v));
    s.emit('test');
    assert.deepEqual(received, ['test']);
  });
});
