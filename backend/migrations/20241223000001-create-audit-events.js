'use strict';

/**
 * Migration: Create AuditEvents Table
 * 
 * Stores security-relevant events for traceability and analysis.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AuditEvents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      
      // Event classification
      eventType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      
      severity: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'info' // info, warning, critical
      },
      
      // Actor (who performed the action)
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      
      // For admin actions: the admin who performed it
      adminId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      
      // Target (who was affected, for admin actions)
      targetUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      
      // Event details (JSON)
      data: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Request context
      ipHash: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      userAgent: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      deviceFingerprint: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Timestamps
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
    
    // Indexes for common queries
    await queryInterface.addIndex('AuditEvents', ['userId']);
    await queryInterface.addIndex('AuditEvents', ['eventType']);
    await queryInterface.addIndex('AuditEvents', ['createdAt']);
    await queryInterface.addIndex('AuditEvents', ['severity']);
    
    console.log('[Migration] AuditEvents table created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AuditEvents');
  }
};

