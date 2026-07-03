/**
 * @file Logger Service
 * @description Structured logging with levels + buffer + subscribers.
 * @module services/logger
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   Logger.info('Orders', 'Created', { id: 'o_123' });
 *   Logger.subscribe(event => sendToAnalytics(event));
 */
(function (global) {
  'use strict';

  const LEVELS = Object.freeze({
    DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4,
  });

  const currentLevel = LEVELS.INFO;
  const buffer = [];
  const MAX_BUFFER = 100;
  const listeners = new Set();

  function emit(level, tag, message, data) {
    if (LEVELS[level] < currentLevel) return;
    const entry = Object.freeze({
      ts: Date.now(),
      level,
      tag: String(tag || 'app'),
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      data: data || null,
    });
    buffer.push(entry);
    if (buffer.length > MAX_BUFFER) buffer.shift();
    const consoleFn = (global.console && global.console[level.toLowerCase()]) || global.console?.log;
    if (consoleFn) {
      const formatted = `[BlinkGo/${entry.tag}] ${entry.message}`;
      if (data) consoleFn(formatted, data);
      else consoleFn(formatted);
    }
    listeners.forEach((fn) => {
      try { fn(entry); } catch (_) {}
    });
  }

  const Logger = Object.freeze({
    LEVELS,

    /**
     * Log at DEBUG level (verbose, for development).
     * @param {string} tag - module/component tag
     * @param {*} msg - message
     * @param {*} [data] - optional payload
     */
    debug: (tag, msg, data) => emit('DEBUG', tag, msg, data),

    /**
     * Log at INFO level (general events).
     */
    info: (tag, msg, data) => emit('INFO', tag, msg, data),

    /**
     * Log at WARN level (recoverable issues).
     */
    warn: (tag, msg, data) => emit('WARN', tag, msg, data),

    /**
     * Log at ERROR level (failures requiring attention).
     */
    error: (tag, msg, data) => emit('ERROR', tag, msg, data),

    /**
     * Subscribe to log events (for analytics, error tracking, etc.).
     * @param {Function} fn - handler(entry)
     * @returns {Function} unsubscribe
     */
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /**
     * Get a copy of the log buffer.
     */
    getBuffer() {
      return buffer.slice();
    },

    /**
     * Clear the log buffer.
     */
    clearBuffer() {
      buffer.length = 0;
    },

    /**
     * Export logs as JSON string.
     */
    export() {
      return JSON.stringify(buffer, null, 2);
    },
  });

  global.Logger = Logger;
})(typeof window !== 'undefined' ? window : globalThis);