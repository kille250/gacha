'use strict';

/**
 * Migration: Add Fortune Wheel fields to Users table
 *
 * This adds fields required for the Fortune Wheel mini-game:
 * - fortuneWheel: JSON tracking spin state, streaks, jackpots, active multipliers
 * - fortuneWheelHistory: JSON array of recent spin results
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing columns to avoid duplicates
      const tableInfo = await queryInterface.describeTable('Users');

      const columnsToAdd = [
        // Fortune wheel state tracking
        {
          name: 'fortuneWheel',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: JSON.stringify({
              lastFreeSpinAt: null,
              totalSpins: 0,
              jackpotsWon: 0,
              currentStreak: 0,
              lastStreakDate: null,
              bonusSpinsAvailable: 0,
              pityCounter: 0,
              activeMultiplier: null
            })
          }
        },
        // Fortune wheel spin history (last 20 spins)
        {
          name: 'fortuneWheelHistory',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '[]'
          }
        }
      ];

      // Add each column if it doesn't exist
      for (const column of columnsToAdd) {
        if (!tableInfo[column.name]) {
          await queryInterface.addColumn('Users', column.name, column.config, { transaction });
          console.log(`Added column: ${column.name}`);
        } else {
          console.log(`Column already exists: ${column.name}`);
        }
      }

      await transaction.commit();
      console.log('Fortune Wheel migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Fortune Wheel migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('Users');

      const columnsToRemove = ['fortuneWheel', 'fortuneWheelHistory'];

      for (const columnName of columnsToRemove) {
        if (tableInfo[columnName]) {
          await queryInterface.removeColumn('Users', columnName, { transaction });
          console.log(`Removed column: ${columnName}`);
        }
      }

      await transaction.commit();
      console.log('Fortune Wheel rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Fortune Wheel rollback failed:', error);
      throw error;
    }
  }
};
