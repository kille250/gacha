/**
 * Cache Action Constants
 * 
 * Use these constants instead of string literals when calling invalidateFor().
 * This provides:
 * - Autocomplete support in IDE
 * - Typo detection at import time
 * - Easy grep-ability for finding all usages
 * - Single source of truth for action names
 * 
 * @example
 * import { CACHE_ACTIONS } from '../utils/cacheActions';
 * invalidateFor(CACHE_ACTIONS.FISHING_CATCH);
 */

// ===========================================
// FISHING ACTIONS
// ===========================================

export const FISHING_ACTIONS = {
  /** Manually catching a fish - updates inventory, points, pity, challenges */
  CATCH: 'fishing:catch',
  /** Autofish loop - updates inventory, points, pity */
  AUTOFISH: 'fishing:autofish',
  /** Trading fish for rewards - updates inventory, points */
  TRADE: 'fishing:trade',
  /** Unlocking a new fishing area - updates areas, points */
  UNLOCK_AREA: 'fishing:unlock_area',
  /** Buying a fishing rod - updates rods, points */
  BUY_ROD: 'fishing:buy_rod',
  /** Equipping a rod (no point change) - updates rods, info */
  EQUIP_ROD: 'fishing:equip_rod',
  /** Claiming a challenge reward - updates challenges, points */
  CLAIM_CHALLENGE: 'fishing:claim_challenge',
  /** Selecting an area to fish in - updates areas, info */
  SELECT_AREA: 'fishing:select_area',
};

// ===========================================
// DOJO ACTIONS
// ===========================================

export const DOJO_ACTIONS = {
  /** Assigning a character to a training slot */
  ASSIGN: 'dojo:assign',
  /** Removing a character from a training slot */
  UNASSIGN: 'dojo:unassign',
  /** Claiming accumulated training rewards */
  CLAIM: 'dojo:claim',
  /** Purchasing a dojo upgrade */
  UPGRADE: 'dojo:upgrade',
};

// ===========================================
// GACHA ACTIONS
// ===========================================

export const GACHA_ACTIONS = {
  /** Standard gacha roll - updates collection, points */
  ROLL: 'gacha:roll',
  /** Banner-specific roll - updates collection, points, tickets */
  ROLL_BANNER: 'gacha:roll_banner',
  /** Level up a character - updates collection, points */
  LEVEL_UP: 'gacha:level_up',
};

// ===========================================
// ADMIN ACTIONS
// ===========================================

export const ADMIN_ACTIONS = {
  /** Adding a new character */
  CHARACTER_ADD: 'admin:character_add',
  /** Editing an existing character */
  CHARACTER_EDIT: 'admin:character_edit',
  /** Deleting a character */
  CHARACTER_DELETE: 'admin:character_delete',
  /** Adding a new banner */
  BANNER_ADD: 'admin:banner_add',
  /** Editing an existing banner */
  BANNER_EDIT: 'admin:banner_edit',
  /** Deleting a banner */
  BANNER_DELETE: 'admin:banner_delete',
  /** Reordering banners */
  BANNER_REORDER: 'admin:banner_reorder',
  /** Changing banner featured status */
  BANNER_FEATURED: 'admin:banner_featured',
  /** Adding a coupon */
  COUPON_ADD: 'admin:coupon_add',
  /** Editing a coupon */
  COUPON_EDIT: 'admin:coupon_edit',
  /** Deleting a coupon */
  COUPON_DELETE: 'admin:coupon_delete',
  /** Adding a rarity */
  RARITY_ADD: 'admin:rarity_add',
  /** Editing a rarity */
  RARITY_EDIT: 'admin:rarity_edit',
  /** Deleting a rarity */
  RARITY_DELETE: 'admin:rarity_delete',
  /** Resetting rarities to defaults */
  RARITY_RESET: 'admin:rarity_reset',
  /** Modifying user coins */
  USER_COINS: 'admin:user_coins',
  /** Toggling user autofish permission */
  USER_TOGGLE_AUTOFISH: 'admin:user_toggle_autofish',
  /** Toggling user R18 setting */
  USER_TOGGLE_R18: 'admin:user_toggle_r18',
  /** Bulk upload of characters */
  BULK_UPLOAD: 'admin:bulk_upload',
  /** Importing from anime database */
  ANIME_IMPORT: 'admin:anime_import',
  /** Visibility change refresh */
  VISIBILITY_CHANGE: 'admin:visibility_change',
};

// ===========================================
// AUTH ACTIONS
// ===========================================

export const AUTH_ACTIONS = {
  /** User login - clears all caches */
  LOGIN: 'auth:login',
  /** User logout - clears all caches */
  LOGOUT: 'auth:logout',
  /** Refreshing user data */
  REFRESH: 'auth:refresh',
  /** Toggling R18 content preference - updates characters visibility */
  TOGGLE_R18: 'auth:toggle_r18',
};

// ===========================================
// MODAL/VIEW ACTIONS
// ===========================================

/**
 * Modal actions replace the forceRefresh pattern.
 * Use these when opening modals/views that need fresh data.
 * This makes cache invalidation explicit and auditable.
 */
export const MODAL_ACTIONS = {
  /** Opening equipment modal - clears areas and rods cache */
  EQUIPMENT_OPEN: 'modal:equipment_open',
  /** Opening trading modal - clears inventory and trading-post cache */
  TRADING_OPEN: 'modal:trading_open',
  /** Opening challenges modal - clears challenges cache */
  CHALLENGES_OPEN: 'modal:challenges_open',
  /** Opening leaderboard modal - clears rank cache */
  LEADERBOARD_OPEN: 'modal:leaderboard_open',
  /** Opening dojo modal - clears dojo status and available characters cache */
  DOJO_OPEN: 'modal:dojo_open',
};

// ===========================================
// COMBINED EXPORT
// ===========================================

/**
 * All cache actions in a single object for convenience.
 * Prefer using the namespaced exports (FISHING_ACTIONS, DOJO_ACTIONS, etc.)
 * for better tree-shaking and clarity.
 */
export const CACHE_ACTIONS = {
  // Fishing
  FISHING_CATCH: FISHING_ACTIONS.CATCH,
  FISHING_AUTOFISH: FISHING_ACTIONS.AUTOFISH,
  FISHING_TRADE: FISHING_ACTIONS.TRADE,
  FISHING_UNLOCK_AREA: FISHING_ACTIONS.UNLOCK_AREA,
  FISHING_BUY_ROD: FISHING_ACTIONS.BUY_ROD,
  FISHING_EQUIP_ROD: FISHING_ACTIONS.EQUIP_ROD,
  FISHING_CLAIM_CHALLENGE: FISHING_ACTIONS.CLAIM_CHALLENGE,
  FISHING_SELECT_AREA: FISHING_ACTIONS.SELECT_AREA,
  
  // Dojo
  DOJO_ASSIGN: DOJO_ACTIONS.ASSIGN,
  DOJO_UNASSIGN: DOJO_ACTIONS.UNASSIGN,
  DOJO_CLAIM: DOJO_ACTIONS.CLAIM,
  DOJO_UPGRADE: DOJO_ACTIONS.UPGRADE,
  
  // Gacha
  GACHA_ROLL: GACHA_ACTIONS.ROLL,
  GACHA_ROLL_BANNER: GACHA_ACTIONS.ROLL_BANNER,
  GACHA_LEVEL_UP: GACHA_ACTIONS.LEVEL_UP,
  
  // Admin
  ADMIN_CHARACTER_ADD: ADMIN_ACTIONS.CHARACTER_ADD,
  ADMIN_CHARACTER_EDIT: ADMIN_ACTIONS.CHARACTER_EDIT,
  ADMIN_CHARACTER_DELETE: ADMIN_ACTIONS.CHARACTER_DELETE,
  ADMIN_BANNER_ADD: ADMIN_ACTIONS.BANNER_ADD,
  ADMIN_BANNER_EDIT: ADMIN_ACTIONS.BANNER_EDIT,
  ADMIN_BANNER_DELETE: ADMIN_ACTIONS.BANNER_DELETE,
  ADMIN_BANNER_REORDER: ADMIN_ACTIONS.BANNER_REORDER,
  ADMIN_BANNER_FEATURED: ADMIN_ACTIONS.BANNER_FEATURED,
  ADMIN_COUPON_ADD: ADMIN_ACTIONS.COUPON_ADD,
  ADMIN_COUPON_EDIT: ADMIN_ACTIONS.COUPON_EDIT,
  ADMIN_COUPON_DELETE: ADMIN_ACTIONS.COUPON_DELETE,
  ADMIN_RARITY_ADD: ADMIN_ACTIONS.RARITY_ADD,
  ADMIN_RARITY_EDIT: ADMIN_ACTIONS.RARITY_EDIT,
  ADMIN_RARITY_DELETE: ADMIN_ACTIONS.RARITY_DELETE,
  ADMIN_RARITY_RESET: ADMIN_ACTIONS.RARITY_RESET,
  ADMIN_USER_COINS: ADMIN_ACTIONS.USER_COINS,
  ADMIN_USER_TOGGLE_AUTOFISH: ADMIN_ACTIONS.USER_TOGGLE_AUTOFISH,
  ADMIN_USER_TOGGLE_R18: ADMIN_ACTIONS.USER_TOGGLE_R18,
  ADMIN_BULK_UPLOAD: ADMIN_ACTIONS.BULK_UPLOAD,
  ADMIN_ANIME_IMPORT: ADMIN_ACTIONS.ANIME_IMPORT,
  ADMIN_VISIBILITY_CHANGE: ADMIN_ACTIONS.VISIBILITY_CHANGE,
  
  // Auth
  AUTH_LOGIN: AUTH_ACTIONS.LOGIN,
  AUTH_LOGOUT: AUTH_ACTIONS.LOGOUT,
  AUTH_REFRESH: AUTH_ACTIONS.REFRESH,
  AUTH_TOGGLE_R18: AUTH_ACTIONS.TOGGLE_R18,
  
  // Modal/View (replaces forceRefresh pattern)
  MODAL_EQUIPMENT_OPEN: MODAL_ACTIONS.EQUIPMENT_OPEN,
  MODAL_TRADING_OPEN: MODAL_ACTIONS.TRADING_OPEN,
  MODAL_CHALLENGES_OPEN: MODAL_ACTIONS.CHALLENGES_OPEN,
  MODAL_LEADERBOARD_OPEN: MODAL_ACTIONS.LEADERBOARD_OPEN,
  MODAL_DOJO_OPEN: MODAL_ACTIONS.DOJO_OPEN,
};

export default CACHE_ACTIONS;

