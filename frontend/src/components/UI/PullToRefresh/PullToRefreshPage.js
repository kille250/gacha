/**
 * PullToRefreshPage - Page-level pull-to-refresh wrapper
 *
 * Combines PullToRefresh with:
 * - Visibility-based refresh (via cache manager)
 * - Toast notifications on refresh
 * - Loading state integration
 *
 * Use this for pages that need both pull-to-refresh AND visibility refresh.
 *
 * Usage:
 * <PullToRefreshPage
 *   pageId="collection-page"
 *   onRefresh={fetchCollection}
 *   threshold="normal"
 * >
 *   <YourPageContent />
 * </PullToRefreshPage>
 */
import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import PullToRefresh from './PullToRefresh';
import { onVisibilityChange, STALE_THRESHOLDS } from '../../../cache';

/**
 * PullToRefreshPage Component
 *
 * @param {string} pageId - Unique identifier for visibility callbacks
 * @param {Function} onRefresh - Async function to call when refresh triggers
 * @param {'critical'|'normal'|'static'} threshold - Staleness threshold for visibility refresh
 * @param {boolean} disableVisibilityRefresh - Disable automatic visibility-based refresh
 * @param {boolean} disabled - Disable pull-to-refresh
 * @param {React.ReactNode} children - Page content
 */
const PullToRefreshPage = forwardRef(({
  pageId,
  onRefresh,
  threshold = 'normal',
  disableVisibilityRefresh = false,
  disabled = false,
  children,
  ...props
}, ref) => {
  const lastRefreshTime = useRef(Date.now());

  // Handle pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    if (!onRefresh) return;

    lastRefreshTime.current = Date.now();
    await onRefresh();
  }, [onRefresh]);

  // Handle visibility-based refresh
  useEffect(() => {
    if (disableVisibilityRefresh || !pageId || !onRefresh) return;

    return onVisibilityChange(pageId, async (staleLevel, elapsed) => {
      // Only refresh if elapsed time exceeds our threshold
      const thresholdMs = STALE_THRESHOLDS[threshold];
      if (elapsed > thresholdMs) {
        // Avoid duplicate refreshes if we just pulled
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        if (timeSinceLastRefresh > 5000) { // 5 second debounce
          lastRefreshTime.current = Date.now();
          await onRefresh();
        }
      }
    });
  }, [pageId, onRefresh, threshold, disableVisibilityRefresh]);

  return (
    <PullToRefresh
      ref={ref}
      onRefresh={handlePullRefresh}
      disabled={disabled}
      {...props}
    >
      {children}
    </PullToRefresh>
  );
});

PullToRefreshPage.displayName = 'PullToRefreshPage';

export default PullToRefreshPage;
