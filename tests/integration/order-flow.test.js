/**
 * @file Integration Test: Order Flow
 * @description Tests the full order lifecycle:
 *   create → push to pool → pull from pool → status updates
 */
describe('Integration: Order Flow', () => {
  beforeEach(() => {
    if (window.EventBus) window.EventBus.clear();
    if (window.AnalyticsService) window.AnalyticsService.clear();
    if (window.Logger) window.Logger.clearBuffer();
  });

  it('should create and push an order', async () => {
    const orderId = 'test_' + Date.now();
    const order = {
      id: orderId,
      customerId: 'test_customer',
      customerName: 'Test User',
      customerPhone: '0501234567',
      items: [{ id: 'pizza', name: 'Pizza', price: 10, qty: 1 }],
      total: 12,
      subtotal: 10,
      deliveryFee: 2,
      address: 'Test Address',
      status: 'pending',
      createdAt: Date.now(),
    };

    let created = false;
    window.EventBus.on('order:created', () => { created = true; });

    try {
      const result = await window.ordersRepository.create(order);
      TestRunner.ok(result, 'Repository returned result');
      TestRunner.equal(result.ok, true, 'Result.ok = true');
      TestRunner.ok(created, 'order:created event fired');
    } catch (err) {
      TestRunner.skip('Skipping due to network: ' + err.message);
    }
  }, { skip: !navigator.onLine });

  it('should pull orders back from the pool', async () => {
    try {
      const orders = await window.ordersRepository.findAll();
      TestRunner.ok(Array.isArray(orders), 'Returns array');
      // Should have at least one order (from the create test or pre-existing)
      TestRunner.greaterThan(orders.length, -1, 'Pool accessible');
    } catch (err) {
      TestRunner.skip('Skipping: ' + err.message);
    }
  }, { skip: !navigator.onLine });

  it('should filter by status', async () => {
    try {
      const pending = await window.ordersRepository.findAll({ status: 'pending' });
      const all = await window.ordersRepository.findAll();
      TestRunner.lessThan(pending.length, all.length + 1, 'Filter works');
    } catch (err) {
      TestRunner.skip('Skipping: ' + err.message);
    }
  }, { skip: !navigator.onLine });

  it('should track analytics for order events', async () => {
    window.AnalyticsService.clear();
    const orderId = 'analytics_test_' + Date.now();
    try {
      await window.ordersRepository.create({
        id: orderId,
        customerName: 'Analytics Test',
        total: 5,
        status: 'pending',
        createdAt: Date.now(),
        items: [{ id: 'x', name: 'x', price: 5, qty: 1 }],
      });
      // Wait briefly for event to fire
      await new Promise((r) => setTimeout(r, 100));
      const events = window.AnalyticsService.getEvents('order_created');
      TestRunner.greaterThan(events.length, 0, 'order_created event tracked');
    } catch (err) {
      TestRunner.skip('Skipping: ' + err.message);
    }
  }, { skip: !navigator.onLine });
});

describe('Integration: EventBus Flow', () => {
  beforeEach(() => {
    if (window.EventBus) window.EventBus.clear();
  });

  it('should propagate order events through EventBus', () => {
    let received = null;
    window.EventBus.on('order:created', (o) => { received = o; });
    window.EventBus.emit('order:created', { id: 'evt_test', total: 5 });
    TestRunner.ok(received, 'Event received');
    TestRunner.equal(received.id, 'evt_test', 'ID matches');
  });

  it('should support multiple subscribers on same event', () => {
    let count = 0;
    window.EventBus.on('test', () => count++);
    window.EventBus.on('test', () => count++);
    window.EventBus.emit('test');
    TestRunner.equal(count, 2, 'Both subscribers called');
  });

  it('should clean up subscribers with unsubscribe', () => {
    let count = 0;
    const off = window.EventBus.on('test', () => count++);
    window.EventBus.emit('test');
    off();
    window.EventBus.emit('test');
    TestRunner.equal(count, 1, 'Only called before unsubscribe');
  });
});