/**
 * @file OrdersRepository
 * @description Data access layer for orders. Wraps the Cloudflare Worker pool.
 * @module services/repository
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   const repo = new OrdersRepository({ baseUrl: 'https://api.example.com' });
 *   const orders = await repo.findAll({ status: 'pending' });
 *   const created = await repo.create(order);
 */
(function (global) {
  'use strict';

  const Config = global.Config;
  const Logger = global.Logger;
  const ErrorService = global.ErrorService;
  const ErrorCodes = global.ErrorCodes;
  const EventBus = global.EventBus;

  /**
   * @typedef {Object} Order
   * @property {string} id - Unique order id
   * @property {string} customerId - Customer UID or email
   * @property {string} customerName
   * @property {string} customerPhone
   * @property {string} [driverId] - Set when accepted
   * @property {string} [driverName]
   * @property {('pending'|'preparing'|'ready'|'delivering'|'delivered'|'cancelled')} status
   * @property {Array<{id:string, name:string, price:number, qty:number}>} items
   * @property {number} total - Total in cents (or unit with currency)
   * @property {number} subtotal
   * @property {number} deliveryFee
   * @property {string} address
   * @property {number} createdAt - Unix timestamp ms
   * @property {string} [deliveryPhoto]
   * @property {number} [deliveryPhotoAt]
   * @property {number} [acceptedAt]
   * @property {number} [deliveredAt]
   */

  /**
   * @typedef {Object} OrderFilter
   * @property {string} [status]
   * @property {string} [customerId]
   * @property {string} [driverId]
   * @property {number} [since] - timestamp in ms
   */

  /**
   * @typedef {Object} RepositoryDeps
   * @property {string} [baseUrl] - API base URL
   * @property {Object} [logger] - Logger service
   * @property {Object} [errorService] - ErrorService
   * @property {number} [timeoutMs] - Request timeout
   * @property {number} [maxRetries] - Max retries on failure
   */

  /**
   * Repository for orders. Provides CRUD over the Cloudflare Worker pool.
   */
  class OrdersRepository {
    /**
     * @param {RepositoryDeps} [deps] - Dependency injection
     */
    constructor(deps = {}) {
      this.baseUrl = deps.baseUrl || Config?.API?.BASE_URL || 'https://stripe.blinkgo.de';
      this.logger = deps.logger || Logger;
      this.errorService = deps.errorService || ErrorService;
      this.timeoutMs = deps.timeoutMs || Config?.API?.TIMEOUT_MS || 10000;
      this.maxRetries = deps.maxRetries || Config?.API?.RETRY_MAX || 5;
      this.enabled = true;
      this.lastSyncAt = 0;
      this.lastErrorAt = 0;
      this.consecutiveErrors = 0;
    }

    /**
     * Internal fetch with timeout + error handling.
     * @param {string} path - API path
     * @param {Object} [options] - fetch options
     * @returns {Promise<*>}
     * @private
     */
    async _fetch(path, options = {}) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(this.baseUrl + path, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw this.errorService.create(
            ErrorCodes.UNKNOWN,
            `HTTP ${res.status}: ${errBody.error || res.statusText}`,
            { path, status: res.status, body: errBody }
          );
        }
        return await res.json();
      } catch (err) {
        clearTimeout(timeoutId);
        if (err && err.name === 'AbortError') {
          throw this.errorService.create(
            ErrorCodes.NETWORK_TIMEOUT,
            'Request timeout',
            { path, timeoutMs: this.timeoutMs }
          );
        }
        throw err;
      }
    }

    /**
     * Create or update an order in the pool.
     * @param {Order} order
     * @returns {Promise<{ok: boolean, id: string, order: Order}>}
     */
    async create(order) {
      if (!this.enabled) return null;
      if (!order || !order.id) {
        throw this.errorService.create(
          ErrorCodes.VALIDATION_FAILED,
          'Order must have an id',
          { order }
        );
      }
      try {
        const data = await this._fetch('/orders', {
          method: 'POST',
          body: JSON.stringify(order),
        });
        this.lastSyncAt = Date.now();
        this.consecutiveErrors = 0;
        if (this.logger) this.logger.info('OrdersRepository', `Order ${order.id} created/updated`, { id: order.id });
        if (EventBus) EventBus.emit('order:created', data);
        return data;
      } catch (err) {
        this.consecutiveErrors++;
        this.lastErrorAt = Date.now();
        if (this.logger) this.logger.warn('OrdersRepository', `create failed: ${err.message}`, { id: order.id });
        throw err;
      }
    }

    /**
     * Fetch orders with optional filters.
     * @param {OrderFilter} [filter={}]
     * @returns {Promise<Order[]>}
     */
    async findAll(filter = {}) {
      if (!this.enabled) return [];
      try {
        const params = new URLSearchParams();
        if (filter.status) params.set('status', filter.status);
        if (filter.customerId) params.set('customerId', filter.customerId);
        if (filter.driverId) params.set('driverId', filter.driverId);
        if (filter.since) params.set('since', String(filter.since));
        const query = params.toString();
        const data = await this._fetch('/orders' + (query ? '?' + query : ''));
        this.lastSyncAt = Date.now();
        this.consecutiveErrors = 0;
        return data.orders || [];
      } catch (err) {
        this.consecutiveErrors++;
        this.lastErrorAt = Date.now();
        if (this.logger) this.logger.warn('OrdersRepository', `findAll failed: ${err.message}`);
        return []; // graceful degradation
      }
    }

    /**
     * Find a single order by id.
     * @param {string} id
     * @returns {Promise<Order|null>}
     */
    async findById(id) {
      const orders = await this.findAll();
      return orders.find((o) => String(o.id) === String(id)) || null;
    }

    /**
     * Find orders for a specific customer.
     * @param {string} customerId
     * @returns {Promise<Order[]>}
     */
    async findByCustomer(customerId) {
      return this.findAll({ customerId });
    }

    /**
     * Find orders for a specific driver.
     * @param {string} driverId
     * @returns {Promise<Order[]>}
     */
    async findByDriver(driverId) {
      return this.findAll({ driverId });
    }

    /**
     * Find pending orders (visible in driver feed).
     * @returns {Promise<Order[]>}
     */
    async findPending() {
      return this.findAll({ status: 'pending' });
    }

    /**
     * Check Worker health.
     * @returns {Promise<boolean>}
     */
    async isHealthy() {
      try {
        const data = await this._fetch('/health');
        return data.status === 'ok';
      } catch (_) {
        return false;
      }
    }

    /**
     * Get repository stats.
     * @returns {Object}
     */
    getStats() {
      return {
        enabled: this.enabled,
        lastSyncAt: this.lastSyncAt,
        lastErrorAt: this.lastErrorAt,
        consecutiveErrors: this.consecutiveErrors,
        uptimeMs: this.lastSyncAt ? Date.now() - this.lastSyncAt : null,
      };
    }

    /**
     * Disable the repository (no requests will be sent).
     */
    disable() {
      this.enabled = false;
      if (this.logger) this.logger.info('OrdersRepository', 'Disabled');
    }

    /**
     * Re-enable the repository.
     */
    enable() {
      this.enabled = true;
      if (this.logger) this.logger.info('OrdersRepository', 'Enabled');
    }
  }

  // Singleton instance with DI
  const ordersRepository = new OrdersRepository({
    baseUrl: Config?.API?.BASE_URL,
    logger: Logger,
    errorService: ErrorService,
  });

  global.OrdersRepository = OrdersRepository;
  global.ordersRepository = ordersRepository;
})(typeof window !== 'undefined' ? window : globalThis);