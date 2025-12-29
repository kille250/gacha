/**
 * Sound Registry
 *
 * Defines all game sounds with their configurations.
 * Sounds are loaded lazily and cached for performance.
 */

// Gacha/Summon sounds
export const GACHA_SOUNDS = {
  // Pull initiation
  PULL_START: {
    id: 'pull_start',
    // Using synthesized sounds initially - can be replaced with audio files
    synthesize: true,
    type: 'whoosh',
    volume: 0.6
  },

  // Buildup tension
  BUILDUP_LOOP: {
    id: 'buildup_loop',
    synthesize: true,
    type: 'tension',
    volume: 0.4,
    loop: true
  },

  // Reveal flash
  REVEAL_FLASH: {
    id: 'reveal_flash',
    synthesize: true,
    type: 'impact',
    volume: 0.7
  },

  // Rarity-specific reveals
  REVEAL_COMMON: {
    id: 'reveal_common',
    synthesize: true,
    type: 'chime_low',
    volume: 0.5
  },

  REVEAL_UNCOMMON: {
    id: 'reveal_uncommon',
    synthesize: true,
    type: 'chime_medium',
    volume: 0.55
  },

  REVEAL_RARE: {
    id: 'reveal_rare',
    synthesize: true,
    type: 'chime_high',
    volume: 0.6
  },

  REVEAL_EPIC: {
    id: 'reveal_epic',
    synthesize: true,
    type: 'fanfare_short',
    volume: 0.7
  },

  REVEAL_LEGENDARY: {
    id: 'reveal_legendary',
    synthesize: true,
    type: 'fanfare_full',
    volume: 0.8
  },

  // Card appearance
  CARD_APPEAR: {
    id: 'card_appear',
    synthesize: true,
    type: 'swoosh',
    volume: 0.5
  },

  // Continue/dismiss
  CONTINUE: {
    id: 'continue',
    synthesize: true,
    type: 'click',
    volume: 0.4
  }
};

// Fortune Wheel sounds
export const WHEEL_SOUNDS = {
  SPIN_START: {
    id: 'spin_start',
    synthesize: true,
    type: 'whoosh_long',
    volume: 0.6
  },

  TICK: {
    id: 'tick',
    synthesize: true,
    type: 'tick',
    volume: 0.3
  },

  SPIN_SLOW: {
    id: 'spin_slow',
    synthesize: true,
    type: 'tension_resolve',
    volume: 0.5
  },

  WIN_SMALL: {
    id: 'win_small',
    synthesize: true,
    type: 'coin',
    volume: 0.5
  },

  WIN_BIG: {
    id: 'win_big',
    synthesize: true,
    type: 'jackpot',
    volume: 0.7
  }
};

// General UI sounds
export const UI_SOUNDS = {
  BUTTON_CLICK: {
    id: 'button_click',
    synthesize: true,
    type: 'click',
    volume: 0.3
  },

  BUTTON_HOVER: {
    id: 'button_hover',
    synthesize: true,
    type: 'hover',
    volume: 0.15
  },

  SUCCESS: {
    id: 'success',
    synthesize: true,
    type: 'success',
    volume: 0.5
  },

  ERROR: {
    id: 'error',
    synthesize: true,
    type: 'error',
    volume: 0.4
  },

  LEVEL_UP: {
    id: 'level_up',
    synthesize: true,
    type: 'level_up',
    volume: 0.7
  },

  REWARD_CLAIM: {
    id: 'reward_claim',
    synthesize: true,
    type: 'reward',
    volume: 0.6
  }
};

// All sounds combined for easy iteration
export const ALL_SOUNDS = {
  ...GACHA_SOUNDS,
  ...WHEEL_SOUNDS,
  ...UI_SOUNDS
};
