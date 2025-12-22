/**
 * Fishing Routes Index
 * 
 * Combines all fishing sub-modules into a single router.
 * This provides a cleaner, more maintainable structure.
 */

const express = require('express');
const router = express.Router();

// Import sub-modules
const coreRoutes = require('./core');
const autofishRoutes = require('./autofish');
const tradingRoutes = require('./trading');
const areasRoutes = require('./areas');
const rodsRoutes = require('./rods');
const challengesRoutes = require('./challenges');
const prestigeRoutes = require('./prestige');
const collectionRoutes = require('./collection');

// Import error handler
const { fishingErrorHandler } = require('../../errors/FishingErrors');

// ===== Core Fishing Routes =====
// POST /cast, POST /catch, GET /info, GET /daily
router.use('/', coreRoutes);

// ===== Autofish Routes =====
// POST /autofish, GET /rank, GET /leaderboard, POST /toggle-autofish
router.use('/autofish', autofishRoutes);
// Alias for backwards compatibility
router.get('/rank', autofishRoutes);
router.get('/leaderboard', autofishRoutes);
router.post('/toggle-autofish', (req, res, next) => {
  req.url = '/toggle';
  autofishRoutes(req, res, next);
});
// Admin routes
router.post('/admin/toggle-autofish', (req, res, next) => {
  req.url = '/admin/toggle';
  autofishRoutes(req, res, next);
});
router.get('/admin/users', (req, res, next) => {
  req.url = '/admin/users';
  autofishRoutes(req, res, next);
});

// ===== Trading Routes =====
// GET /inventory, GET /trading-post, POST /trade
router.use('/', tradingRoutes);

// ===== Areas Routes =====
// GET /areas, POST /areas/:id/unlock, POST /areas/:id/select
router.use('/areas', areasRoutes);

// ===== Rods Routes =====
// GET /rods, POST /rods/:id/buy, POST /rods/:id/equip
router.use('/rods', rodsRoutes);

// ===== Challenges Routes =====
// GET /challenges, POST /challenges/:id/claim
router.use('/challenges', challengesRoutes);

// ===== Prestige Routes =====
// GET /prestige, POST /prestige/claim, GET /prestige/bonuses
router.use('/prestige', prestigeRoutes);

// ===== Collection Routes =====
// GET /collection, GET /collection/fish/:id, GET /collection/bonuses, POST /collection/claim-milestone
router.use('/collection', collectionRoutes);

// Apply error handler for all fishing routes
router.use(fishingErrorHandler);

// Export for use in app.js
module.exports = router;

// Export shared state for potential cleanup/monitoring
module.exports.getSharedState = () => ({
  activeSessions: coreRoutes.activeSessions,
  userFishingMode: coreRoutes.userFishingMode,
  castCooldowns: coreRoutes.castCooldowns
});
