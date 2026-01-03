/**
 * Essence Tap Routes - Main Entry Point
 *
 * This module sets up all essence tap routes.
 * Route handlers are organized into categories for maintainability.
 *
 * Module Structure:
 *   - middleware.js    - Shared rate limiting and caching
 *   - createRoute.js   - Route factory for standardized handlers
 *   - index.js         - This file, main router setup
 */

const express = require('express');
const _router = express.Router();
const _auth = require('../../middleware/auth');
const { rewardClaimLimiter: _rewardClaimLimiter } = require('../../middleware/rateLimiter');

// Import route middleware (reserved for future migration)
const {
  clickRateLimitMiddleware: _clickRateLimitMiddleware,
  essenceLockMiddleware: _essenceLockMiddleware
} = require('./middleware');

// Import the main routes file (for backward compatibility during migration)
// Routes will be gradually migrated to this modular structure
const legacyRoutes = require('../essenceTap.js');

// Re-export the legacy router for now
// New routes can be added here with the modular pattern
module.exports = legacyRoutes;
