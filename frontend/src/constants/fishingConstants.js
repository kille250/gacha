/**
 * Fishing Game Constants
 * 
 * Centralized constants for the fishing minigame.
 * These should match backend values in config/fishing.js
 * 
 * NOTE: Server sends timing values in API responses (waitTime, missTimeout).
 * These constants are for client-only timing that can't come from server.
 */

// ===========================================
// TIMING CONSTANTS (client-side only)
// ===========================================

export const FISHING_TIMING = {
  // Animation delay before transitioning from CASTING to WAITING
  // Must match backend CLIENT_ANIMATION_DELAY in routes/fishing/core.js
  castAnimationDelay: 600,
  
  // How long to display success/failure result popup
  resultDisplayDuration: 2000,
  
  // Autofish interval (slightly higher than backend to account for latency)
  // Backend: 6000ms, Frontend: 6500ms
  autofishInterval: 6500,
  
  // Failsafe timeout for stuck autofish requests
  autofishFailsafeTimeout: 30000,
  
  // WebSocket heartbeat interval
  heartbeatInterval: 30000,
  
  // Mode conflict window (how long before mode is considered inactive)
  modeConflictWindow: 15000,
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

