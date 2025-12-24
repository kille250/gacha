/**
 * Async Hooks
 *
 * Hooks for managing async operations, loading states, and action locking.
 */

// Async action management
export { useAsyncAction, useAsyncActionWithConfirm } from '../useAsyncAction';

// Action lock (prevents double-clicks)
export { useActionLock } from '../useActionLock';

// Pending operation tracking
export { usePendingOperation, PENDING_OPERATION_KEYS } from '../usePendingOperation';

// Error handling with auto-dismiss
export { useAutoDismissError, isCriticalError, getErrorSeverity } from '../useAutoDismissError';

// Network status
export { useNetworkStatus } from '../useNetworkStatus';

// Captcha protection
export { useCaptchaProtectedRequest } from '../useCaptchaProtectedRequest';

// Visibility-based refresh
export { useVisibilityRefresh } from '../useVisibilityRefresh';
