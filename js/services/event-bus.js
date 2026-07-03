/**
 * @file EventBus
 * @description Pub/sub for cross-module communication. Decouples components.
 * @module services/event-bus
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   const off = EventBus.on('order:created', (order) => console.log(order));
 *   EventBus.emit('order:created', { id: 'o_123' });
 *   off();  // unsubscribe
 */
(function (global) {
  'use strict';

  const channels = new Map();

  const EventBus = Object.freeze({
    /**
     * Subscribe to an event.
     * @param {string} event - event name (e.g. 'order:created')
     * @param {Function} handler
     * @returns {Function} unsubscribe function
     */
    on(event, handler) {
      if (typeof event !== 'string' || typeof handler !== 'function') {
        return () => {};
      }
      if (!channels.has(event)) channels.set(event, new Set());
      channels.get(event).add(handler);
      return () => {
        const subs = channels.get(event);
        if (subs) subs.delete(handler);
      };
    },

    /**
     * Subscribe to an event that fires only once.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} unsubscribe
     */
    once(event, handler) {
      const off = EventBus.on(event, (payload) => {
        handler(payload);
        off();
      });
      return off;
    },

    /**
     * Emit an event to all subscribers.
     * @param {string} event
     * @param {*} [payload]
     */
    emit(event, payload) {
      const subs = channels.get(event);
      if (!subs) return;
      // Snapshot to allow safe removal during iteration
      const list = Array.from(subs);
      list.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          const Logger = global.Logger;
          if (Logger) Logger.error('EventBus', `Handler for "${event}" threw:`, e);
        }
      });
    },

    /**
     * Remove subscribers. Pass event name to clear just that channel,
     * or no args to clear all.
     * @param {string} [event]
     */
    clear(event) {
      if (event) channels.delete(event);
      else channels.clear();
    },

    /**
     * Get subscriber count for debugging.
     * @param {string} event
     * @returns {number}
     */
    listenerCount(event) {
      return channels.get(event)?.size || 0;
    },
  });

  global.EventBus = EventBus;
})(typeof window !== 'undefined' ? window : globalThis);