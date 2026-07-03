/**
 * @file Config Service Unit Tests
 */
describe('Config Service', () => {
  it('should expose Config as a frozen object', () => {
    TestRunner.ok(window.Config, 'Config should be defined');
    TestRunner.ok(Object.isFrozen(window.Config), 'Config should be frozen');
  });

  it('should have APP config section', () => {
    TestRunner.ok(window.Config.APP, 'APP section exists');
    TestRunner.equal(window.Config.APP.NAME, 'BlinkGo', 'App name is BlinkGo');
    TestRunner.equal(window.Config.APP.DEFAULT_LANG, 'de', 'Default language is de');
  });

  it('should have API config section', () => {
    TestRunner.ok(window.Config.API, 'API section exists');
    TestRunner.match(window.Config.API.BASE_URL, /^https?:\/\//, 'Base URL is HTTP(S)');
    TestRunner.greaterThan(window.Config.API.TIMEOUT_MS, 0, 'Timeout > 0');
  });

  it('should have POLLING config with reasonable values', () => {
    TestRunner.ok(window.Config.POLLING, 'POLLING section exists');
    TestRunner.greaterThan(window.Config.POLLING.DRIVER_MIN_MS, 0, 'Driver min > 0');
    TestRunner.greaterThan(window.Config.POLLING.DRIVER_MAX_MS, window.Config.POLLING.DRIVER_MIN_MS, 'Driver max > min');
  });

  it('should have SECURITY config', () => {
    TestRunner.ok(window.Config.SECURITY, 'SECURITY section exists');
    TestRunner.greaterThan(window.Config.SECURITY.MAX_LOGIN_ATTEMPTS, 0, 'Max login attempts > 0');
    TestRunner.greaterThan(window.Config.SECURITY.MAX_PHOTO_BYTES, 1024 * 1024, 'Max photo > 1MB');
  });

  it('get() should resolve nested keys', () => {
    TestRunner.equal(window.Config.get('API.BASE_URL'), window.Config.API.BASE_URL, 'get returns same value');
    TestRunner.equal(window.Config.get('APP.NAME'), 'BlinkGo', 'get works for nested keys');
    TestRunner.equal(window.Config.get('NONEXISTENT.KEY'), null, 'get returns null for missing keys');
  });

  it('should be immutable', () => {
    const original = window.Config.APP.NAME;
    try {
      window.Config.APP.NAME = 'Hacked';
    } catch (_) {
      // Some browsers throw on mutation of frozen
    }
    TestRunner.equal(window.Config.APP.NAME, original, 'Config is immutable');
  });
});