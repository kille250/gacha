/**
 * Navigation Constants
 *
 * Single source of truth for navigation items.
 * Used by Navigation, MobileMenu, and BottomNav components.
 */

import { MdCasino, MdCollections, MdLocalActivity, MdAdminPanelSettings, MdSettings } from 'react-icons/md';
import { GiFishingPole, GiDoubleDragon } from 'react-icons/gi';
import { FaDice } from 'react-icons/fa';

/**
 * Navigation item definition
 * @typedef {Object} NavItem
 * @property {string} path - Route path
 * @property {string} labelKey - i18n translation key
 * @property {React.ComponentType} icon - Icon component
 * @property {boolean} [adminOnly] - Only show for admin users
 * @property {boolean} [bottomNav] - Include in bottom navigation
 */

/**
 * Main navigation items grouped by category
 */
export const NAV_GROUPS = [
  {
    id: 'play',
    labelKey: 'nav.play',
    items: [
      { path: '/gacha', labelKey: 'nav.banners', icon: MdCasino, bottomNav: true },
      { path: '/roll', labelKey: 'nav.roll', icon: FaDice, bottomNav: true },
    ],
  },
  {
    id: 'activities',
    labelKey: 'nav.activities',
    items: [
      { path: '/fishing', labelKey: 'nav.fishing', icon: GiFishingPole, bottomNav: true },
      { path: '/dojo', labelKey: 'nav.dojo', icon: GiDoubleDragon, bottomNav: true },
    ],
  },
  {
    id: 'profile',
    labelKey: 'nav.profile',
    items: [
      { path: '/collection', labelKey: 'nav.collection', icon: MdCollections, bottomNav: true },
      { path: '/coupons', labelKey: 'nav.coupons', icon: MdLocalActivity, bottomNav: false },
    ],
  },
];

/**
 * Admin navigation item (shown separately)
 */
export const ADMIN_NAV_ITEM = {
  path: '/admin',
  labelKey: 'nav.admin',
  icon: MdAdminPanelSettings,
  adminOnly: true,
  bottomNav: false,
};

/**
 * Settings navigation item
 */
export const SETTINGS_NAV_ITEM = {
  path: '/settings',
  labelKey: 'nav.settings',
  icon: MdSettings,
  bottomNav: false,
};

/**
 * Get all navigation items as a flat array
 * @param {Object} options
 * @param {boolean} [options.includeAdmin=false] - Include admin item
 * @param {boolean} [options.includeSettings=false] - Include settings item
 * @returns {NavItem[]}
 */
export function getAllNavItems(options = {}) {
  const { includeAdmin = false, includeSettings = false } = options;

  const items = NAV_GROUPS.flatMap(group => group.items);

  if (includeSettings) {
    items.push(SETTINGS_NAV_ITEM);
  }

  if (includeAdmin) {
    items.push(ADMIN_NAV_ITEM);
  }

  return items;
}

/**
 * Get navigation items for bottom nav (mobile)
 * @returns {NavItem[]}
 */
export function getBottomNavItems() {
  return NAV_GROUPS.flatMap(group => group.items).filter(item => item.bottomNav);
}

/**
 * Check if a path is the currently active route
 * @param {string} path - Route path to check
 * @param {string} currentPath - Current location pathname
 * @returns {boolean}
 */
export function isActiveRoute(path, currentPath) {
  if (path === '/') {
    return currentPath === '/';
  }
  return currentPath === path || currentPath.startsWith(`${path}/`);
}

export default NAV_GROUPS;
