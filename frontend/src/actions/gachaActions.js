/**
 * Gacha Actions Helper Module
 * 
 * Centralizes gacha action handlers with built-in cache invalidation and state updates.
 * Use these functions instead of calling API + invalidateFor separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 * 
 * USAGE:
 * import { executeRoll, executeMultiRoll, executeLevelUp } from '../actions/gachaActions';
 * 
 * const result = await executeRoll(rollFn, setUser);
 */

import { rollCharacter, rollMultipleCharacters, rollOnBanner, multiRollOnBanner, levelUpCharacter, levelUpAllCharacters } from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';
import { applyPointsUpdate } from '../utils/userStateUpdates';

/**
 * Execute a standard gacha roll with proper cache invalidation and state updates.
 * 
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Roll result from API
 * @throws {Error} If roll fails
 */
export const executeStandardRoll = async (setUser) => {
  // Defensive revalidation before spending currency to prevent stale-state bugs
  invalidateFor(CACHE_ACTIONS.PRE_ROLL);
  
  const result = await rollCharacter();
  
  // Update user state from response
  applyPointsUpdate(setUser, result.updatedPoints);
  
  // Invalidate gacha-related caches
  invalidateFor(CACHE_ACTIONS.GACHA_ROLL);
  
  return result;
};

/**
 * Execute a standard multi-roll with proper cache invalidation and state updates.
 * 
 * @param {number} count - Number of rolls
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Roll result from API
 * @throws {Error} If roll fails
 */
export const executeStandardMultiRoll = async (count, setUser) => {
  // Defensive revalidation before spending currency to prevent stale-state bugs
  invalidateFor(CACHE_ACTIONS.PRE_ROLL);
  
  const result = await rollMultipleCharacters(count);
  
  // Update user state from response
  applyPointsUpdate(setUser, result.updatedPoints);
  
  // Invalidate gacha-related caches
  invalidateFor(CACHE_ACTIONS.GACHA_ROLL);
  
  return result;
};

/**
 * Execute a banner roll with proper cache invalidation and state updates.
 * 
 * @param {string} bannerId - The banner to roll on
 * @param {boolean} [useTicket=false] - Whether to use a ticket
 * @param {string} [ticketType='roll'] - Type of ticket ('roll' or 'premium')
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Roll result from API
 * @throws {Error} If roll fails
 */
export const executeBannerRoll = async (bannerId, useTicket, ticketType, setUser) => {
  // Defensive revalidation before spending currency to prevent stale-state bugs
  invalidateFor(CACHE_ACTIONS.PRE_ROLL);
  
  const result = await rollOnBanner(bannerId, useTicket, ticketType);
  
  // Update user state from response
  applyPointsUpdate(setUser, result.updatedPoints);
  
  // Invalidate banner roll caches (includes tickets)
  invalidateFor(CACHE_ACTIONS.GACHA_ROLL_BANNER);
  
  return result;
};

/**
 * Execute a banner multi-roll with proper cache invalidation and state updates.
 * 
 * @param {string} bannerId - The banner to roll on
 * @param {number} [count=10] - Number of rolls
 * @param {boolean} [useTickets=false] - Whether to use tickets
 * @param {string} [ticketType='roll'] - Type of ticket ('roll' or 'premium')
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Roll result from API
 * @throws {Error} If roll fails
 */
export const executeBannerMultiRoll = async (bannerId, count, useTickets, ticketType, setUser) => {
  // Defensive revalidation before spending currency to prevent stale-state bugs
  invalidateFor(CACHE_ACTIONS.PRE_ROLL);
  
  const result = await multiRollOnBanner(bannerId, count, useTickets, ticketType);
  
  // Update user state from response
  applyPointsUpdate(setUser, result.updatedPoints);
  
  // Invalidate banner roll caches (includes tickets)
  invalidateFor(CACHE_ACTIONS.GACHA_ROLL_BANNER);
  
  return result;
};

/**
 * Level up a character with proper cache invalidation and state updates.
 * 
 * @param {string} characterId - The character to level up
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Level up result from API
 * @throws {Error} If level up fails
 */
export const executeLevelUp = async (characterId, setUser) => {
  // Defensive revalidation before spending currency to prevent stale-state bugs
  invalidateFor(CACHE_ACTIONS.PRE_PURCHASE);
  
  const result = await levelUpCharacter(characterId);
  
  // Update user state from response
  applyPointsUpdate(setUser, result.newPoints);
  
  // Invalidate gacha-related caches
  invalidateFor(CACHE_ACTIONS.GACHA_LEVEL_UP);
  
  return result;
};

/**
 * Batch level up all upgradable characters (one level each).
 * 
 * @returns {Promise<Object>} Batch level up result with upgraded count and details
 * @throws {Error} If batch level up fails
 */
export const executeUpgradeAll = async () => {
  // Defensive revalidation before spending resources
  invalidateFor(CACHE_ACTIONS.PRE_PURCHASE);
  
  const result = await levelUpAllCharacters();
  
  // Invalidate gacha-related caches (same as single level up)
  invalidateFor(CACHE_ACTIONS.GACHA_LEVEL_UP);
  
  return result;
};

// NOTE: Use named exports instead of default for better tree-shaking

