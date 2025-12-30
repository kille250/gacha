/**
 * UI Hooks
 *
 * Hooks for managing UI-specific state and interactions.
 * These are generic, reusable hooks not tied to specific features.
 */

// Modal management
export { useModal, useModalWithData, useConfirmModal } from '../useModal';

// Focus management
export {
  useFocusTrap,
  useFocusFirstError,
  useRovingTabindex,
  useFocusRestore,
  useModalFocus,
} from '../useFocusManagement';

// Swipe gestures
export { useSwipeGesture } from '../useSwipeGesture';
export { useSwipeToDelete } from '../useSwipeToDelete';

// Filter state
export { useFilterState, useFilteredData } from '../useFilterState';

// Keyboard shortcuts
export { default as useKeyboardShortcuts, SHORTCUT_HELP } from './useKeyboardShortcuts';
