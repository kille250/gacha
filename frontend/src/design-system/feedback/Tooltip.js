/**
 * Tooltip Component
 *
 * Accessible tooltip with animations and multiple placement options.
 * Uses Framer Motion for smooth enter/exit transitions.
 *
 * @example
 * <Tooltip content="This is a tooltip">
 *   <Button>Hover me</Button>
 * </Tooltip>
 *
 * @example
 * <Tooltip content="Right side" placement="right" delay={200}>
 *   <IconButton><InfoIcon /></IconButton>
 * </Tooltip>
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { theme } from '../tokens';

// Animation variants
const tooltipVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.1 }
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.1 }
  }
};

const TooltipContainer = styled(motion.div)`
  position: fixed;
  z-index: ${theme.zIndex.tooltip || 9999};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.surfaceSolid || '#1a1a1a'};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  line-height: ${theme.lineHeights.snug};
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.lg};
  max-width: 280px;
  word-wrap: break-word;
  pointer-events: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  /* Arrow */
  &::before {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: ${theme.colors.surfaceSolid || '#1a1a1a'};
    border: 1px solid ${theme.colors.surfaceBorder};
    transform: rotate(45deg);

    ${props => {
      switch (props.$placement) {
        case 'top':
          return `
            bottom: -5px;
            left: 50%;
            margin-left: -4px;
            border-top: none;
            border-left: none;
          `;
        case 'bottom':
          return `
            top: -5px;
            left: 50%;
            margin-left: -4px;
            border-bottom: none;
            border-right: none;
          `;
        case 'left':
          return `
            right: -5px;
            top: 50%;
            margin-top: -4px;
            border-bottom: none;
            border-left: none;
          `;
        case 'right':
          return `
            left: -5px;
            top: 50%;
            margin-top: -4px;
            border-top: none;
            border-right: none;
          `;
        default:
          return `
            bottom: -5px;
            left: 50%;
            margin-left: -4px;
            border-top: none;
            border-left: none;
          `;
      }
    }}
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 0.1s;
  }
`;

const TriggerWrapper = styled.span`
  display: inline-flex;
`;

/**
 * Calculate tooltip position based on trigger element and placement
 */
const calculatePosition = (triggerRect, placement, tooltipRect) => {
  const offset = 10; // Distance from trigger
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  let top, left;

  switch (placement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - offset;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = triggerRect.bottom + offset;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.left - tooltipRect.width - offset;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.right + offset;
      break;
    default:
      top = triggerRect.top - tooltipRect.height - offset;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
  }

  // Clamp to viewport bounds
  left = Math.max(8, Math.min(left, viewport.width - tooltipRect.width - 8));
  top = Math.max(8, Math.min(top, viewport.height - tooltipRect.height - 8));

  return { top, left };
};

const Tooltip = ({
  children,
  content,
  placement = 'top',
  delay = 300,
  disabled = false,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = useCallback(() => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        // Initial position estimate
        setPosition({
          top: triggerRect.top - 40,
          left: triggerRect.left + triggerRect.width / 2
        });
        setIsVisible(true);
      }
    }, delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  // Update position after tooltip renders
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const newPosition = calculatePosition(triggerRect, placement, tooltipRect);
      setPosition(newPosition);
    }
  }, [isVisible, placement]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render tooltip if no content
  if (!content) {
    return children;
  }

  return (
    <>
      <TriggerWrapper
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={className}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        {children}
      </TriggerWrapper>

      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <TooltipContainer
              ref={tooltipRef}
              id="tooltip"
              role="tooltip"
              variants={tooltipVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              $placement={placement}
              style={{
                top: position.top,
                left: position.left
              }}
            >
              {content}
            </TooltipContainer>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

Tooltip.propTypes = {
  /** The element that triggers the tooltip */
  children: PropTypes.node.isRequired,
  /** Tooltip content - can be string or React node */
  content: PropTypes.node,
  /** Placement of tooltip relative to trigger */
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  /** Delay in ms before showing tooltip */
  delay: PropTypes.number,
  /** Disable the tooltip */
  disabled: PropTypes.bool,
  /** Additional CSS class */
  className: PropTypes.string
};

export default Tooltip;
