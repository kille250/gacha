'use strict';

/**
 * Migration: Add fate points weekly tracking field to Users table
 *
 * This adds the fatePointsWeekly field for tracking weekly fate point earnings
 * to enable the weekly cap feature.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing columns to avoid duplicates
      const tableInfo = await queryInterface.describeTable('Users');

      // Add fatePointsWeekly column if it doesn't exist
      if (!tableInfo.fatePointsWeekly) {
        await queryInterface.addColumn('Users', 'fatePointsWeekly', {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: '{}'
        }, { transaction });
        console.log('Added column: fatePointsWeekly');
      } else {
        console.log('Column fatePointsWeekly already exists, skipping');
      }

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('Users');

      if (tableInfo.fatePointsWeekly) {
        await queryInterface.removeColumn('Users', 'fatePointsWeekly', { transaction });
        console.log('Removed column: fatePointsWeekly');
      }

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
