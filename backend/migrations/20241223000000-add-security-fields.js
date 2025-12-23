'use strict';

/**
 * Migration: Add Security & Abuse Prevention Fields
 * 
 * Adds fields for:
 * - User restrictions (bans, shadowbans, rate limits)
 * - Risk scoring
 * - Warning tracking
 * - Device fingerprinting
 * - Audit trail support
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    // Restriction fields
    if (!tableInfo.restrictionType) {
      await queryInterface.addColumn('Users', 'restrictionType', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'none'
      });
    }
    
    if (!tableInfo.restrictedUntil) {
      await queryInterface.addColumn('Users', 'restrictedUntil', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    
    if (!tableInfo.restrictionReason) {
      await queryInterface.addColumn('Users', 'restrictionReason', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    // Risk scoring
    if (!tableInfo.riskScore) {
      await queryInterface.addColumn('Users', 'riskScore', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
    
    // Warning system
    if (!tableInfo.warningCount) {
      await queryInterface.addColumn('Users', 'warningCount', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
    
    // Device fingerprinting
    if (!tableInfo.deviceFingerprints) {
      await queryInterface.addColumn('Users', 'deviceFingerprints', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
    }
    
    // Linked accounts tracking
    if (!tableInfo.linkedAccounts) {
      await queryInterface.addColumn('Users', 'linkedAccounts', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
    }
    
    // Last known IP (hashed for privacy)
    if (!tableInfo.lastKnownIP) {
      await queryInterface.addColumn('Users', 'lastKnownIP', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    // Last restriction change for audit
    if (!tableInfo.lastRestrictionChange) {
      await queryInterface.addColumn('Users', 'lastRestrictionChange', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    
    console.log('[Migration] Security fields added to Users table');
  },

  async down(queryInterface) {
    const fieldsToRemove = [
      'restrictionType',
      'restrictedUntil',
      'restrictionReason',
      'riskScore',
      'warningCount',
      'deviceFingerprints',
      'linkedAccounts',
      'lastKnownIP',
      'lastRestrictionChange'
    ];
    
    for (const field of fieldsToRemove) {
      try {
        await queryInterface.removeColumn('Users', field);
      } catch (_err) {
        console.log(`[Migration] Column ${field} may not exist, skipping...`);
      }
    }
  }
};

