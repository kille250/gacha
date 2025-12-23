/**
 * Centralized Timer Management for Fishing
 * 
 * Replaces scattered setTimeout/useRef patterns with a controlled timer system.
 * All timers are automatically cleaned up on unmount.
 * 
 * USAGE:
 * import { useFishingTimers, TIMER_IDS } from './useFishingTimers';
 * 
 * const timers = useFishingTimers();
 * timers.setTimer(TIMER_IDS.FISH_BITE, () => dispatch({ type: 'FISH_APPEARED' }), waitTime);
 * timers.clearTimer(TIMER_IDS.FISH_BITE);
 * timers.clearAll();
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing named timers with automatic cleanup
 * @returns {Object} Timer control functions
 */
export function useFishingTimers() {
  const timersRef = useRef(new Map());
  
  /**
   * Set a named timer, clearing any existing timer with the same name
   * @param {string} id - Unique timer identifier
   * @param {Function} callback - Function to call when timer fires
   * @param {number} delay - Delay in milliseconds
   */
  const setTimer = useCallback((id, callback, delay) => {
    // Clear existing timer with same ID
    const existing = timersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Set new timer
    const timerId = setTimeout(() => {
      timersRef.current.delete(id);
      callback();
    }, delay);
    
    timersRef.current.set(id, timerId);
  }, []);
  
  /**
   * Clear a specific timer by ID
   * @param {string} id - Timer identifier to clear
   */
  const clearTimer = useCallback((id) => {
    const timerId = timersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);
  
  /**
   * Clear all active timers
   */
  const clearAll = useCallback(() => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId));
    timersRef.current.clear();
  }, []);
  
  /**
   * Check if a timer is currently active
   * @param {string} id - Timer identifier
   * @returns {boolean} True if timer is active
   */
  const hasTimer = useCallback((id) => {
    return timersRef.current.has(id);
  }, []);
  
  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
    };
  }, []);
  
  return { setTimer, clearTimer, clearAll, hasTimer };
}

// Timer ID constants for type safety and discoverability
export const TIMER_IDS = {
  CAST_ANIMATION: 'castAnimation',
  FISH_BITE: 'fishBite',
  MISS_TIMEOUT: 'missTimeout',
  RESULT_DISPLAY: 'resultDisplay',
  AUTOFISH_FAILSAFE: 'autofishFailsafe',
};

export default useFishingTimers;

