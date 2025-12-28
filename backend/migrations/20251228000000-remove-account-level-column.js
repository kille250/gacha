'use strict';

/**
 * Migration: Remove accountLevel column from Users table
 *
 * The accountLevel column was a cached value that could become stale.
 * Level is now always calculated from accountXP using getLevelFromXP().
 * This eliminates the dual-source-of-truth problem and ensures consistency.
 */

module.exports = {
  async up(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if column exists before trying to remove
      const tableInfo = await queryInterface.describeTable('Users');

      if (tableInfo.accountLevel) {
        await queryInterface.removeColumn('Users', 'accountLevel', { transaction });
        console.log('Removed column: accountLevel');
      } else {
        console.log('Column accountLevel does not exist, skipping');
      }

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Re-add the column if rolling back
      const tableInfo = await queryInterface.describeTable('Users');

      if (!tableInfo.accountLevel) {
        await queryInterface.addColumn('Users', 'accountLevel', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 1
        }, { transaction });
        console.log('Re-added column: accountLevel');
      }

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
