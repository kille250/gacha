/**
 * useUndoableAction - Hook for managing undoable destructive actions
 *
 * Provides a sophisticated undo system for admin actions:
 * - Delayed execution with undo window
 * - Toast notification with undo button
 * - Automatic cleanup after timeout
 * - Multiple pending actions support
 * - Accessibility announcements
 *
 * @example
 * const { scheduleAction, cancelAction, pendingActions } = useUndoableAction({
 *   undoWindowMs: 5000,
 *   onExecute: (action) => api.delete(action.id),
 *   onUndo: () => toast.success('Action undone'),
 * });
 *
 * // Schedule a deletable action
 * scheduleAction({
 *   id: 'delete-character-123',
 *   type: 'delete',
 *   label: 'Delete Character: Gojo',
 *   execute: () => deleteCharacter(123),
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

// Default undo window in milliseconds
const DEFAULT_UNDO_WINDOW = 5000;

/**
 * Hook for managing undoable actions with delayed execution
 *
 * @param {Object} options - Configuration options
 * @param {number} options.undoWindowMs - Time window for undo in ms (default: 5000)
 * @param {Function} options.onExecute - Callback when action executes
 * @param {Function} options.onUndo - Callback when action is undone
 * @param {Function} options.onError - Callback when action fails
 * @returns {Object} Undo action utilities
 */
export const useUndoableAction = (options = {}) => {
  const {
    undoWindowMs = DEFAULT_UNDO_WINDOW,
    onExecute,
    onUndo,
    onError
  } = options;

  const { t } = useTranslation();
  const toast = useToast();

  // Track pending actions
  const [pendingActions, setPendingActions] = useState(new Map());
  const timeoutsRef = useRef(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    const currentTimeouts = timeoutsRef.current;
    return () => {
      currentTimeouts.forEach(timeout => clearTimeout(timeout));
      currentTimeouts.clear();
    };
  }, []);

  /**
   * Execute a pending action
   */
  const executeAction = useCallback(async (actionId) => {
    const action = pendingActions.get(actionId);
    if (!action) return;

    // Remove from pending
    setPendingActions(prev => {
      const next = new Map(prev);
      next.delete(actionId);
      return next;
    });

    // Clear timeout
    if (timeoutsRef.current.has(actionId)) {
      clearTimeout(timeoutsRef.current.get(actionId));
      timeoutsRef.current.delete(actionId);
    }

    try {
      // Execute the action
      await action.execute();
      onExecute?.(action);

      // Show success toast
      toast.success(action.successMessage || t('admin.actionCompleted', 'Action completed'));
    } catch (error) {
      console.error('Action execution failed:', error);
      onError?.(error, action);
      toast.error(error.message || t('admin.actionFailed', 'Action failed'));
    }
  }, [pendingActions, onExecute, onError, toast, t]);

  /**
   * Cancel a pending action (undo)
   */
  const cancelAction = useCallback((actionId) => {
    const action = pendingActions.get(actionId);
    if (!action) return false;

    // Clear timeout
    if (timeoutsRef.current.has(actionId)) {
      clearTimeout(timeoutsRef.current.get(actionId));
      timeoutsRef.current.delete(actionId);
    }

    // Remove from pending
    setPendingActions(prev => {
      const next = new Map(prev);
      next.delete(actionId);
      return next;
    });

    // Call undo callback
    onUndo?.(action);

    // Show undo confirmation
    toast.success(
      action.undoMessage || t('admin.actionUndone', 'Action undone'),
      { duration: 2000 }
    );

    // Announce for screen readers
    if (typeof window !== 'undefined' && window.announce) {
      window.announce(t('admin.actionUndone', 'Action undone'));
    }

    return true;
  }, [pendingActions, onUndo, toast, t]);

  /**
   * Schedule an action for delayed execution
   *
   * @param {Object} action - The action to schedule
   * @param {string} action.id - Unique identifier for the action
   * @param {string} action.type - Type of action (delete, update, etc.)
   * @param {string} action.label - Human-readable action description
   * @param {Function} action.execute - Async function to execute the action
   * @param {string} action.successMessage - Toast message on success
   * @param {string} action.undoMessage - Toast message on undo
   * @param {any} action.data - Optional data associated with the action
   */
  const scheduleAction = useCallback((action) => {
    const { id, label, execute } = action;

    if (!id || !execute) {
      console.error('scheduleAction requires id and execute function');
      return;
    }

    // If action already pending, cancel previous
    if (pendingActions.has(id)) {
      cancelAction(id);
    }

    // Add to pending actions
    const scheduledAction = {
      ...action,
      scheduledAt: Date.now(),
      executeAt: Date.now() + undoWindowMs
    };

    setPendingActions(prev => {
      const next = new Map(prev);
      next.set(id, scheduledAction);
      return next;
    });

    // Schedule execution
    const timeoutId = setTimeout(() => {
      executeAction(id);
    }, undoWindowMs);

    timeoutsRef.current.set(id, timeoutId);

    // Show toast with undo button
    toast.info(
      <UndoToastContent>
        <span>{label}</span>
        <UndoButton onClick={() => cancelAction(id)}>
          {t('common.undo', 'Undo')}
        </UndoButton>
      </UndoToastContent>,
      {
        duration: undoWindowMs,
        id: `undo-${id}`,
        dismissible: false
      }
    );

    return id;
  }, [pendingActions, cancelAction, executeAction, undoWindowMs, toast, t]);

  /**
   * Cancel all pending actions
   */
  const cancelAllActions = useCallback(() => {
    const cancelled = [];
    pendingActions.forEach((_, id) => {
      if (cancelAction(id)) {
        cancelled.push(id);
      }
    });
    return cancelled;
  }, [pendingActions, cancelAction]);

  /**
   * Check if an action is pending
   */
  const isActionPending = useCallback((actionId) => {
    return pendingActions.has(actionId);
  }, [pendingActions]);

  /**
   * Get remaining time for an action in ms
   */
  const getRemainingTime = useCallback((actionId) => {
    const action = pendingActions.get(actionId);
    if (!action) return 0;
    return Math.max(0, action.executeAt - Date.now());
  }, [pendingActions]);

  return {
    // Actions
    scheduleAction,
    cancelAction,
    cancelAllActions,
    executeAction,

    // State
    pendingActions: Array.from(pendingActions.values()),
    pendingCount: pendingActions.size,
    isActionPending,
    getRemainingTime
  };
};

// Simple styled components for the undo toast
// Using inline styles to avoid styled-components dependency in the hook
const UndoToastContent = ({ children }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    width: '100%'
  }}>
    {children}
  </div>
);

const UndoButton = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 12px',
      background: 'rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '6px',
      color: 'white',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'background 0.15s'
    }}
    onMouseEnter={(e) => {
      e.target.style.background = 'rgba(255, 255, 255, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.target.style.background = 'rgba(255, 255, 255, 0.2)';
    }}
  >
    {children}
  </button>
);

export default useUndoableAction;
