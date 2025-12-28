const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Include iat (issued at) for session invalidation checks
    req.user = { ...decoded.user, iat: decoded.iat };
    next();
  } catch (_err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;