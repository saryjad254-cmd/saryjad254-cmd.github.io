/**
 * @file MapService
 * @description Abstraction over Google Maps / OpenStreetMap with strategy pattern.
 * @module services/map-service
 * @version 5.1.0
 * @author BlinkGo Team
 * @license MIT
 *
 * @example
 *   const map = MapService.init(container, { lat: 51.2277, lng: 6.7735 }, { zoom: 14 });
 *   MapService.setCenter(48.8566, 2.3522);
 */
(function (global) {
  'use strict';

  const Config = global.Config;
  const Logger = global.Logger;
  const ErrorService = global.ErrorService;
  const ErrorCodes = global.ErrorCodes;
  const EventBus = global.EventBus;

  /**
   * Available map providers.
   */
  const MapProviders = Object.freeze({
    GOOGLE: 'google',
    OSM: 'osm',
    NONE: 'none',
  });

  /**
   * @typedef {Object} MapCenter
   * @property {number} lat
   * @property {number} lng
   */

  /**
   * @typedef {Object} MapOpts
   * @property {number} [zoom]
   * @property {string} [mapTypeId]
   * @property {Array} [styles]
   * @property {boolean} [disableDefaultUI]
   */

  const MapService = Object.freeze({
    currentProvider: MapProviders.GOOGLE,
    activeInstance: null,

    /**
     * Initialize a map with given provider, falling back gracefully.
     * @param {HTMLElement} container
     * @param {MapCenter} center
     * @param {MapOpts} [opts={}]
     * @returns {Object|null} map instance
     */
    init(container, center, opts = {}) {
      if (!container) {
        if (Logger) Logger.warn('MapService', 'No container provided');
        return null;
      }
      // Try Google Maps first
      if (this.currentProvider === MapProviders.GOOGLE && global.google?.maps) {
        try {
          return this._initGoogle(container, center, opts);
        } catch (err) {
          if (Logger) Logger.warn('MapService', 'Google Maps failed, falling back to OSM', { error: err.message });
          return this._initOSM(container, center, opts);
        }
      }
      return this._initOSM(container, center, opts);
    },

    /**
     * Initialize Google Maps.
     * @private
     */
    _initGoogle(container, center, opts) {
      const map = new global.google.maps.Map(container, {
        center,
        zoom: opts.zoom || Config?.MAP?.DEFAULT_ZOOM || 14,
        mapTypeId: opts.mapTypeId || 'roadmap',
        styles: opts.styles || global.__bgGoogleMapStyle,
        disableDefaultUI: opts.disableDefaultUI !== undefined ? opts.disableDefaultUI : true,
        gestureHandling: 'greedy',
        backgroundColor: '#1c2530',
        minZoom: Config?.MAP?.MIN_ZOOM || 3,
        maxZoom: Config?.MAP?.MAX_ZOOM || 19,
        ...opts,
      });
      this.activeInstance = map;
      this.currentProvider = MapProviders.GOOGLE;
      if (EventBus) EventBus.emit('map:initialized', { provider: 'google', map });
      return map;
    },

    /**
     * Initialize OpenStreetMap (iframe fallback).
     * @private
     */
    _initOSM(container, center, opts) {
      const lat = center?.lat || 51.2277;
      const lng = center?.lng || 6.7735;
      const zoom = opts.zoom || 14;
      const bbox = `${(lng - 0.01).toFixed(4)},${(lat - 0.005).toFixed(4)},${(lng + 0.01).toFixed(4)},${(lat + 0.005).toFixed(4)}`;
      container.innerHTML = `<iframe width="100%" height="100%" frameborder="0" scrolling="no"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(4)},${lng.toFixed(4)}"
        style="border:0;display:block;position:absolute;inset:0" loading="lazy"></iframe>`;
      this.currentProvider = MapProviders.OSM;
      if (EventBus) EventBus.emit('map:initialized', { provider: 'osm' });
      return { provider: 'osm', center, zoom };
    },

    /**
     * Destroy current map instance.
     */
    destroy() {
      if (this.activeInstance && typeof this.activeInstance.setMap === 'function') {
        try { this.activeInstance.setMap(null); } catch (_) {}
      }
      this.activeInstance = null;
      if (EventBus) EventBus.emit('map:destroyed', null);
      if (Logger) Logger.debug('MapService', 'Map destroyed');
    },

    /**
     * Set center on active map.
     * @param {number} lat
     * @param {number} lng
     */
    setCenter(lat, lng) {
      if (!this.activeInstance) return;
      if (typeof this.activeInstance.setCenter === 'function') {
        this.activeInstance.setCenter({ lat, lng });
      }
    },

    /**
     * Get current provider.
     * @returns {string}
     */
    getProvider() {
      return this.currentProvider;
    },

    /**
     * Switch provider manually (for testing).
     * @param {string} provider - MapProviders.*
     */
    setProvider(provider) {
      if (Object.values(MapProviders).includes(provider)) {
        this.currentProvider = provider;
        if (Logger) Logger.info('MapService', `Provider set to ${provider}`);
      }
    },
  });

  global.MapService = MapService;
  global.MapProviders = MapProviders;
})(typeof window !== 'undefined' ? window : globalThis);