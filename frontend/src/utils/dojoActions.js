/**
 * Dojo Actions Helper Module
 * 
 * Centralizes dojo action handlers with built-in cache invalidation and state updates.
 * Use these functions instead of calling API + invalidateFor separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 * 
 * USAGE:
 * import { assignCharacter, claimRewards, purchaseUpgrade } from '../utils/dojoActions';
 * 
 * const result = await claimRewards(setUser);
 */

import {
  assignCharacterToDojo,
  unassignCharacterFromDojo,
  claimDojoRewards,
  purchaseDojoUpgrade
} from './api';
import { invalidateFor, CACHE_ACTIONS } from './cacheManager';
import { applyPointsUpdate, applyServerResponse } from './userStateUpdates';

/**
 * Assign a character to a dojo training slot with proper cache invalidation.
 * 
 * @param {string} characterId - The character to assign
 * @param {number} slotIndex - The slot to assign to
 * @returns {Promise<Object>} Assignment result from API
 * @throws {Error} If assignment fails
 */
export const assignCharacter = async (characterId, slotIndex) => {
  const result = await assignCharacterToDojo(characterId, slotIndex);
  
  // Invalidate dojo caches
  invalidateFor(CACHE_ACTIONS.DOJO_ASSIGN);
  
  return result;
};

/**
 * Remove a character from a dojo training slot with proper cache invalidation.
 * 
 * @param {number} slotIndex - The slot to unassign
 * @returns {Promise<Object>} Unassignment result from API
 * @throws {Error} If unassignment fails
 */
export const unassignCharacter = async (slotIndex) => {
  const result = await unassignCharacterFromDojo(slotIndex);
  
  // Invalidate dojo caches
  invalidateFor(CACHE_ACTIONS.DOJO_UNASSIGN);
  
  return result;
};

/**
 * Claim accumulated dojo training rewards with proper cache invalidation and state updates.
 * 
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Claim result from API
 * @throws {Error} If claim fails
 */
export const claimRewards = async (setUser) => {
  const result = await claimDojoRewards();
  
  // Update user state from response (may include points and tickets via newTotals)
  applyServerResponse(setUser, result);
  
  // Invalidate dojo caches
  invalidateFor(CACHE_ACTIONS.DOJO_CLAIM);
  
  return result;
};

/**
 * Purchase a dojo upgrade with proper cache invalidation and state updates.
 * 
 * @param {string} upgradeType - The upgrade type to purchase
 * @param {string|null} [rarity=null] - Optional rarity for rarity-specific upgrades
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Upgrade result from API
 * @throws {Error} If upgrade fails
 */
export const purchaseUpgrade = async (upgradeType, rarity, setUser) => {
  const result = await purchaseDojoUpgrade(upgradeType, rarity);
  
  // Update user state from response
  applyPointsUpdate(setUser, result.newPoints);
  
  // Invalidate dojo caches
  invalidateFor(CACHE_ACTIONS.DOJO_UPGRADE);
  
  return result;
};

// NOTE: Use named exports instead of default for better tree-shaking

