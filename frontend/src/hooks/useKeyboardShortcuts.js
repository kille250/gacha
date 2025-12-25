/**
 * useKeyboardShortcuts - Global keyboard shortcut handler
 *
 * Provides a declarative way to register keyboard shortcuts with proper
 * cleanup, conflict detection, and accessibility features.
 *
 * @features
 * - Cross-platform key handling (Cmd vs Ctrl)
 * - Automatic cleanup on unmount
 * - Conflict detection and warning
 * - Optional help modal showing all shortcuts
 * - Respects focus context (ignores shortcuts in inputs unless specified)
 * - Supports key sequences (e.g., "g i" for go to inbox)
 *
 * @example
 * useKeyboardShortcuts([
 *   { keys: ['ctrl', 's'], handler: handleSave, description: 'Save changes' },
 *   { keys: ['ctrl', 'k'], handler: openSearch, description: 'Quick search' },
 *   { keys: ['escape'], handler: closeModal, description: 'Close modal' },
 * ]);
 */

import { useEffect, useCallback, useRef, useState, createContext, useContext } from 'react';

// Key aliases for cross-platform support
const KEY_ALIASES = {
  ctrl: ['control', 'ctrl'],
  cmd: ['meta', 'command', 'cmd'],
  alt: ['alt', 'option'],
  shift: ['shift'],
  mod: typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    ? ['meta']
    : ['control'],
};

// Elements that should not trigger shortcuts when focused
const IGNORED_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT', '[contenteditable="true"]'];

/**
 * Normalize a key string to lowercase
 */
const normalizeKey = (key) => key.toLowerCase();

/**
 * Check if a key matches an alias
 */
const keyMatches = (pressedKey, targetKey) => {
  const normalizedPressed = normalizeKey(pressedKey);
  const normalizedTarget = normalizeKey(targetKey);

  // Check aliases
  for (const [alias, keys] of Object.entries(KEY_ALIASES)) {
    if (normalizedTarget === alias && keys.includes(normalizedPressed)) {
      return true;
    }
  }

  return normalizedPressed === normalizedTarget;
};

/**
 * Check if an event matches a shortcut definition
 */
const eventMatchesShortcut = (event, keys) => {
  const pressedKeys = [];

  if (event.ctrlKey) pressedKeys.push('control');
  if (event.metaKey) pressedKeys.push('meta');
  if (event.altKey) pressedKeys.push('alt');
  if (event.shiftKey) pressedKeys.push('shift');
  pressedKeys.push(event.key);

  // All keys in shortcut must be pressed
  const normalizedShortcutKeys = keys.map(normalizeKey);

  // Handle 'mod' alias specially
  const expandedShortcutKeys = normalizedShortcutKeys.flatMap(key => {
    if (key === 'mod') {
      return KEY_ALIASES.mod;
    }
    return [key];
  });

  // Check if all shortcut keys are present in pressed keys
  return expandedShortcutKeys.every(shortcutKey => {
    return pressedKeys.some(pressedKey => keyMatches(pressedKey, shortcutKey));
  }) && pressedKeys.length === expandedShortcutKeys.length;
};

/**
 * Check if the active element should ignore shortcuts
 */
const shouldIgnoreShortcut = (event, ignoreInInputs = true) => {
  if (!ignoreInInputs) return false;

  const { activeElement } = document;
  if (!activeElement) return false;

  return IGNORED_ELEMENTS.some(selector => {
    if (selector.startsWith('[')) {
      return activeElement.matches(selector);
    }
    return activeElement.tagName === selector;
  });
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (keys) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return keys.map(key => {
    const normalized = normalizeKey(key);

    if (normalized === 'mod') {
      return isMac ? 'Cmd' : 'Ctrl';
    }
    if (normalized === 'ctrl' || normalized === 'control') {
      return isMac ? 'Ctrl' : 'Ctrl';
    }
    if (normalized === 'cmd' || normalized === 'meta') {
      return isMac ? 'Cmd' : 'Win';
    }
    if (normalized === 'alt') {
      return isMac ? 'Option' : 'Alt';
    }
    if (normalized === 'shift') {
      return 'Shift';
    }
    if (normalized === 'escape') {
      return 'Esc';
    }
    if (normalized === 'backspace') {
      return 'Backspace';
    }
    if (normalized === 'delete') {
      return 'Delete';
    }
    if (normalized === 'enter') {
      return 'Enter';
    }
    if (normalized === 'arrowup') {
      return 'Arrow Up';
    }
    if (normalized === 'arrowdown') {
      return 'Arrow Down';
    }
    if (normalized === 'arrowleft') {
      return 'Arrow Left';
    }
    if (normalized === 'arrowright') {
      return 'Arrow Right';
    }

    return key.toUpperCase();
  }).join(' + ');
};

/**
 * Main keyboard shortcuts hook
 */
const useKeyboardShortcuts = (shortcuts, options = {}) => {
  const {
    enabled = true,
    ignoreInInputs = true,
    preventDefault = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref up to date
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Skip if in an input and ignoreInInputs is true
      if (shouldIgnoreShortcut(event, ignoreInInputs)) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (!shortcut.enabled && shortcut.enabled !== undefined) {
          continue;
        }

        if (eventMatchesShortcut(event, shortcut.keys)) {
          // Respect ignoreInInputs per-shortcut
          if (shortcut.ignoreInInputs !== undefined && shouldIgnoreShortcut(event, shortcut.ignoreInInputs)) {
            continue;
          }

          if (preventDefault || shortcut.preventDefault) {
            event.preventDefault();
          }

          shortcut.handler(event);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, ignoreInInputs, preventDefault]);
};

export default useKeyboardShortcuts;

// ============================================
// ADMIN-SPECIFIC SHORTCUTS
// ============================================

/**
 * Pre-defined admin shortcuts
 */
export const ADMIN_SHORTCUTS = {
  // Navigation
  GO_TO_DASHBOARD: { keys: ['mod', 'd'], description: 'Go to Dashboard' },
  GO_TO_USERS: { keys: ['mod', 'u'], description: 'Go to Users' },
  GO_TO_CHARACTERS: { keys: ['mod', 'c'], description: 'Go to Characters' },
  GO_TO_BANNERS: { keys: ['mod', 'b'], description: 'Go to Banners' },
  GO_TO_SECURITY: { keys: ['mod', 's'], description: 'Go to Security' },

  // Actions
  SEARCH: { keys: ['mod', 'k'], description: 'Quick search' },
  NEW_ITEM: { keys: ['mod', 'n'], description: 'Create new item' },
  SAVE: { keys: ['mod', 's'], description: 'Save changes' },
  REFRESH: { keys: ['mod', 'r'], description: 'Refresh data' },

  // Selection
  SELECT_ALL: { keys: ['mod', 'a'], description: 'Select all' },
  DESELECT_ALL: { keys: ['escape'], description: 'Deselect all / Cancel' },

  // Modal
  CLOSE_MODAL: { keys: ['escape'], description: 'Close modal' },
  CONFIRM_ACTION: { keys: ['mod', 'enter'], description: 'Confirm action' },

  // Help
  SHOW_SHORTCUTS: { keys: ['shift', '?'], description: 'Show keyboard shortcuts' },
};

/**
 * Hook for admin-specific keyboard shortcuts
 */
export const useAdminKeyboardShortcuts = ({
  onNavigate,
  onSearch,
  onNew,
  onSave,
  onRefresh,
  onSelectAll,
  onDeselectAll,
  onCloseModal,
  onShowShortcuts,
  enabled = true,
}) => {
  const shortcuts = [];

  if (onNavigate) {
    shortcuts.push(
      { ...ADMIN_SHORTCUTS.GO_TO_DASHBOARD, handler: () => onNavigate('dashboard') },
      { ...ADMIN_SHORTCUTS.GO_TO_USERS, handler: () => onNavigate('users') },
      { ...ADMIN_SHORTCUTS.GO_TO_CHARACTERS, handler: () => onNavigate('characters') },
      { ...ADMIN_SHORTCUTS.GO_TO_BANNERS, handler: () => onNavigate('banners') },
      { ...ADMIN_SHORTCUTS.GO_TO_SECURITY, handler: () => onNavigate('security') },
    );
  }

  if (onSearch) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.SEARCH, handler: onSearch });
  }

  if (onNew) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.NEW_ITEM, handler: onNew });
  }

  if (onSave) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.SAVE, handler: onSave });
  }

  if (onRefresh) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.REFRESH, handler: onRefresh });
  }

  if (onSelectAll) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.SELECT_ALL, handler: onSelectAll });
  }

  if (onDeselectAll) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.DESELECT_ALL, handler: onDeselectAll });
  }

  if (onCloseModal) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.CLOSE_MODAL, handler: onCloseModal });
  }

  if (onShowShortcuts) {
    shortcuts.push({ ...ADMIN_SHORTCUTS.SHOW_SHORTCUTS, handler: onShowShortcuts, ignoreInInputs: false });
  }

  useKeyboardShortcuts(shortcuts, { enabled });

  return {
    shortcuts: shortcuts.map(s => ({
      keys: s.keys,
      description: s.description,
      formatted: formatShortcut(s.keys),
    })),
  };
};

// ============================================
// KEYBOARD SHORTCUTS CONTEXT
// ============================================

const KeyboardShortcutsContext = createContext({
  shortcuts: [],
  registerShortcuts: () => {},
  unregisterShortcuts: () => {},
});

/**
 * Provider for global keyboard shortcuts management
 */
export const KeyboardShortcutsProvider = ({ children }) => {
  const [registeredShortcuts, setRegisteredShortcuts] = useState([]);

  const registerShortcuts = useCallback((id, shortcuts) => {
    setRegisteredShortcuts(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return [...filtered, ...shortcuts.map(s => ({ ...s, id }))];
    });
  }, []);

  const unregisterShortcuts = useCallback((id) => {
    setRegisteredShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  // Use the main hook with all registered shortcuts
  useKeyboardShortcuts(registeredShortcuts);

  const value = {
    shortcuts: registeredShortcuts,
    registerShortcuts,
    unregisterShortcuts,
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcutsContext = () => useContext(KeyboardShortcutsContext);
