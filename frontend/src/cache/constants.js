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
 * import { CACHE_ACTIONS } from '../cache';
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
  /** Claiming a prestige level - updates prestige, points */
  CLAIM_PRESTIGE: 'fishing:claim_prestige',
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
  // Security Actions
  /** Restricting a user (ban, shadowban, etc.) */
  RESTRICT_USER: 'admin:restrict_user',
  /** Removing a user restriction */
  UNRESTRICT_USER: 'admin:unrestrict_user',
  /** Issuing a warning to a user */
  WARN_USER: 'admin:warn_user',
  /** Resetting user warnings */
  RESET_WARNINGS: 'admin:reset_warnings',
  /** Clearing user device fingerprints */
  CLEAR_DEVICES: 'admin:clear_devices',
  /** Recalculating user risk score */
  RECALCULATE_RISK: 'admin:recalculate_risk',
  /** Resetting user risk score */
  RESET_RISK: 'admin:reset_risk',
  /** Updating security configuration */
  SECURITY_CONFIG_UPDATE: 'admin:security_config_update',
  /** Approving an appeal */
  APPROVE_APPEAL: 'admin:approve_appeal',
  /** Denying an appeal */
  DENY_APPEAL: 'admin:deny_appeal',
  /** Triggering risk score decay */
  RISK_DECAY: 'admin:risk_decay',
  /** Resetting a user's password */
  PASSWORD_RESET: 'admin:password_reset',
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
// COUPON ACTIONS
// ===========================================

export const COUPON_ACTIONS = {
  /** Redeeming a coupon - may grant points, characters, or tickets */
  REDEEM: 'coupon:redeem',
};

// ===========================================
// MODAL/VIEW ACTIONS
// ===========================================

/**
 * Modal actions for pre-fetching fresh data when opening modals/views.
 * Use these before fetching data to ensure fresh responses.
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
  /** Opening prestige modal - clears prestige cache */
  PRESTIGE_OPEN: 'modal:prestige_open',
};

// ===========================================
// PRE-TRANSACTION ACTIONS
// ===========================================

/**
 * Pre-transaction actions for defensive revalidation before critical operations.
 * Use these before spending currency to ensure fresh data and prevent stale-state bugs.
 */
export const PRE_TRANSACTION_ACTIONS = {
  /** Before any gacha roll - ensures fresh user data and tickets */
  PRE_ROLL: 'pre:roll',
  /** Before any purchase - ensures fresh user points */
  PRE_PURCHASE: 'pre:purchase',
};

// ===========================================
// VISIBILITY CALLBACK IDS
// ===========================================

/**
 * Standardized IDs for visibility change callbacks.
 * Use these when registering with onVisibilityChange() for consistency.
 */
export const VISIBILITY_CALLBACK_IDS = {
  /** Fishing page data refresh */
  FISHING_DATA: 'fishing-data',
  /** Trading post modal data refresh */
  TRADING_POST: 'trading-post-modal',
  /** Banner page pricing and tickets refresh */
  BANNER_PRICING: 'banner-pricing-and-tickets',
  /** Standard roll page pricing refresh */
  ROLL_PRICING: 'roll-pricing',
  /** Admin dashboard data refresh */
  ADMIN_DASHBOARD: 'admin-dashboard',
  /** Dojo page status refresh */
  DOJO_STATUS: 'dojo-status',
};

// ===========================================
// ENHANCEMENT ACTIONS
// ===========================================

/**
 * Enhancement system actions for dojo specializations, gacha milestones,
 * fate points, and retention systems.
 */
export const ENHANCEMENT_ACTIONS = {
  /** Applying a specialization to a dojo character */
  DOJO_SPECIALIZE: 'enhancement:dojo_specialize',
  /** Upgrading a dojo facility tier */
  DOJO_FACILITY_UPGRADE: 'enhancement:dojo_facility_upgrade',
  /** Claiming a gacha milestone reward */
  CLAIM_MILESTONE: 'enhancement:claim_milestone',
  /** Exchanging fate points for rewards */
  EXCHANGE_FATE_POINTS: 'enhancement:exchange_fate_points',
  /** Claiming rest-and-return bonus */
  CLAIM_RETURN_BONUS: 'enhancement:claim_return_bonus',
  /** Using a character selector */
  USE_SELECTOR: 'enhancement:use_selector',
};

// ===========================================
// FORTUNE WHEEL ACTIONS
// ===========================================

/**
 * Fortune wheel actions for spin and reward invalidation.
 */
export const FORTUNE_WHEEL_ACTIONS = {
  /** Spinning the fortune wheel - may grant points, tickets, or XP multiplier */
  SPIN: 'fortune:spin',
};

// ===========================================
// ANNOUNCEMENT ACTIONS
// ===========================================

/**
 * Announcement actions for admin management and user-facing cache invalidation.
 */
export const ANNOUNCEMENT_ACTIONS = {
  /** Creating a new announcement */
  CREATE: 'announcement:create',
  /** Updating an existing announcement */
  UPDATE: 'announcement:update',
  /** Deleting an announcement */
  DELETE: 'announcement:delete',
  /** Publishing an announcement */
  PUBLISH: 'announcement:publish',
  /** Archiving an announcement */
  ARCHIVE: 'announcement:archive',
};

// ===========================================
// ESSENCE TAP ACTIONS
// ===========================================

/**
 * Essence Tap clicker game actions for cache invalidation.
 */
export const ESSENCE_TAP_ACTIONS = {
  /** Purchasing a generator - updates essence, production rate */
  GENERATOR_PURCHASE: 'essence_tap:generator_purchase',
  /** Purchasing an upgrade - updates essence, click power, crit, etc. */
  UPGRADE_PURCHASE: 'essence_tap:upgrade_purchase',
  /** Performing prestige/awakening - resets progress, awards shards */
  PRESTIGE: 'essence_tap:prestige',
  /** Purchasing a prestige upgrade with shards */
  PRESTIGE_UPGRADE: 'essence_tap:prestige_upgrade',
  /** Claiming a milestone reward */
  MILESTONE_CLAIM: 'essence_tap:milestone_claim',
  /** Assigning a character for bonuses */
  CHARACTER_ASSIGN: 'essence_tap:character_assign',
  /** Unassigning a character */
  CHARACTER_UNASSIGN: 'essence_tap:character_unassign',
};

// ===========================================
// SESSION STORAGE KEYS
// ===========================================

/**
 * Centralized sessionStorage keys for operation recovery and state persistence.
 * Use these instead of string literals to prevent typos and enable easy searching.
 */
export const SESSION_KEYS = {
  /** Pending gacha roll state (banner rolls) */
  PENDING_ROLL: 'gacha_pendingRoll',
  /** Unviewed roll results (user navigated away during animation) */
  UNVIEWED_ROLL: 'gacha_unviewedRoll',
  /** Pending standard gacha roll state */
  PENDING_ROLL_STANDARD: 'gacha_pendingRoll_standard',
  /** Unviewed standard roll results */
  UNVIEWED_ROLL_STANDARD: 'gacha_unviewedRoll_standard',
  /** Cache debug events for crash debugging */
  CACHE_DEBUG_EVENTS: '__cache_debug_events',
};

// ===========================================
// LOCAL STORAGE KEYS
// ===========================================

/**
 * Centralized localStorage keys for persistent settings.
 * Use these instead of string literals to prevent typos and enable easy searching.
 */
export const LOCAL_STORAGE_KEYS = {
  /** Cache debug mode flag */
  CACHE_DEBUG: 'CACHE_DEBUG',
  /** Cross-tab ticket synchronization */
  TICKET_SYNC: 'gacha_tickets_sync',
  /** Animation skip preference */
  SKIP_ANIMATIONS: 'gacha_skipAnimations',
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
  FISHING_CLAIM_PRESTIGE: FISHING_ACTIONS.CLAIM_PRESTIGE,
  
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
  ADMIN_RESTRICT_USER: ADMIN_ACTIONS.RESTRICT_USER,
  ADMIN_UNRESTRICT_USER: ADMIN_ACTIONS.UNRESTRICT_USER,
  ADMIN_WARN_USER: ADMIN_ACTIONS.WARN_USER,
  ADMIN_RESET_WARNINGS: ADMIN_ACTIONS.RESET_WARNINGS,
  ADMIN_CLEAR_DEVICES: ADMIN_ACTIONS.CLEAR_DEVICES,
  ADMIN_RECALCULATE_RISK: ADMIN_ACTIONS.RECALCULATE_RISK,
  ADMIN_RESET_RISK: ADMIN_ACTIONS.RESET_RISK,
  ADMIN_SECURITY_CONFIG_UPDATE: ADMIN_ACTIONS.SECURITY_CONFIG_UPDATE,
  ADMIN_APPROVE_APPEAL: ADMIN_ACTIONS.APPROVE_APPEAL,
  ADMIN_DENY_APPEAL: ADMIN_ACTIONS.DENY_APPEAL,
  ADMIN_RISK_DECAY: ADMIN_ACTIONS.RISK_DECAY,
  ADMIN_PASSWORD_RESET: ADMIN_ACTIONS.PASSWORD_RESET,
  
  // Auth
  AUTH_LOGIN: AUTH_ACTIONS.LOGIN,
  AUTH_LOGOUT: AUTH_ACTIONS.LOGOUT,
  AUTH_REFRESH: AUTH_ACTIONS.REFRESH,
  AUTH_TOGGLE_R18: AUTH_ACTIONS.TOGGLE_R18,
  
  // Coupon
  COUPON_REDEEM: COUPON_ACTIONS.REDEEM,
  
  // Modal/View (explicit cache invalidation before data fetch)
  MODAL_EQUIPMENT_OPEN: MODAL_ACTIONS.EQUIPMENT_OPEN,
  MODAL_TRADING_OPEN: MODAL_ACTIONS.TRADING_OPEN,
  MODAL_CHALLENGES_OPEN: MODAL_ACTIONS.CHALLENGES_OPEN,
  MODAL_LEADERBOARD_OPEN: MODAL_ACTIONS.LEADERBOARD_OPEN,
  MODAL_DOJO_OPEN: MODAL_ACTIONS.DOJO_OPEN,
  MODAL_PRESTIGE_OPEN: MODAL_ACTIONS.PRESTIGE_OPEN,
  
  // Pre-transaction (defensive revalidation)
  PRE_ROLL: PRE_TRANSACTION_ACTIONS.PRE_ROLL,
  PRE_PURCHASE: PRE_TRANSACTION_ACTIONS.PRE_PURCHASE,

  // Enhancement actions
  ENHANCEMENT_DOJO_SPECIALIZE: ENHANCEMENT_ACTIONS.DOJO_SPECIALIZE,
  ENHANCEMENT_DOJO_FACILITY_UPGRADE: ENHANCEMENT_ACTIONS.DOJO_FACILITY_UPGRADE,
  ENHANCEMENT_CLAIM_MILESTONE: ENHANCEMENT_ACTIONS.CLAIM_MILESTONE,
  ENHANCEMENT_EXCHANGE_FATE_POINTS: ENHANCEMENT_ACTIONS.EXCHANGE_FATE_POINTS,
  ENHANCEMENT_CLAIM_RETURN_BONUS: ENHANCEMENT_ACTIONS.CLAIM_RETURN_BONUS,
  ENHANCEMENT_USE_SELECTOR: ENHANCEMENT_ACTIONS.USE_SELECTOR,

  // Fortune Wheel actions
  FORTUNE_WHEEL_SPIN: FORTUNE_WHEEL_ACTIONS.SPIN,

  // Announcement actions
  ANNOUNCEMENT_CREATE: ANNOUNCEMENT_ACTIONS.CREATE,
  ANNOUNCEMENT_UPDATE: ANNOUNCEMENT_ACTIONS.UPDATE,
  ANNOUNCEMENT_DELETE: ANNOUNCEMENT_ACTIONS.DELETE,
  ANNOUNCEMENT_PUBLISH: ANNOUNCEMENT_ACTIONS.PUBLISH,
  ANNOUNCEMENT_ARCHIVE: ANNOUNCEMENT_ACTIONS.ARCHIVE,

  // Essence Tap actions
  ESSENCE_TAP_GENERATOR_PURCHASE: ESSENCE_TAP_ACTIONS.GENERATOR_PURCHASE,
  ESSENCE_TAP_UPGRADE_PURCHASE: ESSENCE_TAP_ACTIONS.UPGRADE_PURCHASE,
  ESSENCE_TAP_PRESTIGE: ESSENCE_TAP_ACTIONS.PRESTIGE,
  ESSENCE_TAP_PRESTIGE_UPGRADE: ESSENCE_TAP_ACTIONS.PRESTIGE_UPGRADE,
  ESSENCE_TAP_MILESTONE_CLAIM: ESSENCE_TAP_ACTIONS.MILESTONE_CLAIM,
  ESSENCE_TAP_CHARACTER_ASSIGN: ESSENCE_TAP_ACTIONS.CHARACTER_ASSIGN,
  ESSENCE_TAP_CHARACTER_UNASSIGN: ESSENCE_TAP_ACTIONS.CHARACTER_UNASSIGN,
};

// NOTE: Default export removed - use named exports instead for better tree-shaking

