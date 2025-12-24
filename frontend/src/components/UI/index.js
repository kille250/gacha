/**
 * UI Component Library
 *
 * This module exports all shared UI components for the application.
 * Components are consolidated from the design-system with additional
 * app-specific components.
 *
 * MIGRATION NOTE: Prefer importing directly from '../design-system' for:
 * - Basic primitives (Button, Input, Badge, Typography)
 * - Layout components (Container, Grid, Stack, Flex)
 * - Feedback states (LoadingState, ErrorState, EmptyState, Alert)
 * - Overlays (Modal, Drawer, ConfirmDialog)
 *
 * This index re-exports design-system components for backward compatibility
 * and provides app-specific components not in the design-system.
 *
 * @example
 * // Preferred - direct design-system import
 * import { Button, Modal, LoadingState } from '../design-system';
 *
 * // Also works - for app-specific components
 * import { ErrorBoundary, MainLayout, Toast } from '../components/UI';
 */

// ============================================================
// RE-EXPORTS FROM DESIGN SYSTEM (for backward compatibility)
// ============================================================

// Primitives
export {
  Button,
  IconButton,
  Input,
  Select,
  Badge,
  Spinner,
  // Typography
  Text,
  Caption,
  Heading1,
  Heading2,
  Heading3,
  // Chips
  Chip,
  RarityBadge,
} from '../../design-system';

// Feedback
export {
  LoadingState,
  ErrorState,
  EmptyState,
  Alert,
} from '../../design-system';

// Overlay
export {
  Modal,
  Drawer,
  ConfirmDialog,
} from '../../design-system';

// Layout
export {
  Container,
  Stack,
  Grid,
  AutoGrid,
  Flex,
  Center,
  GlassCard,
  Section,
} from '../../design-system';

// ============================================================
// APP-SPECIFIC COMPONENTS (not in design-system)
// ============================================================

// Toast notifications (app-specific styling and ToastList)
export { default as Toast, ToastList } from './feedback/Toast';

// Additional spinner variants
export { InlineSpinner, PageLoader } from './feedback/Spinner';

// Error boundary (class component for catching React errors)
export { default as ErrorBoundary } from './data/ErrorBoundary';

// Card component (distinct from GlassCard)
export { default as Card } from './data/Card';

// Layout components
export { default as MainLayout } from './layout/MainLayout';
export { default as PageLayout } from './layout/PageLayout';

// Form components with app-specific styling
export { default as SearchInput } from './forms/SearchInput';

// Action button with loading state
export { default as ActionButton } from './buttons/ActionButton';

// Stack variants
export { HStack, VStack, Cluster } from './layout/Stack';
