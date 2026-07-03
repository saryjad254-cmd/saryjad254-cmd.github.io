/**
 * @file ErrorService Unit Tests
 */
describe('ErrorService', () => {
  it('should be exposed on window', () => {
    TestRunner.ok(window.ErrorService, 'ErrorService is defined');
    TestRunner.ok(window.ErrorCodes, 'ErrorCodes is defined');
    TestRunner.ok(window.BlinkGoError, 'BlinkGoError is defined');
  });

  it('ErrorCodes should have all canonical codes', () => {
    const expected = [
      'NETWORK_TIMEOUT', 'NETWORK_OFFLINE', 'AUTH_INVALID',
      'AUTH_LOCKED', 'VALIDATION_FAILED', 'ORDER_NOT_FOUND',
      'ORDER_ALREADY_ACCEPTED', 'PAYMENT_FAILED', 'PHOTO_TOO_LARGE',
      'STORAGE_FULL', 'PERMISSION_DENIED', 'RATE_LIMITED',
      'GEOLOCATION_FAILED', 'MAP_LOAD_FAILED', 'UNKNOWN',
    ];
    for (const code of expected) {
      TestRunner.ok(window.ErrorCodes[code], `ErrorCodes.${code} exists`);
    }
    TestRunner.equal(window.ErrorCodes.NETWORK_TIMEOUT, 'E001', 'NETWORK_TIMEOUT = E001');
    TestRunner.equal(window.ErrorCodes.UNKNOWN, 'E999', 'UNKNOWN = E999');
  });

  it('create() should make a BlinkGoError', () => {
    const err = window.ErrorService.create('E001', 'Test message');
    TestRunner.isInstanceOf(err, window.BlinkGoError, 'Is BlinkGoError');
    TestRunner.equal(err.code, 'E001', 'Code preserved');
    TestRunner.equal(err.message, 'Test message', 'Message preserved');
    TestRunner.ok(err.ts, 'Has timestamp');
  });

  it('toJSON() should serialize', () => {
    const err = window.ErrorService.create('E005', 'Validation', { field: 'email' });
    const json = err.toJSON();
    TestRunner.equal(json.code, 'E005', 'Code in JSON');
    TestRunner.equal(json.message, 'Validation', 'Message in JSON');
    TestRunner.equal(json.context.field, 'email', 'Context in JSON');
  });

  it('wrap() should pass through success', async () => {
    const result = await window.ErrorService.wrap(
      async () => 'success',
      'E001',
      'Failed'
    );
    TestRunner.equal(result, 'success', 'Returns value on success');
  });

  it('wrap() should rethrow as BlinkGoError', async () => {
    try {
      await window.ErrorService.wrap(
        async () => { throw new Error('original'); },
        'E001',
        'Wrapped message'
      );
      TestRunner.ok(false, 'Should have thrown');
    } catch (err) {
      TestRunner.isInstanceOf(err, window.BlinkGoError, 'Is BlinkGoError');
      TestRunner.equal(err.code, 'E001', 'Code is E001');
      TestRunner.equal(err.context.original, 'original', 'Original preserved');
    }
  });

  it('getMessage() should return localized message', () => {
    const deMsg = window.ErrorService.getMessage('E001', 'de');
    const arMsg = window.ErrorService.getMessage('E001', 'ar');
    TestRunner.ok(deMsg, 'Has DE message');
    TestRunner.ok(arMsg, 'Has AR message');
    TestRunner.notEqual(deMsg, arMsg, 'Messages differ by language');
  });

  it('getMessage() should default to DE for unknown lang', () => {
    const msg = window.ErrorService.getMessage('E001', 'fr');
    TestRunner.ok(msg, 'Returns message for unknown lang');
  });

  it('isBlinkGoError() should distinguish error types', () => {
    const bgErr = window.ErrorService.create('E001', 'test');
    const regularErr = new Error('test');
    TestRunner.ok(window.ErrorService.isBlinkGoError(bgErr), 'Recognizes BlinkGoError');
    TestRunner.notOk(window.ErrorService.isBlinkGoError(regularErr), 'Rejects regular Error');
    TestRunner.notOk(window.ErrorService.isBlinkGoError(null), 'Rejects null');
    TestRunner.notOk(window.ErrorService.isBlinkGoError('string'), 'Rejects string');
  });
});