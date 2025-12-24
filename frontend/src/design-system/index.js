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
  spacing,
  radius,
  shadows,
  blur,
  breakpoints,
  zIndex,
  transitions,
  timing,
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
  Spinner
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
  Alert
} from './feedback';

// Overlays
export {
  Modal,
  ConfirmDialog,
  Drawer
} from './overlays';

// Re-export theme as default for backward compatibility
export { theme as default } from './tokens';
