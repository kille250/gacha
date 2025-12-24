/**
 * Admin Components Barrel Export
 *
 * Provides both flat exports (backward compatible) and domain-organized exports.
 *
 * @example
 * // Domain-specific imports (preferred for new code)
 * import { AdminUsers, UserSecurityModal } from '../Admin/users';
 * import { AdminSecurity, SecurityAlerts } from '../Admin/security';
 * import { AdminCharacters, AdminBanners } from '../Admin/content';
 *
 * @example
 * // Flat imports (backward compatible)
 * import { AdminUsers, AdminSecurity, AdminCharacters } from '../Admin';
 */

// ==================== CORE COMPONENTS ====================

export { default as AdminTabs } from './AdminTabs';

// ==================== FLAT EXPORTS (BACKWARD COMPATIBLE) ====================

export { default as AdminDashboard } from './AdminDashboard';
export { default as AdminUsers } from './AdminUsers';
export { default as AdminCharacters } from './AdminCharacters';
export { default as AdminBanners } from './AdminBanners';
export { default as AdminCoupons } from './AdminCoupons';
export { default as AdminRarities } from './AdminRarities';
export { default as AdminSecurity } from './AdminSecurity';
export { default as SecurityAlerts } from './SecurityAlerts';
export { default as SecurityOverview } from './SecurityOverview';
export { default as AltMediaPicker } from './AltMediaPicker';
export { default as EditCharacterModal } from './EditCharacterModal';
export { default as UserSecurityModal } from './UserSecurityModal';

// Shared styles
export * from './AdminStyles';
