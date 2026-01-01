'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Announcements table
    await queryInterface.createTable('Announcements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('maintenance', 'update', 'event', 'patch_notes', 'promotion', 'warning', 'info'),
        allowNull: false,
        defaultValue: 'info'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      displayMode: {
        type: Sequelize.ENUM('banner', 'modal', 'inline', 'toast'),
        allowNull: false,
        defaultValue: 'banner'
      },
      targetAudience: {
        type: Sequelize.ENUM('all', 'premium', 'new_users', 'admins'),
        allowNull: false,
        defaultValue: 'all'
      },
      dismissible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      requiresAcknowledgment: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      publishAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      acknowledgmentCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // Create UserAnnouncementStatus table for tracking user interactions
    await queryInterface.createTable('UserAnnouncementStatuses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      announcementId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      viewedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      acknowledgedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      dismissedAt: {
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

    // Indexes for Announcements
    await queryInterface.addIndex('Announcements', ['status']);
    await queryInterface.addIndex('Announcements', ['type']);
    await queryInterface.addIndex('Announcements', ['priority']);
    await queryInterface.addIndex('Announcements', ['publishAt']);
    await queryInterface.addIndex('Announcements', ['expiresAt']);
    await queryInterface.addIndex('Announcements', ['createdBy']);

    // Indexes for UserAnnouncementStatus
    await queryInterface.addIndex('UserAnnouncementStatuses', ['userId']);
    await queryInterface.addIndex('UserAnnouncementStatuses', ['announcementId']);
    await queryInterface.addIndex('UserAnnouncementStatuses', ['userId', 'announcementId'], {
      unique: true,
      name: 'user_announcement_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserAnnouncementStatuses');
    await queryInterface.dropTable('Announcements');
  }
};
