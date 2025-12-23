/**
 * Fishing Game Constants
 * 
 * Centralized constants for the fishing minigame.
 * 
 * ARCHITECTURE NOTES:
 * - Server sends dynamic timing values in API responses (waitTime, missTimeout)
 * - These constants are for client-only timing that must be consistent
 * - Backend config is in: config/fishing.js, routes/fishing/core.js
 * 
 * @see backend/config/fishing.js for server-side configuration
 */

// ===========================================
// TIMING CONSTANTS
// ===========================================

export const FISHING_TIMING = {
  /**
   * Duration of cast animation before transitioning CASTING → WAITING
   * This gives visual feedback that the line is being cast before waiting for fish.
   * 
   * MUST match backend CLIENT_ANIMATION_DELAY in routes/fishing/core.js
   * If changed, update both frontend and backend simultaneously.
   * @type {number} milliseconds
   */
  castAnimationDelay: 600,
  
  /**
   * How long to display success/failure result popup before auto-dismissing.
   * UX tradeoff: Long enough to read fish name & stats, short enough to not block gameplay.
   * 
   * User can click to dismiss early. This is the auto-dismiss fallback.
   * @type {number} milliseconds
   */
  resultDisplayDuration: 2000,
  
  /**
   * Interval between autofish attempts.
   * Set slightly higher than backend minimum (6000ms) to account for network latency
   * and prevent rate limiting issues.
   * 
   * Backend minimum: 6000ms (config/fishing.js)
   * Frontend buffer: +500ms for safety
   * @type {number} milliseconds
   */
  autofishInterval: 6500,
  
  /**
   * Failsafe timeout for stuck autofish requests.
   * If a request takes longer than this, reset in-flight guard to prevent deadlock.
   * This handles edge cases like network timeouts or server issues.
   * @type {number} milliseconds
   */
  autofishFailsafeTimeout: 30000,
  
  /**
   * WebSocket heartbeat interval for multiplayer connection.
   * Keeps the connection alive and helps detect disconnections.
   * Server timeout should be slightly longer than this value.
   * @type {number} milliseconds
   */
  heartbeatInterval: 30000,
  
  /**
   * Mode conflict detection window.
   * How long before a fishing mode (manual/autofish) is considered inactive.
   * Used to prevent conflicts between browser tabs or sessions.
   * @type {number} milliseconds
   */
  modeConflictWindow: 15000,
  
  /**
   * Day/night cycle duration per period.
   * Visual-only effect for ambiance. Each time period (dawn, day, dusk, night)
   * lasts this long before transitioning to the next.
   * @type {number} milliseconds (90 seconds = 1.5 minutes per period)
   */
  dayNightCycleDuration: 90000,
};

// ===========================================
// GAME STATES
// ===========================================

export const GAME_STATES = {
  WALKING: 'walking',
  CASTING: 'casting',
  WAITING: 'waiting',
  FISH_APPEARED: 'fish_appeared',
  CATCHING: 'catching',
  SUCCESS: 'success',
  FAILURE: 'failure',
};

// ===========================================
// DIRECTIONS
// ===========================================

export const DIRECTIONS = {
  DOWN: 'down',
  UP: 'up',
  LEFT: 'left',
  RIGHT: 'right',
};

// ===========================================
// TIME PERIODS (visual only)
// ===========================================

export const TIME_PERIODS = {
  DAWN: 'dawn',
  DAY: 'day',
  DUSK: 'dusk',
  NIGHT: 'night',
};

// Day/night cycle timing (ms per period)
export const TIME_PERIOD_DURATION = 90000;

// ===========================================
// RARITY HIERARCHY
// ===========================================

export const RARITY_RANK = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

/**
 * Compare two fish by rarity
 * @param {Object} newFish - Fish to compare
 * @param {Object} currentBest - Current best fish (or null)
 * @returns {boolean} True if newFish is better
 */
export const isBetterFish = (newFish, currentBest) => {
  if (!currentBest) return true;
  const currentRarity = currentBest.fish?.rarity || currentBest.rarity;
  return (RARITY_RANK[newFish.rarity] || 0) > (RARITY_RANK[currentRarity] || 0);
};

// ===========================================
// UI CONSTANTS
// ===========================================

export const UI_CONSTANTS = {
  // Maximum bubbles to show in autofish log
  maxAutofishBubblesMobile: 3,
  maxAutofishBubblesDesktop: 6,
  
  // Autofish bubble lifetime (ms)
  autofishBubbleLifetime: 4000,
  
  // Low quota warning threshold
  lowQuotaThreshold: 20,
};

// ===========================================
// SESSION STORAGE KEYS
// ===========================================

export const STORAGE_KEYS = {
  sessionStats: 'fishing_sessionStats',
};

// Session stats validity duration (30 minutes)
export const SESSION_STATS_VALIDITY = 30 * 60 * 1000;

