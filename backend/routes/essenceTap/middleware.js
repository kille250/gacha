/**
 * Essence Tap Route Middleware
 *
 * Shared middleware for rate limiting, deduplication, and caching.
 * Extracted from the main routes file to reduce code duplication.
 */

// ===========================================
// SERVER-SIDE RATE LIMITING
// ===========================================

/**
 * In-memory rate limiter for click requests
 * Tracks last click timestamp and click count per user
 */
const clickRateLimiter = new Map();
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const MAX_CLICKS_PER_WINDOW = 25; // Slightly higher than client-side to account for network batching
const RATE_LIMIT_CLEANUP_INTERVAL = 60000; // Clean up old entries every minute

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of clickRateLimiter.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 10) {
      clickRateLimiter.delete(userId);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

/**
 * Check and update rate limit for a user
 * @param {number} userId - User ID
 * @param {number} clickCount - Number of clicks in this request
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
function checkClickRateLimit(userId, clickCount) {
  const now = Date.now();
  const userLimit = clickRateLimiter.get(userId);

  if (!userLimit || now - userLimit.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    clickRateLimiter.set(userId, {
      windowStart: now,
      clicks: clickCount
    });
    return {
      allowed: true,
      remaining: MAX_CLICKS_PER_WINDOW - clickCount,
      resetIn: RATE_LIMIT_WINDOW_MS
    };
  }

  // Same window - check if adding clicks would exceed limit
  const newTotal = userLimit.clicks + clickCount;
  if (newTotal > MAX_CLICKS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: MAX_CLICKS_PER_WINDOW - userLimit.clicks,
      resetIn: RATE_LIMIT_WINDOW_MS - (now - userLimit.windowStart)
    };
  }

  // Update count
  userLimit.clicks = newTotal;
  return {
    allowed: true,
    remaining: MAX_CLICKS_PER_WINDOW - newTotal,
    resetIn: RATE_LIMIT_WINDOW_MS - (now - userLimit.windowStart)
  };
}

// ===========================================
// REQUEST DEDUPLICATION FOR PASSIVE GAINS
// ===========================================

/**
 * Tracks pending essence-modifying requests per user to prevent race conditions.
 */
const pendingEssenceRequests = new Map();
const PASSIVE_GAIN_DEDUP_WINDOW_MS = 1000;

/**
 * Wrapper to serialize essence-modifying requests per user.
 * @param {number} userId - User ID
 * @param {Function} handler - Async handler function
 * @returns {Promise} Handler result
 */
async function withEssenceLock(userId, handler) {
  const key = `essence_${userId}`;
  const existing = pendingEssenceRequests.get(key);

  if (existing) {
    try {
      await existing.promise;
    } catch {
      // Ignore errors from previous request
    }
  }

  let resolve;
  const promise = new Promise(r => { resolve = r; });
  pendingEssenceRequests.set(key, { promise, timestamp: Date.now() });

  try {
    return await handler();
  } finally {
    resolve();
    setTimeout(() => {
      const current = pendingEssenceRequests.get(key);
      if (current && current.promise === promise) {
        pendingEssenceRequests.delete(key);
      }
    }, PASSIVE_GAIN_DEDUP_WINDOW_MS);
  }
}

// Clean up stale dedup entries
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of pendingEssenceRequests.entries()) {
    if (now - data.timestamp > PASSIVE_GAIN_DEDUP_WINDOW_MS * 10) {
      pendingEssenceRequests.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

// ===========================================
// INITIALIZATION DEDUPLICATION
// ===========================================

/**
 * Caches recent /initialize results to return idempotently.
 */
const initializationCache = new Map();
const INITIALIZATION_DEDUP_WINDOW_MS = 5000;

/**
 * Check if this initialization can return a cached result.
 * @param {number} userId - User ID
 * @param {number} clientTimestamp - Client's timestamp
 * @returns {Object|null} Cached response or null
 */
function getCachedInitialization(userId, clientTimestamp) {
  const key = `init_${userId}`;
  const cached = initializationCache.get(key);

  if (!cached) return null;

  if (Date.now() - cached.serverTimestamp > INITIALIZATION_DEDUP_WINDOW_MS) {
    initializationCache.delete(key);
    return null;
  }

  if (clientTimestamp && clientTimestamp <= cached.clientTimestamp) {
    return { ...cached.response, fromCache: true };
  }

  return null;
}

/**
 * Cache an initialization result for deduplication.
 * @param {number} userId - User ID
 * @param {number} clientTimestamp - Client's timestamp
 * @param {Object} response - Response to cache
 */
function cacheInitialization(userId, clientTimestamp, response) {
  const key = `init_${userId}`;
  initializationCache.set(key, {
    clientTimestamp,
    serverTimestamp: Date.now(),
    response
  });

  setTimeout(() => {
    const current = initializationCache.get(key);
    if (current && Date.now() - current.serverTimestamp > INITIALIZATION_DEDUP_WINDOW_MS) {
      initializationCache.delete(key);
    }
  }, INITIALIZATION_DEDUP_WINDOW_MS + 1000);
}

// Clean up stale cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of initializationCache.entries()) {
    if (now - data.serverTimestamp > INITIALIZATION_DEDUP_WINDOW_MS * 2) {
      initializationCache.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

// ===========================================
// EXPRESS MIDDLEWARE
// ===========================================

/**
 * Express middleware for click rate limiting
 */
function clickRateLimitMiddleware(req, res, next) {
  const clickCount = req.body.count || 1;
  const rateLimit = checkClickRateLimit(req.user.id, clickCount);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn
    });
  }

  req.rateLimit = rateLimit;
  next();
}

/**
 * Express middleware to attach essence lock
 */
function essenceLockMiddleware(req, res, next) {
  req.withEssenceLock = (handler) => withEssenceLock(req.user.id, handler);
  next();
}

module.exports = {
  // Rate limiting
  checkClickRateLimit,
  clickRateLimitMiddleware,
  RATE_LIMIT_WINDOW_MS,
  MAX_CLICKS_PER_WINDOW,

  // Essence lock
  withEssenceLock,
  essenceLockMiddleware,

  // Initialization cache
  getCachedInitialization,
  cacheInitialization,
  INITIALIZATION_DEDUP_WINDOW_MS
};
