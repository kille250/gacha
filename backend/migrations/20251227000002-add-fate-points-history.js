'use strict';

/**
 * Migration: Add fate points history field to Users table
 *
 * This adds the fatePointsHistory field for tracking fate point transaction history.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing columns to avoid duplicates
      const tableInfo = await queryInterface.describeTable('Users');

      // Add fatePointsHistory column if it doesn't exist
      if (!tableInfo.fatePointsHistory) {
        await queryInterface.addColumn('Users', 'fatePointsHistory', {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: '[]'
        }, { transaction });
        console.log('Added column: fatePointsHistory');
      } else {
        console.log('Column fatePointsHistory already exists, skipping');
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

      if (tableInfo.fatePointsHistory) {
        await queryInterface.removeColumn('Users', 'fatePointsHistory', { transaction });
        console.log('Removed column: fatePointsHistory');
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
