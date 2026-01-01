/**
 * Avatar Adapter for OpenHotel
 *
 * Maps your character/user data to OpenHotel's avatar system.
 * Handles customization options, animations, and appearance.
 */

import { DIRECTION } from '../config';

/**
 * Character body actions (animations)
 */
export const BODY_ACTION = {
  IDLE: 0,
  WALK_0: 1,
  WALK_1: 2,
  WALK_2: 3,
  WALK_3: 4,
  SIT: 5,
  LAY: 6,
  WAVE: 7
};

/**
 * Character arm actions
 */
export const ARM_ACTION = {
  IDLE: 0,
  CARRY: 1,
  WAVE: 2,
  DRINK: 3
};

/**
 * Default skin color presets
 */
export const SKIN_PRESETS = [
  { name: 'Light', color: 0xffe0bd },
  { name: 'Fair', color: 0xefcfb1 },
  { name: 'Medium', color: 0xd4a574 },
  { name: 'Tan', color: 0xc68642 },
  { name: 'Brown', color: 0x8d5524 },
  { name: 'Dark', color: 0x5c3317 }
];

/**
 * AvatarAdapter - Maps your character data to OpenHotel avatars
 */
export class AvatarAdapter {
  /**
   * Create avatar data from your user profile
   * @param {object} user - Your user data
   * @returns {object} OpenHotel avatar data
   */
  createFromUser(user) {
    return {
      accountId: `gacha_${user.id}`,
      username: user.username,

      // Appearance
      skinColor: this.getRandomSkinColor(),
      bodyAction: BODY_ACTION.IDLE,
      bodyDirection: DIRECTION.SOUTH_EAST,
      headDirection: DIRECTION.SOUTH_EAST,
      leftArmAction: ARM_ACTION.IDLE,
      rightArmAction: ARM_ACTION.IDLE,

      // Position (set when entering room)
      position: { x: 0, y: 0, z: 0 },
      targetPosition: null,

      // Status
      isTyping: false,
      isSitting: false,
      message: null
    };
  }

  /**
   * Create avatar data from collected character
   * Allows users to "cosplay" as their collected characters
   *
   * @param {object} character - Collected character data
   * @param {object} user - User data
   * @returns {object} Avatar with character appearance
   */
  createFromCharacter(character, user) {
    const baseAvatar = this.createFromUser(user);

    // Override with character appearance
    return {
      ...baseAvatar,
      // Character-specific appearance (if supported)
      characterId: character.id,
      characterName: character.name,
      // Could add costume/outfit data here
      costume: {
        id: `char_${character.id}`,
        name: character.name
      }
    };
  }

  /**
   * Map mastery level to avatar effects
   * Higher mastery = special visual effects
   *
   * @param {object} masteryData - Character mastery data
   * @returns {object} Visual effects for avatar
   */
  mapMasteryToEffects(masteryData) {
    const effects = [];

    if (!masteryData) return effects;

    const level = masteryData.level || 0;

    if (level >= 5) {
      effects.push({ type: 'glow', color: 0xffd700, intensity: 0.3 });
    }

    if (level >= 10) {
      effects.push({ type: 'particles', preset: 'sparkles' });
    }

    return effects;
  }

  /**
   * Get direction from movement vector
   * @param {object} from - Starting position {x, z}
   * @param {object} to - Target position {x, z}
   * @returns {number} Direction enum value
   */
  getDirectionFromMovement(from, to) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;

    if (dx === 0 && dz === 0) return DIRECTION.NONE;

    // 8-directional movement
    if (dx > 0 && dz === 0) return DIRECTION.EAST;
    if (dx < 0 && dz === 0) return DIRECTION.WEST;
    if (dx === 0 && dz > 0) return DIRECTION.SOUTH;
    if (dx === 0 && dz < 0) return DIRECTION.NORTH;
    if (dx > 0 && dz > 0) return DIRECTION.SOUTH_EAST;
    if (dx > 0 && dz < 0) return DIRECTION.NORTH_EAST;
    if (dx < 0 && dz > 0) return DIRECTION.SOUTH_WEST;
    if (dx < 0 && dz < 0) return DIRECTION.NORTH_WEST;

    return DIRECTION.SOUTH_EAST; // Default
  }

  /**
   * Get opposite direction (for facing)
   */
  getOppositeDirection(direction) {
    return (direction + 4) % 8;
  }

  /**
   * Get random skin color from presets
   */
  getRandomSkinColor() {
    const preset = SKIN_PRESETS[Math.floor(Math.random() * SKIN_PRESETS.length)];
    return preset.color;
  }

  /**
   * Map progression level to avatar badge
   * @param {object} user - User data with progression
   * @returns {array} Badges to display
   */
  mapProgressionToBadges(user) {
    const badges = [];

    // Account level badge
    const accountLevel = this.calculateAccountLevel(user.accountXP || 0);
    if (accountLevel >= 10) {
      badges.push({
        id: `level_${Math.floor(accountLevel / 10) * 10}`,
        icon: 'star',
        tooltip: `Level ${accountLevel}`
      });
    }

    // Dojo rank badge
    const dojoRank = this.calculateDojoRank(user);
    if (dojoRank) {
      badges.push({
        id: `dojo_${dojoRank}`,
        icon: 'dojo',
        tooltip: dojoRank
      });
    }

    // Fishing mastery badge
    const fishingMastery = user.fishingAchievements?.prestige || 0;
    if (fishingMastery > 0) {
      badges.push({
        id: `fishing_p${fishingMastery}`,
        icon: 'fish',
        tooltip: `Fishing Prestige ${fishingMastery}`
      });
    }

    // VIP/Admin badge
    if (user.isAdmin) {
      badges.push({
        id: 'staff',
        icon: 'shield',
        tooltip: 'Staff Member'
      });
    }

    return badges;
  }

  /**
   * Calculate account level from XP
   * Uses same formula as your accountLevel.js config
   */
  calculateAccountLevel(xp) {
    // Fibonacci-inspired scaling: level n requires sum of previous XP thresholds
    const baseXP = 100;
    let totalRequired = 0;
    let level = 1;

    while (totalRequired <= xp) {
      level++;
      totalRequired += Math.floor(baseXP * Math.pow(1.5, level - 1));
    }

    return level - 1;
  }

  /**
   * Calculate dojo rank from user data
   */
  calculateDojoRank(user) {
    const claims = user.dojoClaimsTotal || 0;

    if (claims >= 1000) return 'Grandmaster';
    if (claims >= 500) return 'Master';
    if (claims >= 200) return 'Expert';
    if (claims >= 100) return 'Veteran';
    if (claims >= 50) return 'Adept';
    if (claims >= 20) return 'Trained';
    return null;
  }

  /**
   * Create bubble message data
   * @param {string} text - Message text
   * @param {string} type - Message type ('chat', 'shout', 'whisper')
   * @returns {object} Bubble data
   */
  createMessageBubble(text, type = 'chat') {
    const bubbleTypes = {
      chat: { style: 'normal', duration: 5000 },
      shout: { style: 'shout', duration: 7000 },
      whisper: { style: 'whisper', duration: 4000 }
    };

    const bubble = bubbleTypes[type] || bubbleTypes.chat;

    return {
      text,
      style: bubble.style,
      duration: bubble.duration,
      timestamp: Date.now()
    };
  }

  /**
   * Get walk animation frames
   * @returns {array} Animation frame sequence
   */
  getWalkAnimationFrames() {
    return [
      BODY_ACTION.WALK_0,
      BODY_ACTION.WALK_1,
      BODY_ACTION.WALK_2,
      BODY_ACTION.WALK_3,
      BODY_ACTION.WALK_0 // Loop
    ];
  }

  /**
   * Serialize avatar state for network transmission
   * @param {object} avatar - Avatar data
   * @returns {object} Serialized data
   */
  serialize(avatar) {
    return {
      id: avatar.accountId,
      u: avatar.username,
      sc: avatar.skinColor,
      ba: avatar.bodyAction,
      bd: avatar.bodyDirection,
      hd: avatar.headDirection,
      la: avatar.leftArmAction,
      ra: avatar.rightArmAction,
      p: avatar.position,
      tp: avatar.targetPosition
    };
  }

  /**
   * Deserialize avatar data from network
   * @param {object} data - Serialized data
   * @returns {object} Avatar data
   */
  deserialize(data) {
    return {
      accountId: data.id || data.accountId,
      username: data.u || data.username,
      skinColor: data.sc || data.skinColor || 0xefcfb1,
      bodyAction: data.ba ?? data.bodyAction ?? BODY_ACTION.IDLE,
      bodyDirection: data.bd ?? data.bodyDirection ?? DIRECTION.SOUTH_EAST,
      headDirection: data.hd ?? data.headDirection ?? DIRECTION.SOUTH_EAST,
      leftArmAction: data.la ?? data.leftArmAction ?? ARM_ACTION.IDLE,
      rightArmAction: data.ra ?? data.rightArmAction ?? ARM_ACTION.IDLE,
      position: data.p || data.position || { x: 0, y: 0, z: 0 },
      targetPosition: data.tp || data.targetPosition
    };
  }
}

// Singleton instance
let instance = null;

export function getAvatarAdapter() {
  if (!instance) {
    instance = new AvatarAdapter();
  }
  return instance;
}

export default AvatarAdapter;
