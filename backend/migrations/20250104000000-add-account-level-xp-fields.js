'use strict';

/**
 * Migration: Add account XP tracking fields to Users table
 *
 * This adds fields required for the Account Level XP system:
 * - accountXP: Total XP accumulated from activities
 * - dojoClaimsTotal: Total number of dojo training claims (for XP calculation)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing columns to avoid duplicates
      const tableInfo = await queryInterface.describeTable('Users');

      const columnsToAdd = [
        // Account XP for level calculation
        {
          name: 'accountXP',
          config: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0
          }
        },
        // Total dojo claims for XP tracking
        {
          name: 'dojoClaimsTotal',
          config: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0
          }
        }
      ];

      for (const column of columnsToAdd) {
        if (!tableInfo[column.name]) {
          console.log(`Adding column: ${column.name}`);
          await queryInterface.addColumn('Users', column.name, column.config, { transaction });
        } else {
          console.log(`Column already exists: ${column.name}`);
        }
      }

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const columnsToRemove = ['accountXP', 'dojoClaimsTotal'];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('Users', column, { transaction });
          console.log(`Removed column: ${column}`);
        } catch (_err) {
          console.log(`Column ${column} may not exist, skipping`);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
