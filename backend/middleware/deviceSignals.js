/**
 * Device Signal Collection Middleware
 * 
 * Collects device fingerprint and other signals from requests.
 * Privacy-respecting: only hashes IPs, stores minimal data.
 */
const crypto = require('crypto');

/**
 * Hash an IP address for privacy
 * Uses SHA-256 with a salt to prevent rainbow table attacks
 */
function hashIP(ip) {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || 'gacha-security-salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
}

/**
 * Extract the real client IP from various headers
 */
function getClientIP(req) {
  // Render.com and other proxies
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  // Cloudflare
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }
  
  // Direct connection
  return req.ip || req.connection?.remoteAddress;
}

/**
 * Collect device signals middleware
 * Attaches signals to req.deviceSignals
 */
const collectDeviceSignals = (req, res, next) => {
  const clientIP = getClientIP(req);
  
  req.deviceSignals = {
    // From client headers
    fingerprint: req.headers['x-device-fingerprint'] || null,
    deviceId: req.headers['x-device-id'] || null,
    
    // Server-side signals
    ipHash: hashIP(clientIP),
    rawIP: clientIP, // Only for internal use, never store raw
    
    // Request metadata
    userAgent: req.headers['user-agent'] || null,
    acceptLanguage: req.headers['accept-language'] || null,
    
    // Timestamp
    timestamp: Date.now()
  };
  
  next();
};

/**
 * Update user's device fingerprints if new one detected
 * Call this after authentication when user is known
 */
async function recordDeviceFingerprint(user, fingerprint) {
  if (!fingerprint || !user) return false;
  
  try {
    const fingerprints = user.deviceFingerprints || [];
    
    // Already recorded
    if (fingerprints.includes(fingerprint)) {
      return false;
    }
    
    // Add new fingerprint (keep last 10)
    fingerprints.push(fingerprint);
    if (fingerprints.length > 10) {
      fingerprints.shift();
    }
    
    user.deviceFingerprints = fingerprints;
    await user.save();
    
    return true; // New fingerprint recorded
  } catch (err) {
    console.error('[DeviceSignals] Failed to record fingerprint:', err.message);
    return false;
  }
}

/**
 * Update user's last known IP
 */
async function recordIPHash(user, ipHash) {
  if (!ipHash || !user) return;
  
  try {
    if (user.lastKnownIP !== ipHash) {
      user.lastKnownIP = ipHash;
      await user.save();
    }
  } catch (err) {
    console.error('[DeviceSignals] Failed to record IP:', err.message);
  }
}

/**
 * Check if fingerprint is used by other accounts
 * @returns {Array} - Array of user IDs with same fingerprint
 */
async function findFingerprintCollisions(fingerprint, excludeUserId) {
  if (!fingerprint) return [];
  
  const { User } = require('../models');
  const { Op } = require('sequelize');
  
  try {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: excludeUserId },
        deviceFingerprints: { [Op.like]: `%${fingerprint}%` }
      },
      attributes: ['id', 'username', 'restrictionType']
    });
    
    return users.map(u => ({
      id: u.id,
      username: u.username,
      isBanned: ['perm_ban', 'temp_ban'].includes(u.restrictionType)
    }));
  } catch (err) {
    console.error('[DeviceSignals] Collision check failed:', err.message);
    return [];
  }
}

module.exports = {
  collectDeviceSignals,
  recordDeviceFingerprint,
  recordIPHash,
  findFingerprintCollisions,
  hashIP,
  getClientIP
};

