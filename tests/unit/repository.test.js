/**
 * @file OrdersRepository Unit Tests
 */
describe('OrdersRepository', () => {
  it('should be exposed on window', () => {
    TestRunner.ok(window.OrdersRepository, 'OrdersRepository class is defined');
    TestRunner.ok(window.ordersRepository, 'Singleton instance is defined');
  });

  it('class should have expected methods', () => {
    TestRunner.ok(typeof window.OrdersRepository === 'function', 'Is a class');
    const proto = window.OrdersRepository.prototype;
    TestRunner.ok(typeof proto.create === 'function', 'has create()');
    TestRunner.ok(typeof proto.findAll === 'function', 'has findAll()');
    TestRunner.ok(typeof proto.findById === 'function', 'has findById()');
    TestRunner.ok(typeof proto.isHealthy === 'function', 'has isHealthy()');
    TestRunner.ok(typeof proto.getStats === 'function', 'has getStats()');
  });

  it('singleton should have correct config', () => {
    const repo = window.ordersRepository;
    TestRunner.match(repo.baseUrl, /^https?:\/\//, 'Has baseUrl');
    TestRunner.greaterThan(repo.timeoutMs, 0, 'Has timeout');
    TestRunner.equal(repo.enabled, true, 'Is enabled by default');
  });

  it('getStats() should return valid object', () => {
    const stats = window.ordersRepository.getStats();
    TestRunner.hasProperty(stats, 'enabled', 'Has enabled property');
    TestRunner.hasProperty(stats, 'lastSyncAt', 'Has lastSyncAt');
    TestRunner.hasProperty(stats, 'consecutiveErrors', 'Has consecutiveErrors');
    TestRunner.equal(stats.enabled, true, 'enabled is true');
    TestRunner.equal(stats.consecutiveErrors, 0, 'No errors yet');
  });

  it('enable() / disable() should toggle state', () => {
    const repo = window.ordersRepository;
    repo.disable();
    TestRunner.equal(repo.enabled, false, 'Disabled');
    repo.enable();
    TestRunner.equal(repo.enabled, true, 'Re-enabled');
  });

  it('findAll() should return empty array when disabled', async () => {
    const repo = window.ordersRepository;
    repo.disable();
    const result = await repo.findAll();
    TestRunner.deepEqual(result, [], 'Returns empty array when disabled');
    repo.enable();
  });

  it('create() should throw if no id provided', async () => {
    try {
      await window.ordersRepository.create({});
      TestRunner.ok(false, 'Should have thrown');
    } catch (err) {
      TestRunner.equal(err.code, 'E005', 'Validation error code');
      TestRunner.match(err.message, /id/i, 'Error mentions id');
    }
  });

  it('create() should throw if order is null', async () => {
    try {
      await window.ordersRepository.create(null);
      TestRunner.ok(false, 'Should have thrown');
    } catch (err) {
      TestRunner.equal(err.code, 'E005', 'Validation error code');
    }
  });

  it('should be constructable with custom deps', () => {
    const customLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    const repo = new window.OrdersRepository({
      baseUrl: 'https://custom.api.com',
      logger: customLogger,
      timeoutMs: 5000,
    });
    TestRunner.equal(repo.baseUrl, 'https://custom.api.com', 'Custom baseUrl');
    TestRunner.equal(repo.timeoutMs, 5000, 'Custom timeout');
    TestRunner.equal(repo.logger, customLogger, 'Custom logger');
  });
});

describe('OrdersRepository — Live API (integration)', () => {
  // These tests hit the actual Worker. They may fail if Worker is down.
  // Marked separately so CI can skip them.
  it('isHealthy() should return boolean', async () => {
    const healthy = await window.ordersRepository.isHealthy();
    TestRunner.ok(typeof healthy === 'boolean', 'Returns boolean');
  }, { skip: !navigator.onLine });

  it('findAll() should return array', async () => {
    const orders = await window.ordersRepository.findAll();
    TestRunner.ok(Array.isArray(orders), 'Returns array');
  }, { skip: !navigator.onLine });
});