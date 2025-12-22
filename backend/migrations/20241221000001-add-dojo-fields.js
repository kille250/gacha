'use strict';

/**
 * Migration: Add Dojo (Idle Game) Fields to Users
 * 
 * Adds fields for the Character Dojo feature where users can
 * assign characters to training slots for passive income.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    // Add dojoSlots - JSON array of character IDs in training
    if (!tableInfo.dojoSlots) {
      await queryInterface.addColumn('Users', 'dojoSlots', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]',
        comment: 'JSON array of character IDs currently training in dojo'
      });
    }
    
    // Add dojoLastClaim - when rewards were last claimed
    if (!tableInfo.dojoLastClaim) {
      await queryInterface.addColumn('Users', 'dojoLastClaim', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last dojo reward claim'
      });
    }
    
    // Add dojoUpgrades - JSON object for upgrade levels
    if (!tableInfo.dojoUpgrades) {
      await queryInterface.addColumn('Users', 'dojoUpgrades', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '{"slots":3,"capHours":8,"intensity":0,"masteries":{}}',
        comment: 'JSON object containing dojo upgrade levels'
      });
    }
    
    console.log('✅ Added dojo fields to Users table');
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('Users', 'dojoSlots');
    await queryInterface.removeColumn('Users', 'dojoLastClaim');
    await queryInterface.removeColumn('Users', 'dojoUpgrades');
    
    console.log('✅ Removed dojo fields from Users table');
  }
};

