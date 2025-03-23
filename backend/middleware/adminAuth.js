// middleware/adminAuth.js
const adminAuth = (req, res, next) => {
	// Der Auth-Middleware wurde bereits ausgeführt und req.user gesetzt
	if (!req.user.isAdmin) {
	  return res.status(403).json({ error: 'Administrator privileges required' });
	}
	
	next();
  };
  
  module.exports = adminAuth;