/**
 * Authentication Adapter for OpenHotel
 *
 * Bridges your existing JWT-based authentication with OpenHotel's auth system.
 * Generates compatible tokens and handles session synchronization.
 */

// getToken imported for future use with OAuth flow
import { getToken as _getToken } from '../../../utils/authStorage';
import api from '../../../utils/api';
import { OPENHOTEL_CONFIG } from '../config';

/**
 * Generate a unique session identifier
 */
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a ULID-like identifier for OpenHotel compatibility
 * Reserved for future OAuth flow implementation
 */
function _generateULID() {
  const timestamp = Date.now().toString(36).padStart(10, '0');
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
  return (timestamp + random).toUpperCase();
}

/**
 * AuthAdapter - Bridges your auth system with OpenHotel
 */
export class AuthAdapter {
  constructor() {
    this.sessionState = null;
    this.sessionToken = null;
    this.hotelAccountId = null;
  }

  /**
   * Get current user from your auth system
   * @returns {object|null} User data
   */
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Generate OpenHotel-compatible authentication credentials
   *
   * OpenHotel uses WebSocket subprotocols for auth:
   * - If auth is enabled: [state, token] from OAuth flow
   * - If auth is disabled: [accountId, username] for development
   *
   * Since we're running our own server, we use the development mode format.
   */
  async generateCredentials() {
    const user = await this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate stable account ID based on your user ID
    // This ensures the same user always gets the same hotel account
    this.hotelAccountId = `gacha_${user.id}`;

    // For OpenHotel development mode auth (no external OAuth)
    // Protocols: [accountId, username]
    const credentials = {
      accountId: this.hotelAccountId,
      username: user.username,
      // Additional data to send after connection
      metadata: {
        sourceUserId: user.id,
        points: user.points,
        isAdmin: user.isAdmin,
        // Avatar customization from your character system
        skinColor: 0xefcfb1 // Default, can be customized
      }
    };

    // Store session for later use
    this.sessionState = generateSessionId();
    this.sessionToken = generateSessionId();

    return credentials;
  }

  /**
   * Get WebSocket subprotocols for OpenHotel connection
   * @returns {string[]} Protocol strings
   */
  async getWebSocketProtocols() {
    const credentials = await this.generateCredentials();

    // Development mode: [accountId, username]
    return [
      credentials.accountId,
      credentials.username
    ];
  }

  /**
   * Verify OpenHotel session is still valid
   * Call this periodically to maintain session
   */
  async verifySession() {
    if (!this.hotelAccountId) {
      return false;
    }

    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    // Check if the user ID still matches
    return this.hotelAccountId === `gacha_${user.id}`;
  }

  /**
   * Map your character data to OpenHotel avatar format
   * @param {object} character - Your character model
   * @returns {object} OpenHotel avatar data
   */
  mapCharacterToAvatar(character) {
    // OpenHotel uses specific character properties
    // This maps your character model to their format
    return {
      skinColor: character?.skinColor || 0xefcfb1,
      hairColor: character?.hairColor || 0x3d2314,
      shirtColor: character?.shirtColor || 0x5c5c5c,
      pantsColor: character?.pantsColor || 0x1a1a1a,
      // Body parts
      headId: 'default',
      bodyId: 'default',
      leftArmId: 'default',
      rightArmId: 'default'
    };
  }

  /**
   * Sync user progression to OpenHotel badges/achievements
   * @param {object} user - Your user data
   * @returns {object} Badge data for OpenHotel
   */
  mapProgressionToBadges(user) {
    const badges = [];

    // Map your achievements to hotel badges
    if (user.fishingAchievements?.totalLegendaries >= 10) {
      badges.push({ id: 'legendary_fisher', name: 'Legendary Fisher' });
    }

    if (user.dojoClaimsTotal >= 100) {
      badges.push({ id: 'dojo_master', name: 'Dojo Master' });
    }

    if (user.accountXP >= 10000) {
      badges.push({ id: 'veteran', name: 'Veteran Player' });
    }

    if (user.isAdmin) {
      badges.push({ id: 'staff', name: 'Staff' });
    }

    return badges;
  }

  /**
   * Get hotel account ID for the current user
   */
  getHotelAccountId() {
    return this.hotelAccountId;
  }

  /**
   * Clear authentication state
   */
  clear() {
    this.sessionState = null;
    this.sessionToken = null;
    this.hotelAccountId = null;
  }
}

// Singleton instance
let instance = null;

export function getAuthAdapter() {
  if (!instance) {
    instance = new AuthAdapter();
  }
  return instance;
}

export function resetAuthAdapter() {
  if (instance) {
    instance.clear();
    instance = null;
  }
}

export default AuthAdapter;
