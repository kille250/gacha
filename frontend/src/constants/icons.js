/**
 * Icon Constants
 *
 * Centralized icon definitions for consistent usage across the application.
 * Import from here instead of hardcoding emoji/icon values in components.
 *
 * Migration notes:
 * - These can be gradually replaced with react-icons components
 * - Keep emoji strings for now, swap to <FaIcon /> when refactoring components
 * - All icons should be rendered with aria-hidden="true" when decorative
 */

// ==================== CURRENCY & ECONOMY ====================

/** Points/coins currency icon */
export const ICON_POINTS = '🪙';

/** Standard roll ticket */
export const ICON_TICKET = '🎟️';

/** Premium ticket with guaranteed rare+ */
export const ICON_PREMIUM_TICKET = '🌟';

/** Gift/reward icon */
export const ICON_GIFT = '🎁';

// ==================== STATUS & FEEDBACK ====================

/** Success/completed state */
export const ICON_SUCCESS = '✓';

/** Warning indicator */
export const ICON_WARNING = '⚠';

/** Error/failed state */
export const ICON_ERROR = '✕';

/** Locked/unavailable state */
export const ICON_LOCKED = '🔒';

/** Unlocked/available state */
export const ICON_UNLOCKED = '🔓';

// ==================== GAME FEATURES ====================

/** Dice/random roll */
export const ICON_DICE = '🎲';

/** Star rating/featured */
export const ICON_STAR = '⭐';

/** Sparkle/special effect */
export const ICON_SPARKLE = '✨';

/** Magic/premium sparkle */
export const ICON_MAGIC = '💫';

/** Search/magnifier */
export const ICON_SEARCH = '🔍';

/** View/eye icon */
export const ICON_VIEW = '👁';

/** Slot machine/gacha */
export const ICON_GACHA = '🎰';

// ==================== FISHING FEATURE ====================

/** Fishing rod */
export const ICON_FISHING = '🎣';

/** Fish (common) */
export const ICON_FISH = '🐟';

/** Pity/whale */
export const ICON_PITY = '🐋';

// ==================== DOJO FEATURE ====================

/** Dojo building */
export const ICON_DOJO = '🏯';

/** Progress/stats */
export const ICON_STATS = '📊';

/** Power/strength */
export const ICON_POWER = '⚡';

/** Sword/combat */
export const ICON_COMBAT = '⚔️';

/** Level up arrow */
export const ICON_LEVEL_UP = '↑';

/** Balance/efficiency */
export const ICON_BALANCE = '⚖️';

/** Rocket/boost */
export const ICON_BOOST = '🚀';

// ==================== GACHA POOLS ====================

/** Standard pool indicator */
export const ICON_POOL_STANDARD = '🎲';

/** Banner/featured pool indicator */
export const ICON_POOL_BANNER = '⭐';

/** Premium pool indicator */
export const ICON_POOL_PREMIUM = '💎';

/** Pity system indicator */
export const ICON_POOL_PITY = '🎯';

// ==================== ADMIN & SYSTEM ====================

/** Settings/admin gear */
export const ICON_SETTINGS = '⚙️';

/** Dashboard/admin icon */
export const ICON_DASHBOARD = '📊';

/** System health */
export const ICON_HEALTH = '🖥️';

/** Quick actions */
export const ICON_QUICK_ACTIONS = '⚡';

/** R18/adult content */
export const ICON_R18 = '🔞';

/** Empty state placeholder */
export const ICON_EMPTY = '📭';

/** Characters/masks */
export const ICON_CHARACTERS = '🎭';

/** Coupon/ticket */
export const ICON_COUPON = '🎫';

/** Banner/flag */
export const ICON_BANNER = '🏳️';

/** Timer/loading */
export const ICON_TIMER = '⏳';

// ==================== AUDIT LOG EVENT ICONS ====================

/** Authentication events */
export const ICON_AUTH = '🔐';

/** Admin events */
export const ICON_ADMIN = '👑';

/** Security events */
export const ICON_SECURITY = '🛡️';

/** Economy events */
export const ICON_ECONOMY = '💰';

/** Appeal events */
export const ICON_APPEAL = '⚖️';

/** Generic log entry */
export const ICON_LOG = '📝';

// ==================== MEDIA CATEGORIES ====================

/** Person/character category */
export const ICON_CATEGORY_PERSON = '👤';

/** Series/show category */
export const ICON_CATEGORY_SERIES = '📺';

/** Generic tag/category */
export const ICON_CATEGORY_TAG = '🏷️';

// ==================== HELPER: Category Icons Map ====================

/**
 * Map of category IDs to icons
 * Used in AltMediaPicker and similar components
 */
export const CATEGORY_ICONS = {
  4: ICON_CATEGORY_PERSON,  // Person/character
  3: ICON_CATEGORY_SERIES,  // Series/show
};

/**
 * Get icon for a category ID
 * @param {number} categoryId - The category ID
 * @returns {string} The icon for the category
 */
export const getCategoryIcon = (categoryId) => CATEGORY_ICONS[categoryId] || ICON_CATEGORY_TAG;

// ==================== UI COMPONENTS ====================

/** Language/globe icon */
export const ICON_GLOBE = '🌐';

/** Image/picture icon */
export const ICON_IMAGE = '🖼️';

/** Folder/collection icon */
export const ICON_FOLDER = '📁';

/** Info icon */
export const ICON_INFO = '💡';

/** New/fresh indicator */
export const ICON_NEW = '🆕';

/** Fire/hot streak icon */
export const ICON_FIRE = '🔥';

/** Trophy/achievement icon */
export const ICON_TROPHY = '🏆';

/** Heart/like icon */
export const ICON_HEART = '❤️';

/** Party/celebration icon */
export const ICON_PARTY = '🎉';

/** Wave/hello emote */
export const ICON_WAVE = '👋';

/** Thumbs up/approve icon */
export const ICON_THUMBS_UP = '👍';

/** Muscle/strength emote */
export const ICON_MUSCLE = '💪';

/** Smiley/happy icon */
export const ICON_SMILEY = '😊';

/** Question/help icon */
export const ICON_QUESTION = '❓';

/** Clock/time icon */
export const ICON_CLOCK = '🕐';

/** Calendar/date icon */
export const ICON_CALENDAR = '📅';

/** Checkmark/complete icon */
export const ICON_CHECK = '✅';

/** Crossmark/cancel icon */
export const ICON_CROSS = '❌';

/** Skull/danger icon */
export const ICON_SKULL = '💀';
