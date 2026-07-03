/**
 * @file AnalyticsService Unit Tests
 */
describe('AnalyticsService', () => {
  beforeEach(() => {
    if (window.AnalyticsService) window.AnalyticsService.clear();
    if (window.AnalyticsService) window.AnalyticsService.resetSession();
  });

  it('should be exposed on window', () => {
    TestRunner.ok(window.AnalyticsService, 'AnalyticsService is defined');
    TestRunner.ok(Object.isFrozen(window.AnalyticsService), 'Is frozen');
  });

  it('should have MAX_EVENTS constant', () => {
    TestRunner.equal(window.AnalyticsService.MAX_EVENTS, 200, 'MAX_EVENTS = 200');
  });

  it('track() should add events', () => {
    const before = window.AnalyticsService.count();
    window.AnalyticsService.track('test_event');
    const after = window.AnalyticsService.count();
    TestRunner.equal(after, before + 1, 'Event count increased');
  });

  it('tracked event should have proper structure', () => {
    window.AnalyticsService.track('test_event', { foo: 'bar' });
    const events = window.AnalyticsService.getEvents('test_event');
    TestRunner.equal(events.length, 1, 'Has 1 event');
    const evt = events[0];
    TestRunner.equal(evt.name, 'test_event', 'Name matches');
    TestRunner.equal(evt.properties.foo, 'bar', 'Property preserved');
    TestRunner.ok(evt.sessionId, 'Has sessionId');
    TestRunner.ok(evt.ts, 'Has timestamp');
  });

  it('getEvents(name) should filter by name', () => {
    window.AnalyticsService.track('event_a');
    window.AnalyticsService.track('event_b');
    window.AnalyticsService.track('event_a');
    TestRunner.equal(window.AnalyticsService.getEvents('event_a').length, 2, '2 of event_a');
    TestRunner.equal(window.AnalyticsService.getEvents('event_b').length, 1, '1 of event_b');
  });

  it('flush() should return and clear events', () => {
    window.AnalyticsService.track('test', { a: 1 });
    window.AnalyticsService.track('test', { b: 2 });
    const flushed = window.AnalyticsService.flush();
    TestRunner.equal(flushed.length, 2, 'Flushed 2 events');
    TestRunner.equal(window.AnalyticsService.count(), 0, 'Cleared after flush');
  });

  it('should respect MAX_EVENTS cap', () => {
    window.AnalyticsService.clear();
    for (let i = 0; i < 250; i++) {
      window.AnalyticsService.track('bulk_event');
    }
    TestRunner.lessThan(window.AnalyticsService.count(), 201, 'Capped at 200');
  });

  it('sessionId should be stable across calls', () => {
    window.AnalyticsService.resetSession();
    window.AnalyticsService.track('a');
    const id1 = window.AnalyticsService.getEvents()[0].sessionId;
    window.AnalyticsService.track('b');
    const id2 = window.AnalyticsService.getEvents()[1].sessionId;
    TestRunner.equal(id1, id2, 'Same sessionId');
  });

  it('resetSession() should generate new session', () => {
    window.AnalyticsService.track('a');
    const id1 = window.AnalyticsService.getEvents()[0].sessionId;
    window.AnalyticsService.resetSession();
    window.AnalyticsService.track('b');
    const id2 = window.AnalyticsService.getEvents()[1].sessionId;
    TestRunner.notEqual(id1, id2, 'Different sessionId after reset');
  });

  it('export() should return valid JSON', () => {
    window.AnalyticsService.track('test');
    const json = window.AnalyticsService.export();
    const parsed = JSON.parse(json);
    TestRunner.ok(Array.isArray(parsed), 'Valid JSON array');
  });

  it('should emit to EventBus', () => {
    let received = null;
    const off = window.EventBus.on('analytics:track', (e) => { received = e; });
    window.AnalyticsService.track('test_event', { foo: 'bar' });
    TestRunner.ok(received, 'EventBus received event');
    TestRunner.equal(received.name, 'test_event', 'Name matches');
    off();
  });
});