/**
 * Centralized Cache Manager
 *
 * Provides unified cache invalidation, visibility handling, and debugging tools.
 * This is the SINGLE SOURCE OF TRUTH for all cache invalidation patterns.
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
 *
 * MODAL INVALIDATION PATTERN:
 * When opening a modal that may show cached data:
 * 1. Call invalidateFor(CACHE_ACTIONS.MODAL_*_OPEN) BEFORE fetching
 * 2. Then fetch the data
 * 3. Data will be fresh from server (cache cleared)
 *
 * This prevents showing stale data when user closes/reopens modal.
 *
 * Example:
 *   case MODAL_TYPES.EQUIPMENT:
 *     invalidateFor(CACHE_ACTIONS.MODAL_EQUIPMENT_OPEN);  // Clear first
 *     equipment.fetchData();                              // Then fetch
 *     break;
 *
 * PRE-TRANSACTION PATTERN:
 * Before any action that spends currency (points, tickets, fate points):
 * 1. Call invalidateFor(CACHE_ACTIONS.PRE_ROLL) or invalidateFor(CACHE_ACTIONS.PRE_PURCHASE)
 * 2. This ensures fresh user data, preventing stale-state bugs
 * 3. Then execute the transaction
 * 4. After success, invalidate the result caches
 *
 * Example:
 *   invalidateFor(CACHE_ACTIONS.PRE_PURCHASE);  // Ensure fresh user data
 *   const result = await exchangeFatePoints(...);
 *   invalidateFor(CACHE_ACTIONS.ENHANCEMENT_EXCHANGE_FATE_POINTS);
 */

import { clearCache } from '../utils/api';
import { SESSION_KEYS } from './constants';

// Re-export CACHE_ACTIONS for convenience
export {
  CACHE_ACTIONS,
  FISHING_ACTIONS,
  DOJO_ACTIONS,
  GACHA_ACTIONS,
  ADMIN_ACTIONS,
  AUTH_ACTIONS,
  COUPON_ACTIONS,
  MODAL_ACTIONS,
  PRE_TRANSACTION_ACTIONS,
  ENHANCEMENT_ACTIONS,
  FORTUNE_WHEEL_ACTIONS,
  VISIBILITY_CALLBACK_IDS,
  SESSION_KEYS,
  LOCAL_STORAGE_KEYS
} from './constants';

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
 * Centralized refresh interval configuration.
 * Use these instead of magic numbers scattered across pages.
 */
export const REFRESH_INTERVALS = {
  /** Refresh fishing/rank data every N autofish catches (to reduce API calls) */
  autofishCatchThreshold: 10,
  /** WebSocket keepalive heartbeat interval (ms) */
  heartbeatMs: 30000,
  /** Background periodic status refresh (ms) */
  periodicRefreshMs: 30000,
  /** Admin data staleness threshold (ms) - longer since admin changes are rare */
  adminStaleThresholdMs: 60000,
};

/**
 * Cache patterns to invalidate at each staleness threshold
 */
const VISIBILITY_INVALIDATIONS = {
  critical: ['/auth/me', '/banners/user/tickets'],
  normal: ['/fishing/info', '/fishing/rank', '/fishing/challenges', '/dojo/status', '/enhancements/gacha/fate-points'],
  static: ['/characters', '/banners']
};

// ===========================================
// CONSOLIDATED INVALIDATION PATTERNS
// Single source of truth for all cache invalidation
// ===========================================

/**
 * Fishing action invalidation patterns
 * Guidelines:
 * - Include '/auth/me' only for actions that change user points/currency
 * - Include '/fishing/inventory' for actions that add/remove fish
 * - Include '/fishing/info' for actions that change equipped gear or area
 */
const FISHING_PATTERNS = {
  catch: ['/fishing/info', '/fishing/rank', '/fishing/inventory', '/fishing/challenges', '/auth/me'],
  autofish: ['/fishing/info', '/fishing/rank', '/fishing/inventory', '/fishing/challenges', '/auth/me'],
  trade: ['/fishing/inventory', '/fishing/trading-post', '/fishing/challenges', '/auth/me'],
  unlock_area: ['/fishing/areas', '/fishing/info', '/auth/me'],
  buy_rod: ['/fishing/rods', '/fishing/info', '/auth/me'],
  equip_rod: ['/fishing/rods', '/fishing/info'],
  claim_challenge: ['/fishing/challenges', '/auth/me', '/banners/user/tickets'],
  select_area: ['/fishing/areas', '/fishing/info'],
  claim_prestige: ['/fishing/prestige', '/fishing/info', '/auth/me']
};

/**
 * Dojo action invalidation patterns
 */
const DOJO_PATTERNS = {
  assign: ['/dojo/status', '/dojo/available-characters'],
  unassign: ['/dojo/status', '/dojo/available-characters'],
  claim: ['/dojo/status', '/auth/me', '/banners/user/tickets'],
  upgrade: ['/dojo/status', '/auth/me']
};

/**
 * Admin action invalidation patterns
 * These actions affect both admin views AND user-facing pages
 */
const ADMIN_PATTERNS = {
  character_add: ['/admin/dashboard', '/characters'],
  character_edit: ['/admin/dashboard', '/characters', '/characters/collection'],
  character_delete: ['/admin/dashboard', '/characters', '/characters/collection', '/banners'],
  banner_add: ['/admin/dashboard', '/banners'],
  banner_edit: ['/admin/dashboard', '/banners'],
  banner_delete: ['/admin/dashboard', '/banners'],
  banner_reorder: ['/banners'],
  banner_featured: ['/banners'],
  coupon_add: ['/admin/dashboard', '/coupons'],
  coupon_edit: ['/admin/dashboard', '/coupons'],
  coupon_delete: ['/admin/dashboard', '/coupons'],
  rarity_add: ['/admin/dashboard', '/rarities', '/characters'],
  rarity_edit: ['/admin/dashboard', '/rarities', '/characters'],
  rarity_delete: ['/admin/dashboard', '/rarities', '/characters'],
  rarity_reset: ['/admin/dashboard', '/rarities', '/characters'],
  user_coins: ['/admin/dashboard', '/admin/users', '/auth/me'],
  user_toggle_autofish: ['/admin/users'],
  user_toggle_r18: ['/admin/users'],
  bulk_upload: ['/admin/dashboard', '/characters'],
  anime_import: ['/admin/dashboard', '/characters'],
  visibility_change: ['/admin/dashboard', '/admin/users']
};

/**
 * Modal/View pre-fetch invalidation patterns
 * Use before fetching data to ensure fresh responses
 */
const MODAL_PATTERNS = {
  equipment_open: ['/fishing/areas', '/fishing/rods'],
  trading_open: ['/fishing/inventory', '/fishing/trading-post'],
  challenges_open: ['/fishing/challenges'],
  leaderboard_open: ['/fishing/rank'],
  dojo_open: ['/dojo/status', '/dojo/available-characters'],
  prestige_open: ['/fishing/prestige']
};

/**
 * Gacha action invalidation patterns
 * Note: Fate points are invalidated because rolls award points
 */
const GACHA_PATTERNS = {
  roll: ['/characters/collection', '/auth/me', '/enhancements/gacha/fate-points'],
  roll_banner: ['/characters/collection', '/auth/me', '/banners/user/tickets', '/enhancements/gacha/fate-points'],
  level_up: ['/characters/collection', '/auth/me']
};

/**
 * Coupon action invalidation patterns
 * Coupons can grant points, characters, or tickets - invalidate all relevant caches
 */
const COUPON_PATTERNS = {
  redeem: ['/auth/me', '/characters/collection', '/banners/user/tickets']
};

/**
 * Pre-transaction invalidation patterns
 * Use these for defensive revalidation before critical operations to prevent stale-state bugs
 */
const PRE_TRANSACTION_PATTERNS = {
  roll: ['/auth/me', '/banners/user/tickets'],
  purchase: ['/auth/me']
};

/**
 * Security action invalidation patterns
 * For admin security operations that affect user states and audit data
 */
const SECURITY_PATTERNS = {
  restrict_user: ['/admin/security', '/admin/users'],
  unrestrict_user: ['/admin/security', '/admin/users'],
  warn_user: ['/admin/security', '/admin/users'],
  reset_warnings: ['/admin/security', '/admin/users'],
  clear_devices: ['/admin/security', '/admin/users'],
  recalculate_risk: ['/admin/security', '/admin/users'],
  reset_risk: ['/admin/security', '/admin/users'],
  security_config_update: ['/admin/security'],
  approve_appeal: ['/admin/security', '/admin/users'],
  deny_appeal: ['/admin/security'],
  risk_decay: ['/admin/security']
};

/**
 * Enhancement system invalidation patterns
 * For dojo specializations, gacha milestones, fate points, and retention systems
 */
const ENHANCEMENT_PATTERNS = {
  dojo_specialize: ['/enhancements/dojo/character', '/dojo/status'],
  dojo_facility_upgrade: ['/enhancements/dojo/facility', '/dojo/status', '/auth/me'],
  claim_milestone: ['/enhancements/gacha/milestones', '/auth/me', '/banners/user/tickets'],
  exchange_fate_points: ['/enhancements/gacha/fate-points', '/characters/collection', '/enhancements/selectors', '/banners/user/tickets', '/auth/me'],
  claim_return_bonus: ['/auth/me', '/enhancements/return-bonus'],
  use_selector: ['/enhancements/selectors', '/characters/collection']
};

/**
 * Fortune Wheel invalidation patterns
 * Spinning the wheel may grant points, tickets, or XP multipliers
 */
const FORTUNE_WHEEL_PATTERNS = {
  spin: ['/fortune-wheel/status', '/fortune-wheel/multiplier', '/auth/me', '/banners/user/tickets']
};

/**
 * Helper to invalidate patterns for an action
 */
const invalidatePatterns = (patterns) => {
  patterns.forEach(p => clearCache(p));
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
 * Cache invalidation event log for debugging
 */
const cacheEvents = [];
const MAX_CACHE_EVENTS = 100;
const MAX_PERSISTED_EVENTS = 20;

/**
 * Persist recent cache events to sessionStorage for crash debugging
 */
const persistCacheEvents = () => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEYS.CACHE_DEBUG_EVENTS, 
      JSON.stringify(cacheEvents.slice(-MAX_PERSISTED_EVENTS))
    );
  } catch (_e) {
    // Silent fail - sessionStorage might be full or disabled
  }
};

/**
 * Restore persisted cache events (for debugging after page reload)
 */
const restorePersistedEvents = () => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const stored = sessionStorage.getItem(SESSION_KEYS.CACHE_DEBUG_EVENTS);
    if (stored) {
      const events = JSON.parse(stored);
      // Mark as restored
      events.forEach(e => e.restored = true);
      cacheEvents.push(...events);
    }
  } catch (_e) {
    // Silent fail
  }
};

/**
 * All action types and their corresponding invalidation patterns.
 * This provides a single entry point for all cache invalidation.
 */
const ACTION_HANDLERS = {
  // ===========================================
  // FISHING ACTIONS
  // ===========================================
  'fishing:catch': () => invalidatePatterns(FISHING_PATTERNS.catch),
  'fishing:autofish': () => invalidatePatterns(FISHING_PATTERNS.autofish),
  'fishing:trade': () => invalidatePatterns(FISHING_PATTERNS.trade),
  'fishing:unlock_area': () => invalidatePatterns(FISHING_PATTERNS.unlock_area),
  'fishing:buy_rod': () => invalidatePatterns(FISHING_PATTERNS.buy_rod),
  'fishing:equip_rod': () => invalidatePatterns(FISHING_PATTERNS.equip_rod),
  'fishing:claim_challenge': () => invalidatePatterns(FISHING_PATTERNS.claim_challenge),
  'fishing:select_area': () => invalidatePatterns(FISHING_PATTERNS.select_area),
  'fishing:claim_prestige': () => invalidatePatterns(FISHING_PATTERNS.claim_prestige),
  
  // ===========================================
  // MODAL/VIEW ACTIONS (pre-fetch cache invalidation)
  // ===========================================
  'modal:equipment_open': () => invalidatePatterns(MODAL_PATTERNS.equipment_open),
  'modal:trading_open': () => invalidatePatterns(MODAL_PATTERNS.trading_open),
  'modal:challenges_open': () => invalidatePatterns(MODAL_PATTERNS.challenges_open),
  'modal:leaderboard_open': () => invalidatePatterns(MODAL_PATTERNS.leaderboard_open),
  'modal:dojo_open': () => invalidatePatterns(MODAL_PATTERNS.dojo_open),
  'modal:prestige_open': () => invalidatePatterns(MODAL_PATTERNS.prestige_open),

  // ===========================================
  // DOJO ACTIONS
  // ===========================================
  'dojo:assign': () => invalidatePatterns(DOJO_PATTERNS.assign),
  'dojo:unassign': () => invalidatePatterns(DOJO_PATTERNS.unassign),
  'dojo:claim': () => invalidatePatterns(DOJO_PATTERNS.claim),
  'dojo:upgrade': () => invalidatePatterns(DOJO_PATTERNS.upgrade),

  // ===========================================
  // ADMIN ACTIONS
  // ===========================================
  'admin:character_add': () => invalidatePatterns(ADMIN_PATTERNS.character_add),
  'admin:character_edit': () => invalidatePatterns(ADMIN_PATTERNS.character_edit),
  'admin:character_delete': () => invalidatePatterns(ADMIN_PATTERNS.character_delete),
  'admin:banner_add': () => invalidatePatterns(ADMIN_PATTERNS.banner_add),
  'admin:banner_edit': () => invalidatePatterns(ADMIN_PATTERNS.banner_edit),
  'admin:banner_delete': () => invalidatePatterns(ADMIN_PATTERNS.banner_delete),
  'admin:banner_reorder': () => invalidatePatterns(ADMIN_PATTERNS.banner_reorder),
  'admin:banner_featured': () => invalidatePatterns(ADMIN_PATTERNS.banner_featured),
  'admin:coupon_add': () => invalidatePatterns(ADMIN_PATTERNS.coupon_add),
  'admin:coupon_edit': () => invalidatePatterns(ADMIN_PATTERNS.coupon_edit),
  'admin:coupon_delete': () => invalidatePatterns(ADMIN_PATTERNS.coupon_delete),
  'admin:rarity_add': () => invalidatePatterns(ADMIN_PATTERNS.rarity_add),
  'admin:rarity_edit': () => invalidatePatterns(ADMIN_PATTERNS.rarity_edit),
  'admin:rarity_delete': () => invalidatePatterns(ADMIN_PATTERNS.rarity_delete),
  'admin:rarity_reset': () => invalidatePatterns(ADMIN_PATTERNS.rarity_reset),
  'admin:user_coins': () => invalidatePatterns(ADMIN_PATTERNS.user_coins),
  'admin:user_toggle_autofish': () => invalidatePatterns(ADMIN_PATTERNS.user_toggle_autofish),
  'admin:user_toggle_r18': () => invalidatePatterns(ADMIN_PATTERNS.user_toggle_r18),
  'admin:bulk_upload': () => invalidatePatterns(ADMIN_PATTERNS.bulk_upload),
  'admin:anime_import': () => invalidatePatterns(ADMIN_PATTERNS.anime_import),
  'admin:visibility_change': () => invalidatePatterns(ADMIN_PATTERNS.visibility_change),
  // Security actions
  'admin:restrict_user': () => invalidatePatterns(SECURITY_PATTERNS.restrict_user),
  'admin:unrestrict_user': () => invalidatePatterns(SECURITY_PATTERNS.unrestrict_user),
  'admin:warn_user': () => invalidatePatterns(SECURITY_PATTERNS.warn_user),
  'admin:reset_warnings': () => invalidatePatterns(SECURITY_PATTERNS.reset_warnings),
  'admin:clear_devices': () => invalidatePatterns(SECURITY_PATTERNS.clear_devices),
  'admin:recalculate_risk': () => invalidatePatterns(SECURITY_PATTERNS.recalculate_risk),
  'admin:reset_risk': () => invalidatePatterns(SECURITY_PATTERNS.reset_risk),
  'admin:security_config_update': () => invalidatePatterns(SECURITY_PATTERNS.security_config_update),
  'admin:approve_appeal': () => invalidatePatterns(SECURITY_PATTERNS.approve_appeal),
  'admin:deny_appeal': () => invalidatePatterns(SECURITY_PATTERNS.deny_appeal),
  'admin:risk_decay': () => invalidatePatterns(SECURITY_PATTERNS.risk_decay),

  // ===========================================
  // GACHA/ROLL ACTIONS
  // ===========================================
  'gacha:roll': () => invalidatePatterns(GACHA_PATTERNS.roll),
  'gacha:roll_banner': () => invalidatePatterns(GACHA_PATTERNS.roll_banner),
  'gacha:level_up': () => invalidatePatterns(GACHA_PATTERNS.level_up),

  // ===========================================
  // COUPON ACTIONS
  // ===========================================
  'coupon:redeem': () => invalidatePatterns(COUPON_PATTERNS.redeem),

  // ===========================================
  // AUTH ACTIONS
  // ===========================================
  'auth:login': () => clearCache(),
  'auth:logout': () => clearCache(),
  'auth:refresh': () => clearCache('/auth/me'),
  'auth:toggle_r18': () => {
    clearCache('/characters');
    clearCache('/auth/me');
  },

  // ===========================================
  // PRE-TRANSACTION ACTIONS (defensive revalidation)
  // ===========================================
  'pre:roll': () => invalidatePatterns(PRE_TRANSACTION_PATTERNS.roll),
  'pre:purchase': () => invalidatePatterns(PRE_TRANSACTION_PATTERNS.purchase),

  // ===========================================
  // ENHANCEMENT ACTIONS
  // ===========================================
  'enhancement:dojo_specialize': () => invalidatePatterns(ENHANCEMENT_PATTERNS.dojo_specialize),
  'enhancement:dojo_facility_upgrade': () => invalidatePatterns(ENHANCEMENT_PATTERNS.dojo_facility_upgrade),
  'enhancement:claim_milestone': () => invalidatePatterns(ENHANCEMENT_PATTERNS.claim_milestone),
  'enhancement:exchange_fate_points': () => invalidatePatterns(ENHANCEMENT_PATTERNS.exchange_fate_points),
  'enhancement:claim_return_bonus': () => invalidatePatterns(ENHANCEMENT_PATTERNS.claim_return_bonus),
  'enhancement:use_selector': () => invalidatePatterns(ENHANCEMENT_PATTERNS.use_selector),

  // ===========================================
  // FORTUNE WHEEL ACTIONS
  // ===========================================
  'fortune:spin': () => invalidatePatterns(FORTUNE_WHEEL_PATTERNS.spin)
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
    
    if (import.meta.env.DEV) {
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
 * import { CACHE_ACTIONS } from '../cache';
 * invalidateFor(CACHE_ACTIONS.FISHING_CATCH);
 * invalidateFor(CACHE_ACTIONS.DOJO_CLAIM, { debug: true });
 */
export const invalidateFor = (action, options = {}) => {
  if (!validateAction(action)) {
    return false;
  }

  const startTime = performance.now();
  const handler = ACTION_HANDLERS[action];
  handler();
  const duration = performance.now() - startTime;

  // Track invalidation for debugging
  if (typeof window !== 'undefined') {
    const event = {
      action,
      timestamp: Date.now(),
      duration: Math.round(duration * 100) / 100
    };
    cacheEvents.push(event);
    // Keep only last N events
    if (cacheEvents.length > MAX_CACHE_EVENTS) {
      cacheEvents.shift();
    }
    // Persist for crash debugging
    persistCacheEvents();
  }

  if (options.debug || (typeof window !== 'undefined' && window.__CACHE_DEBUG_ENABLED__)) {
    console.debug(`[CacheManager] Invalidated for action: ${action} (${duration.toFixed(2)}ms)`);
  }

  return true;
};

/**
 * Get all registered action types.
 * Useful for autocomplete and documentation.
 */
export const getActionTypes = () => Object.keys(ACTION_HANDLERS);

/**
 * Get the invalidation patterns for a specific action.
 * Useful for debugging and understanding what caches an action clears.
 * 
 * @param {string} action - The action identifier
 * @returns {string[]|null} Array of cache patterns, or null if action unknown
 */
export const getInvalidationPatterns = (action) => {
  const parts = action.split(':');
  if (parts.length !== 2) return null;
  
  const [domain, actionName] = parts;
  
  switch (domain) {
    case 'fishing':
      return FISHING_PATTERNS[actionName] || null;
    case 'dojo':
      return DOJO_PATTERNS[actionName] || null;
    case 'admin':
      // Check security patterns first, then admin patterns
      return SECURITY_PATTERNS[actionName] || ADMIN_PATTERNS[actionName] || null;
    case 'gacha':
      return GACHA_PATTERNS[actionName] || null;
    case 'coupon':
      return COUPON_PATTERNS[actionName] || null;
    case 'modal':
      return MODAL_PATTERNS[actionName] || null;
    case 'auth':
      // Auth actions use full clear or specific patterns
      if (actionName === 'toggle_r18') return ['/characters', '/auth/me'];
      if (actionName === 'refresh') return ['/auth/me'];
      return ['*']; // Full clear
    case 'pre':
      return PRE_TRANSACTION_PATTERNS[actionName] || null;
    case 'enhancement':
      return ENHANCEMENT_PATTERNS[actionName] || null;
    case 'fortune':
      return FORTUNE_WHEEL_PATTERNS[actionName] || null;
    default:
      return null;
  }
};

/**
 * Get current cache state for debugging purposes.
 * Useful for understanding cache behavior and diagnosing issues.
 * 
 * @returns {Object} Current cache state information
 */
export const getCacheState = () => {
  return {
    visibilityCallbackCount: visibilityCallbacks.size,
    registeredCallbackIds: Array.from(visibilityCallbacks.keys()),
    lastHiddenTime: lastHiddenTime > 0 ? new Date(lastHiddenTime).toISOString() : null,
    elapsedSinceHidden: lastHiddenTime > 0 ? Date.now() - lastHiddenTime : 0,
    visibilityHandlerInitialized,
    registeredActionCount: Object.keys(ACTION_HANDLERS).length,
    recentEvents: cacheEvents.slice(-10),
  };
};

/**
 * Get comprehensive cache audit log for production debugging.
 * Provides statistics and event history for diagnosing cache issues.
 * 
 * @returns {Object} Audit log with events and statistics
 */
export const getCacheAuditLog = () => {
  const events = [...cacheEvents];
  
  // Calculate statistics
  const byAction = events.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
  }, {});
  
  const avgDuration = events.length > 0
    ? events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length
    : 0;
  
  const restoredCount = events.filter(e => e.restored).length;
  
  return {
    events,
    stats: {
      totalInvalidations: events.length,
      byAction,
      avgDuration: Math.round(avgDuration * 100) / 100,
      restoredFromPreviousSession: restoredCount
    },
    state: getCacheState()
  };
};

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
     * Get invalidation patterns for an action
     */
    getInvalidationPatterns,

    /**
     * Get staleness thresholds
     */
    getThresholds: () => ({ ...STALE_THRESHOLDS }),

    /**
     * Get visibility invalidation patterns
     */
    getVisibilityPatterns: () => ({ ...VISIBILITY_INVALIDATIONS }),

    /**
     * Get all invalidation pattern maps
     */
    getAllPatterns: () => ({
      fishing: { ...FISHING_PATTERNS },
      dojo: { ...DOJO_PATTERNS },
      admin: { ...ADMIN_PATTERNS },
      security: { ...SECURITY_PATTERNS },
      modal: { ...MODAL_PATTERNS },
      gacha: { ...GACHA_PATTERNS },
      coupon: { ...COUPON_PATTERNS },
      pre: { ...PRE_TRANSACTION_PATTERNS },
      enhancement: { ...ENHANCEMENT_PATTERNS },
      fortune: { ...FORTUNE_WHEEL_PATTERNS }
    }),

    /**
     * Get comprehensive audit log
     */
    getAuditLog: getCacheAuditLog,

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
     * Get current cache state
     */
    getCacheState,

    /**
     * Get recent cache events
     */
    getEvents: () => [...cacheEvents],

    /**
     * Clear event log
     */
    clearEvents: () => {
      cacheEvents.length = 0;
      console.debug('[CacheManager] Event log cleared');
    },

    /**
     * Disable debug mode
     */
    disable: () => {
      window.__CACHE_DEBUG_ENABLED__ = false;
      console.debug('[CacheManager] Debug mode disabled');
    }
  };

  // Restore any persisted events from previous session
  restorePersistedEvents();
  
  console.debug('[CacheManager] Debug mode enabled. Access via window.__CACHE_DEBUG__');
  console.debug('[CacheManager] Available actions:', getActionTypes());
  console.debug('[CacheManager] Current state:', getCacheState());
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
// RE-EXPORT clearCache for convenience
// ===========================================

export { clearCache };
