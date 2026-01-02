/**
 * Essence Tap Animation Utilities
 *
 * Shared animation variants, keyframes, and utilities for the redesigned
 * Essence Tap UI. Provides consistent, premium motion design.
 */

import { keyframes, css } from 'styled-components';

// ============================================================================
// KEYFRAME ANIMATIONS
// ============================================================================

/**
 * Orb breathing animation - subtle idle pulse synced with production
 */
export const orbBreathe = keyframes`
  0%, 100% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.02);
    filter: brightness(1.1);
  }
`;

/**
 * Orb glow pulse - ambient glow effect
 */
export const orbGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 40px rgba(168, 85, 247, 0.4),
      0 0 80px rgba(168, 85, 247, 0.2),
      inset 0 0 30px rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow:
      0 0 60px rgba(168, 85, 247, 0.6),
      0 0 120px rgba(168, 85, 247, 0.3),
      inset 0 0 40px rgba(255, 255, 255, 0.15);
  }
`;

/**
 * Electric crackle effect for higher prestige levels
 */
export const electricCrackle = keyframes`
  0%, 100% {
    box-shadow:
      0 0 50px rgba(139, 92, 246, 0.5),
      0 0 100px rgba(139, 92, 246, 0.3),
      0 0 150px rgba(124, 58, 237, 0.2);
    filter: brightness(1) saturate(1);
  }
  25% {
    box-shadow:
      0 0 70px rgba(167, 139, 250, 0.7),
      0 0 120px rgba(139, 92, 246, 0.4),
      0 0 180px rgba(124, 58, 237, 0.3);
    filter: brightness(1.2) saturate(1.1);
  }
  50% {
    box-shadow:
      0 0 60px rgba(139, 92, 246, 0.6),
      0 0 110px rgba(139, 92, 246, 0.35),
      0 0 160px rgba(124, 58, 237, 0.25);
    filter: brightness(1.1) saturate(1.05);
  }
  75% {
    box-shadow:
      0 0 80px rgba(192, 132, 252, 0.8),
      0 0 140px rgba(139, 92, 246, 0.5),
      0 0 200px rgba(124, 58, 237, 0.35);
    filter: brightness(1.3) saturate(1.2);
  }
`;

/**
 * Prismatic rainbow rotation for max prestige
 */
export const prismaticShift = keyframes`
  0% {
    filter: hue-rotate(0deg) brightness(1.1) saturate(1.2);
    box-shadow:
      0 0 60px rgba(168, 85, 247, 0.6),
      0 0 120px rgba(236, 72, 153, 0.4),
      0 0 180px rgba(245, 158, 11, 0.2);
  }
  33% {
    filter: hue-rotate(120deg) brightness(1.2) saturate(1.3);
    box-shadow:
      0 0 70px rgba(16, 185, 129, 0.6),
      0 0 130px rgba(59, 130, 246, 0.4),
      0 0 190px rgba(168, 85, 247, 0.2);
  }
  66% {
    filter: hue-rotate(240deg) brightness(1.15) saturate(1.25);
    box-shadow:
      0 0 65px rgba(245, 158, 11, 0.6),
      0 0 125px rgba(236, 72, 153, 0.4),
      0 0 185px rgba(16, 185, 129, 0.2);
  }
  100% {
    filter: hue-rotate(360deg) brightness(1.1) saturate(1.2);
    box-shadow:
      0 0 60px rgba(168, 85, 247, 0.6),
      0 0 120px rgba(236, 72, 153, 0.4),
      0 0 180px rgba(245, 158, 11, 0.2);
  }
`;

/**
 * Value change flash effect
 */
export const valueFlash = keyframes`
  0% {
    color: inherit;
    text-shadow: none;
  }
  50% {
    color: #FCD34D;
    text-shadow: 0 0 10px rgba(252, 211, 77, 0.5);
  }
  100% {
    color: inherit;
    text-shadow: none;
  }
`;

/**
 * Purchase success burst
 */
export const purchaseBurst = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
`;

/**
 * Subtle float for icons/elements
 */
export const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

/**
 * Progress bar fill animation
 */
export const progressFill = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

/**
 * Glow pulse for affordable items
 */
export const affordableGlow = keyframes`
  0%, 100% {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.1);
  }
  50% {
    border-color: rgba(168, 85, 247, 0.7);
    box-shadow: 0 0 25px rgba(168, 85, 247, 0.2);
  }
`;

/**
 * Nav button active indicator
 */
export const navActiveGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
  }
`;

// ============================================================================
// CSS MIXINS
// ============================================================================

/**
 * Glassmorphism effect
 */
export const glassmorphism = css`
  background: rgba(28, 28, 30, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

/**
 * Glassmorphism light variant
 */
export const glassmorphismLight = css`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

/**
 * Premium card styling
 */
export const premiumCard = css`
  ${glassmorphism}
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }
`;

// ============================================================================
// ORB VISUAL VARIANTS BY PRESTIGE LEVEL
// ============================================================================

/**
 * Get orb styles based on prestige level
 */
export const getOrbStyles = (prestigeLevel) => {
  if (prestigeLevel >= 5) {
    // Prismatic - max prestige
    return css`
      background: conic-gradient(
        from 0deg,
        rgba(168, 85, 247, 0.9),
        rgba(236, 72, 153, 0.9),
        rgba(245, 158, 11, 0.9),
        rgba(16, 185, 129, 0.9),
        rgba(59, 130, 246, 0.9),
        rgba(168, 85, 247, 0.9)
      );
      animation: ${prismaticShift} 6s linear infinite;

      &::before {
        content: '';
        position: absolute;
        inset: 10%;
        border-radius: 50%;
        background: radial-gradient(
          circle at 30% 30%,
          rgba(255, 255, 255, 0.4),
          transparent 50%
        );
      }
    `;
  }

  if (prestigeLevel >= 3) {
    // Electric - mid-high prestige
    return css`
      background: radial-gradient(
        circle at 30% 30%,
        rgba(167, 139, 250, 0.95),
        rgba(139, 92, 246, 0.9),
        rgba(124, 58, 237, 0.95)
      );
      animation: ${electricCrackle} 2s ease-in-out infinite;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(
          circle at 40% 40%,
          rgba(255, 255, 255, 0.35),
          transparent 40%
        );
      }
    `;
  }

  if (prestigeLevel >= 1) {
    // Inner core glow - early prestige
    return css`
      background: radial-gradient(
        circle at 30% 30%,
        rgba(192, 132, 252, 0.95),
        rgba(168, 85, 247, 0.9),
        rgba(139, 92, 246, 0.95)
      );
      animation: ${orbGlow} 3s ease-in-out infinite;

      &::before {
        content: '';
        position: absolute;
        inset: 20%;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(255, 255, 255, 0.5),
          rgba(255, 255, 255, 0.2) 40%,
          transparent 70%
        );
        animation: ${orbBreathe} 2s ease-in-out infinite;
      }
    `;
  }

  // Default - no prestige
  return css`
    background: radial-gradient(
      circle at 30% 30%,
      rgba(160, 100, 255, 0.9),
      rgba(100, 50, 200, 0.8),
      rgba(60, 20, 140, 0.9)
    );
    animation: ${orbGlow} 4s ease-in-out infinite;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(
        circle at 30% 30%,
        rgba(255, 255, 255, 0.3),
        transparent 50%
      );
    }
  `;
};

// ============================================================================
// FRAMER MOTION VARIANTS
// ============================================================================

/**
 * Stagger container for lists
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

/**
 * Stagger item
 */
export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};

/**
 * Card hover animation
 */
export const cardHover = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: 0.2 }
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

/**
 * Purchase animation
 */
export const purchaseAnimation = {
  initial: { scale: 1 },
  purchase: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3 }
  }
};

/**
 * Floating number animation
 */
export const floatingNumber = {
  initial: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  animate: {
    opacity: 0,
    y: -100,
    scale: 1.5,
    transition: {
      duration: 0.8,
      ease: 'easeOut'
    }
  }
};

/**
 * Panel collapse animation
 */
export const panelCollapse = {
  open: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  }
};

/**
 * Nav item animation
 */
export const navItem = {
  rest: { scale: 1 },
  hover: {
    scale: 1.1,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  },
  tap: { scale: 0.9 }
};

/**
 * Stats HUD slide animation
 */
export const statsHudSlide = {
  initial: { y: -100, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      delay: 0.2
    }
  }
};

/**
 * Bottom nav slide animation
 */
export const bottomNavSlide = {
  initial: { y: 100, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      delay: 0.3
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get production rate color based on value
 */
export const getProductionColor = (rate) => {
  if (rate >= 1000000) return '#FFD700'; // Gold for 1M+
  if (rate >= 100000) return '#C084FC';  // Purple for 100K+
  if (rate >= 10000) return '#A855F7';   // Lighter purple for 10K+
  return 'rgba(255, 255, 255, 0.7)';     // Default
};

/**
 * Format large numbers with abbreviations
 */
export const formatCompact = (num) => {
  if (num >= 1e15) return (num / 1e15).toFixed(2) + 'Q';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return Math.floor(num).toString();
};

export default {
  // Keyframes
  orbBreathe,
  orbGlow,
  electricCrackle,
  prismaticShift,
  valueFlash,
  purchaseBurst,
  subtleFloat,
  progressFill,
  affordableGlow,
  navActiveGlow,

  // CSS Mixins
  glassmorphism,
  glassmorphismLight,
  premiumCard,

  // Orb styles
  getOrbStyles,

  // Motion variants
  staggerContainer,
  staggerItem,
  cardHover,
  purchaseAnimation,
  floatingNumber,
  panelCollapse,
  navItem,
  statsHudSlide,
  bottomNavSlide,

  // Utilities
  getProductionColor,
  formatCompact
};
