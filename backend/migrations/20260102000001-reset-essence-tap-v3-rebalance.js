'use strict';

/**
 * Migration: Reset Essence Tap Data for v3.0 Rebalancing
 *
 * This migration resets all Essence Tap save data to provide a fresh start
 * with the new v3.0 balance values. The rebalancing significantly changed:
 * - Generator costs (10x-1600x increase for late tiers)
 * - Generator outputs (reduced across all tiers)
 * - Prestige thresholds (1M -> 50M minimum)
 * - Upgrade costs and bonuses
 * - Milestone thresholds
 *
 * Existing saves would be heavily imbalanced with the new values, so a full
 * reset provides the best player experience.
 *
 * See docs/ESSENCE_TAP_BALANCE_ANALYSIS.md for full rebalancing details.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    // Reset all Essence Tap data to NULL (will regenerate fresh state on next load)
    await queryInterface.sequelize.query(
      `UPDATE "Users" SET "essenceTap" = NULL WHERE "essenceTap" IS NOT NULL`
    );

    console.log('Essence Tap v3.0 Rebalancing: All player Essence Tap data has been reset.');
    console.log('Players will start fresh with the new balanced progression.');
  },

  async down(queryInterface, _Sequelize) {
    // Cannot restore deleted data - this is a one-way migration
    // Log a warning if someone tries to rollback
    console.warn('WARNING: Cannot restore Essence Tap data after reset.');
    console.warn('The down migration is a no-op. Player data cannot be recovered.');

    // No-op - data cannot be restored
    await queryInterface.sequelize.query('SELECT 1');
  }
};
