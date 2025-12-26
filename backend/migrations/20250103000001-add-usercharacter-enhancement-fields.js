'use strict';

/**
 * Migration: Add game enhancement fields to UserCharacters table
 *
 * This adds new fields for:
 * - Character specialization (permanent path choice)
 * - Mastery XP tracking
 * - Training methods
 * - Intense training schedule
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get existing columns to avoid duplicates
    const tableInfo = await queryInterface.describeTable('UserCharacters');

    const columnsToAdd = [
      // Specialization path (strength, wisdom, spirit) - permanent choice
      {
        name: 'specialization',
        config: {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: null
        }
      },
      // Mastery XP for this character
      {
        name: 'masteryXp',
        config: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        }
      },
      // Training method currently assigned (standard, intense, meditation, sparring)
      {
        name: 'trainingMethod',
        config: {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: 'standard'
        }
      },
      // If in intense training, when it ends
      {
        name: 'intenseTrainingEnd',
        config: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }
    ];

    for (const column of columnsToAdd) {
      if (!tableInfo[column.name]) {
        console.log(`Adding column to UserCharacters: ${column.name}`);
        await queryInterface.addColumn('UserCharacters', column.name, column.config);
      } else {
        console.log(`Column already exists in UserCharacters: ${column.name}`);
      }
    }

    console.log('UserCharacters migration completed successfully');
  },

  async down(queryInterface, _Sequelize) {
    const columnsToRemove = [
      'specialization',
      'masteryXp',
      'trainingMethod',
      'intenseTrainingEnd'
    ];

    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('UserCharacters', column);
        console.log(`Removed column from UserCharacters: ${column}`);
      } catch (_err) {
        console.log(`Column ${column} may not exist in UserCharacters, skipping`);
      }
    }
  }
};
