'use strict';

/**
 * Migration: Add game enhancement fields to Users table
 *
 * This adds all the new fields required for:
 * - Account level system
 * - Dojo facility tiers
 * - Bait inventory
 * - Gacha pity system
 * - Banner-specific pity
 * - Pull history & milestones
 * - Fate points
 * - Character selectors
 * - Character mastery
 * - Fish codex
 * - Luck meter
 * - Return bonus system
 * - Weekly banner tickets
 * - Items & rod skins
 * - Wandering warrior (special event)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing columns to avoid duplicates
      const tableInfo = await queryInterface.describeTable('Users');

      const columnsToAdd = [
        // Account level for facility tier unlocks
        {
          name: 'accountLevel',
          config: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 1
          }
        },
        // Dojo facility tiers unlocked
        {
          name: 'dojoFacilityTiers',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '["basic"]'
          }
        },
        // Bait inventory
        {
          name: 'baitInventory',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{}'
          }
        },
        // Gacha pity tracking
        {
          name: 'gachaPity',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{"pullsSinceRare":0,"pullsSinceEpic":0,"pullsSinceLegendary":0,"totalPulls":0}'
          }
        },
        // Banner-specific pity
        {
          name: 'bannerPity',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{}'
          }
        },
        // Pull history for milestones
        {
          name: 'pullHistory',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{}'
          }
        },
        // Fate points per banner
        {
          name: 'fatePoints',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{}'
          }
        },
        // Character selectors earned
        {
          name: 'characterSelectors',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '[]'
          }
        },
        // Character mastery progress
        {
          name: 'characterMastery',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{}'
          }
        },
        // Fish codex (collection tracking)
        {
          name: 'fishCodex',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{"discovered":[],"biomeProgress":{},"claimedMilestones":[],"recentDiscoveries":[]}'
          }
        },
        // Luck meter for anti-frustration
        {
          name: 'luckMeter',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '{"fishing":0,"gacha":0,"lastUpdate":null}'
          }
        },
        // Last login for return bonus calculation
        {
          name: 'lastLogin',
          config: {
            type: Sequelize.DATE,
            allowNull: true
          }
        },
        // Return bonus claimed timestamp
        {
          name: 'returnBonusClaimed',
          config: {
            type: Sequelize.DATE,
            allowNull: true
          }
        },
        // Weekly banner tickets (from voyages)
        {
          name: 'weeklyBannerTickets',
          config: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0
          }
        },
        // Items inventory
        {
          name: 'items',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '[]'
          }
        },
        // Rod skins owned
        {
          name: 'rodSkins',
          config: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: '[]'
          }
        },
        // Last wandering warrior encounter
        {
          name: 'lastWanderingWarrior',
          config: {
            type: Sequelize.DATE,
            allowNull: true
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
      const columnsToRemove = [
        'accountLevel',
        'dojoFacilityTiers',
        'baitInventory',
        'gachaPity',
        'bannerPity',
        'pullHistory',
        'fatePoints',
        'characterSelectors',
        'characterMastery',
        'fishCodex',
        'luckMeter',
        'lastLogin',
        'returnBonusClaimed',
        'weeklyBannerTickets',
        'items',
        'rodSkins',
        'lastWanderingWarrior'
      ];

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
