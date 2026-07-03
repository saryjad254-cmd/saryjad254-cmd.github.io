/**
 * @file Logger Service Unit Tests
 */
describe('Logger Service', () => {
  beforeEach(() => {
    if (window.Logger) window.Logger.clearBuffer();
  });

  it('should be exposed on window', () => {
    TestRunner.ok(window.Logger, 'Logger is defined');
    TestRunner.ok(Object.isFrozen(window.Logger), 'Logger is frozen');
  });

  it('should have LEVELS constants', () => {
    TestRunner.ok(window.Logger.LEVELS, 'LEVELS exists');
    TestRunner.equal(window.Logger.LEVELS.DEBUG, 0, 'DEBUG = 0');
    TestRunner.equal(window.Logger.LEVELS.INFO, 1, 'INFO = 1');
    TestRunner.equal(window.Logger.LEVELS.WARN, 2, 'WARN = 2');
    TestRunner.equal(window.Logger.LEVELS.ERROR, 3, 'ERROR = 3');
    TestRunner.equal(window.Logger.LEVELS.NONE, 4, 'NONE = 4');
  });

  it('info() should add to buffer', () => {
    const before = window.Logger.getBuffer().length;
    window.Logger.info('Test', 'Hello world');
    const after = window.Logger.getBuffer().length;
    TestRunner.equal(after, before + 1, 'Buffer grew by 1');
    const last = window.Logger.getBuffer()[after - 1];
    TestRunner.equal(last.level, 'INFO', 'Level is INFO');
    TestRunner.equal(last.tag, 'Test', 'Tag matches');
    TestRunner.equal(last.message, 'Hello world', 'Message matches');
  });

  it('warn() should log at WARN level', () => {
    window.Logger.warn('Test', 'Warn msg');
    const last = window.Logger.getBuffer()[window.Logger.getBuffer().length - 1];
    TestRunner.equal(last.level, 'WARN', 'Level is WARN');
  });

  it('error() should log at ERROR level', () => {
    window.Logger.error('Test', 'Error msg');
    const last = window.Logger.getBuffer()[window.Logger.getBuffer().length - 1];
    TestRunner.equal(last.level, 'ERROR', 'Level is ERROR');
  });

  it('should accept data payload', () => {
    window.Logger.info('Test', 'With data', { foo: 'bar', count: 42 });
    const last = window.Logger.getBuffer()[window.Logger.getBuffer().length - 1];
    TestRunner.deepEqual(last.data, { foo: 'bar', count: 42 }, 'Data preserved');
  });

  it('subscribe() should receive events', () => {
    let received = null;
    const unsub = window.Logger.subscribe((entry) => { received = entry; });
    window.Logger.info('Test', 'Subscribed event');
    TestRunner.ok(received, 'Subscriber received event');
    TestRunner.equal(received.message, 'Subscribed event', 'Message matches');
    unsub();
  });

  it('clearBuffer() should empty buffer', () => {
    window.Logger.info('Test', 'msg1');
    window.Logger.info('Test', 'msg2');
    TestRunner.greaterThan(window.Logger.getBuffer().length, 0, 'Buffer has items');
    window.Logger.clearBuffer();
    TestRunner.equal(window.Logger.getBuffer().length, 0, 'Buffer cleared');
  });

  it('export() should return valid JSON', () => {
    window.Logger.info('Test', 'Export me');
    const json = window.Logger.export();
    const parsed = JSON.parse(json);
    TestRunner.ok(Array.isArray(parsed), 'Export is JSON array');
  });

  it('should respect MAX_BUFFER (100)', () => {
    window.Logger.clearBuffer();
    for (let i = 0; i < 150; i++) {
      window.Logger.info('Test', `Message ${i}`);
    }
    TestRunner.lessThan(window.Logger.getBuffer().length, 101, 'Buffer capped at 100');
  });
});