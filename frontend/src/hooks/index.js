/**
 * Hooks Barrel Export
 *
 * Provides both flat exports (backward compatible) and domain-organized exports.
 *
 * Recommended import patterns:
 *
 * @example
 * // Domain-specific imports (preferred for clarity)
 * import { useModal, useSwipeGesture } from '../hooks/ui';
 * import { useAsyncAction, useActionLock } from '../hooks/async';
 * import { useGachaRoll, useFishingState } from '../hooks/features';
 *
 * @example
 * // Flat imports (backward compatible)
 * import { useModal, useAsyncAction, useGachaRoll } from '../hooks';
 */

// ==================== DOMAIN EXPORTS ====================
// These provide organized access to hooks by category

// UI hooks - modals, focus, gestures, filters
export * from './ui';

// Async hooks - loading states, action locking, network
export * from './async';

// Feature hooks - gacha, collection, fishing, upload
export * from './features';

// Data hooks - modal data, error handling
export * from './data';

// ==================== FLAT EXPORTS (BACKWARD COMPATIBLE) ====================
// These maintain backward compatibility with existing imports

// Core UI
export { useGachaRoll } from './useGachaRoll';
export { useHourlyReward } from './useHourlyReward';
export { useActionLock } from './useActionLock';
export { useAsyncAction, useAsyncActionWithConfirm } from './useAsyncAction';
export { useAutoDismissError, isCriticalError, getErrorSeverity } from './useAutoDismissError';
export { useSkipAnimations } from './useSkipAnimations';
export { usePendingOperation, PENDING_OPERATION_KEYS } from './usePendingOperation';
export { useVisibilityRefresh } from './useVisibilityRefresh';

// Fishing hooks - Core game logic
export { useFishingTimers, TIMER_IDS } from './useFishingTimers';
export { useFishingState, FISHING_ACTIONS } from './useFishingState';
export { useFishingSession } from './useFishingSession';
export { useFishingAutofish } from './useFishingAutofish';
export { useFishingMultiplayer } from './useFishingMultiplayer';

// Fishing hooks - UI & Modals (composed from focused hooks)
export { useFishingNotifications, formatChallengeReward } from './useFishingNotifications';
export { useFishingModals, MODAL_TYPES } from './useFishingModals';

// Fishing hooks - Modal-specific logic (focused hooks)
export { useFishingTrade } from './useFishingTrade';
export { useFishingChallengesModal } from './useFishingChallengesModal';
export { useFishingEquipment } from './useFishingEquipment';
export { useFishingPrestige } from './useFishingPrestige';

// Fishing hooks - Extracted helpers
export { useSessionStats } from './useSessionStats';
export { useFishingKeyboard } from './useFishingKeyboard';

// Utility hooks
export { useModalData, useMultiModalData } from './useModalData';

// Upload hooks
export { useUploadState, FILE_STATUS, UPLOAD_FLOW_STATES } from './useUploadState';
export { useUploadController } from './useUploadController';
export { useSwipeToDelete } from './useSwipeToDelete';

// Page-level hooks
export { useCollectionPage } from './useCollectionPage';
export { useGachaPage } from './useGachaPage';
export { useBannerPage } from './useBannerPage';
export { useRollPage } from './useRollPage';
export { useDojoPage } from './useDojoPage';
export { useCollection } from './useCollection';

// Modal hooks
export { useModal, useModalWithData, useConfirmModal } from './useModal';

// Filter hooks
export { useFilterState, useFilteredData } from './useFilterState';
export { useFilterParams } from './useFilterParams';

// Page error handling
export { usePageError, extractErrorMessage } from './usePageError';

// Focus management hooks
export {
  useFocusTrap,
  useFocusFirstError,
  useRovingTabindex,
  useFocusRestore,
  useModalFocus,
} from './useFocusManagement';

// Network status
export { useNetworkStatus } from './useNetworkStatus';

// Captcha
export { useCaptchaProtectedRequest } from './useCaptchaProtectedRequest';

// Swipe gesture
export { useSwipeGesture } from './useSwipeGesture';

// Duplicate check
export { useDuplicateCheck } from './useDuplicateCheck';

// Video visibility (performance optimization)
export { useVideoVisibility, useLazyVideo } from './useVideoVisibility';
