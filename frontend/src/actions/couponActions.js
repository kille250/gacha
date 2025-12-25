/**
 * Coupon Actions Helper Module
 *
 * Centralizes coupon action handlers with built-in cache invalidation and state updates.
 * Use these functions instead of calling API + invalidateFor separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 *
 * USAGE:
 * import { redeemCoupon } from '../actions/couponActions';
 *
 * const result = await redeemCoupon(code, setUser);
 *
 * Supported coupon types:
 * - coins: Updates user.points
 * - character: Adds character to collection
 * - ticket: Updates user.rollTickets
 * - premium_ticket: Updates user.premiumTickets
 */

import api from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';
import { applyPointsUpdate } from '../utils/userStateUpdates';

/**
 * Redeem a coupon code with proper cache invalidation and state updates.
 *
 * Coupons can grant various rewards:
 * - Points (coins)
 * - Characters
 * - Roll tickets (regular gacha tickets)
 * - Premium tickets (enhanced gacha tickets)
 *
 * @param {string} code - The coupon code to redeem
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Redemption result from API containing type, reward, message, updatedPoints
 * @throws {Error} If redemption fails (invalid code, already used, expired, etc.)
 */
export const redeemCoupon = async (code, setUser) => {
  const response = await api.post('/coupons/redeem', { code });
  const result = response.data;

  // Update user points from response (optimistic update)
  if (result.updatedPoints !== undefined) {
    applyPointsUpdate(setUser, result.updatedPoints);
  }

  // Update ticket counts for ticket-type coupons
  // The API returns updatedTickets for ticket/premium_ticket redemptions
  if (result.updatedTickets) {
    setUser(prev => ({
      ...prev,
      rollTickets: result.updatedTickets.rollTickets,
      premiumTickets: result.updatedTickets.premiumTickets
    }));
  }

  // Invalidate coupon-related caches
  // This clears: /auth/me, /characters/collection, /banners/user/tickets
  // because coupons can grant points, characters, or tickets
  invalidateFor(CACHE_ACTIONS.COUPON_REDEEM);

  return result;
};

// NOTE: Use named exports instead of default for better tree-shaking

