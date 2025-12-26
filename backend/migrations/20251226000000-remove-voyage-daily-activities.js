'use strict';

/**
 * Migration: Remove Weekly Voyage and Daily Activities columns
 *
 * This migration removes the weeklyVoyages and dailyActivities
 * columns from the Users table. These features have been permanently
 * removed from the game design.
 */

module.exports = {
  async up(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing columns to check if they exist
      const tableInfo = await queryInterface.describeTable('Users');

      const columnsToRemove = ['weeklyVoyages', 'dailyActivities'];

      for (const column of columnsToRemove) {
        if (tableInfo[column]) {
          console.log(`Removing column: ${column}`);
          await queryInterface.removeColumn('Users', column, { transaction });
        } else {
          console.log(`Column ${column} does not exist, skipping`);
        }
      }

      await transaction.commit();
      console.log('Migration completed successfully - removed voyage and daily activities columns');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Re-add the columns if rollback is needed
      const tableInfo = await queryInterface.describeTable('Users');

      if (!tableInfo.weeklyVoyages) {
        await queryInterface.addColumn('Users', 'weeklyVoyages', {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: '{}'
        }, { transaction });
        console.log('Re-added column: weeklyVoyages');
      }

      if (!tableInfo.dailyActivities) {
        await queryInterface.addColumn('Users', 'dailyActivities', {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: '{}'
        }, { transaction });
        console.log('Re-added column: dailyActivities');
      }

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
