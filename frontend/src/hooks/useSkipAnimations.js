/**
 * useSkipAnimations - Centralized hook for animation skip preference
 * 
 * Provides a single source of truth for the "fast mode" / skip animations
 * preference across all gacha-related pages.
 * 
 * Features:
 * - Persists preference to localStorage
 * - Syncs across browser tabs via storage event
 * - Provides consistent API for all consuming components
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gacha_skipAnimations';

/**
 * Custom hook for managing animation skip preference
 * @returns {[boolean, Function]} [skipAnimations, setSkipAnimations]
 */
export const useSkipAnimations = () => {
  // Initialize from localStorage
  const [skipAnimations, setSkipAnimationsState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Setter that also persists to localStorage
  const setSkipAnimations = useCallback((value) => {
    const newValue = typeof value === 'function' ? value(skipAnimations) : value;
    setSkipAnimationsState(newValue);
    try {
      localStorage.setItem(STORAGE_KEY, newValue.toString());
    } catch {
      // Ignore localStorage errors (private browsing, etc.)
    }
  }, [skipAnimations]);

  // Sync across tabs via storage event
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setSkipAnimationsState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return [skipAnimations, setSkipAnimations];
};

export default useSkipAnimations;



