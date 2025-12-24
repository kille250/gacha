/**
 * useFocusManagement - Hook for managing focus in complex UI flows
 *
 * Features:
 * - Track focus history for restoration
 * - Focus first error on validation failure
 * - Roving tabindex for grid navigation
 * - Focus trap for modals
 */
import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook for focus trap within a container
 * @param {boolean} active - Whether the focus trap is active
 * @returns {Object} Ref to attach to container and keyboard handler
 */
export const useFocusTrap = (active) => {
  const containerRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (!active || !containerRef.current) return;

    if (e.key !== 'Tab') return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [active]);

  return { containerRef, handleKeyDown };
};

/**
 * Hook for focusing the first error field
 * @returns {Function} Function to call with validation state
 */
export const useFocusFirstError = () => {
  return useCallback((fileValidation, fileIds) => {
    for (const fileId of fileIds) {
      const validation = fileValidation[fileId];
      if (!validation) continue;

      for (const field of ['name', 'series', 'rarity']) {
        if (validation[field]?.touched && !validation[field]?.valid) {
          const element = document.getElementById(`${field}-${fileId}`);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
        }
      }
    }
    return false;
  }, []);
};

/**
 * Hook for roving tabindex in a grid
 * @param {number} itemCount - Number of items in the grid
 * @param {number} columns - Number of columns in the grid
 * @returns {Object} Current focused index and handlers
 */
export const useRovingTabindex = (itemCount, columns = 1) => {
  const focusedIndexRef = useRef(0);

  const handleKeyDown = useCallback((e, index) => {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(index + 1, itemCount - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(index - 1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(index + columns, itemCount - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(index - columns, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }

    focusedIndexRef.current = newIndex;
    return newIndex;
  }, [itemCount, columns]);

  const getTabIndex = useCallback((index) => {
    return index === focusedIndexRef.current ? 0 : -1;
  }, []);

  return {
    focusedIndex: focusedIndexRef.current,
    handleKeyDown,
    getTabIndex,
    setFocusedIndex: (index) => { focusedIndexRef.current = index; },
  };
};

/**
 * Hook for saving and restoring focus
 * @returns {Object} Functions to save and restore focus
 */
export const useFocusRestore = () => {
  const savedFocusRef = useRef(null);

  const saveFocus = useCallback(() => {
    savedFocusRef.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (savedFocusRef.current && typeof savedFocusRef.current.focus === 'function') {
      savedFocusRef.current.focus();
      savedFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
};

/**
 * Combined hook for modal focus management
 * @param {boolean} isOpen - Whether the modal is open
 * @returns {Object} Container ref and utilities
 */
export const useModalFocus = (isOpen) => {
  const { containerRef, handleKeyDown } = useFocusTrap(isOpen);
  const { saveFocus, restoreFocus } = useFocusRestore();

  useEffect(() => {
    if (isOpen) {
      saveFocus();
      // Focus first focusable element
      setTimeout(() => {
        const firstFocusable = containerRef.current?.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    } else {
      restoreFocus();
    }
  }, [isOpen, saveFocus, restoreFocus, containerRef]);

  return { containerRef, handleKeyDown };
};

const focusManagement = {
  useFocusTrap,
  useFocusFirstError,
  useRovingTabindex,
  useFocusRestore,
  useModalFocus,
};

export default focusManagement;
