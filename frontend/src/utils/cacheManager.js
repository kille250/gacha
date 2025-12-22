/**
 * Centralized Cache Manager
 * 
 * Provides unified cache invalidation, visibility handling, and debugging tools.
 * This consolidates scattered cache logic into a single, auditable module.
 * 
 * USAGE:
 * - Use invalidateFor(CACHE_ACTIONS.FISHING_CATCH) for type-safe invalidation
 * - Use onVisibilityChange() to register page-specific refresh callbacks
 * - Cache invalidation is the CALLER's responsibility (not API functions)
 * 
 * VISIBILITY HANDLING:
 * - Global visibility changes are handled centrally
 * - Pages can register callbacks via onVisibilityChange() for specific data refreshes
 * - This replaces scattered document.addEventListener('visibilitychange', ...) calls
 */

import { clearCache, invalidateFishingAction, invalidateDojoAction, invalidateAdminAction } from './api';

// Re-export CACHE_ACTIONS for convenience
export { CACHE_ACTIONS, FISHING_ACTIONS, DOJO_ACTIONS, GACHA_ACTIONS, ADMIN_ACTIONS, AUTH_ACTIONS, MODAL_ACTIONS } from './cacheActions';

// ===========================================
// STALENESS THRESHOLDS
// ===========================================

/**
 * Staleness thresholds for visibility-based cache invalidation.
 * When a tab is backgrounded longer than these thresholds, caches are cleared.
 */
export const STALE_THRESHOLDS = {
  critical: 30 * 1000,    // 30s - auth, tickets (must be fresh for transactions)
  normal: 2 * 60 * 1000,  // 2min - dojo, fishing status
  static: 5 * 60 * 1000   // 5min - character lists, banners (rarely change)
};

/**
 * Cache patterns to invalidate at each staleness threshold
 */
const VISIBILITY_INVALIDATIONS = {
  critical: ['/auth/me', '/banners/user/tickets'],
  normal: ['/fishing/info', '/fishing/rank', '/dojo/status'],
  static: ['/characters', '/banners']
};

// ===========================================
// VISIBILITY HANDLER
// ===========================================

let lastHiddenTime = 0;
let visibilityHandlerInitialized = false;

/**
 * Registry for page-specific visibility callbacks.
 * Pages can register callbacks that run when the tab becomes visible.
 * This replaces scattered visibility event listeners in individual pages.
 */
const visibilityCallbacks = new Map();

/**
 * Register a callback to run when the tab becomes visible after being hidden.
 * Use this instead of adding your own visibilitychange event listener.
 * 
 * @param {string} id - Unique identifier for this callback (e.g., 'banner-pricing')
 * @param {Function} callback - Function to call: (staleLevel, elapsedMs) => void
 * @returns {Function} Cleanup function to unregister the callback
 * 
 * @example
 * // In a React component:
 * useEffect(() => {
 *   return onVisibilityChange('my-page-data', async (staleLevel, elapsed) => {
 *     if (staleLevel === 'critical') {
 *       await refreshMyData();
 *     }
 *   });
 * }, []);
 */
export const onVisibilityChange = (id, callback) => {
  visibilityCallbacks.set(id, callback);
  return () => {
    visibilityCallbacks.delete(id);
  };
};

/**
 * Get elapsed time since tab was hidden (for manual checks)
 * @returns {number} Milliseconds since tab was hidden, or 0 if never hidden
 */
export const getElapsedHiddenTime = () => {
  if (lastHiddenTime === 0) return 0;
  return Date.now() - lastHiddenTime;
};

/**
 * Initialize the global visibility change handler.
 * Call this once in your app's entry point (e.g., App.js).
 * 
 * @param {Object} options
 * @param {Function} [options.onStale] - Callback when data is stale (for triggering refreshes)
 * @param {boolean} [options.debug=false] - Enable debug logging
 */
export const initVisibilityHandler = (options = {}) => {
  if (visibilityHandlerInitialized) {
    if (options.debug) {
      console.debug('[CacheManager] Visibility handler already initialized');
    }
    return;
  }

  const { onStale, debug = false } = options;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastHiddenTime = Date.now();
      if (debug) {
        console.debug('[CacheManager] Tab hidden at', new Date().toISOString());
      }
    } else if (document.visibilityState === 'visible') {
      const elapsed = Date.now() - lastHiddenTime;
      let staleLevel = null;

      if (elapsed > STALE_THRESHOLDS.static) {
        staleLevel = 'static';
        VISIBILITY_INVALIDATIONS.critical.forEach(p => clearCache(p));
        VISIBILITY_INVALIDATIONS.normal.forEach(p => clearCache(p));
        VISIBILITY_INVALIDATIONS.static.forEach(p => clearCache(p));
      } else if (elapsed > STALE_THRESHOLDS.normal) {
        staleLevel = 'normal';
        VISIBILITY_INVALIDATIONS.critical.forEach(p => clearCache(p));
        VISIBILITY_INVALIDATIONS.normal.forEach(p => clearCache(p));
      } else if (elapsed > STALE_THRESHOLDS.critical) {
        staleLevel = 'critical';
        VISIBILITY_INVALIDATIONS.critical.forEach(p => clearCache(p));
      }

      if (debug && staleLevel) {
        console.debug(`[CacheManager] Tab visible after ${elapsed}ms (${staleLevel} staleness)`);
      }

      // Invoke the global onStale callback if provided
      if (staleLevel && onStale) {
        onStale(staleLevel, elapsed);
      }
      
      // Invoke all registered page-specific callbacks
      // Run even if staleLevel is null (pages may want to know about any visibility change)
      visibilityCallbacks.forEach((callback, id) => {
        try {
          callback(staleLevel, elapsed);
        } catch (err) {
          console.error(`[CacheManager] Error in visibility callback '${id}':`, err);
        }
      });
    }
  });

  visibilityHandlerInitialized = true;
  if (debug) {
    console.debug('[CacheManager] Visibility handler initialized');
  }
};

// ===========================================
// UNIFIED INVALIDATION
// ===========================================

/**
 * All action types and their corresponding invalidation handlers.
 * This provides a single entry point for all cache invalidation.
 * 
 * NOTE: When adding new actions, also add them to cacheActions.js for type safety.
 */
const ACTION_HANDLERS = {
  // ===========================================
  // FISHING ACTIONS
  // ===========================================
  'fishing:catch': () => invalidateFishingAction('catch'),
  'fishing:autofish': () => invalidateFishingAction('autofish'),
  'fishing:trade': () => invalidateFishingAction('trade'),
  'fishing:unlock_area': () => invalidateFishingAction('unlock_area'),
  'fishing:buy_rod': () => invalidateFishingAction('buy_rod'),
  'fishing:equip_rod': () => invalidateFishingAction('equip_rod'),
  'fishing:claim_challenge': () => invalidateFishingAction('claim_challenge'),
  'fishing:select_area': () => invalidateFishingAction('select_area'),
  
  // ===========================================
  // MODAL/VIEW ACTIONS (replaces forceRefresh pattern)
  // ===========================================
  'modal:equipment_open': () => {
    clearCache('/fishing/areas');
    clearCache('/fishing/rods');
  },
  'modal:trading_open': () => {
    clearCache('/fishing/inventory');
    clearCache('/fishing/trading-post');
  },
  'modal:challenges_open': () => {
    clearCache('/fishing/challenges');
  },
  'modal:leaderboard_open': () => {
    clearCache('/fishing/rank');
  },
  'modal:dojo_open': () => {
    clearCache('/dojo/status');
    clearCache('/dojo/available-characters');
  },

  // ===========================================
  // DOJO ACTIONS
  // ===========================================
  'dojo:assign': () => invalidateDojoAction('assign'),
  'dojo:unassign': () => invalidateDojoAction('unassign'),
  'dojo:claim': () => invalidateDojoAction('claim'),
  'dojo:upgrade': () => invalidateDojoAction('upgrade'),

  // ===========================================
  // ADMIN ACTIONS
  // ===========================================
  'admin:character_add': () => invalidateAdminAction('character_add'),
  'admin:character_edit': () => invalidateAdminAction('character_edit'),
  'admin:character_delete': () => invalidateAdminAction('character_delete'),
  'admin:banner_add': () => invalidateAdminAction('banner_add'),
  'admin:banner_edit': () => invalidateAdminAction('banner_edit'),
  'admin:banner_delete': () => invalidateAdminAction('banner_delete'),
  'admin:banner_reorder': () => invalidateAdminAction('banner_reorder'),
  'admin:banner_featured': () => invalidateAdminAction('banner_featured'),
  'admin:coupon_add': () => invalidateAdminAction('coupon_add'),
  'admin:coupon_edit': () => invalidateAdminAction('coupon_edit'),
  'admin:coupon_delete': () => invalidateAdminAction('coupon_delete'),
  'admin:rarity_add': () => invalidateAdminAction('rarity_add'),
  'admin:rarity_edit': () => invalidateAdminAction('rarity_edit'),
  'admin:rarity_delete': () => invalidateAdminAction('rarity_delete'),
  'admin:rarity_reset': () => invalidateAdminAction('rarity_reset'),
  'admin:user_coins': () => invalidateAdminAction('user_coins'),
  'admin:user_toggle_autofish': () => invalidateAdminAction('user_toggle_autofish'),
  'admin:user_toggle_r18': () => invalidateAdminAction('user_toggle_r18'),
  'admin:bulk_upload': () => invalidateAdminAction('bulk_upload'),
  'admin:anime_import': () => invalidateAdminAction('anime_import'),
  'admin:visibility_change': () => invalidateAdminAction('visibility_change'),

  // ===========================================
  // GACHA/ROLL ACTIONS
  // ===========================================
  'gacha:roll': () => {
    clearCache('/characters/collection');
    clearCache('/auth/me');
  },
  'gacha:roll_banner': () => {
    clearCache('/characters/collection');
    clearCache('/auth/me');
    clearCache('/banners/user/tickets');
  },
  'gacha:level_up': () => {
    clearCache('/characters/collection');
    clearCache('/auth/me');
  },

  // ===========================================
  // AUTH ACTIONS
  // ===========================================
  'auth:login': () => clearCache(),
  'auth:logout': () => clearCache(),
  'auth:refresh': () => clearCache('/auth/me'),
  'auth:toggle_r18': () => {
    clearCache('/characters');
    clearCache('/auth/me');
  }
};

/**
 * Validate an action exists in the ACTION_HANDLERS map.
 * In development, throws an error for unknown actions.
 * In production, logs a warning and returns false.
 * 
 * @param {string} action - The action to validate
 * @returns {boolean} Whether the action is valid
 */
const validateAction = (action) => {
  if (!ACTION_HANDLERS[action]) {
    const availableActions = Object.keys(ACTION_HANDLERS).join(', ');
    const message = `[CacheManager] Unknown action: "${action}". Available actions: ${availableActions}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.error(message);
      // Throw in development to catch typos early
      throw new Error(message);
    }
    
    console.warn(message);
    return false;
  }
  return true;
};

/**
 * Invalidate caches for a specific action.
 * This is the single entry point for all cache invalidation in the app.
 * 
 * @param {string} action - The action identifier (e.g., 'fishing:catch', 'dojo:claim')
 * @param {Object} [options]
 * @param {boolean} [options.debug=false] - Log the invalidation
 * @returns {boolean} Whether the action was handled
 * 
 * @example
 * import { CACHE_ACTIONS } from '../utils/cacheManager';
 * invalidateFor(CACHE_ACTIONS.FISHING_CATCH);
 * invalidateFor(CACHE_ACTIONS.DOJO_CLAIM, { debug: true });
 */
export const invalidateFor = (action, options = {}) => {
  if (!validateAction(action)) {
    return false;
  }

  const handler = ACTION_HANDLERS[action];
  handler();

  if (options.debug || (typeof window !== 'undefined' && window.__CACHE_DEBUG_ENABLED__)) {
    console.debug(`[CacheManager] Invalidated for action: ${action}`);
  }

  return true;
};

/**
 * Get all registered action types.
 * Useful for autocomplete and documentation.
 */
export const getActionTypes = () => Object.keys(ACTION_HANDLERS);

// ===========================================
// DEBUGGING TOOLS
// ===========================================

/**
 * Enable cache debugging mode.
 * Exposes debugging tools on window.__CACHE_DEBUG__
 */
export const enableCacheDebugging = () => {
  if (typeof window === 'undefined') return;

  window.__CACHE_DEBUG_ENABLED__ = true;
  
  window.__CACHE_DEBUG__ = {
    /**
     * Invalidate caches for an action
     */
    invalidateFor,

    /**
     * Clear cache by pattern
     */
    clearCache,

    /**
     * Get all registered action types
     */
    getActionTypes,

    /**
     * Get staleness thresholds
     */
    getThresholds: () => ({ ...STALE_THRESHOLDS }),

    /**
     * Get visibility invalidation patterns
     */
    getVisibilityPatterns: () => ({ ...VISIBILITY_INVALIDATIONS }),

    /**
     * Manually trigger visibility-based invalidation
     */
    triggerStaleCheck: (staleLevel = 'critical') => {
      const patterns = [];
      if (['critical', 'normal', 'static'].includes(staleLevel)) {
        patterns.push(...VISIBILITY_INVALIDATIONS.critical);
      }
      if (['normal', 'static'].includes(staleLevel)) {
        patterns.push(...VISIBILITY_INVALIDATIONS.normal);
      }
      if (staleLevel === 'static') {
        patterns.push(...VISIBILITY_INVALIDATIONS.static);
      }
      patterns.forEach(p => clearCache(p));
      console.debug(`[CacheManager] Manually triggered ${staleLevel} staleness check`);
      return patterns;
    },

    /**
     * Disable debug mode
     */
    disable: () => {
      window.__CACHE_DEBUG_ENABLED__ = false;
      console.debug('[CacheManager] Debug mode disabled');
    }
  };

  console.debug('[CacheManager] Debug mode enabled. Access via window.__CACHE_DEBUG__');
  console.debug('[CacheManager] Available actions:', getActionTypes());
};

/**
 * Disable cache debugging mode
 */
export const disableCacheDebugging = () => {
  if (typeof window === 'undefined') return;
  window.__CACHE_DEBUG_ENABLED__ = false;
  delete window.__CACHE_DEBUG__;
};

// ===========================================
// DEFAULT EXPORT
// ===========================================

const cacheManager = {
  initVisibilityHandler,
  invalidateFor,
  getActionTypes,
  enableCacheDebugging,
  disableCacheDebugging,
  onVisibilityChange,
  getElapsedHiddenTime,
  STALE_THRESHOLDS,
  // Re-export for convenience
  clearCache
};

export default cacheManager;

