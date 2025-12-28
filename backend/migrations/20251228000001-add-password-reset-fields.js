'use strict';

/**
 * Migration: Add password reset fields to Users table
 *
 * Adds:
 * - forcePasswordChange: boolean to flag when user must change password
 * - passwordResetExpiry: timestamp when temporary password expires
 * - passwordResetAt: timestamp of last password reset (for audit)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');

    // Add forcePasswordChange field
    if (!tableInfo.forcePasswordChange) {
      await queryInterface.addColumn('Users', 'forcePasswordChange', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
    }

    // Add passwordResetExpiry field
    if (!tableInfo.passwordResetExpiry) {
      await queryInterface.addColumn('Users', 'passwordResetExpiry', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Add passwordResetAt field (for tracking last reset)
    if (!tableInfo.passwordResetAt) {
      await queryInterface.addColumn('Users', 'passwordResetAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('Users');

    if (tableInfo.forcePasswordChange) {
      await queryInterface.removeColumn('Users', 'forcePasswordChange');
    }

    if (tableInfo.passwordResetExpiry) {
      await queryInterface.removeColumn('Users', 'passwordResetExpiry');
    }

    if (tableInfo.passwordResetAt) {
      await queryInterface.removeColumn('Users', 'passwordResetAt');
    }
  }
};
