/**
 * Icon Constants - React Icons
 *
 * Centralized icon definitions using react-icons for consistent cross-platform rendering.
 * All icons render as SVG, ensuring identical appearance on Windows, macOS, Linux, iOS, and Android.
 *
 * Usage:
 *   import { IconPoints, IconTicket } from '../constants/icons';
 *   <IconPoints /> or <IconPoints size={24} color="#gold" />
 *
 * All icons accept standard react-icons props: size, color, style, className, etc.
 */

import React from 'react';
import {
  FaCoins,
  FaTicketAlt,
  FaStar,
  FaGift,
  FaCheck,
  FaExclamationTriangle,
  FaTimes,
  FaLock,
  FaLockOpen,
  FaDice,
  FaSearch,
  FaEye,
  FaFish,
  FaChartBar,
  FaBolt,
  FaArrowUp,
  FaBalanceScale,
  FaRocket,
  FaGem,
  FaBullseye,
  FaCog,
  FaDesktop,
  FaBan,
  FaInbox,
  FaTheaterMasks,
  FaTag,
  FaFlag,
  FaHourglass,
  FaKey,
  FaCrown,
  FaShieldAlt,
  FaMoneyBillWave,
  FaGavel,
  FaClipboardList,
  FaUser,
  FaTv,
  FaGlobe,
  FaImage,
  FaFolder,
  FaLightbulb,
  FaPlusCircle,
  FaFire,
  FaTrophy,
  FaHeart,
  FaBirthdayCake,
  FaHandPaper,
  FaThumbsUp,
  FaDumbbell,
  FaSmile,
  FaQuestionCircle,
  FaClock,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaSkull,
  FaMagic,
} from 'react-icons/fa';
import { GiCastle, GiCrossedSwords, GiFishingPole, GiSpermWhale, GiRollingDiceCup } from 'react-icons/gi';

// ==================== CURRENCY & ECONOMY ====================

/** Points/coins currency icon */
export const IconPoints = (props) => <FaCoins {...props} />;

/** Standard roll ticket */
export const IconTicket = (props) => <FaTicketAlt {...props} />;

/** Premium ticket with guaranteed rare+ */
export const IconPremiumTicket = (props) => <FaStar style={{ color: '#ffd700' }} {...props} />;

/** Gift/reward icon */
export const IconGift = (props) => <FaGift {...props} />;

// ==================== STATUS & FEEDBACK ====================

/** Success/completed state */
export const IconSuccess = (props) => <FaCheck {...props} />;

/** Warning indicator */
export const IconWarning = (props) => <FaExclamationTriangle {...props} />;

/** Error/failed state */
export const IconError = (props) => <FaTimes {...props} />;

/** Locked/unavailable state */
export const IconLocked = (props) => <FaLock {...props} />;

/** Unlocked/available state */
export const IconUnlocked = (props) => <FaLockOpen {...props} />;

// ==================== GAME FEATURES ====================

/** Dice/random roll */
export const IconDice = (props) => <FaDice {...props} />;

/** Star rating/featured */
export const IconStar = (props) => <FaStar {...props} />;

/** Sparkle/special effect */
export const IconSparkle = (props) => <FaMagic {...props} />;

/** Magic/premium sparkle */
export const IconMagic = (props) => <FaMagic {...props} />;

/** Search/magnifier */
export const IconSearch = (props) => <FaSearch {...props} />;

/** View/eye icon */
export const IconView = (props) => <FaEye {...props} />;

/** Slot machine/gacha */
export const IconGacha = (props) => <GiRollingDiceCup {...props} />;

// ==================== FISHING FEATURE ====================

/** Fishing rod */
export const IconFishing = (props) => <GiFishingPole {...props} />;

/** Fish (common) */
export const IconFish = (props) => <FaFish {...props} />;

/** Pity/whale */
export const IconPity = (props) => <GiSpermWhale {...props} />;

// ==================== DOJO FEATURE ====================

/** Dojo building */
export const IconDojo = (props) => <GiCastle {...props} />;

/** Progress/stats */
export const IconStats = (props) => <FaChartBar {...props} />;

/** Power/strength */
export const IconPower = (props) => <FaBolt {...props} />;

/** Sword/combat */
export const IconCombat = (props) => <GiCrossedSwords {...props} />;

/** Level up arrow */
export const IconLevelUp = (props) => <FaArrowUp {...props} />;

/** Balance/efficiency */
export const IconBalance = (props) => <FaBalanceScale {...props} />;

/** Rocket/boost */
export const IconBoost = (props) => <FaRocket {...props} />;

// ==================== GACHA POOLS ====================

/** Standard pool indicator */
export const IconPoolStandard = (props) => <FaDice {...props} />;

/** Banner/featured pool indicator */
export const IconPoolBanner = (props) => <FaStar {...props} />;

/** Premium pool indicator */
export const IconPoolPremium = (props) => <FaGem {...props} />;

/** Pity system indicator */
export const IconPoolPity = (props) => <FaBullseye {...props} />;

// ==================== ADMIN & SYSTEM ====================

/** Settings/admin gear */
export const IconSettings = (props) => <FaCog {...props} />;

/** Dashboard/admin icon */
export const IconDashboard = (props) => <FaChartBar {...props} />;

/** System health */
export const IconHealth = (props) => <FaDesktop {...props} />;

/** Quick actions */
export const IconQuickActions = (props) => <FaBolt {...props} />;

/** R18/adult content */
export const IconR18 = (props) => <FaBan style={{ color: '#ff3b30' }} {...props} />;

/** Empty state placeholder */
export const IconEmpty = (props) => <FaInbox {...props} />;

/** Characters/masks */
export const IconCharacters = (props) => <FaTheaterMasks {...props} />;

/** Coupon/ticket */
export const IconCoupon = (props) => <FaTicketAlt {...props} />;

/** Banner/flag */
export const IconBanner = (props) => <FaFlag {...props} />;

/** Timer/loading */
export const IconTimer = (props) => <FaHourglass {...props} />;

// ==================== AUDIT LOG EVENT ICONS ====================

/** Authentication events */
export const IconAuth = (props) => <FaKey {...props} />;

/** Admin events */
export const IconAdmin = (props) => <FaCrown {...props} />;

/** Security events */
export const IconSecurity = (props) => <FaShieldAlt {...props} />;

/** Economy events */
export const IconEconomy = (props) => <FaMoneyBillWave {...props} />;

/** Appeal events */
export const IconAppeal = (props) => <FaGavel {...props} />;

/** Generic log entry */
export const IconLog = (props) => <FaClipboardList {...props} />;

// ==================== MEDIA CATEGORIES ====================

/** Person/character category */
export const IconCategoryPerson = (props) => <FaUser {...props} />;

/** Series/show category */
export const IconCategorySeries = (props) => <FaTv {...props} />;

/** Generic tag/category */
export const IconCategoryTag = (props) => <FaTag {...props} />;

// ==================== UI COMPONENTS ====================

/** Language/globe icon */
export const IconGlobe = (props) => <FaGlobe {...props} />;

/** Image/picture icon */
export const IconImage = (props) => <FaImage {...props} />;

/** Folder/collection icon */
export const IconFolder = (props) => <FaFolder {...props} />;

/** Info icon */
export const IconInfo = (props) => <FaLightbulb {...props} />;

/** New/fresh indicator */
export const IconNew = (props) => <FaPlusCircle {...props} />;

/** Fire/hot streak icon */
export const IconFire = (props) => <FaFire {...props} />;

/** Trophy/achievement icon */
export const IconTrophy = (props) => <FaTrophy {...props} />;

/** Heart/like icon */
export const IconHeart = (props) => <FaHeart {...props} />;

/** Party/celebration icon */
export const IconParty = (props) => <FaBirthdayCake {...props} />;

/** Wave/hello emote */
export const IconWave = (props) => <FaHandPaper {...props} />;

/** Thumbs up/approve icon */
export const IconThumbsUp = (props) => <FaThumbsUp {...props} />;

/** Muscle/strength emote */
export const IconMuscle = (props) => <FaDumbbell {...props} />;

/** Smiley/happy icon */
export const IconSmiley = (props) => <FaSmile {...props} />;

/** Question/help icon */
export const IconQuestion = (props) => <FaQuestionCircle {...props} />;

/** Clock/time icon */
export const IconClock = (props) => <FaClock {...props} />;

/** Calendar/date icon */
export const IconCalendar = (props) => <FaCalendarAlt {...props} />;

/** Checkmark/complete icon */
export const IconCheck = (props) => <FaCheckCircle {...props} />;

/** Crossmark/cancel icon */
export const IconCross = (props) => <FaTimesCircle {...props} />;

/** Skull/danger icon */
export const IconSkull = (props) => <FaSkull {...props} />;

// ==================== HELPER: Category Icons Map ====================

/**
 * Get icon component for a category ID
 * @param {number} categoryId - The category ID
 * @returns {React.Component} The icon component for the category
 */
export const getCategoryIcon = (categoryId) => {
  switch (categoryId) {
    case 4: return IconCategoryPerson;
    case 3: return IconCategorySeries;
    default: return IconCategoryTag;
  }
};

// ==================== LEGACY STRING EXPORTS (for gradual migration) ====================
// These are kept temporarily for components that haven't been updated yet.
// TODO: Remove these once all components use the Icon components above.

/** @deprecated Use IconPoints component instead */
export const ICON_POINTS = null; // Removed - use <IconPoints />

/** @deprecated Use IconTicket component instead */
export const ICON_TICKET = null;

/** @deprecated Use IconPremiumTicket component instead */
export const ICON_PREMIUM_TICKET = null;

/** @deprecated Use IconSuccess component instead */
export const ICON_SUCCESS = null;

/** @deprecated Use IconWarning component instead */
export const ICON_WARNING = null;

/** @deprecated Use IconError component instead */
export const ICON_ERROR = null;

/** @deprecated Use IconEmpty component instead */
export const ICON_EMPTY = null;

/** @deprecated Use IconR18 component instead */
export const ICON_R18 = null;

/** @deprecated Use IconSearch component instead */
export const ICON_SEARCH = null;

/** @deprecated Use IconInfo component instead */
export const ICON_INFO = null;
