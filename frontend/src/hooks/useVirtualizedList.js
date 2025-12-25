/**
 * useVirtualizedList - Hook for virtualized rendering of large lists
 *
 * Renders only visible items plus buffer, dramatically improving performance
 * for lists with hundreds or thousands of items.
 *
 * @features
 * - Only renders items in viewport + configurable buffer
 * - Supports variable height items with measurement
 * - Smooth scrolling with momentum
 * - Keyboard navigation support
 * - Accessible - maintains proper ARIA attributes
 *
 * @example
 * const { containerRef, virtualItems, totalHeight, scrollToIndex } = useVirtualizedList({
 *   itemCount: 1000,
 *   itemHeight: 60,
 *   overscan: 5,
 * });
 *
 * return (
 *   <div ref={containerRef} style={{ height: '400px', overflow: 'auto' }}>
 *     <div style={{ height: totalHeight }}>
 *       {virtualItems.map(item => (
 *         <div key={item.index} style={{ position: 'absolute', top: item.start }}>
 *           {renderItem(item.index)}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * @param {Object} options
 * @param {number} options.itemCount - Total number of items
 * @param {number|function} options.itemHeight - Fixed height or function(index) => height
 * @param {number} options.overscan - Number of items to render outside visible area (default: 3)
 * @param {number} options.scrollMargin - Extra margin for scroll calculations (default: 0)
 * @param {function} options.getItemKey - Function to get unique key for item (default: index)
 * @param {boolean} options.horizontal - Enable horizontal scrolling (default: false)
 */
export const useVirtualizedList = ({
  itemCount,
  itemHeight,
  overscan = 3,
  scrollMargin = 0,
  getItemKey = (index) => index,
  horizontal = false,
}) => {
  const containerRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerSize, setContainerSize] = useState(0);

  // Track measured heights for variable height items
  const [measuredHeights, setMeasuredHeights] = useState(() => new Map());

  // Get the height of an item
  const getItemSize = useCallback((index) => {
    if (typeof itemHeight === 'function') {
      // Check if we have a measured height
      const measured = measuredHeights.get(index);
      if (measured !== undefined) return measured;
      // Otherwise use the estimated height
      return itemHeight(index);
    }
    return itemHeight;
  }, [itemHeight, measuredHeights]);

  // Calculate total height of all items
  const totalHeight = useMemo(() => {
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += getItemSize(i);
    }
    return total;
  }, [itemCount, getItemSize]);

  // Find the range of visible items
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (containerSize === 0 || itemCount === 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] };
    }

    // Find start index
    let start = 0;
    let offset = 0;
    while (start < itemCount && offset + getItemSize(start) < scrollOffset - scrollMargin) {
      offset += getItemSize(start);
      start++;
    }

    // Apply overscan for smoother scrolling
    start = Math.max(0, start - overscan);

    // Recalculate offset from the new start
    offset = 0;
    for (let i = 0; i < start; i++) {
      offset += getItemSize(i);
    }

    // Find end index
    let end = start;
    let endOffset = offset;
    while (end < itemCount && endOffset < scrollOffset + containerSize + scrollMargin) {
      endOffset += getItemSize(end);
      end++;
    }

    // Apply overscan
    end = Math.min(itemCount, end + overscan);

    // Build virtual items array
    const items = [];
    let currentOffset = offset;
    for (let i = start; i < end; i++) {
      const size = getItemSize(i);
      items.push({
        index: i,
        key: getItemKey(i),
        start: currentOffset,
        end: currentOffset + size,
        size,
      });
      currentOffset += size;
    }

    return { startIndex: start, endIndex: end, virtualItems: items };
  }, [itemCount, containerSize, scrollOffset, scrollMargin, overscan, getItemSize, getItemKey]);

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    const target = event.currentTarget;
    const offset = horizontal ? target.scrollLeft : target.scrollTop;
    setScrollOffset(offset);
  }, [horizontal]);

  // Measure container size and listen for resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measureContainer = () => {
      const size = horizontal ? container.clientWidth : container.clientHeight;
      setContainerSize(size);
    };

    measureContainer();

    // Use ResizeObserver for dynamic container sizing
    const resizeObserver = new ResizeObserver(measureContainer);
    resizeObserver.observe(container);

    // Listen to scroll events
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, horizontal]);

  // Scroll to a specific index
  const scrollToIndex = useCallback((index, options = {}) => {
    const { align = 'start', behavior = 'smooth' } = options;
    const container = containerRef.current;
    if (!container || index < 0 || index >= itemCount) return;

    // Calculate offset to the item
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemSize(i);
    }

    const itemSize = getItemSize(index);

    // Adjust based on alignment
    let scrollTo = offset;
    if (align === 'center') {
      scrollTo = offset - (containerSize / 2) + (itemSize / 2);
    } else if (align === 'end') {
      scrollTo = offset - containerSize + itemSize;
    }

    // Clamp to valid scroll range
    scrollTo = Math.max(0, Math.min(scrollTo, totalHeight - containerSize));

    if (horizontal) {
      container.scrollTo({ left: scrollTo, behavior });
    } else {
      container.scrollTo({ top: scrollTo, behavior });
    }
  }, [itemCount, containerSize, totalHeight, getItemSize, horizontal]);

  // Function to measure an item's actual height
  const measureItem = useCallback((index, element) => {
    if (!element) return;
    const size = horizontal ? element.offsetWidth : element.offsetHeight;
    setMeasuredHeights(prev => {
      if (prev.get(index) === size) return prev;
      const next = new Map(prev);
      next.set(index, size);
      return next;
    });
  }, [horizontal]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event) => {
    const container = containerRef.current;
    if (!container) return;

    const pageSize = Math.floor(containerSize / (typeof itemHeight === 'number' ? itemHeight : 50));

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        container.scrollBy({
          [horizontal ? 'left' : 'top']: typeof itemHeight === 'number' ? itemHeight : 50,
          behavior: 'smooth',
        });
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        container.scrollBy({
          [horizontal ? 'left' : 'top']: -(typeof itemHeight === 'number' ? itemHeight : 50),
          behavior: 'smooth',
        });
        break;
      case 'PageDown':
        event.preventDefault();
        scrollToIndex(Math.min(itemCount - 1, startIndex + pageSize));
        break;
      case 'PageUp':
        event.preventDefault();
        scrollToIndex(Math.max(0, startIndex - pageSize));
        break;
      case 'Home':
        event.preventDefault();
        scrollToIndex(0);
        break;
      case 'End':
        event.preventDefault();
        scrollToIndex(itemCount - 1);
        break;
      default:
        break;
    }
  }, [containerSize, itemHeight, horizontal, scrollToIndex, startIndex, itemCount]);

  return {
    // Refs and handlers
    containerRef,
    handleKeyDown,

    // Virtual list state
    virtualItems,
    totalHeight,
    totalWidth: horizontal ? totalHeight : undefined,

    // Indexes
    startIndex,
    endIndex,

    // Scroll state
    scrollOffset,
    containerSize,

    // Actions
    scrollToIndex,
    measureItem,

    // Helper for container props
    getContainerProps: () => ({
      ref: containerRef,
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: 'list',
      'aria-label': `List with ${itemCount} items`,
      style: {
        overflow: 'auto',
        position: 'relative',
      },
    }),

    // Helper for inner container props
    getInnerProps: () => ({
      role: 'presentation',
      style: {
        height: horizontal ? '100%' : totalHeight,
        width: horizontal ? totalHeight : '100%',
        position: 'relative',
      },
    }),

    // Helper for individual item props
    getItemProps: (virtualItem) => ({
      key: virtualItem.key,
      role: 'listitem',
      'aria-setsize': itemCount,
      'aria-posinset': virtualItem.index + 1,
      style: {
        position: 'absolute',
        [horizontal ? 'left' : 'top']: virtualItem.start,
        [horizontal ? 'height' : 'width']: '100%',
        [horizontal ? 'width' : 'height']: virtualItem.size,
      },
    }),
  };
};

export default useVirtualizedList;
