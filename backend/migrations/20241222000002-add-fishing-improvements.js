'use strict';

/**
 * Migration: Fishing System Improvements
 * 
 * Adds:
 * - Daily fishing limits (democratized autofish)
 * - Daily challenges tracking
 * - Fishing area unlock tracking
 * - Rod upgrades
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    // Daily fishing stats (resets daily) - for limits and challenges
    if (!tableInfo.fishingDaily) {
      await queryInterface.addColumn('Users', 'fishingDaily', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({
          date: null,           // YYYY-MM-DD format
          manualCasts: 0,       // Manual casts today
          autofishCasts: 0,     // Autofish casts today
          catches: 0,           // Total catches today
          perfectCatches: 0,    // Perfect catches today
          rareCatches: 0,       // Rare+ catches today
          tradesCompleted: 0,   // Trades today
          pointsFromTrades: 0,  // Points earned from trades today
          ticketsEarned: { roll: 0, premium: 0 }
        })
      });
    }
    
    // Daily challenges progress
    if (!tableInfo.fishingChallenges) {
      await queryInterface.addColumn('Users', 'fishingChallenges', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({
          date: null,           // YYYY-MM-DD format
          active: [],           // Array of active challenge IDs
          completed: [],        // Array of completed challenge IDs (today)
          progress: {}          // { challengeId: currentProgress }
        })
      });
    }
    
    // Unlocked fishing areas
    if (!tableInfo.fishingAreas) {
      await queryInterface.addColumn('Users', 'fishingAreas', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({
          unlocked: ['pond'],   // Start with pond unlocked
          current: 'pond'       // Currently selected area
        })
      });
    }
    
    // Fishing rod upgrades
    if (!tableInfo.fishingRod) {
      await queryInterface.addColumn('Users', 'fishingRod', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'basic'
      });
    }
    
    // Lifetime fishing achievements
    if (!tableInfo.fishingAchievements) {
      await queryInterface.addColumn('Users', 'fishingAchievements', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({
          totalLegendaries: 0,
          totalPerfects: 0,
          longestStreak: 0,
          currentStreak: 0,
          challengesCompleted: 0,
          prestige: 0
        })
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.fishingDaily) {
      await queryInterface.removeColumn('Users', 'fishingDaily');
    }
    if (tableInfo.fishingChallenges) {
      await queryInterface.removeColumn('Users', 'fishingChallenges');
    }
    if (tableInfo.fishingAreas) {
      await queryInterface.removeColumn('Users', 'fishingAreas');
    }
    if (tableInfo.fishingRod) {
      await queryInterface.removeColumn('Users', 'fishingRod');
    }
    if (tableInfo.fishingAchievements) {
      await queryInterface.removeColumn('Users', 'fishingAchievements');
    }
  }
};

