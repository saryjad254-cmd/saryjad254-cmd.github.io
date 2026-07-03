/**
 * @file AnalyticsService
 * @description Event tracking with session + user context. Buffer + flush.
 * @module services/analytics
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   AnalyticsService.track('order_created', { total: 12 });
 *   AnalyticsService.getEvents('order_created');
 *   AnalyticsService.flush(); // returns and clears events
 */
(function (global) {
  'use strict';

  const Config = global.Config;
  const Logger = global.Logger;

  const events = [];
  const MAX_EVENTS = 200;
  let _sessionId = null;
  let _userId = null;

  function getSessionId() {
    if (!_sessionId) {
      _sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }
    return _sessionId;
  }

  function getUserId() {
    if (_userId !== null) return _userId;
    try {
      const prefix = Config?.STORAGE?.PREFIX || 'bg_';
      const u = JSON.parse(global.localStorage?.getItem(prefix + 'user') || 'null');
      _userId = u?.uid || u?.id || 'anonymous';
    } catch (_) {
      _userId = 'anonymous';
    }
    return _userId;
  }

  /**
   * @typedef {Object} AnalyticsEvent
   * @property {string} name
   * @property {number} ts
   * @property {Object} properties
   * @property {string} sessionId
   * @property {string} userId
   */

  const AnalyticsService = Object.freeze({
    MAX_EVENTS,

    /**
     * Track an event.
     * @param {string} eventName
     * @param {Object} [properties={}]
     */
    track(eventName, properties = {}) {
      const event = Object.freeze({
        name: eventName,
        ts: Date.now(),
        properties: Object.freeze({ ...properties }),
        sessionId: getSessionId(),
        userId: getUserId(),
      });
      events.push(event);
      if (events.length > MAX_EVENTS) events.shift();
      if (Logger) Logger.debug('Analytics', eventName, properties);
      // Pipe to EventBus so other services can subscribe
      const EventBus = global.EventBus;
      if (EventBus) EventBus.emit('analytics:track', event);
    },

    /**
     * Get events, optionally filtered by name.
     * @param {string} [eventName]
     * @returns {AnalyticsEvent[]}
     */
    getEvents(eventName) {
      return eventName ? events.filter((e) => e.name === eventName) : events.slice();
    },

    /**
     * Get count of events.
     * @returns {number}
     */
    count() {
      return events.length;
    },

    /**
     * Flush and clear all events.
     * @returns {AnalyticsEvent[]}
     */
    flush() {
      const payload = events.slice();
      events.length = 0;
      return payload;
    },

    /**
     * Clear all events.
     */
    clear() {
      events.length = 0;
    },

    /**
     * Export as JSON.
     * @returns {string}
     */
    export() {
      return JSON.stringify(events, null, 2);
    },

    /**
     * Reset session (for testing).
     */
    resetSession() {
      _sessionId = null;
      _userId = null;
    },
  });

  global.AnalyticsService = AnalyticsService;
})(typeof window !== 'undefined' ? window : globalThis);