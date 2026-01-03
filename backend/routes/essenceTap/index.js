/**
 * Essence Tap Routes - Main Entry Point
 *
 * This module sets up all essence tap routes.
 * Route handlers are organized into categories for maintainability.
 *
 * Module Structure:
 *   - middleware.js         - Shared rate limiting and caching
 *   - createRoute.js        - Route factory for standardized handlers
 *   - routes/core.routes.js       - Status, click, sync, config
 *   - routes/generator.routes.js  - Generator purchase and info
 *   - routes/upgrade.routes.js    - Upgrade management
 *   - routes/prestige.routes.js   - Prestige/awakening system
 *   - routes/character.routes.js  - Character assignment and mastery
 *   - routes/gamble.routes.js     - Gambling mechanics
 *   - routes/boss.routes.js       - Boss encounters
 *   - routes/milestone.routes.js  - Milestones and daily challenges
 *   - routes/tournament.routes.js - Tournament, leaderboards, checkpoints
 *   - routes/ticket.routes.js     - Ticket generation, essence types, infusion
 *   - index.js                    - This file, main router setup
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { rewardClaimLimiter, clickLimiter } = require('../../middleware/rateLimiter');

// Import modular route modules
const coreRoutes = require('./routes/core.routes');
const generatorRoutes = require('./routes/generator.routes');
const upgradeRoutes = require('./routes/upgrade.routes');
const prestigeRoutes = require('./routes/prestige.routes');
const characterRoutes = require('./routes/character.routes');
const gambleRoutes = require('./routes/gamble.routes');
const bossRoutes = require('./routes/boss.routes');
const milestoneRoutes = require('./routes/milestone.routes');
const tournamentRoutes = require('./routes/tournament.routes');
const ticketRoutes = require('./routes/ticket.routes');

// Import the main routes file (for backward compatibility during migration)
// Routes will be gradually migrated to this modular structure
const legacyRoutes = require('../essenceTap.js');

// ===========================================
// MODULAR ROUTE MOUNTING
// ===========================================

// Core routes (status, click, sync, config)
// Click route has its own rate limiter
router.get('/status', auth, coreRoutes);
router.post('/click', auth, clickLimiter, coreRoutes);
router.post('/sync-on-leave', auth, coreRoutes);
router.get('/config', auth, coreRoutes);

// Generator routes (buy, info)
router.use('/generator', auth, generatorRoutes);

// Upgrade routes (buy, list)
router.use('/upgrade', auth, upgradeRoutes);
router.get('/upgrades', auth, upgradeRoutes);

// Prestige routes (prestige action, info, upgrades)
router.use('/prestige', auth, prestigeRoutes);

// Character routes (assign, unassign, bonuses, mastery)
router.use('/character', auth, characterRoutes);
router.get('/mastery', auth, characterRoutes);

// Gamble routes (gamble action, jackpot)
router.post('/gamble', auth, gambleRoutes);
router.get('/jackpot', auth, gambleRoutes);

// Boss routes (spawn, attack, status, rewards)
router.use('/boss', auth, bossRoutes);

// Milestone routes (claim, daily challenges)
router.use('/milestone', auth, milestoneRoutes);
router.use('/milestones', auth, milestoneRoutes);
router.get('/daily-challenges', auth, milestoneRoutes);
router.post('/daily-challenge/claim', auth, milestoneRoutes);

// Tournament routes (weekly, leaderboards, checkpoints, cosmetics)
// Claim routes have rate limiting
router.use('/tournament/weekly/claim', auth, rewardClaimLimiter);
router.use('/tournament/checkpoint/claim', auth, rewardClaimLimiter);
router.use('/tournament', auth, tournamentRoutes);

// Ticket routes (streak claiming, essence types, infusion)
router.use('/tickets', auth, ticketRoutes);

// Mount essence-types, daily-modifier, and infusion at root level for backward compatibility
router.get('/essence-types', auth, ticketRoutes);
router.get('/daily-modifier', auth, ticketRoutes);
router.post('/infusion', auth, ticketRoutes);

// ===========================================
// LEGACY ROUTE FALLBACK
// ===========================================

// For all other routes, fall back to the legacy router
// This ensures backward compatibility while routes are being migrated
router.use('/', legacyRoutes);

module.exports = router;
