/**
 * PullToRefresh - Apple-inspired pull-to-refresh container
 *
 * Wraps content and provides smooth pull-to-refresh functionality.
 * Integrates with the existing cache/visibility refresh system.
 *
 * Features:
 * - Natural resistance curve
 * - Clear visual feedback
 * - Haptic feedback on threshold
 * - Reduced motion support
 * - Integration with cache manager
 *
 * Usage:
 * <PullToRefresh onRefresh={handleRefresh}>
 *   <YourContent />
 * </PullToRefresh>
 */
import React, { forwardRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { usePullToRefresh, PULL_STATES } from '../../../hooks/usePullToRefresh';
import { useReducedMotion } from '../../../design-system';
import PullIndicator from './PullIndicator';

/**
 * Styled components
 */
const Container = styled.div`
  position: relative;
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  /* Prevent pull-to-refresh on Chrome mobile (native behavior) */
  overscroll-behavior-y: contain;
`;

const ContentWrapper = styled(motion.div)`
  position: relative;
  width: 100%;
  min-height: 100%;
  will-change: ${props => props.$isActive ? 'transform' : 'auto'};

  /* Optimize for smooth animations */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
`;

/**
 * PullToRefresh Component
 *
 * @param {Function} onRefresh - Async function to call when refresh triggers
 * @param {Function} onComplete - Called after refresh completes
 * @param {boolean} disabled - Disable pull-to-refresh
 * @param {number} threshold - Pull distance to trigger (default: 80)
 * @param {boolean} showHint - Show hint text during pull (default: true)
 * @param {React.ReactNode} children - Content to wrap
 * @param {string} className - Additional CSS classes
 * @param {Object} style - Additional inline styles
 */
const PullToRefresh = forwardRef(({
  onRefresh,
  onComplete,
  disabled = false,
  threshold = 80,
  showHint = true,
  children,
  className,
  style,
  ...props
}, ref) => {
  const reducedMotion = useReducedMotion();

  const {
    pullState,
    progress,
    visualOffset,
    isRefreshing,
    isIdle,
    handlers,
    containerRef,
    contentStyle,
  } = usePullToRefresh({
    onRefresh,
    onComplete,
    disabled,
    threshold,
    hapticFeedback: !reducedMotion,
  });

  // Merge refs if external ref provided
  const setContainerRef = useCallback((node) => {
    containerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [containerRef, ref]);

  const isActive = !isIdle || visualOffset > 0;

  return (
    <Container
      ref={setContainerRef}
      className={className}
      style={style}
      {...handlers}
      {...props}
    >
      {/* Pull indicator */}
      <PullIndicator
        pullState={pullState}
        progress={progress}
        visualOffset={visualOffset}
        showHint={showHint}
        reducedMotion={reducedMotion}
      />

      {/* Content wrapper with transform */}
      <ContentWrapper
        $isActive={isActive}
        style={reducedMotion ? {} : contentStyle}
        aria-busy={isRefreshing}
      >
        {children}
      </ContentWrapper>
    </Container>
  );
});

PullToRefresh.displayName = 'PullToRefresh';

export { PULL_STATES };
export default PullToRefresh;
