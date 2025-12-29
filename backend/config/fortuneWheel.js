/**
 * Fortune Wheel Configuration
 *
 * Daily spin wheel that provides variable rewards to create engagement hooks.
 * Uses proven psychological mechanics: anticipation, near-misses, and variable rewards.
 *
 * ============================================================================
 * BALANCE SUMMARY (v1.0 - Initial Release)
 * ============================================================================
 *
 * Design Philosophy:
 * - Free daily spin creates return habit
 * - Variable rewards create excitement
 * - Higher account levels unlock better wheels
 * - Near-miss segments maximize engagement
 *
 * Expected Daily Value (Standard Wheel):
 * - Average: ~85 points per spin
 * - This is intentionally modest to avoid economy inflation
 * - The excitement comes from variance, not raw value
 *
 * ============================================================================
 */

// ===========================================
// WHEEL SEGMENT DEFINITIONS
// ===========================================

/**
 * Each segment has:
 * - id: Unique identifier
 * - label: Display text
 * - type: 'points' | 'tickets' | 'premium' | 'multiplier' | 'jackpot' | 'nothing'
 * - value: Amount to award
 * - color: Segment color (for rendering)
 * - weight: Probability weight (higher = more likely)
 */

const STANDARD_WHEEL = {
  id: 'standard',
  name: 'Daily Fortune Wheel',
  description: 'Spin once daily for free rewards!',
  minAccountLevel: 1,
  segments: [
    { id: 'points_50', label: '50 Points', type: 'points', value: 50, color: '#4CAF50', weight: 25 },
    { id: 'points_100', label: '100 Points', type: 'points', value: 100, color: '#8BC34A', weight: 20 },
    { id: 'points_200', label: '200 Points', type: 'points', value: 200, color: '#CDDC39', weight: 12 },
    { id: 'points_500', label: '500 Points', type: 'points', value: 500, color: '#FFC107', weight: 5 },
    { id: 'ticket_1', label: '1 Ticket', type: 'tickets', value: 1, color: '#03A9F4', weight: 15 },
    { id: 'ticket_2', label: '2 Tickets', type: 'tickets', value: 2, color: '#00BCD4', weight: 8 },
    { id: 'premium_1', label: '1 Premium', type: 'premium', value: 1, color: '#9C27B0', weight: 3 },
    { id: 'xp_boost', label: '2x XP (1hr)', type: 'multiplier', value: 2, color: '#E91E63', weight: 8 },
    { id: 'jackpot', label: 'JACKPOT!', type: 'jackpot', value: 1000, color: '#FFD700', weight: 2 },
    { id: 'try_again', label: 'Try Again', type: 'nothing', value: 0, color: '#607D8B', weight: 2 },
  ]
};

const PREMIUM_WHEEL = {
  id: 'premium',
  name: 'Premium Fortune Wheel',
  description: 'Better odds for high-level players!',
  minAccountLevel: 50,
  segments: [
    { id: 'points_100', label: '100 Points', type: 'points', value: 100, color: '#4CAF50', weight: 20 },
    { id: 'points_250', label: '250 Points', type: 'points', value: 250, color: '#8BC34A', weight: 18 },
    { id: 'points_500', label: '500 Points', type: 'points', value: 500, color: '#CDDC39', weight: 12 },
    { id: 'points_1000', label: '1000 Points', type: 'points', value: 1000, color: '#FFC107', weight: 5 },
    { id: 'ticket_2', label: '2 Tickets', type: 'tickets', value: 2, color: '#03A9F4', weight: 15 },
    { id: 'ticket_3', label: '3 Tickets', type: 'tickets', value: 3, color: '#00BCD4', weight: 8 },
    { id: 'premium_1', label: '1 Premium', type: 'premium', value: 1, color: '#9C27B0', weight: 8 },
    { id: 'premium_2', label: '2 Premium', type: 'premium', value: 2, color: '#7B1FA2', weight: 3 },
    { id: 'xp_boost', label: '2x XP (2hr)', type: 'multiplier', value: 2, color: '#E91E63', weight: 6 },
    { id: 'jackpot', label: 'MEGA JACKPOT!', type: 'jackpot', value: 2500, color: '#FFD700', weight: 5 },
  ]
};

const WHEELS = {
  standard: STANDARD_WHEEL,
  premium: PREMIUM_WHEEL
};

// ===========================================
// SPIN CONFIGURATION
// ===========================================

const SPIN_CONFIG = {
  // Free spins per day
  freeSpinsPerDay: 1,

  // Hours until next free spin resets (24 = daily)
  resetHours: 24,

  // Bonus spins from streak (consecutive days)
  streakBonuses: {
    3: 1,   // 3 day streak: +1 bonus spin
    7: 1,   // 7 day streak: +1 more bonus spin (total 2)
    14: 1,  // 14 day streak: +1 more bonus spin (total 3)
    30: 2,  // 30 day streak: +2 more bonus spins (total 5)
  },

  // Maximum spins per day (including bonus spins)
  maxDailySpins: 5,

  // Animation duration in milliseconds
  spinDuration: 4000,

  // Minimum rotations before landing
  minRotations: 5,

  // Pity system: Guaranteed good prize after X bad spins
  pityThreshold: 5,
  pityPrizes: ['points_200', 'ticket_1', 'premium_1'],

  // Near-miss simulation (wheel slows near jackpot)
  nearMissChance: 0.15, // 15% chance to have a near-miss
};

// ===========================================
// MULTIPLIER EFFECTS
// ===========================================

const MULTIPLIER_EFFECTS = {
  // XP multiplier duration in minutes
  xp_boost: {
    standard: 60,  // 1 hour
    premium: 120   // 2 hours
  },

  // Affected systems
  affectedSystems: ['gacha', 'dojo', 'fishing']
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get the appropriate wheel for a user's account level
 * @param {number} accountLevel - User's account level
 * @returns {Object} - Wheel configuration
 */
function getWheelForLevel(accountLevel) {
  if (accountLevel >= PREMIUM_WHEEL.minAccountLevel) {
    return PREMIUM_WHEEL;
  }
  return STANDARD_WHEEL;
}

/**
 * Calculate total weight for a wheel
 * @param {Object} wheel - Wheel configuration
 * @returns {number} - Total weight
 */
function getTotalWeight(wheel) {
  return wheel.segments.reduce((sum, seg) => sum + seg.weight, 0);
}

/**
 * Select a random segment based on weights
 * @param {Object} wheel - Wheel configuration
 * @param {Object} options - Options for selection
 * @returns {Object} - Selected segment
 */
function selectSegment(wheel, options = {}) {
  const { forcePity = false } = options;

  // If pity is triggered, select from pity prizes
  if (forcePity) {
    const pitySegments = wheel.segments.filter(s =>
      SPIN_CONFIG.pityPrizes.includes(s.id)
    );
    if (pitySegments.length > 0) {
      return pitySegments[Math.floor(Math.random() * pitySegments.length)];
    }
  }

  const totalWeight = getTotalWeight(wheel);
  let random = Math.random() * totalWeight;

  for (const segment of wheel.segments) {
    random -= segment.weight;
    if (random <= 0) {
      return segment;
    }
  }

  // Fallback to first segment
  return wheel.segments[0];
}

/**
 * Calculate bonus spins from streak
 * @param {number} streak - Current streak in days
 * @returns {number} - Bonus spins
 */
function calculateStreakBonus(streak) {
  let bonus = 0;
  for (const [threshold, spins] of Object.entries(SPIN_CONFIG.streakBonuses)) {
    if (streak >= parseInt(threshold)) {
      bonus += spins;
    }
  }
  return Math.min(bonus, SPIN_CONFIG.maxDailySpins - SPIN_CONFIG.freeSpinsPerDay);
}

/**
 * Check if spin is a "bad" spin (for pity tracking)
 * @param {Object} segment - The segment that was won
 * @returns {boolean} - True if this counts as a bad spin
 */
function isBadSpin(segment) {
  return segment.type === 'nothing' ||
         (segment.type === 'points' && segment.value <= 50);
}

/**
 * Calculate expected value of a wheel
 * Used for balance analysis
 * @param {Object} wheel - Wheel configuration
 * @returns {Object} - Expected values by type
 */
function calculateExpectedValue(wheel) {
  const totalWeight = getTotalWeight(wheel);
  const expected = {
    points: 0,
    tickets: 0,
    premium: 0,
    jackpotChance: 0
  };

  for (const segment of wheel.segments) {
    const probability = segment.weight / totalWeight;

    switch (segment.type) {
      case 'points':
        expected.points += segment.value * probability;
        break;
      case 'tickets':
        expected.tickets += segment.value * probability;
        break;
      case 'premium':
        expected.premium += segment.value * probability;
        break;
      case 'jackpot':
        expected.points += segment.value * probability;
        expected.jackpotChance = probability;
        break;
    }
  }

  return expected;
}

/**
 * Validate wheel configuration
 * Runs at server start to catch config errors
 */
function validateWheelConfig() {
  for (const [wheelId, wheel] of Object.entries(WHEELS)) {
    // Check minimum segments
    if (wheel.segments.length < 4) {
      throw new Error(`Wheel ${wheelId}: Must have at least 4 segments`);
    }

    // Check all segments have required fields
    for (const segment of wheel.segments) {
      if (!segment.id || !segment.label || !segment.type || segment.weight === undefined) {
        throw new Error(`Wheel ${wheelId}: Segment missing required fields: ${JSON.stringify(segment)}`);
      }

      if (segment.weight <= 0) {
        throw new Error(`Wheel ${wheelId}: Segment ${segment.id} has invalid weight`);
      }
    }

    // Check for duplicate segment IDs
    const ids = wheel.segments.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new Error(`Wheel ${wheelId}: Duplicate segment IDs detected`);
    }

    // Log expected values for balance analysis
    const ev = calculateExpectedValue(wheel);
    console.log(`[INFO] Fortune Wheel ${wheelId} EV: ~${Math.round(ev.points)} pts, ~${ev.tickets.toFixed(2)} tickets, ~${ev.premium.toFixed(2)} premium, ${(ev.jackpotChance * 100).toFixed(1)}% jackpot`);
  }

  console.log('[OK] Fortune Wheel configuration validated successfully (v1.0)');
}

// Run validation when module is loaded
validateWheelConfig();

module.exports = {
  WHEELS,
  STANDARD_WHEEL,
  PREMIUM_WHEEL,
  SPIN_CONFIG,
  MULTIPLIER_EFFECTS,
  getWheelForLevel,
  getTotalWeight,
  selectSegment,
  calculateStreakBonus,
  isBadSpin,
  calculateExpectedValue,
  validateWheelConfig
};
