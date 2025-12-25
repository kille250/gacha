/**
 * Navigation Components Index
 *
 * Exports all navigation-related components and hooks.
 *
 * Mobile navigation uses unified bottom tab bar pattern:
 * - BottomNav: 5 primary tabs including Profile
 * - No hamburger menu needed
 */

// Main Navigation component
export { default as Navigation } from './Navigation';

// Sub-components
export { default as HourlyReward } from './HourlyReward';
export { default as ProfileDropdown } from './ProfileDropdown';
export { default as LanguageSelector } from './LanguageSelector';
export { default as RewardPopup } from './RewardPopup';
export { default as BottomNav } from './BottomNav';
