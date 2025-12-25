/**
 * Animation Tokens
 *
 * CSS keyframes, timing functions, and Framer Motion variants.
 *
 * Updated with:
 * - Standardized timing scale
 * - Spring physics for natural motion
 * - Premium rarity effects (shimmer, glow)
 * - Focus state transitions
 */

import { keyframes, css } from 'styled-components';

/**
 * Transition Timing Scale
 *
 * Standardized durations for consistent motion across the app.
 */
export const timing = {
  instant: '100ms',     // Immediate feedback (focus, active states)
  fast: '150ms',        // Quick interactions (hover, toggle)
  normal: '200ms',      // Standard transitions
  moderate: '300ms',    // Medium animations
  slow: '400ms',        // Larger changes
  slower: '500ms',      // Page transitions
  slowest: '700ms'      // Complex animations
};

/**
 * Easing Functions
 *
 * Apple-like easing curves for natural motion.
 */
export const easing = {
  // Standard easings
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',      // Default exit
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',     // Default enter
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',            // Smooth transition

  // Apple-like easings
  apple: 'cubic-bezier(0.25, 0.1, 0.25, 1)',            // iOS standard
  appleSpring: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)', // Slight overshoot

  // Specialized easings
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',          // Bouncy finish
  smooth: 'cubic-bezier(0.45, 0, 0.55, 1)',             // Very smooth
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'                 // Quick and precise
};

/**
 * Spring Configurations (Framer Motion)
 *
 * Natural spring physics for interactive elements.
 */
export const springs = {
  // Snappy - buttons, toggles
  snappy: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 },

  // Gentle - cards, panels
  gentle: { type: 'spring', stiffness: 300, damping: 25, mass: 1 },

  // Bouncy - celebratory elements
  bouncy: { type: 'spring', stiffness: 350, damping: 15, mass: 0.8 },

  // Smooth - modals, overlays
  smooth: { type: 'spring', stiffness: 200, damping: 25, mass: 1 },

  // Quick - micro interactions
  quick: { type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }
};

// CSS Keyframes
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Premium shimmer for rarity effects
export const shimmerPremium = keyframes`
  0% {
    background-position: -200% 0;
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    background-position: 200% 0;
    opacity: 0.5;
  }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// Subtle pulse for emphasis
export const pulseSoft = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(0.98); }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// Glow animation for legendary items - reduced for Apple aesthetic
export const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 14px var(--glow-color, rgba(255, 167, 38, 0.25)),
                0 0 28px var(--glow-color, rgba(255, 167, 38, 0.12));
  }
  50% {
    box-shadow: 0 0 20px var(--glow-color, rgba(255, 167, 38, 0.35)),
                0 0 40px var(--glow-color, rgba(255, 167, 38, 0.18));
  }
`;

// Subtle glow for epic items - softer
export const glowSubtle = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px var(--glow-color, rgba(191, 90, 242, 0.2));
  }
  50% {
    box-shadow: 0 0 16px var(--glow-color, rgba(191, 90, 242, 0.32));
  }
`;

// Sparkle effect
export const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
`;

// Focus ring animation
export const focusRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.4); }
  100% { box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.4); }
`;

/**
 * Transition Presets
 *
 * Ready-to-use CSS transition strings.
 */
export const transitions = {
  // Standard transitions
  fast: `all ${timing.fast} ${easing.easeOut}`,
  normal: `all ${timing.normal} ${easing.easeOut}`,
  slow: `all ${timing.slow} ${easing.easeOut}`,

  // Specific property transitions
  opacity: `opacity ${timing.fast} ${easing.easeOut}`,
  transform: `transform ${timing.normal} ${easing.appleSpring}`,
  colors: `color ${timing.fast} ${easing.easeOut}, background-color ${timing.fast} ${easing.easeOut}, border-color ${timing.fast} ${easing.easeOut}`,
  shadow: `box-shadow ${timing.normal} ${easing.easeOut}`,

  // Focus transition (with delay for smoother appearance)
  focus: `box-shadow ${timing.instant} ${easing.easeOut}, outline ${timing.instant} ${easing.easeOut}`,

  // Combined for interactive elements
  interactive: `transform ${timing.fast} ${easing.appleSpring}, box-shadow ${timing.normal} ${easing.easeOut}, background-color ${timing.fast} ${easing.easeOut}`
};

/**
 * CSS Mixins for common patterns
 */
export const animationMixins = {
  // Shimmer effect for loading/premium
  shimmerEffect: css`
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 2s ease-in-out infinite;
  `,

  // Premium shimmer for rare items
  shimmerPremium: css`
    background: linear-gradient(
      110deg,
      transparent 25%,
      rgba(255, 255, 255, 0.15) 50%,
      transparent 75%
    );
    background-size: 200% 100%;
    animation: ${shimmerPremium} 3s ease-in-out infinite;
  `,

  // Legendary glow - refined for premium feel
  legendaryGlow: css`
    --glow-color: rgba(255, 167, 38, 0.28);
    animation: ${glow} 2.5s ease-in-out infinite;
  `,

  // Epic glow - softer for Apple aesthetic
  epicGlow: css`
    --glow-color: rgba(191, 90, 242, 0.25);
    animation: ${glowSubtle} 3s ease-in-out infinite;
  `
};

// Framer Motion Variants
export const motionVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  },

  slideUp: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ...springs.gentle, duration: 0.3 }
    },
    exit: { opacity: 0, y: -6, transition: { duration: 0.15 } }
  },

  slideDown: {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ...springs.gentle, duration: 0.3 }
    },
    exit: { opacity: 0, y: 6, transition: { duration: 0.15 } }
  },

  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { ...springs.snappy, duration: 0.25 }
    },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
  },

  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.08 }
    }
  },

  staggerContainerFast: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.05 }
    }
  },

  staggerItem: {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ...springs.gentle }
    }
  },

  card: {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { ...springs.gentle }
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.15 }
    },
    hover: {
      y: -3,  // Reduced from -6 for subtler lift
      transition: { ...springs.snappy }
    },
    tap: {
      scale: 0.98,
      transition: { ...springs.quick }
    }
  },

  // Improved modal with spring bounce - Apple-like motion
  modal: {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        ...springs.smooth,
        opacity: { duration: 0.2 }
      }
    },
    exit: {
      opacity: 0,
      scale: 0.97,
      y: 10,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    }
  },

  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }  // Slightly longer for smoother feel
  },

  // Button hover/tap
  button: {
    hover: {
      y: -2,
      transition: { ...springs.snappy }
    },
    tap: {
      scale: 0.97,
      y: 0,
      transition: { ...springs.quick }
    }
  },

  // Dropdown menu
  dropdown: {
    hidden: { opacity: 0, scale: 0.95, y: -8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { ...springs.snappy }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -4,
      transition: { duration: 0.1 }
    }
  },

  // List items
  listItem: {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { ...springs.gentle }
    },
    exit: {
      opacity: 0,
      x: 8,
      transition: { duration: 0.1 }
    }
  },

  // Tooltip
  tooltip: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.1 }
    }
  },

  // Points/currency change animation
  valueChange: {
    initial: { opacity: 0, y: -10, scale: 0.8 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { ...springs.bouncy }
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  }
};

const animations = {
  // Keyframes
  fadeIn,
  slideUp,
  slideDown,
  slideIn,
  scaleIn,
  shimmer,
  shimmerPremium,
  pulse,
  pulseSoft,
  float,
  spin,
  glow,
  glowSubtle,
  sparkle,
  focusRing,

  // Timing & easing
  timing,
  easing,
  springs,
  transitions,

  // Mixins
  animationMixins,

  // Motion variants
  motionVariants
};

export default animations;
