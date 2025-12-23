/**
 * Shared Security Constants
 * 
 * Centralized definitions for security-related UI constants.
 * Use these instead of defining colors/types in individual components.
 */

/**
 * Restriction type configurations with colors and translation keys
 */
export const RESTRICTION_TYPES = [
  { value: 'none', labelKey: 'admin.security.restrictionTypes.none', color: '#34c759' },
  { value: 'warning', labelKey: 'admin.security.restrictionTypes.warning', color: '#ffcc00' },
  { value: 'rate_limited', labelKey: 'admin.security.restrictionTypes.rateLimited', color: '#af52de' },
  { value: 'shadowban', labelKey: 'admin.security.restrictionTypes.shadowban', color: '#8e8e93' },
  { value: 'temp_ban', labelKey: 'admin.security.restrictionTypes.tempBan', color: '#ff9500' },
  { value: 'perm_ban', labelKey: 'admin.security.restrictionTypes.permBan', color: '#ff3b30' },
];

/**
 * Restriction colors by type value (for quick lookup)
 */
export const RESTRICTION_COLORS = {
  none: '#34c759',
  warning: '#ffcc00',
  rate_limited: '#af52de',
  shadowban: '#8e8e93',
  temp_ban: '#ff9500',
  perm_ban: '#ff3b30',
};

/**
 * Duration options for temporary restrictions
 */
export const DURATION_OPTIONS = [
  { value: '1h', labelKey: 'admin.security.durations.1h' },
  { value: '6h', labelKey: 'admin.security.durations.6h' },
  { value: '24h', labelKey: 'admin.security.durations.24h' },
  { value: '7d', labelKey: 'admin.security.durations.7d' },
  { value: '30d', labelKey: 'admin.security.durations.30d' },
];

/**
 * Severity levels with colors
 */
export const SEVERITY_COLORS = {
  info: '#0a84ff',
  warning: '#ff9500',
  critical: '#ff3b30',
};

/**
 * Risk score thresholds and colors
 */
export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 50,
  HIGH: 70,
  CRITICAL: 85,
};

/**
 * Get color based on risk score
 * @param {number} score - Risk score (0-100)
 * @returns {string} - Hex color code
 */
export const getRiskColor = (score) => {
  if (score >= RISK_THRESHOLDS.HIGH) return '#ff3b30';
  if (score >= RISK_THRESHOLDS.MEDIUM) return '#ff9500';
  if (score >= RISK_THRESHOLDS.LOW) return '#ffcc00';
  return '#34c759';
};

/**
 * Get restriction color by type
 * @param {string} type - Restriction type value
 * @returns {string} - Hex color code
 */
export const getRestrictionColor = (type) => {
  return RESTRICTION_COLORS[type] || '#8e8e93';
};

/**
 * Auto-enforcement action icons and colors
 */
export const ACTION_STYLES = {
  perm_ban: { color: '#ff3b30' },
  temp_ban: { color: '#ff9500' },
  shadowban: { color: '#8e8e93' },
  rate_limited: { color: '#af52de' },
  warning: { color: '#ffcc00' },
};

/**
 * Audit event category configurations
 */
export const AUDIT_CATEGORIES = {
  auth: ['auth.login.success', 'auth.login.failed', 'auth.signup', 'auth.google.login', 'auth.password.change'],
  admin: ['admin.restrict', 'admin.unrestrict', 'admin.warning', 'admin.points_adjust'],
  security: ['security.device.new', 'security.risk.change', 'security.auto_restriction', 'security.ban_evasion'],
  economy: ['economy.trade', 'economy.coupon.redeemed', 'economy.anomaly'],
  appeal: ['appeal.submitted', 'appeal.approved', 'appeal.denied'],
};

