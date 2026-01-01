'use strict';

/**
 * Migration: Add element field to Characters table
 *
 * This enables the element-based ability system for Essence Tap.
 * Elements: fire, water, earth, air, light, dark, neutral
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Characters', 'element', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null
    });

    // Add index for querying by element
    await queryInterface.addIndex('Characters', ['element'], {
      name: 'idx_characters_element'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Characters', 'idx_characters_element');
    await queryInterface.removeColumn('Characters', 'element');
  }
};
