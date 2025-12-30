/**
 * Design System
 *
 * Unified design system for the Gacha application.
 * Import from here for all design tokens and components.
 *
 * @example
 * import { Button, Modal, theme, colors } from '../design-system';
 */

// Tokens
export {
  theme,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  textStyles,
  spacing,
  radius,
  shadows,
  blur,
  breakpoints,
  zIndex,
  navHeights,
  transitions,
  timing,
  easing,
  springs,
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  shimmer,
  pulse,
  float,
  spin,
  motionVariants
} from './tokens';

// Primitives
export {
  Button,
  IconButton,
  Input,
  Select,
  Badge,
  Spinner,
  // Typography
  Heading1,
  Heading2,
  Heading3,
  Text,
  Caption,
  // Chips
  Chip,
  PrimaryChip,
  RarityBadge,
  // Loading
  LoadingSpinner,
  LoadingDots,
  // Messages
  ErrorMessage,
  SuccessMessage,
  WarningMessage,
  // Animated values
  AnimatedValue,
  AnimatedCurrency,
  AnimatedPoints,
  AnimatedScore,
  AnimatedPercentage,
  // Page transitions
  PageTransition,
  StaggerChild,
  FadeIn,
  SlideIn,
  ScaleIn,
  staggerContainer,
  staggerItem,
  // Ripple effect
  Ripple,
  useRipple
} from './primitives';

// Layout
export {
  Stack,
  Grid,
  AutoGrid,
  Flex,
  Cluster,
  Center,
  Spacer,
  Container,
  GlassCard,
  Section,
  PageWrapper,
  Sidebar,
  Switcher,
  Cover,
  Reel
} from './layout';

// Feedback
export {
  LoadingState,
  ErrorState,
  EmptyState,
  Alert,
  // Skeleton loaders - comprehensive set for all UI patterns
  Skeleton,
  SkeletonBase,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonCharacterCard,
  SkeletonBanner,
  SkeletonHero,
  SkeletonRow,
  SkeletonGrid,
  SkeletonCharacterGrid,
  SkeletonBannerCarousel,
  SkeletonStats,
  SkeletonControls,
  SkeletonButton,
  SkeletonInput,
  SkeletonBadge,
  SkeletonPage,
  SkeletonProfile,
  SkeletonForm,
  SkeletonInline,
  SkeletonProgress,
} from './feedback';

// Overlays
export {
  Modal,
  ConfirmDialog,
  Drawer,
  BottomSheet,
  // Modal building blocks
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  scrollbarStyles
} from './overlays';

// Utilities
export {
  srOnly,
  srOnlyFocusable,
  VisuallyHidden,
  SkipLink,
  AriaLiveRegion,
  AriaAlert,
  useAriaLive,
  useFocusReturn,
  useRovingTabIndex,
  useReducedMotion,
  // Rarity
  getRarityColor,
  getRarityGlow,
  // Micro-interactions
  haptic,
  touchFeedback,
  rippleContainer,
  hoverLift,
  interactiveScale,
  enhancedFocus,
  microMotionVariants
} from './utilities';

// Effects
export {
  Confetti,
  useConfetti,
  HolographicCard,
  holographicBorderStyle
} from './effects';

// Re-export theme as default for backward compatibility
export { theme as default } from './tokens';
