/**
 * Admin Components Barrel Export
 *
 * @example
 * import { AdminUsers, AdminSecurity, AdminCharacters } from '../Admin';
 */

// ==================== CORE COMPONENTS ====================

export { default as AdminTabs } from './AdminTabs';
export { default as AdminHeader } from './AdminHeader';
export { default as AdminErrorBoundary } from './AdminErrorBoundary';

// ==================== UI COMPONENTS ====================

export { default as ActionPreview } from './ActionPreview';
export { default as AdminMobileControls } from './AdminMobileControls';
export { default as KeyboardShortcutsModal } from './KeyboardShortcutsModal';

// ==================== FEATURE COMPONENTS ====================

export { default as AdminDashboard } from './AdminDashboard';
export { default as AdminUsers } from './AdminUsers';
export { default as AdminCharacters } from './AdminCharacters';
export { default as AdminBanners } from './AdminBanners';
export { default as AdminCoupons } from './AdminCoupons';
export { default as AdminAnnouncements } from './AdminAnnouncements';
export { default as AdminRarities } from './Rarities';
export { default as CreateFromDanbooru } from './CreateFromDanbooru';

// ==================== SECURITY COMPONENTS ====================

export { default as AdminSecurity } from './AdminSecurity';
export { default as SecurityAlerts } from './SecurityAlerts';
export { default as SecurityOverview } from './SecurityOverview';
export { default as SecurityConfigPanel } from './SecurityConfigPanel';
export { default as SecurityConfigEditor } from './SecurityConfigEditor';
export { default as AuditLogViewer } from './AuditLogViewer';
export { default as AutoEnforcementViewer } from './AutoEnforcementViewer';
export { default as HighRiskUsersList } from './HighRiskUsersList';
export { default as RestrictedUsersList } from './RestrictedUsersList';
export { default as RiskDecayPanel } from './RiskDecayPanel';
export { default as DeviceHistoryPanel } from './DeviceHistoryPanel';
export { default as SessionActivityPanel } from './SessionActivityPanel';
export { default as RiskScoreHistoryPanel } from './RiskScoreHistoryPanel';

// ==================== MODAL COMPONENTS ====================

export { default as AltMediaPicker } from './AltMediaPicker';
export { default as EditCharacterModal } from './EditCharacterModal';
export { default as UserSecurityModal } from './UserSecurityModal';
export { default as LinkedAccountsModal } from './LinkedAccountsModal';
export { default as BulkActionsModal } from './BulkActionsModal';
export { default as AppealReviewModal } from './AppealReviewModal';
export { default as AppealsList } from './AppealsList';
export { default as AnnouncementFormModal } from './AnnouncementFormModal';

// Shared styles
export * from './Admin.styles';
