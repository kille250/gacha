/**
 * Design System
 * 
 * A cohesive design language with clean, minimal aesthetics:
 * - Clean, minimal look
 * - Elegant typography
 * - Subtle shadows and blur effects
 * - Generous whitespace
 * - Soft, rounded corners
 * - Smooth animations
 */

import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// ==================== THEME CONFIGURATION ====================

export const theme = {
  colors: {
    // Primary palette
    primary: '#0071e3',
    primaryHover: '#0077ed',
    primaryActive: '#006edb',
    
    // Accent colors
    accent: '#5856d6',
    accentSecondary: '#af52de',
    
    // Semantic colors
    success: '#34c759',
    warning: '#ff9f0a',
    error: '#ff3b30',
    info: '#5ac8fa',
    
    // Neutral palette (dark mode)
    background: '#000000',
    backgroundSecondary: '#1c1c1e',
    backgroundTertiary: '#2c2c2e',
    backgroundElevated: '#1c1c1e',
    
    // Surface colors (for cards, modals)
    surface: 'rgba(28, 28, 30, 0.8)',
    surfaceHover: 'rgba(44, 44, 46, 0.9)',
    surfaceBorder: 'rgba(255, 255, 255, 0.1)',
    
    // Text colors
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.6)', // Improved contrast for WCAG AA
    textMuted: 'rgba(255, 255, 255, 0.4)',
    
    // Special
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Rarity colors (refined)
    rarity: {
      common: '#8e8e93',
      uncommon: '#30d158',
      rare: '#0a84ff',
      epic: '#bf5af2',
      legendary: '#ff9f0a'
    }
  },
  
  // Typography
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", "Monaco", monospace'
  },
  
  fontSizes: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '34px',
    '4xl': '40px',
    '5xl': '48px',
    hero: '56px'
  },
  
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  
  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625
  },
  
  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px'
  },
  
  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '28px',
    full: '9999px'
  },
  
  // Shadows
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 4px 20px rgba(0, 0, 0, 0.25)',
    lg: '0 8px 40px rgba(0, 0, 0, 0.35)',
    xl: '0 16px 64px rgba(0, 0, 0, 0.45)',
    glow: (color) => `0 0 24px ${color}40, 0 0 48px ${color}20`,
    inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  },
  
  // Transitions
  transitions: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    base: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  
  // Blur values
  blur: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px'
  },
  
  // Z-index layers
  zIndex: {
    base: 1,
    dropdown: 100,
    sticky: 200,
    modal: 1000,
    toast: 1100,
    tooltip: 1200
  },
  
  // Breakpoints
  breakpoints: {
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    // Semantic aliases for easier usage
    mobile: '640px',
    tablet: '1024px',
    desktop: '1280px',
  },
  
  // Timing constants (in milliseconds)
  timing: {
    notificationDismiss: 3000,    // Auto-dismiss notifications
    successMessageDismiss: 4000,  // Auto-dismiss success messages
    errorMessageDismiss: 6000,    // Auto-dismiss error messages (longer for reading)
    tradeResultDismiss: 1500,     // Quick feedback animations
    stateTransition: 2000,        // Game/UI state transitions
    retryDelay: 3000,             // Delay before retrying failed operations
    claimCooldown: 2000,          // Prevent double-claims on rewards
    healthCheckInterval: 60000,   // Admin health check polling
  }
};


// ==================== ANIMATIONS ====================

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ==================== MOTION VARIANTS ====================

export const motionVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  },
  
  slideUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2 } }
  },
  
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  },
  
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  },
  
  staggerItem: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
  },
  
  card: {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
    },
    exit: { 
      opacity: 0, 
      scale: 0.96, 
      transition: { duration: 0.2 } 
    },
    hover: { 
      y: -4, 
      transition: { duration: 0.2 } 
    }
  },
  
  modal: {
    hidden: { opacity: 0, scale: 0.96, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        duration: 0.35, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.96, 
      y: 20,
      transition: { duration: 0.2 }
    }
  },
  
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  }
};

// ==================== BASE COMPONENTS ====================

// Page wrapper with gradient background
export const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
  color: ${theme.colors.text};
  font-family: ${theme.fonts.primary};
  position: relative;
  overflow-x: hidden;
  
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: 
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168, 85, 247, 0.1), transparent),
      radial-gradient(ellipse 50% 30% at 20% 80%, rgba(14, 165, 233, 0.08), transparent);
    pointer-events: none;
    z-index: 0;
  }
`;

// Container with max-width and padding
export const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 ${theme.spacing.md};
  position: relative;
  
  @media (min-width: ${theme.breakpoints.lg}) {
    padding: 0 ${theme.spacing.xl};
  }
`;

// Glass morphism card
export const GlassCard = styled(motion.div)`
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.md};
  transition: all ${theme.transitions.base};
  
  &:hover {
    border-color: ${theme.colors.glassBorder};
  }
`;

// Section with glass effect
export const Section = styled(GlassCard)`
  padding: ${theme.spacing.lg};
  
  @media (min-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.xl};
  }
`;

// ==================== TYPOGRAPHY ====================

export const Heading1 = styled.h1`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  line-height: ${theme.lineHeights.tight};
  color: ${theme.colors.text};
  letter-spacing: -0.02em;
  margin: 0;
  
  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['4xl']};
  }
`;

export const Heading2 = styled.h2`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  color: ${theme.colors.text};
  letter-spacing: -0.01em;
  margin: 0;
  
  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['2xl']};
  }
`;

export const Heading3 = styled.h3`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  color: ${theme.colors.text};
  margin: 0;
`;

export const Text = styled.p`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.regular};
  line-height: ${theme.lineHeights.relaxed};
  color: ${props => props.secondary ? theme.colors.textSecondary : theme.colors.text};
  margin: 0;
`;

export const Caption = styled.span`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.regular};
  color: ${theme.colors.textTertiary};
`;

// ==================== BUTTONS ====================

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-family: ${theme.fonts.primary};
  font-weight: ${theme.fontWeights.semibold};
  border: none;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  text-decoration: none;
  white-space: nowrap;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const PrimaryButton = styled(motion.button)`
  ${buttonBase}
  background: ${theme.colors.primary};
  color: white;
  font-size: ${theme.fontSizes.base};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.full};
  box-shadow: 0 4px 14px rgba(0, 113, 227, 0.4);
  
  &:hover:not(:disabled) {
    background: ${theme.colors.primaryHover};
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 113, 227, 0.5);
  }
  
  &:active:not(:disabled) {
    background: ${theme.colors.primaryActive};
    transform: translateY(0);
  }
`;

export const SecondaryButton = styled(motion.button)`
  ${buttonBase}
  background: ${theme.colors.glass};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.full};
  border: 1px solid ${theme.colors.surfaceBorder};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

export const GhostButton = styled(motion.button)`
  ${buttonBase}
  background: transparent;
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.base};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  
  &:hover:not(:disabled) {
    background: rgba(0, 113, 227, 0.1);
  }
`;

export const IconButton = styled(motion.button)`
  ${buttonBase}
  width: 44px;
  height: 44px;
  padding: 0;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.text};
  font-size: 20px;
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: scale(1.05);
  }
  
  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

// ==================== CHIPS & BADGES ====================

export const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

export const PrimaryChip = styled(Chip)`
  background: rgba(0, 113, 227, 0.15);
  border-color: rgba(0, 113, 227, 0.3);
  color: ${theme.colors.primary};
`;

export const RarityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => theme.colors.rarity[props.rarity] || theme.colors.rarity.common};
  color: white;
  box-shadow: 0 2px 8px ${props => theme.colors.rarity[props.rarity]}60;
`;

// ==================== INPUTS ====================

export const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
  
  &:hover {
    border-color: ${theme.colors.glassBorder};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    border-color: ${theme.colors.glassBorder};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

// ==================== LOADING ====================

export const Spinner = styled.div`
  width: ${props => props.size || '48px'};
  height: ${props => props.size || '48px'};
  border: 3px solid ${theme.colors.surfaceBorder};
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/**
 * Small inline loading spinner - use for buttons and inline loading states
 * @prop {string} $size - Size in pixels (default: 20)
 * @prop {string} $color - Spinner color (default: white)
 */
export const LoadingSpinner = styled.div`
  width: ${props => props.$size || '20px'};
  height: ${props => props.$size || '20px'};
  border: 2px solid ${props => props.$color ? `${props.$color}30` : 'rgba(255, 255, 255, 0.3)'};
  border-top-color: ${props => props.$color || 'white'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const LoadingDots = styled.div`
  display: flex;
  gap: 6px;
  
  span {
    width: 8px;
    height: 8px;
    background: ${theme.colors.primary};
    border-radius: 50%;
    animation: ${pulse} 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0; }
  }
`;

// ==================== MODAL ====================

export const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  z-index: ${theme.zIndex.modal};
`;

export const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.xl};
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
`;

// ==================== ALERTS ====================

export const Alert = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  
  ${props => props.variant === 'error' && css`
    background: rgba(255, 59, 48, 0.15);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: ${theme.colors.error};
  `}
  
  ${props => props.variant === 'success' && css`
    background: rgba(52, 199, 89, 0.15);
    border: 1px solid rgba(52, 199, 89, 0.3);
    color: ${theme.colors.success};
  `}
  
  ${props => props.variant === 'warning' && css`
    background: rgba(255, 159, 10, 0.15);
    border: 1px solid rgba(255, 159, 10, 0.3);
    color: ${theme.colors.warning};
  `}
`;

/**
 * Inline error message - for form validation and inline errors
 */
export const ErrorMessage = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
`;

/**
 * Inline success message - for form success states
 */
export const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(52, 199, 89, 0.15);
  border: 1px solid rgba(52, 199, 89, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
`;

// ==================== GRID & LAYOUT ====================

export const Grid = styled.div`
  display: grid;
  gap: ${props => props.gap || theme.spacing.lg};
  grid-template-columns: repeat(${props => props.columns || 1}, 1fr);

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(${props => props.columnsMd || props.columns || 2}, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(${props => props.columnsLg || props.columnsMd || props.columns || 3}, 1fr);
  }
`;

export const Flex = styled.div`
  display: flex;
  align-items: ${props => props.align || 'center'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap || theme.spacing.md};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
  flex-direction: ${props => props.direction || 'row'};
`;

export const Spacer = styled.div`
  height: ${props => props.y || '0'};
  width: ${props => props.x || '0'};
`;

// ==================== LAYOUT PRIMITIVES ====================

/**
 * Stack - Vertical spacing layout primitive
 * Use for vertically stacked content with consistent spacing
 * @prop {string} gap - Spacing between items (default: theme.spacing.md)
 * @prop {string} align - Cross-axis alignment (default: stretch)
 */
export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.gap || theme.spacing.md};
  align-items: ${props => props.align || 'stretch'};
`;

/**
 * Cluster - Horizontal wrapping layout primitive
 * Use for groups of elements that should wrap naturally
 * @prop {string} gap - Spacing between items (default: theme.spacing.sm)
 * @prop {string} justify - Main-axis alignment (default: flex-start)
 */
export const Cluster = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.gap || theme.spacing.sm};
  align-items: center;
  justify-content: ${props => props.justify || 'flex-start'};
`;

/**
 * AutoGrid - Responsive auto-fit grid
 * Automatically adjusts columns based on available space
 * @prop {string} minWidth - Minimum item width (default: 280px)
 * @prop {string} gap - Spacing between items (default: theme.spacing.lg)
 */
export const AutoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(${props => props.minWidth || '280px'}, 100%), 1fr)
  );
  gap: ${props => props.gap || theme.spacing.lg};
`;

/**
 * Center - Centers content both horizontally and vertically
 * @prop {string} maxWidth - Maximum width of centered content
 * @prop {boolean} intrinsic - If true, centers based on content width
 */
export const Center = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${props => props.maxWidth && `max-width: ${props.maxWidth};`}
  ${props => props.intrinsic && 'width: fit-content;'}
  margin-inline: auto;
`;

/**
 * Sidebar - Layout with fixed sidebar and fluid main content
 * Mobile: stacks vertically, Desktop: side-by-side
 * @prop {string} sideWidth - Width of sidebar (default: 280px)
 * @prop {string} gap - Gap between sidebar and content (default: theme.spacing.lg)
 * @prop {boolean} reversed - If true, sidebar on right
 */
export const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.gap || theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: ${props => props.reversed ? 'row-reverse' : 'row'};

    > :first-child {
      flex-basis: ${props => props.sideWidth || '280px'};
      flex-shrink: 0;
    }

    > :last-child {
      flex-grow: 1;
      min-width: 0; /* Prevents overflow */
    }
  }
`;

/**
 * Switcher - Switches between horizontal and vertical based on available space
 * @prop {string} threshold - Width at which layout switches (default: 600px)
 * @prop {string} gap - Gap between items
 */
export const Switcher = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.gap || theme.spacing.md};

  > * {
    flex-grow: 1;
    flex-basis: calc((${props => props.threshold || '600px'} - 100%) * 999);
  }
`;

/**
 * Cover - Full-height layout with centered principal element
 * Use for hero sections, centered content pages
 * @prop {string} minHeight - Minimum height (default: 100vh)
 */
export const Cover = styled.div`
  display: flex;
  flex-direction: column;
  min-height: ${props => props.minHeight || '100vh'};
  padding: ${theme.spacing.lg};

  > * {
    margin-block: ${theme.spacing.lg};
  }

  > :first-child:not([data-cover-center]) {
    margin-block-start: 0;
  }

  > :last-child:not([data-cover-center]) {
    margin-block-end: 0;
  }

  > [data-cover-center] {
    margin-block: auto;
  }
`;

/**
 * Reel - Horizontal scrolling container
 * Use for carousels, horizontal scrolling lists
 * @prop {string} gap - Gap between items (default: theme.spacing.md)
 * @prop {boolean} noBar - Hide scrollbar
 */
export const Reel = styled.div`
  display: flex;
  gap: ${props => props.gap || theme.spacing.md};
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: ${theme.spacing.md};
  -webkit-overflow-scrolling: touch;

  ${props => props.noBar && `
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `}

  > * {
    scroll-snap-align: start;
    flex-shrink: 0;
  }
`;

// ==================== UTILITY FUNCTIONS ====================

export const getRarityColor = (rarity) => theme.colors.rarity[rarity] || theme.colors.rarity.common;

export const getRarityGlow = (rarity) => {
  const color = getRarityColor(rarity);
  return `0 0 20px ${color}50, 0 0 40px ${color}30`;
};

// ==================== SCROLLBAR STYLES ====================

export const scrollbarStyles = css`
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundTertiary};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.glassBorder};
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

export default theme;

