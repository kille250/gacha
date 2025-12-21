'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists (case-insensitive for PostgreSQL)
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.some(t => t.toLowerCase() === 'fishinventories');
    
    if (!tableExists) {
      await queryInterface.createTable('FishInventories', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
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
        fishId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        fishName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        fishEmoji: {
          type: Sequelize.STRING,
          allowNull: false
        },
        rarity: {
          type: Sequelize.STRING,
          allowNull: false
        },
        quantity: {
          type: Sequelize.INTEGER,
          defaultValue: 1
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

      // Add unique constraint
      await queryInterface.addConstraint('FishInventories', {
        fields: ['userId', 'fishId'],
        type: 'unique',
        name: 'FishInventories_userId_fishId_unique'
      });

      console.log('Created FishInventories table');
    } else {
      console.log('FishInventories table already exists');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('FishInventories');
  }
};

