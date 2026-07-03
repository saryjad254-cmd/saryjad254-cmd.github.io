/**
 * @file EventBus Unit Tests
 */
describe('EventBus', () => {
  beforeEach(() => {
    // Don't call EventBus.clear() (no args) - it would remove persistent listeners
    // like the analytics tracking wired by services/index.js.
    // Tests should clean up their own listeners via the unsubscribe function returned by on().
  });

  it('should be exposed on window', () => {
    TestRunner.ok(window.EventBus, 'EventBus is defined');
    TestRunner.ok(Object.isFrozen(window.EventBus), 'EventBus is frozen');
  });

  it('on() should subscribe to events', () => {
    let called = false;
    window.EventBus.on('test:event', () => { called = true; });
    window.EventBus.emit('test:event');
    TestRunner.ok(called, 'Handler was called');
  });

  it('emit() should pass payload to handlers', () => {
    let received = null;
    window.EventBus.on('test:event', (payload) => { received = payload; });
    window.EventBus.emit('test:event', { foo: 'bar', n: 42 });
    TestRunner.deepEqual(received, { foo: 'bar', n: 42 }, 'Payload received');
  });

  it('on() should return unsubscribe function', () => {
    let count = 0;
    const off = window.EventBus.on('test:event', () => { count++; });
    window.EventBus.emit('test:event');
    TestRunner.equal(count, 1, 'Called once');
    off();
    window.EventBus.emit('test:event');
    TestRunner.equal(count, 1, 'Still 1 after unsubscribe');
  });

  it('once() should fire only once', () => {
    let count = 0;
    window.EventBus.once('test:event', () => { count++; });
    window.EventBus.emit('test:event');
    window.EventBus.emit('test:event');
    window.EventBus.emit('test:event');
    TestRunner.equal(count, 1, 'Fired only once');
  });

  it('should support multiple subscribers', () => {
    let count = 0;
    window.EventBus.on('test:event', () => count++);
    window.EventBus.on('test:event', () => count++);
    window.EventBus.on('test:event', () => count++);
    window.EventBus.emit('test:event');
    TestRunner.equal(count, 3, 'All 3 subscribers called');
  });

  it('handler errors should not break other handlers', () => {
    let secondCalled = false;
    window.EventBus.on('test:event', () => { throw new Error('boom'); });
    window.EventBus.on('test:event', () => { secondCalled = true; });
    // Should not throw
    try {
      window.EventBus.emit('test:event');
      TestRunner.ok(true, 'Did not throw');
    } catch (e) {
      TestRunner.ok(false, 'Should not have thrown: ' + e.message);
    }
    TestRunner.ok(secondCalled, 'Second handler still called');
  });

  it('clear(event) should remove specific channel', () => {
    let count = 0;
    window.EventBus.on('test:a', () => count++);
    window.EventBus.on('test:b', () => count++);
    window.EventBus.clear('test:a');
    window.EventBus.emit('test:a');
    window.EventBus.emit('test:b');
    TestRunner.equal(count, 1, 'Only test:b fired');
  });

  it('clear() with no args should remove all', () => {
    let count = 0;
    window.EventBus.on('test:a', () => count++);
    window.EventBus.on('test:b', () => count++);
    window.EventBus.clear();
    window.EventBus.emit('test:a');
    window.EventBus.emit('test:b');
    TestRunner.equal(count, 0, 'No events fired after clear()');
  });

  it('listenerCount() should return count', () => {
    window.EventBus.on('test:event', () => {});
    window.EventBus.on('test:event', () => {});
    TestRunner.equal(window.EventBus.listenerCount('test:event'), 2, '2 listeners');
    TestRunner.equal(window.EventBus.listenerCount('nonexistent'), 0, '0 for unknown');
  });

  it('should be safe with null/undefined handlers', () => {
    // on() with bad args should return no-op function, not throw
    const result = window.EventBus.on(null, () => {});
    TestRunner.equal(typeof result, 'function', 'Returns a function even with bad args');
    TestRunner.equal(result(), undefined, 'Returned function is no-op');
    // emit with no subscribers should not throw
    let threw = false;
    try { window.EventBus.emit('nonexistent:event', { foo: 'bar' }); } catch(_) { threw = true; }
    TestRunner.notOk(threw, 'emit() with no subscribers is safe');
  });
});