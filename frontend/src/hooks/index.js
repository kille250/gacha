/**
 * Barrel export for custom hooks
 */
export { useGachaRoll } from './useGachaRoll';
export { useHourlyReward } from './useHourlyReward';
export { useActionLock } from './useActionLock';
export { useAutoDismissError, isCriticalError, getErrorSeverity } from './useAutoDismissError';
export { useSkipAnimations } from './useSkipAnimations';
export { usePendingOperation, PENDING_OPERATION_KEYS } from './usePendingOperation';
export { useVisibilityRefresh } from './useVisibilityRefresh';

// Fishing hooks
export { useFishingTimers, TIMER_IDS } from './useFishingTimers';
export { useFishingState, FISHING_ACTIONS } from './useFishingState';
export { useFishingSession } from './useFishingSession';
export { useFishingAutofish } from './useFishingAutofish';
export { useFishingMultiplayer } from './useFishingMultiplayer';

