// middleware/adminAuth.js
const { User } = require('../models');

/**
 * Admin authentication middleware
 * Re-validates admin status from database to prevent using stale JWT tokens
 * Must be used AFTER the auth middleware
 */
const adminAuth = async (req, res, next) => {
  try {
    // Auth middleware should have already set req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Re-validate admin status from database (not from JWT token)
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'isAdmin']
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Administrator privileges required' });
    }
    
    // Update req.user with current admin status from DB
    req.user.isAdmin = user.isAdmin;
    
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = adminAuth;