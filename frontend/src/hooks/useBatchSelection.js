/**
 * useBatchSelection - Hook for managing batch selection in lists
 *
 * Provides functionality for:
 * - Selecting/deselecting individual items
 * - Selecting all items
 * - Clearing selection
 * - Shift-click for range selection
 * - Keyboard shortcuts (Ctrl/Cmd+A for select all)
 *
 * @accessibility
 * - Supports keyboard navigation
 * - Maintains focus when items are selected
 * - Provides count for screen readers
 *
 * @example
 * const { selectedIds, toggleItem, selectAll, clearSelection, isSelected } = useBatchSelection(items);
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * @param {Array} items - Array of items with id property
 * @param {Object} options - Configuration options
 * @param {string} options.idKey - Key to use for item ID (default: 'id')
 * @param {number} options.maxSelection - Maximum items that can be selected (default: unlimited)
 * @param {Function} options.onSelectionChange - Callback when selection changes
 */
export const useBatchSelection = (items = [], options = {}) => {
  const {
    idKey = 'id',
    maxSelection = Infinity,
    onSelectionChange,
  } = options;

  const [selectedIds, setSelectedIds] = useState(new Set());
  const lastSelectedIdRef = useRef(null);

  // Get all item IDs for select all functionality
  const allIds = useMemo(() =>
    new Set(items.map(item => item[idKey])),
  [items, idKey]);

  // Check if an item is selected
  const isSelected = useCallback((id) =>
    selectedIds.has(id),
  [selectedIds]);

  // Toggle selection of a single item
  const toggleItem = useCallback((id, event) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);

      // Handle shift+click for range selection
      if (event?.shiftKey && lastSelectedIdRef.current !== null) {
        const itemIds = Array.from(allIds);
        const lastIndex = itemIds.indexOf(lastSelectedIdRef.current);
        const currentIndex = itemIds.indexOf(id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);

          for (let i = start; i <= end; i++) {
            if (newSet.size < maxSelection || newSet.has(itemIds[i])) {
              newSet.add(itemIds[i]);
            }
          }
          return newSet;
        }
      }

      // Regular toggle
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < maxSelection) {
        newSet.add(id);
        lastSelectedIdRef.current = id;
      }

      return newSet;
    });
  }, [allIds, maxSelection]);

  // Select all items
  const selectAll = useCallback(() => {
    const idsToSelect = Array.from(allIds).slice(0, maxSelection);
    setSelectedIds(new Set(idsToSelect));
    lastSelectedIdRef.current = idsToSelect[idsToSelect.length - 1] || null;
  }, [allIds, maxSelection]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  // Select specific items by their IDs
  const selectItems = useCallback((ids) => {
    const validIds = ids.filter(id => allIds.has(id)).slice(0, maxSelection);
    setSelectedIds(new Set(validIds));
    lastSelectedIdRef.current = validIds[validIds.length - 1] || null;
  }, [allIds, maxSelection]);

  // Invert selection
  const invertSelection = useCallback(() => {
    const newSet = new Set();
    allIds.forEach(id => {
      if (!selectedIds.has(id) && newSet.size < maxSelection) {
        newSet.add(id);
      }
    });
    setSelectedIds(newSet);
  }, [allIds, selectedIds, maxSelection]);

  // Get selected items
  const selectedItems = useMemo(() =>
    items.filter(item => selectedIds.has(item[idKey])),
  [items, selectedIds, idKey]);

  // Selection count
  const selectionCount = selectedIds.size;
  const hasSelection = selectionCount > 0;
  const allSelected = selectionCount === allIds.size && allIds.size > 0;
  const someSelected = selectionCount > 0 && selectionCount < allIds.size;

  // Notify on selection change
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedIds));
    }
  }, [selectedIds, onSelectionChange]);

  // Keyboard handler for select all (Ctrl/Cmd+A)
  const handleKeyDown = useCallback((event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      if (allSelected) {
        clearSelection();
      } else {
        selectAll();
      }
    } else if (event.key === 'Escape' && hasSelection) {
      event.preventDefault();
      clearSelection();
    }
  }, [allSelected, hasSelection, selectAll, clearSelection]);

  return {
    // State
    selectedIds: Array.from(selectedIds),
    selectedItems,
    selectionCount,
    hasSelection,
    allSelected,
    someSelected,

    // Actions
    isSelected,
    toggleItem,
    selectAll,
    clearSelection,
    selectItems,
    invertSelection,

    // Event handlers
    handleKeyDown,

    // Helpers
    getCheckboxProps: (id) => ({
      checked: isSelected(id),
      onChange: (e) => toggleItem(id, e),
      'aria-label': `Select item ${id}`,
    }),
    getSelectAllProps: () => ({
      checked: allSelected,
      indeterminate: someSelected,
      onChange: allSelected ? clearSelection : selectAll,
      'aria-label': allSelected ? 'Deselect all' : 'Select all',
    }),
  };
};

export default useBatchSelection;
