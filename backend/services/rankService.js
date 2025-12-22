/**
 * Rank Service
 * 
 * Handles user rank caching and batch refresh for performance.
 * Separated from routes for better testability and reuse.
 */

const { User } = require('../models');
const { Op } = require('sequelize');

// Configuration
const RANK_REFRESH_INTERVAL = 60000; // Refresh all ranks every 60 seconds
const RANK_CACHE_TTL = 65000; // Cache entries live slightly longer than refresh interval

// Rank cache state
let userRankCache = new Map(); // userId -> { rank, points, expiry }
let lastRankRefresh = 0;
let rankRefreshInProgress = false;
let refreshPromise = null; // Store promise for concurrent requests

/**
 * Batch refresh all user ranks
 * Uses mutex pattern to prevent concurrent refreshes
 * @returns {Promise<void>}
 */
async function refreshAllRanks() {
  const now = Date.now();
  
  // Skip if recently refreshed
  if (now - lastRankRefresh < RANK_REFRESH_INTERVAL) {
    return;
  }
  
  // If refresh is in progress, wait for it to complete
  if (rankRefreshInProgress && refreshPromise) {
    return refreshPromise;
  }
  
  // Set mutex and create promise
  rankRefreshInProgress = true;
  
  refreshPromise = (async () => {
    try {
      // Single query to get all users ordered by points
      const users = await User.findAll({
        attributes: ['id', 'points'],
        order: [['points', 'DESC']]
      });
      
      // Clear old cache and assign new ranks
      const newCache = new Map();
      const expiry = now + RANK_CACHE_TTL;
      
      users.forEach((user, index) => {
        newCache.set(user.id, {
          rank: index + 1,
          points: user.points,
          expiry
        });
      });
      
      // Atomic swap of cache
      userRankCache = newCache;
      lastRankRefresh = now;
      
      console.log(`[RankService] Refreshed ranks for ${users.length} users`);
    } catch (err) {
      console.error('[RankService] Error refreshing ranks:', err);
      throw err;
    } finally {
      rankRefreshInProgress = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

/**
 * Get user's rank with batch caching for performance
 * @param {number} userId - User ID to get rank for
 * @param {boolean} forceRefresh - Force a batch refresh
 * @returns {Promise<number|null>} - User's rank (1-indexed) or null if not found
 */
async function getUserRank(userId, forceRefresh = false) {
  const now = Date.now();
  
  // Check if we need to refresh the batch cache
  if (forceRefresh || now - lastRankRefresh >= RANK_REFRESH_INTERVAL) {
    await refreshAllRanks();
  }
  
  // Check cache
  const cached = userRankCache.get(userId);
  if (cached && now < cached.expiry) {
    return cached.rank;
  }
  
  // Fallback: User not in cache (new user or cache miss)
  // Do individual query but also trigger batch refresh
  const user = await User.findByPk(userId, {
    attributes: ['id', 'points']
  });
  
  if (!user) return null;
  
  // Count users with more points (fallback for edge cases)
  const higherRanked = await User.count({
    where: {
      points: { [Op.gt]: user.points }
    }
  });
  
  const rank = higherRanked + 1;
  
  // Cache the result
  userRankCache.set(userId, {
    rank,
    points: user.points,
    expiry: now + RANK_CACHE_TTL
  });
  
  return rank;
}

/**
 * Get multiple users' ranks efficiently
 * @param {number[]} userIds - Array of user IDs
 * @returns {Promise<Map<number, number>>} - Map of userId -> rank
 */
async function getUserRanks(userIds) {
  const now = Date.now();
  
  // Ensure cache is fresh
  if (now - lastRankRefresh >= RANK_REFRESH_INTERVAL) {
    await refreshAllRanks();
  }
  
  const results = new Map();
  const missingIds = [];
  
  // Check cache for each user
  for (const userId of userIds) {
    const cached = userRankCache.get(userId);
    if (cached && now < cached.expiry) {
      results.set(userId, cached.rank);
    } else {
      missingIds.push(userId);
    }
  }
  
  // Fetch missing ranks individually
  for (const userId of missingIds) {
    const rank = await getUserRank(userId);
    if (rank !== null) {
      results.set(userId, rank);
    }
  }
  
  return results;
}

/**
 * Invalidate a specific user's cached rank
 * Call this when a user's points change significantly
 * @param {number} userId - User ID to invalidate
 */
function invalidateUserRank(userId) {
  userRankCache.delete(userId);
}

/**
 * Force a full rank refresh on next query
 * Useful after bulk point changes (e.g., admin operations)
 */
function invalidateAllRanks() {
  lastRankRefresh = 0;
  userRankCache.clear();
}

/**
 * Get total number of users (from cache if available)
 * @returns {Promise<number>}
 */
async function getTotalUsers() {
  const now = Date.now();
  
  // If cache is fresh, use its size
  if (now - lastRankRefresh < RANK_REFRESH_INTERVAL && userRankCache.size > 0) {
    return userRankCache.size;
  }
  
  // Otherwise count from DB
  return await User.count();
}

/**
 * Get cache statistics for monitoring
 * @returns {Object}
 */
function getCacheStats() {
  return {
    cacheSize: userRankCache.size,
    lastRefresh: new Date(lastRankRefresh).toISOString(),
    refreshInterval: RANK_REFRESH_INTERVAL,
    cacheTTL: RANK_CACHE_TTL,
    isRefreshing: rankRefreshInProgress
  };
}

/**
 * Clean up expired cache entries
 * Called periodically to prevent memory bloat
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let removed = 0;
  
  for (const [userId, data] of userRankCache.entries()) {
    if (now > data.expiry) {
      userRankCache.delete(userId);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[RankService] Cleaned up ${removed} expired cache entries`);
  }
}

// Schedule periodic cleanup
setInterval(cleanupExpiredEntries, 5 * 60 * 1000); // Every 5 minutes

module.exports = {
  refreshAllRanks,
  getUserRank,
  getUserRanks,
  invalidateUserRank,
  invalidateAllRanks,
  getTotalUsers,
  getCacheStats,
  cleanupExpiredEntries
};

