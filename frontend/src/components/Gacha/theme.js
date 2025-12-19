// ==================== THEME CONFIGURATION ====================
// Re-exports from the main Design System for backwards compatibility

import { theme as designTheme, motionVariants } from '../../styles/DesignSystem';

export const rarityColors = designTheme.colors.rarity;

export const rarityGradients = {
  common: 'linear-gradient(135deg, #8e8e93, #636366)',
  uncommon: 'linear-gradient(135deg, #30d158, #28a745)',
  rare: 'linear-gradient(135deg, #0a84ff, #007aff)',
  epic: 'linear-gradient(135deg, #bf5af2, #9c27b0)',
  legendary: 'linear-gradient(135deg, #ff9f0a, #ff6b00)'
};

export const theme = designTheme;

// Motion variants for animations
export const cardVariants = motionVariants.card;
export const cardVariantsFast = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } }
};

export const containerVariants = motionVariants.scaleIn;
export const gridItemVariants = motionVariants.staggerItem;
export const modalVariants = motionVariants.modal;
export const overlayVariants = motionVariants.overlay;

export const slideVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { x: '100%', transition: { duration: 0.2 } }
};

export default theme;
