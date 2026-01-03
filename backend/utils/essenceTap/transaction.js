/**
 * Transaction Helper for Essence Tap
 * Unified transaction handling to eliminate duplication
 */

const { sequelize } = require('../../models');

/**
 * Execute a function within a database transaction with user locking
 * @param {number} userId - User ID to lock
 * @param {Function} callback - Async function(user, transaction) to execute
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result from callback
 */
async function withUserTransaction(userId, callback, options = {}) {
  const { User } = require('../../models');
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, {
      transaction,
      lock: true,
      ...options.findOptions
    });

    if (!user) {
      await transaction.rollback();
      return { success: false, error: 'User not found', statusCode: 404 };
    }

    const result = await callback(user, transaction);

    // If callback indicates failure, rollback
    if (result && result.success === false) {
      await transaction.rollback();
      return result;
    }

    // Save user if modified (callback should set user properties)
    if (options.saveUser !== false) {
      await user.save({ transaction });
    }

    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error('Transaction error:', error);
    throw error;
  }
}

/**
 * Execute a function within a transaction without user locking
 * For operations that don't need user state
 * @param {Function} callback - Async function(transaction) to execute
 * @returns {Promise<Object>} Result from callback
 */
async function withTransaction(callback) {
  const transaction = await sequelize.transaction();

  try {
    const result = await callback(transaction);

    if (result && result.success === false) {
      await transaction.rollback();
      return result;
    }

    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error('Transaction error:', error);
    throw error;
  }
}

/**
 * Get user's clicker state with defaults
 * @param {Object} user - User model instance
 * @returns {Object} Clicker state
 */
function getClickerState(user) {
  return user.clickerState || {};
}

/**
 * Update user's clicker state
 * @param {Object} user - User model instance
 * @param {Object} newState - New state to merge
 */
function updateClickerState(user, newState) {
  user.clickerState = {
    ...user.clickerState,
    ...newState
  };
}

/**
 * Replace user's clicker state entirely
 * @param {Object} user - User model instance
 * @param {Object} newState - Complete new state
 */
function setClickerState(user, newState) {
  user.clickerState = newState;
}

module.exports = {
  withUserTransaction,
  withTransaction,
  getClickerState,
  updateClickerState,
  setClickerState
};
