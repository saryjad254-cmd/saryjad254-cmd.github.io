/**
 * @file ErrorService
 * @description Typed errors with codes + context. Wraps async functions safely.
 * @module services/error
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   throw ErrorService.create(ErrorCodes.NETWORK_TIMEOUT, 'Request timed out');
 *   const data = await ErrorService.wrap(() => fetch(url), ErrorCodes.NETWORK_TIMEOUT, 'Failed');
 */
(function (global) {
  'use strict';

  /**
   * @typedef {Object} ErrorContext
   * @property {string} [path] - API path or operation
   * @property {string} [original] - original error message
   * @property {Object} [extra] - additional context
   */

  /**
   * Custom error class with code + context.
   */
  class BlinkGoError extends Error {
    /**
     * @param {string} code - ErrorCodes.*
     * @param {string} message - Human-readable message
     * @param {ErrorContext} [context]
     */
    constructor(code, message, context) {
      super(message);
      this.name = 'BlinkGoError';
      this.code = code;
      this.context = context || {};
      this.ts = Date.now();
    }

    /**
     * Serialize for logging / transmission.
     * @returns {Object}
     */
    toJSON() {
      return {
        name: this.name,
        code: this.code,
        message: this.message,
        context: this.context,
        ts: this.ts,
      };
    }
  }

  /**
   * Canonical error codes used throughout the app.
   */
  const ErrorCodes = Object.freeze({
    NETWORK_TIMEOUT:    'E001',
    NETWORK_OFFLINE:    'E002',
    AUTH_INVALID:       'E003',
    AUTH_LOCKED:        'E004',
    VALIDATION_FAILED:  'E005',
    ORDER_NOT_FOUND:    'E006',
    ORDER_ALREADY_ACCEPTED: 'E007',
    PAYMENT_FAILED:     'E008',
    PHOTO_TOO_LARGE:    'E009',
    STORAGE_FULL:       'E010',
    PERMISSION_DENIED:  'E011',
    RATE_LIMITED:       'E012',
    GEOLOCATION_FAILED: 'E013',
    MAP_LOAD_FAILED:    'E014',
    UNKNOWN:            'E999',
  });

  /**
   * Localized error messages.
   * @private
   */
  const MESSAGES = Object.freeze({
    E001: { ar: '⏱️ انتهت مهلة الاتصال', de: '⏱️ Zeitüberschreitung' },
    E002: { ar: '📡 لا يوجد اتصال بالإنترنت', de: '📡 Keine Internetverbindung' },
    E003: { ar: '🔒 بيانات الدخول غير صحيحة', de: '🔒 Anmeldedaten ungültig' },
    E004: { ar: '🔒 الحساب مقفل مؤقتاً', de: '🔒 Konto vorübergehend gesperrt' },
    E005: { ar: '❌ البيانات المدخلة غير صحيحة', de: '❌ Eingabedaten ungültig' },
    E006: { ar: '🔍 الطلب غير موجود', de: '🔍 Bestellung nicht gefunden' },
    E007: { ar: '⚠️ الطلب مقبول من سائق آخر', de: '⚠️ Bestellung bereits angenommen' },
    E008: { ar: '💳 فشلت عملية الدفع', de: '💳 Zahlung fehlgeschlagen' },
    E009: { ar: '📷 الصورة كبيرة جداً', de: '📷 Bild zu groß' },
    E010: { ar: '💾 الذاكرة ممتلئة', de: '💾 Speicher voll' },
    E011: { ar: '🚫 لا يوجد إذن', de: '🚫 Keine Berechtigung' },
    E012: { ar: '⚠️ محاولات كثيرة. حاول لاحقاً', de: '⚠️ Zu viele Versuche' },
    E013: { ar: '📍 تعذّر الوصول للموقع', de: '📍 Standort nicht verfügbar' },
    E014: { ar: '🗺️ فشل تحميل الخريطة', de: '🗺️ Karte konnte nicht geladen werden' },
  });

  const ErrorService = Object.freeze({
    /**
     * Create a new BlinkGoError.
     * @param {string} code
     * @param {string} message
     * @param {ErrorContext} [context]
     * @returns {BlinkGoError}
     */
    create(code, message, context) {
      return new BlinkGoError(code, message, context);
    },

    /**
     * Wrap an async function with error handling.
     * @template T
     * @param {() => Promise<T>} fn
     * @param {string} code - ErrorCodes.*
     * @param {string} [fallbackMsg] - fallback message
     * @returns {Promise<T>}
     * @throws {BlinkGoError}
     */
    async wrap(fn, code, fallbackMsg) {
      try {
        return await fn();
      } catch (err) {
        const Logger = global.Logger;
        if (Logger) Logger.error('ErrorService', fallbackMsg || err?.message, { code, original: err?.message });
        throw new BlinkGoError(code, fallbackMsg || err?.message, { original: err?.message });
      }
    },

    /**
     * Get a localized message for an error code.
     * @param {string} code
     * @param {string} [lang='de']
     * @returns {string}
     */
    getMessage(code, lang) {
      return MESSAGES[code]?.[lang || 'de'] || '❌ Error';
    },

    /**
     * Check if an error is a BlinkGoError.
     * @param {*} err
     * @returns {boolean}
     */
    isBlinkGoError(err) {
      return err instanceof BlinkGoError;
    },
  });

  global.BlinkGoError = BlinkGoError;
  global.ErrorCodes = ErrorCodes;
  global.ErrorService = ErrorService;
})(typeof window !== 'undefined' ? window : globalThis);