/**
 * ToastContext - Global toast notification management
 *
 * Provides a way to show toast notifications from anywhere in the app.
 *
 * @example
 * const { showToast } = useToast();
 * showToast({ variant: 'success', title: 'Saved!' });
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ToastList } from '../components/UI';
import { theme } from '../design-system';

const ToastContext = createContext(null);

/**
 * Default duration for each toast variant
 */
const TOAST_DURATIONS = {
  success: theme.timing?.successMessageDismiss || 4000,
  error: theme.timing?.errorMessageDismiss || 6000,
  warning: 5000,
  info: 4000
};

/**
 * ToastProvider Component
 *
 * Wrap your app with this provider to enable toast notifications.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastIdCounter = useRef(0);

  /**
   * Show a toast notification
   *
   * @param {Object} options
   * @param {'success' | 'error' | 'warning' | 'info'} options.variant - Toast type
   * @param {string} options.title - Toast title (required)
   * @param {string} options.description - Optional description
   * @param {number} options.duration - Auto-dismiss duration in ms (0 for no auto-dismiss)
   * @param {boolean} options.dismissible - Whether toast can be dismissed (default: true)
   * @returns {string} Toast ID (for programmatic dismissal)
   */
  /**
   * Dismiss a toast by ID
   */
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((options) => {
    const id = `toast-${++toastIdCounter.current}`;
    const {
      variant = 'info',
      title,
      description,
      duration = TOAST_DURATIONS[variant],
      dismissible = true
    } = options;

    const newToast = {
      id,
      variant,
      title,
      description,
      dismissible
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Convenience methods for common toast types
   */
  const success = useCallback((title, description) => {
    return showToast({ variant: 'success', title, description });
  }, [showToast]);

  const error = useCallback((title, description) => {
    return showToast({ variant: 'error', title, description });
  }, [showToast]);

  const warning = useCallback((title, description) => {
    return showToast({ variant: 'warning', title, description });
  }, [showToast]);

  const info = useCallback((title, description) => {
    return showToast({ variant: 'info', title, description });
  }, [showToast]);

  const value = {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

/**
 * Hook to access toast functionality
 *
 * @returns {Object} Toast context value
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
