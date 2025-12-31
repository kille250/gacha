/**
 * Device Fingerprint Utility
 * 
 * Collects device signals for abuse prevention.
 * Privacy-respecting: no invasive tracking, only basic device characteristics.
 */

const DEVICE_ID_KEY = '_gacha_did';
const FINGERPRINT_CACHE_KEY = '_gacha_fp';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Get or create a persistent device ID
 * This regenerates if localStorage is cleared
 */
function getOrCreateDeviceId() {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate a random UUID-like string
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (_e) {
    // localStorage not available
    return generateUUID();
  }
}

/**
 * Generate a UUID v4
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/**
 * Collect device signals
 * These are non-invasive characteristics used for abuse detection
 */
function collectDeviceSignals() {
  const signals = {
    // Screen characteristics
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    colorDepth: window.screen?.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    
    // Browser/platform info
    language: navigator.language || 'unknown',
    languages: navigator.languages?.join(',') || navigator.language || 'unknown',
    platform: navigator.platform || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Touch support
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    
    // Storage availability
    hasLocalStorage: isStorageAvailable('localStorage'),
    hasSessionStorage: isStorageAvailable('sessionStorage'),
    
    // Timestamp for freshness
    collectedAt: Date.now()
  };
  
  return signals;
}

/**
 * Check if a storage type is available
 */
function isStorageAvailable(type) {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Create a simple hash of the device signals
 * This is not cryptographically secure, just a fingerprint
 */
function hashSignals(signals) {
  const str = JSON.stringify(signals);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string and pad
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Get the device fingerprint
 * Uses caching to avoid recalculating on every request
 */
export function getDeviceFingerprint() {
  try {
    // Check cache
    const cached = sessionStorage.getItem(FINGERPRINT_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.fingerprint;
      }
    }
    
    // Generate new fingerprint
    const signals = collectDeviceSignals();
    const fingerprint = hashSignals(signals);
    
    // Cache it
    sessionStorage.setItem(FINGERPRINT_CACHE_KEY, JSON.stringify({
      fingerprint,
      timestamp: Date.now()
    }));
    
    return fingerprint;
  } catch (_e) {
    // Fallback if anything fails
    return 'unknown';
  }
}

/**
 * Get the persistent device ID
 */
export function getDeviceId() {
  return getOrCreateDeviceId();
}

/**
 * Get headers to include in API requests for device tracking
 */
export function getDeviceHeaders() {
  return {
    'X-Device-Fingerprint': getDeviceFingerprint(),
    'X-Device-Id': getDeviceId()
  };
}

/**
 * Clear device fingerprint (for testing/debugging)
 */
export function clearDeviceData() {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
    sessionStorage.removeItem(FINGERPRINT_CACHE_KEY);
  } catch (_e) {
    // Ignore
  }
}

const deviceFingerprintUtils = {
  getDeviceFingerprint,
  getDeviceId,
  getDeviceHeaders,
  clearDeviceData
};

export default deviceFingerprintUtils;

