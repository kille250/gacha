/**
 * useEssenceTapLifecycle - Page lifecycle management hook
 *
 * Handles visibility changes, page unload, and background/foreground transitions.
 */

import { useEffect, useCallback, useRef } from 'react';
import { onVisibilityChange } from '../../cache/manager';

/**
 * Lifecycle management hook for Essence Tap
 * @param {Object} options - Hook options
 * @param {function} options.onVisibilityReturn - Callback when returning to tab
 * @param {function} options.onPageUnload - Callback before page unload
 * @param {function} options.flushPendingActions - Flush pending actions to server
 * @param {boolean} options.isConnected - Whether WebSocket is connected
 * @returns {Object} Lifecycle state and handlers
 */
export function useEssenceTapLifecycle(options = {}) {
  const {
    onVisibilityReturn,
    onPageUnload,
    flushPendingActions,
    isConnected: _isConnected
  } = options;

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Track visibility state
  const isVisibleRef = useRef(true);

  // Track last visibility change time
  const lastVisibilityChangeRef = useRef(Date.now());

  /**
   * Handle page unload
   */
  const handleUnload = useCallback(() => {
    if (flushPendingActions) {
      flushPendingActions();
    }
    if (onPageUnload) {
      onPageUnload();
    }
  }, [flushPendingActions, onPageUnload]);

  /**
   * Handle visibility change
   */
  const handleVisibilityChange = useCallback(() => {
    const wasVisible = isVisibleRef.current;
    const isNowVisible = document.visibilityState === 'visible';
    isVisibleRef.current = isNowVisible;

    if (!wasVisible && isNowVisible) {
      // Returning to tab
      const hiddenDuration = Date.now() - lastVisibilityChangeRef.current;

      if (onVisibilityReturn) {
        onVisibilityReturn(hiddenDuration);
      }
    } else if (wasVisible && !isNowVisible) {
      // Leaving tab
      lastVisibilityChangeRef.current = Date.now();

      // Flush pending actions when leaving
      if (flushPendingActions) {
        flushPendingActions();
      }
    }
  }, [onVisibilityReturn, flushPendingActions]);

  // Set up lifecycle listeners
  useEffect(() => {
    isMountedRef.current = true;

    // Page unload handlers
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // Visibility change handler
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleUnload, handleVisibilityChange]);

  // Set up cache-based visibility change (with stale detection)
  useEffect(() => {
    const cleanup = onVisibilityChange('essence-tap-game-state', (staleLevel) => {
      if (!isMountedRef.current) return;

      if (staleLevel && staleLevel !== 'static') {
        if (onVisibilityReturn) {
          const hiddenDuration = Date.now() - lastVisibilityChangeRef.current;
          onVisibilityReturn(hiddenDuration, staleLevel);
        }
      }
    });

    return cleanup;
  }, [onVisibilityReturn]);

  /**
   * Check if component is still mounted
   */
  const isMounted = useCallback(() => {
    return isMountedRef.current;
  }, []);

  /**
   * Check if page is currently visible
   */
  const isVisible = useCallback(() => {
    return isVisibleRef.current;
  }, []);

  return {
    isMounted,
    isVisible,
    isMountedRef,
    isVisibleRef
  };
}

export default useEssenceTapLifecycle;
