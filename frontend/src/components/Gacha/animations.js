// ==================== ANIMATION VARIANTS ====================
// Re-exports from the main Apple Design System for backwards compatibility

import { motionVariants } from '../../styles/DesignSystem';

// Card animations
export const cardVariants = motionVariants.card;

export const cardVariantsFast = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
  hover: { y: -4, transition: { duration: 0.2 } }
};

// Container animations
export const containerVariants = motionVariants.scaleIn;

// Grid item animations with stagger
export const gridItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }),
  hover: { y: -4, scale: 1.02 }
};

// Modal animations
export const modalVariants = motionVariants.modal;

// Overlay animations
export const overlayVariants = motionVariants.overlay;

// Slide in from right
export const slideVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 } 
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { duration: 0.2 } 
  }
};

// Fade in animations
export const fadeInVariants = motionVariants.fadeIn;

// Scale in animations
export const scaleInVariants = motionVariants.scaleIn;

// Stagger container for lists
export const staggerContainer = motionVariants.staggerContainer;

// Stagger item for list items
export const staggerItem = motionVariants.staggerItem;
