/**
 * User Preferences Utility Functions
 * 
 * Centralized helpers for accessing user preference settings
 */

const sequelize = require('../config/db');

/**
 * Get user's R18 preference via raw SQL
 * User can see R18 content only if admin has allowed AND user has enabled it
 * @param {number} userId - The user's ID
 * @returns {Promise<boolean>} - True if user can view R18 content
 */
async function getUserAllowR18(userId) {
  const [rows] = await sequelize.query(
    `SELECT "allowR18", "showR18" FROM "Users" WHERE "id" = :userId`,
    { replacements: { userId } }
  );
  return rows[0]?.allowR18 === true && rows[0]?.showR18 === true;
}

module.exports = {
  getUserAllowR18
};