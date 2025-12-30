/**
 * useKeyboardShortcuts - Global keyboard navigation hook
 *
 * Provides keyboard shortcuts for quick navigation throughout the app.
 * Respects focus states and input fields to avoid conflicts.
 *
 * @example
 * // In a layout component
 * useKeyboardShortcuts();
 *
 * Shortcuts:
 * - G: Go to Gacha
 * - C: Go to Collection
 * - D: Go to Dojo
 * - F: Go to Fishing
 * - W: Go to Fortune Wheel
 * - P: Go to Profile
 * - S: Go to Settings
 * - ?: Show help (shortcuts overlay)
 * - Escape: Close modals/overlays
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Shortcut definitions
const SHORTCUTS = {
  g: '/gacha',
  c: '/collection',
  d: '/dojo',
  f: '/fishing',
  w: '/fortune-wheel',
  p: '/profile',
  s: '/settings'
};

// Pages that should not have navigation shortcuts active
const EXCLUDED_PATHS = ['/login', '/register', '/roll', '/banner'];

/**
 * Check if the current focus is on an input element
 */
const isInputFocused = () => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isEditable = activeElement.isContentEditable;
  const isInput = ['input', 'textarea', 'select'].includes(tagName);

  return isInput || isEditable;
};

/**
 * Check if any modal or overlay is open
 */
const isModalOpen = () => {
  return document.querySelector('[role="dialog"]') !== null ||
         document.querySelector('[data-modal-open="true"]') !== null;
};

const useKeyboardShortcuts = ({ enabled = true, onShowHelp } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lastShortcut, setLastShortcut] = useState(null);

  // Check if shortcuts should be active on current page
  const isActiveOnPage = useCallback(() => {
    return !EXCLUDED_PATHS.some(path => location.pathname.startsWith(path));
  }, [location.pathname]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event) => {
    // Don't trigger if disabled
    if (!enabled) return;

    // Don't trigger if page excludes shortcuts
    if (!isActiveOnPage()) return;

    // Don't trigger if typing in an input
    if (isInputFocused()) return;

    // Don't trigger if modifier keys are pressed (except for ?)
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const key = event.key.toLowerCase();

    // Handle help shortcut
    if (event.shiftKey && key === '?') {
      event.preventDefault();
      if (onShowHelp) {
        onShowHelp();
      }
      setLastShortcut('help');
      return;
    }

    // Don't process other shortcuts if shift is pressed
    if (event.shiftKey) return;

    // Navigation shortcuts
    if (SHORTCUTS[key]) {
      // Don't navigate if already on the page
      if (location.pathname === SHORTCUTS[key]) return;

      // Don't navigate if modal is open
      if (isModalOpen()) return;

      event.preventDefault();
      navigate(SHORTCUTS[key]);
      setLastShortcut(key);
      return;
    }

    // Escape to go back or close overlay
    if (key === 'escape') {
      // Let the event bubble for modals to catch
      setLastShortcut('escape');
    }
  }, [enabled, isActiveOnPage, location.pathname, navigate, onShowHelp]);

  // Attach event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Clear last shortcut after a delay
  useEffect(() => {
    if (lastShortcut) {
      const timer = setTimeout(() => setLastShortcut(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastShortcut]);

  return {
    lastShortcut,
    shortcuts: SHORTCUTS,
    isActive: enabled && isActiveOnPage()
  };
};

/**
 * Shortcut help data for display
 */
export const SHORTCUT_HELP = [
  { key: 'G', description: 'Go to Gacha' },
  { key: 'C', description: 'Go to Collection' },
  { key: 'D', description: 'Go to Dojo' },
  { key: 'F', description: 'Go to Fishing' },
  { key: 'W', description: 'Go to Fortune Wheel' },
  { key: 'P', description: 'Go to Profile' },
  { key: 'S', description: 'Go to Settings' },
  { key: '?', description: 'Show this help' },
  { key: 'Esc', description: 'Close dialogs' }
];

export default useKeyboardShortcuts;
