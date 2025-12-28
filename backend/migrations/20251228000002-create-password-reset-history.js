'use strict';

/**
 * Migration: Create PasswordResetHistory table
 *
 * Stores audit trail for all admin password resets:
 * - adminId: who performed the reset
 * - targetUserId: whose password was reset
 * - ipHash: IP address hash of admin (for security audit)
 * - userAgent: browser/device info
 * - createdAt: when the reset occurred
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PasswordResetHistory', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      adminId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      targetUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ipHash: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userAgent: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('PasswordResetHistory', ['adminId']);
    await queryInterface.addIndex('PasswordResetHistory', ['targetUserId']);
    await queryInterface.addIndex('PasswordResetHistory', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PasswordResetHistory');
  }
};
