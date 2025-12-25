/**
 * useUndoStack - Undo/redo capability for admin actions
 *
 * Provides a way to undo recent actions with a timed window.
 * Perfect for destructive or batch operations in admin interfaces.
 *
 * @features
 * - Time-limited undo window (configurable)
 * - Multiple undo levels
 * - Visual countdown for undo window
 * - Automatic expiration of old undos
 * - Toast notification integration
 *
 * @example
 * const { push, undo, canUndo, pendingUndos } = useUndoStack({
 *   onUndo: async (action) => {
 *     // Revert the action
 *     await revertAction(action);
 *   },
 *   undoWindowMs: 5000, // 5 second undo window
 * });
 *
 * // When performing an action
 * await deleteUser(userId);
 * push({
 *   type: 'DELETE_USER',
 *   payload: { userId, userData },
 *   description: 'Deleted user "john"',
 * });
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

const useUndoStack = ({
  onUndo,
  undoWindowMs = 5000,
  maxUndoLevels = 5,
  onExpire,
} = {}) => {
  const [stack, setStack] = useState([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const timersRef = useRef({});
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear all timers
      Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Push a new action onto the stack
  const push = useCallback((action) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const entry = {
      id,
      ...action,
      timestamp: Date.now(),
      expiresAt: Date.now() + undoWindowMs,
    };

    setStack(prev => {
      // Limit stack size
      const newStack = [entry, ...prev].slice(0, maxUndoLevels);
      return newStack;
    });

    // Set expiration timer
    timersRef.current[id] = setTimeout(() => {
      if (mountedRef.current) {
        setStack(prev => prev.filter(e => e.id !== id));
        if (onExpire) {
          onExpire(entry);
        }
      }
      delete timersRef.current[id];
    }, undoWindowMs);

    return id;
  }, [undoWindowMs, maxUndoLevels, onExpire]);

  // Undo the most recent action (or a specific one by id)
  const undo = useCallback(async (actionId) => {
    const targetId = actionId || stack[0]?.id;
    if (!targetId) return false;

    const entry = stack.find(e => e.id === targetId);
    if (!entry) return false;

    setIsUndoing(true);

    try {
      // Clear the expiration timer
      if (timersRef.current[targetId]) {
        clearTimeout(timersRef.current[targetId]);
        delete timersRef.current[targetId];
      }

      // Remove from stack
      setStack(prev => prev.filter(e => e.id !== targetId));

      // Execute the undo
      if (onUndo) {
        await onUndo(entry);
      }

      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    } finally {
      if (mountedRef.current) {
        setIsUndoing(false);
      }
    }
  }, [stack, onUndo]);

  // Undo all actions
  const undoAll = useCallback(async () => {
    const results = [];
    for (const entry of stack) {
      const result = await undo(entry.id);
      results.push({ id: entry.id, success: result });
    }
    return results;
  }, [stack, undo]);

  // Clear all pending undos
  const clear = useCallback(() => {
    // Clear all timers
    Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
    timersRef.current = {};
    setStack([]);
  }, []);

  // Get time remaining for an action
  const getTimeRemaining = useCallback((actionId) => {
    const entry = stack.find(e => e.id === actionId);
    if (!entry) return 0;

    const remaining = entry.expiresAt - Date.now();
    return Math.max(0, remaining);
  }, [stack]);

  // Check if can undo
  const canUndo = stack.length > 0 && !isUndoing;

  // Pending undos with time remaining
  const pendingUndos = useMemo(() => {
    const now = Date.now();
    return stack.map(entry => ({
      ...entry,
      timeRemaining: Math.max(0, entry.expiresAt - now),
      percentRemaining: Math.max(0, ((entry.expiresAt - now) / undoWindowMs) * 100),
    }));
  }, [stack, undoWindowMs]);

  return {
    push,
    undo,
    undoAll,
    clear,
    canUndo,
    isUndoing,
    pendingUndos,
    getTimeRemaining,
    stackSize: stack.length,
  };
};

export default useUndoStack;

/**
 * UndoToast - A toast notification component for undo actions
 * To be used with the design system
 */
export const createUndoToast = ({
  description,
  onUndo,
  timeRemaining,
  percentRemaining,
}) => ({
  type: 'info',
  message: description,
  action: {
    label: 'Undo',
    onClick: onUndo,
  },
  duration: timeRemaining,
  showProgress: true,
  progress: percentRemaining,
});
