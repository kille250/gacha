/**
 * Barrel export for custom hooks
 */
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

