/**
 * Fishing Actions Helper Module
 * 
 * Centralizes fishing action handlers with built-in cache invalidation and state updates.
 * Use these functions instead of calling API + invalidateFor separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 * 
 * USAGE:
 * import { executeFishTrade, catchFish, claimChallenge } from '../actions/fishingActions';
 * 
 * const result = await executeFishTrade(tradeId, 1, setUser);
 */

import api from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';
import { applyPointsUpdate, applyRewards } from '../utils/userStateUpdates';

/**
 * Execute a fish trade with proper cache invalidation and state updates.
 * 
 * @param {string} tradeId - The trade to execute
 * @param {number} quantity - Quantity to trade
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Trade result from API
 * @throws {Error} If trade fails
 */
export const executeFishTrade = async (tradeId, quantity, setUser) => {
  const response = await api.post('/fishing/trade', { tradeId, quantity });
  const result = response.data;
  
  // Update user state from response
  applyPointsUpdate(setUser, result.newPoints);
  
  // Invalidate trade-related caches
  invalidateFor(CACHE_ACTIONS.FISHING_TRADE);
  
  return result;
};

/**
 * Catch a fish with proper cache invalidation.
 * 
 * @param {string} sessionId - The fishing session ID
 * @param {number} [reactionTime] - Reaction time in ms (optional for miss)
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Catch result from API
 * @throws {Error} If catch fails
 */
export const catchFish = async (sessionId, reactionTime, setUser) => {
  const payload = reactionTime !== undefined 
    ? { sessionId, reactionTime } 
    : { sessionId };
  
  const response = await api.post('/fishing/catch', payload);
  const result = response.data;
  
  if (result.success) {
    // Update user state from response
    applyPointsUpdate(setUser, result.newPoints);
    
    // Invalidate fishing caches
    invalidateFor(CACHE_ACTIONS.FISHING_CATCH);
  }
  
  return result;
};

/**
 * Claim a fishing challenge reward with proper cache invalidation.
 * 
 * @param {string} challengeId - The challenge to claim
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Claim result from API
 * @throws {Error} If claim fails
 */
export const claimChallenge = async (challengeId, setUser) => {
  const response = await api.post(`/fishing/challenges/${challengeId}/claim`);
  const result = response.data;
  
  // Update user state from response (may include points and tickets)
  applyRewards(setUser, result.rewards);
  
  // Invalidate challenge-related caches
  invalidateFor(CACHE_ACTIONS.FISHING_CLAIM_CHALLENGE);
  
  return result;
};

/**
 * Buy a fishing rod with proper cache invalidation.
 * 
 * @param {string} rodId - The rod to buy
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Purchase result from API
 * @throws {Error} If purchase fails
 */
export const buyRod = async (rodId, setUser) => {
  const response = await api.post(`/fishing/rods/${rodId}/buy`);
  const result = response.data;
  
  // Update user state from response
  applyPointsUpdate(setUser, result.newPoints);
  
  // Invalidate rod-related caches
  invalidateFor(CACHE_ACTIONS.FISHING_BUY_ROD);
  
  return result;
};

/**
 * Equip a fishing rod with proper cache invalidation.
 * 
 * @param {string} rodId - The rod to equip
 * @returns {Promise<Object>} Equip result from API
 * @throws {Error} If equip fails
 */
export const equipRod = async (rodId) => {
  const response = await api.post(`/fishing/rods/${rodId}/equip`);
  const result = response.data;
  
  // Invalidate rod-related caches (no points change)
  invalidateFor(CACHE_ACTIONS.FISHING_EQUIP_ROD);
  
  return result;
};

/**
 * Unlock a fishing area with proper cache invalidation.
 * 
 * @param {string} areaId - The area to unlock
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Unlock result from API
 * @throws {Error} If unlock fails
 */
export const unlockArea = async (areaId, setUser) => {
  const response = await api.post(`/fishing/areas/${areaId}/unlock`);
  const result = response.data;
  
  // Update user state from response
  applyPointsUpdate(setUser, result.newPoints);
  
  // Invalidate area-related caches
  invalidateFor(CACHE_ACTIONS.FISHING_UNLOCK_AREA);
  
  return result;
};

/**
 * Select a fishing area with proper cache invalidation.
 * 
 * @param {string} areaId - The area to select
 * @returns {Promise<Object>} Select result from API
 * @throws {Error} If select fails
 */
export const selectArea = async (areaId) => {
  const response = await api.post(`/fishing/areas/${areaId}/select`);
  const result = response.data;
  
  // Invalidate area-related caches (no points change)
  invalidateFor(CACHE_ACTIONS.FISHING_SELECT_AREA);
  
  return result;
};

/**
 * Run autofish with proper cache invalidation.
 * 
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Autofish result from API
 * @throws {Error} If autofish fails
 */
export const runAutofish = async (setUser) => {
  const response = await api.post('/fishing/autofish');
  const result = response.data;
  
  // Update user state from response
  applyPointsUpdate(setUser, result.newPoints);
  
  // Invalidate autofish-related caches
  invalidateFor(CACHE_ACTIONS.FISHING_AUTOFISH);
  
  return result;
};

/**
 * Cast a fishing line to start a fishing session.
 * 
 * NOTE: Cast deducts points but doesn't need full cache invalidation.
 * The fishing session is ephemeral - persistent state only changes on catch.
 * 
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Cast result from API containing sessionId, waitTime, missTimeout, daily stats
 * @throws {Error} If cast fails
 */
export const castLine = async (setUser) => {
  const response = await api.post('/fishing/cast');
  const result = response.data;
  
  // Update user points from cast cost deduction
  applyPointsUpdate(setUser, result.newPoints);
  
  // No cache invalidation needed - cast creates a transient session
  // Cache is invalidated on catch (success or miss)
  
  return result;
};

// NOTE: Default export removed - use named exports instead for better tree-shaking

