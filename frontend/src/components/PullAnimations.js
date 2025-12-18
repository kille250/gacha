import { keyframes, css } from 'styled-components';

// ==================== KEYFRAME ANIMATIONS ====================

// Spinner rotation
export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Coin pulse effect
export const coinPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

// Floating animation for empty states
export const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

// Shimmer effect for rare items
export const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// Glow pulse for legendary/epic items
export const glowPulse = keyframes`
  0%, 100% { 
    filter: brightness(1);
    box-shadow: 0 0 20px currentColor;
  }
  50% { 
    filter: brightness(1.3);
    box-shadow: 0 0 40px currentColor;
  }
`;

// Card reveal animation
export const cardReveal = keyframes`
  0% {
    transform: rotateY(90deg) scale(0.8);
    opacity: 0;
  }
  50% {
    transform: rotateY(-10deg) scale(1.05);
  }
  100% {
    transform: rotateY(0deg) scale(1);
    opacity: 1;
  }
`;

// Starburst effect for rare pulls
export const starburst = keyframes`
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(3) rotate(180deg);
    opacity: 0;
  }
`;

// Shake effect for rolling
export const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
`;

// Scale bounce for buttons
export const scaleBounce = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// Slide up fade in
export const slideUpFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Shine sweep effect for buttons
export const shineSweep = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

// ==================== ANIMATION MIXINS ====================

// Apply spin animation
export const spinAnimation = css`
  animation: ${spin} 1s linear infinite;
`;

// Apply float animation
export const floatAnimation = css`
  animation: ${float} 3s ease-in-out infinite;
`;

// Apply shimmer for rarity badges
export const shimmerAnimation = css`
  background-size: 200% auto;
  animation: ${shimmer} 3s linear infinite;
`;

// Apply glow for legendary/epic
export const glowAnimation = css`
  animation: ${glowPulse} 2s ease-in-out infinite;
`;

// Apply shake for rolling state
export const shakeAnimation = css`
  animation: ${shake} 0.5s ease-in-out;
`;

// ==================== TRANSITION PRESETS ====================

export const transitions = {
  fast: 'all 0.15s ease',
  normal: 'all 0.3s ease',
  slow: 'all 0.5s ease',
  bounce: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ==================== FRAMER MOTION VARIANTS ====================

// Card animation variants
export const cardVariants = {
  hidden: { 
    opacity: 0, 
    rotateY: 90,
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    rotateY: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 15
    }
  },
  exit: { 
    opacity: 0, 
    rotateY: -90,
    scale: 0.8,
    transition: { duration: 0.3 }
  }
};

// Fast card variants (for skip animation mode)
export const cardVariantsFast = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.15 }
  }
};

// Multi-roll grid item variants
export const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 100,
      damping: 12
    }
  }),
  hover: {
    scale: 1.05,
    zIndex: 5,
    transition: { duration: 0.2 }
  }
};

// Container fade variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Slide variants for modals/panels
export const slideVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300
    }
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Scale modal variants
export const modalVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    scale: 0.9, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Overlay variants
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

