/**
 * Navigation Constants
 *
 * Single source of truth for navigation items.
 * Used by Navigation and BottomNav components.
 *
 * Mobile navigation uses a 4-tab bottom bar with sheet menus:
 * - Gacha (primary)
 * - Games (hub for mini-games)
 * - Collection
 * - More (profile, settings, coupons)
 *
 * Desktop uses horizontal nav with dropdown for Games.
 */

import { MdCasino, MdCollections, MdLocalActivity, MdAdminPanelSettings, MdSettings, MdPerson, MdMoreHoriz } from 'react-icons/md';
import { GiFishingPole, GiDoubleDragon, GiCartwheel } from 'react-icons/gi';
import { FaDice, FaGamepad, FaBullhorn } from 'react-icons/fa';

/**
 * Navigation item definition
 * @typedef {Object} NavItem
 * @property {string} path - Route path
 * @property {string} labelKey - i18n translation key
 * @property {React.ComponentType} icon - Icon component
 * @property {boolean} [adminOnly] - Only show for admin users
 * @property {boolean} [isNew] - Show "New" badge for discoverability
 */

/**
 * Games hub items - shown in Games dropdown/sheet
 */
export const GAMES_ITEMS = [
  { path: '/fishing', labelKey: 'nav.fishing', icon: GiFishingPole },
  { path: '/dojo', labelKey: 'nav.dojo', icon: GiDoubleDragon },
  { path: '/fortune-wheel', labelKey: 'nav.fortuneWheel', icon: GiCartwheel, isNew: true },
];

/**
 * More menu items - shown in More sheet (mobile) or profile dropdown (desktop)
 */
export const MORE_ITEMS = [
  { path: '/profile', labelKey: 'nav.profile', icon: MdPerson },
  { path: '/announcements', labelKey: 'nav.announcements', icon: FaBullhorn },
  { path: '/coupons', labelKey: 'nav.coupons', icon: MdLocalActivity },
  { path: '/settings', labelKey: 'nav.settings', icon: MdSettings },
];

/**
 * Admin navigation item (shown separately, conditional)
 */
export const ADMIN_NAV_ITEM = {
  path: '/admin',
  labelKey: 'nav.admin',
  icon: MdAdminPanelSettings,
  adminOnly: true,
};

/**
 * Primary navigation items for desktop top nav
 * (Games has a dropdown, others are direct links)
 */
export const DESKTOP_NAV_ITEMS = [
  { path: '/gacha', labelKey: 'nav.banners', icon: MdCasino },
  { path: '/roll', labelKey: 'nav.roll', icon: FaDice },
  {
    id: 'games',
    labelKey: 'nav.games',
    icon: FaGamepad,
    isDropdown: true,
    items: GAMES_ITEMS,
  },
  { path: '/collection', labelKey: 'nav.collection', icon: MdCollections },
];

/**
 * Bottom navigation items (mobile)
 * 4 tabs: Gacha, Games (sheet), Collection, More (sheet)
 */
export const BOTTOM_NAV_ITEMS = [
  {
    id: 'gacha',
    path: '/gacha',
    labelKey: 'nav.banners',
    icon: MdCasino,
    type: 'link',
  },
  {
    id: 'games',
    labelKey: 'nav.games',
    icon: FaGamepad,
    type: 'sheet',
    items: GAMES_ITEMS,
    // Paths that should highlight this tab
    activePaths: ['/fishing', '/dojo', '/fortune-wheel'],
  },
  {
    id: 'collection',
    path: '/collection',
    labelKey: 'nav.collection',
    icon: MdCollections,
    type: 'link',
  },
  {
    id: 'more',
    labelKey: 'nav.more',
    icon: MdMoreHoriz,
    type: 'sheet',
    items: MORE_ITEMS,
    // Paths that should highlight this tab
    activePaths: ['/profile', '/settings', '/coupons', '/announcements', '/admin'],
  },
];

/**
 * Legacy NAV_GROUPS for backward compatibility during migration
 * @deprecated Use DESKTOP_NAV_ITEMS instead
 */
export const NAV_GROUPS = [
  {
    id: 'play',
    labelKey: 'nav.play',
    items: [
      { path: '/gacha', labelKey: 'nav.banners', icon: MdCasino, bottomNav: true },
      { path: '/roll', labelKey: 'nav.roll', icon: FaDice, bottomNav: false },
    ],
  },
  {
    id: 'activities',
    labelKey: 'nav.activities',
    items: [
      { path: '/fishing', labelKey: 'nav.fishing', icon: GiFishingPole, bottomNav: true },
      { path: '/dojo', labelKey: 'nav.dojo', icon: GiDoubleDragon, bottomNav: true },
      { path: '/fortune-wheel', labelKey: 'nav.fortuneWheel', icon: GiCartwheel, bottomNav: false },
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
 * Profile navigation item for bottom nav
 * @deprecated Use BOTTOM_NAV_ITEMS with 'more' sheet instead
 */
export const PROFILE_NAV_ITEM = {
  path: '/profile',
  labelKey: 'nav.profile',
  icon: MdPerson,
  bottomNav: true,
};

/**
 * Settings navigation item
 */
export const SETTINGS_NAV_ITEM = {
  path: '/settings',
  labelKey: 'nav.settings',
  icon: MdSettings,
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

  const items = [
    { path: '/gacha', labelKey: 'nav.banners', icon: MdCasino },
    { path: '/roll', labelKey: 'nav.roll', icon: FaDice },
    ...GAMES_ITEMS,
    { path: '/collection', labelKey: 'nav.collection', icon: MdCollections },
    { path: '/profile', labelKey: 'nav.profile', icon: MdPerson },
    { path: '/coupons', labelKey: 'nav.coupons', icon: MdLocalActivity },
  ];

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
 * Returns the 4-tab configuration with sheet metadata
 * @returns {NavItem[]}
 * @deprecated Use BOTTOM_NAV_ITEMS directly
 */
export function getBottomNavItems() {
  return BOTTOM_NAV_ITEMS;
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

/**
 * Check if any path in an array matches the current route
 * @param {string[]} paths - Array of route paths to check
 * @param {string} currentPath - Current location pathname
 * @returns {boolean}
 */
export function isAnyRouteActive(paths, currentPath) {
  return paths.some(path => isActiveRoute(path, currentPath));
}

export default NAV_GROUPS;
