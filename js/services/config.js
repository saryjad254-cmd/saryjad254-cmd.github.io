/**
 * @file Config Service
 * @description Centralized configuration — all magic strings/values live here.
 * @module services/config
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   import { Config } from './services/config.js';
 *   const apiUrl = Config.get('API.BASE_URL');
 */
(function (global) {
  'use strict';

  const Config = Object.freeze({
    APP: Object.freeze({
      NAME: 'BlinkGo',
      VERSION: '5.1',
      BUILD_DATE: '2026-07-03',
      DEFAULT_LANG: 'de',
      SUPPORTED_LANGS: Object.freeze(['de', 'ar']),
    }),
    API: Object.freeze({
      BASE_URL: 'https://stripe.blinkgo.de',
      TIMEOUT_MS: 10000,
      RETRY_MAX: 5,
      RETRY_BASE_MS: 2000,
      RETRY_BACKOFF: 1.5,
    }),
    STORAGE: Object.freeze({
      PREFIX: 'bg_',
      TTL_DAYS: 30,
    }),
    POLLING: Object.freeze({
      DRIVER_MIN_MS: 3000,
      DRIVER_MAX_MS: 15000,
      CUSTOMER_MS: 4000,
      CUSTOMER_MAX_MS: 15000,
      LOCATION_MS: 5000,
    }),
    MAP: Object.freeze({
      DEFAULT_ZOOM: 14,
      MIN_ZOOM: 3,
      MAX_ZOOM: 19,
      STYLE_THEME: 'apple_dark',
      GOOGLE_KEY: 'AIzaSyD5qefSAn7KWdbE0GF8DT_bV-JQOUKSeko',
    }),
    PAYMENT: Object.freeze({
      CURRENCY: '€',
      TAX_RATE: 0.15,
      DEFAULT_DELIVERY_FEE_CENTS: 150,
      DRIVER_COMMISSION_RATE: 0.15,
    }),
    SECURITY: Object.freeze({
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_MINUTES: 15,
      SESSION_IDLE_MINUTES: 60,
      MAX_PHOTO_BYTES: 10 * 1024 * 1024,
      MAX_TEXT_LENGTH: 5000,
    }),
    FEATURES: Object.freeze({
      STRIPE_ENABLED: false,
      FIREBASE_ENABLED: true,
      PUSH_ENABLED: true,
      GEOLOCATION_ENABLED: true,
      WEBSOCKETS_ENABLED: false,
    }),
    /**
     * Get a nested config value by dot-notation key.
     * @param {string} key - e.g. 'API.BASE_URL'
     * @returns {*} value or null
     */
    get(key) {
      return key.split('.').reduce((o, k) => (o ? o[k] : null), this);
    },
  });

  // Expose to window for global access (vanilla JS pattern)
  global.Config = Config;
})(typeof window !== 'undefined' ? window : globalThis);