/**
 * @file Services Initializer
 * @description Bootstraps all service modules in correct order. Provides a global namespace.
 * @module services
 * @version 5.1.0
 *
 * Load order (matters!):
 *   1. config     — other services depend on it
 *   2. logger     — depends on console only
 *   3. error      — depends on Logger
 *   4. event-bus  — independent
 *   5. repository — depends on Config, Logger, ErrorService, EventBus
 *   6. map-service — depends on Config, Logger, EventBus
 *   7. analytics  — depends on Config, Logger, EventBus
 *
 * After this file loads, window.BlinkGo contains all services:
 *   window.BlinkGo.Config
 *   window.BlinkGo.Logger
 *   window.BlinkGo.ErrorService
 *   window.BlinkGo.EventBus
 *   window.BlinkGo.OrdersRepository
 *   window.BlinkGo.MapService
 *   window.BlinkGo.AnalyticsService
 */
(function (global) {
  'use strict';

  // Services are loaded by individual <script> tags before this file.
  // This file just verifies they're all loaded and creates the namespace.

  const required = [
    'Config', 'Logger', 'ErrorService', 'BlinkGoError', 'ErrorCodes',
    'EventBus', 'OrdersRepository', 'ordersRepository',
    'MapService', 'MapProviders', 'AnalyticsService',
  ];

  const missing = required.filter((name) => !(name in global));

  if (missing.length > 0) {
    console.error('[BlinkGo] Missing services:', missing);
    console.error('[BlinkGo] Make sure all service scripts are loaded before services/index.js');
  }

  // Create unified namespace
  global.BlinkGo = global.BlinkGo || {};
  global.BlinkGo.Config = global.Config;
  global.BlinkGo.Logger = global.Logger;
  global.BlinkGo.ErrorService = global.ErrorService;
  global.BlinkGo.BlinkGoError = global.BlinkGoError;
  global.BlinkGo.ErrorCodes = global.ErrorCodes;
  global.BlinkGo.EventBus = global.EventBus;
  global.BlinkGo.OrdersRepository = global.OrdersRepository;
  global.BlinkGo.ordersRepository = global.ordersRepository;
  global.BlinkGo.MapService = global.MapService;
  global.BlinkGo.MapProviders = global.MapProviders;
  global.BlinkGo.AnalyticsService = global.AnalyticsService;

  // Version info
  global.BlinkGo.VERSION = '5.1.0';
  global.BlinkGo.BUILD_DATE = '2026-07-03';

  // === AUTO-INTEGRATION: Hook into existing app lifecycle ===
  // Wrap existing key functions to add observability without breaking anything.
  // Uses late binding (DOMContentLoaded) so main script defines functions first.

  function bgWireAnalytics() {
    if (typeof global.quickLogin === 'function' && !global.quickLogin.__bg_wrapped) {
      const _origQuickLogin = global.quickLogin;
      global.quickLogin = function (role) {
        try {
          if (global.AnalyticsService) global.AnalyticsService.track('login', { role });
          if (global.EventBus) global.EventBus.emit('user:login', { role });
        } catch (_) {}
        return _origQuickLogin.apply(this, arguments);
      };
      global.quickLogin.__bg_wrapped = true;
    }

    if (typeof global.setActivePage === 'function' && !global.setActivePage.__bg_wrapped) {
      const _origSetActivePage = global.setActivePage;
      global.setActivePage = function (page) {
        try {
          if (global.AnalyticsService) global.AnalyticsService.track('page_view', { page });
          if (global.EventBus) global.EventBus.emit('page:changed', { page });
        } catch (_) {}
        return _origSetActivePage.apply(this, arguments);
      };
      global.setActivePage.__bg_wrapped = true;
    }

    // Listen to repository events
    if (global.EventBus) {
      global.EventBus.on('order:created', (o) => {
        if (global.AnalyticsService) global.AnalyticsService.track('order_created', { id: o?.id, total: o?.total });
      });
    }
  }

  // Wire on DOMContentLoaded (after main script has run)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bgWireAnalytics);
  } else {
    // DOM already loaded — run immediately (and a small delay for main script)
    setTimeout(bgWireAnalytics, 100);
  }

  // Log successful boot
  if (global.Logger) {
    global.Logger.info('Services', 'All services initialized', {
      version: global.BlinkGo.VERSION,
      services: required.filter((n) => !(missing.includes(n))),
    });
  }

  console.log('[BlinkGo] 🏛️ Service Layer v' + global.BlinkGo.VERSION + ' loaded');
  console.log('[BlinkGo] Available at: window.BlinkGo.*');
})(typeof window !== 'undefined' ? window : globalThis);