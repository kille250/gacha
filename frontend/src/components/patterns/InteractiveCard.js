/**
 * InteractiveCard - Premium interactive card with world-class UX
 *
 * A versatile card component with:
 * - Smooth hover lift animations
 * - Touch-optimized press states
 * - Haptic feedback
 * - Focus management for accessibility
 * - Skeleton loading state
 * - Scroll-linked reveal animations
 * - Reduced motion support
 *
 * This component demonstrates best practices for creating
 * premium interactive elements that feel responsive and polished.
 *
 * @example
 * <InteractiveCard
 *   onClick={() => navigate('/details')}
 *   onLongPress={() => openQuickActions()}
 *   loading={isLoading}
 *   reveal
 * >
 *   <CardContent />
 * </InteractiveCard>
 */

import React, { forwardRef, memo, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme, springs, timing, easing, Skeleton, enhancedFocus } from '../../design-system';
import { usePressState, useScrollReveal } from '../../hooks';

// ==================== STYLED COMPONENTS ====================

const CardContainer = styled(motion.div)`
  position: relative;
  background: ${props => props.$variant === 'glass'
    ? theme.colors.glass
    : props.$variant === 'solid'
      ? theme.colors.surfaceSolid
      : theme.colors.surface
  };
  border-radius: ${props => props.$radius || theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  overflow: hidden;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  outline: none;

  /* Base shadow */
  box-shadow: ${theme.shadows.card};

  /* Transitions */
  transition:
    transform ${timing.normal} ${easing.appleSpring},
    box-shadow ${timing.normal} ${easing.easeOut},
    border-color ${timing.fast} ${easing.easeOut};

  /* Disable tap highlight on mobile */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  /* Hover effects - only on devices that support hover */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: ${theme.shadows.cardHover};
      border-color: ${theme.colors.surfaceBorder};
      transform: translateY(-2px);
    }
  }

  /* Press state */
  ${props => props.$isPressed && css`
    transform: scale(0.98) translateY(0) !important;
    box-shadow: ${theme.shadows.sm} !important;
  `}

  /* Focus state - accessibility */
  ${enhancedFocus}

  /* Disabled state */
  ${props => props.$disabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  `}

  /* Loading state */
  ${props => props.$loading && css`
    pointer-events: none;
    overflow: hidden;
  `}

  /* Elevated variant */
  ${props => props.$elevated && css`
    box-shadow: ${theme.shadows.lg};

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        box-shadow: ${theme.shadows.xl};
        transform: translateY(-4px);
      }
    }
  `}

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: box-shadow ${timing.fast} ${easing.easeOut};

    &:hover {
      transform: none;
    }
  }
`;

const CardContent = styled.div`
  position: relative;
  z-index: 1;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: ${theme.colors.surface};
  z-index: 10;
`;

const ShimmerEffect = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
`;

// ==================== COMPONENT ====================

/**
 * InteractiveCard Component
 *
 * @param {React.ReactNode} children - Card content
 * @param {Function} onClick - Click handler
 * @param {Function} onLongPress - Long press handler
 * @param {'default' | 'glass' | 'solid'} variant - Visual style
 * @param {string} radius - Border radius override
 * @param {boolean} elevated - Use elevated shadow
 * @param {boolean} loading - Show loading skeleton
 * @param {boolean} disabled - Disable interactions
 * @param {boolean} reveal - Enable scroll reveal animation
 * @param {Object} revealOptions - Options for scroll reveal
 * @param {boolean} hapticFeedback - Enable haptic feedback
 * @param {string} ariaLabel - Accessible label
 */
const InteractiveCard = memo(forwardRef(function InteractiveCard({
  children,
  onClick,
  onLongPress,
  variant = 'default',
  radius,
  elevated = false,
  loading = false,
  disabled = false,
  reveal = false,
  revealOptions = {},
  hapticFeedback = true,
  ariaLabel,
  className,
  style,
  ...props
}, ref) {
  const isClickable = Boolean(onClick) && !disabled && !loading;

  // Press state management
  const { pressProps, isPressed } = usePressState({
    onPress: onClick,
    onLongPress,
    disabled: !isClickable,
    hapticFeedback,
  });

  // Scroll reveal
  const { ref: revealRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
    ...revealOptions,
    disabled: !reveal,
  });

  // Merge refs
  const setRefs = useCallback((node) => {
    // Forward ref
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
    // Reveal ref
    revealRef.current = node;
  }, [ref, revealRef]);

  // Animation variants
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        ...springs.gentle,
        opacity: { duration: 0.3 },
      },
    },
  };

  return (
    <CardContainer
      ref={setRefs}
      className={className}
      style={style}
      $variant={variant}
      $radius={radius}
      $elevated={elevated}
      $clickable={isClickable}
      $isPressed={isPressed}
      $disabled={disabled}
      $loading={loading}
      variants={reveal ? cardVariants : undefined}
      initial={reveal ? 'hidden' : undefined}
      animate={reveal ? (isVisible ? 'visible' : 'hidden') : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      {...(isClickable ? pressProps : {})}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingOverlay
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Skeleton
              $width="100%"
              $height="100%"
              $radius={radius || theme.radius.xl}
            />
            <ShimmerEffect
              animate={{
                translateX: ['100%', '-100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </LoadingOverlay>
        ) : (
          <CardContent key="content">
            {children}
          </CardContent>
        )}
      </AnimatePresence>
    </CardContainer>
  );
}));

// ==================== VARIANTS ====================

/**
 * GlassCard - Glassmorphism variant
 */
export const GlassInteractiveCard = memo(forwardRef(function GlassInteractiveCard(props, ref) {
  return <InteractiveCard ref={ref} variant="glass" {...props} />;
}));

/**
 * SolidCard - Solid background variant
 */
export const SolidInteractiveCard = memo(forwardRef(function SolidInteractiveCard(props, ref) {
  return <InteractiveCard ref={ref} variant="solid" {...props} />;
}));

/**
 * ElevatedCard - Higher elevation variant
 */
export const ElevatedInteractiveCard = memo(forwardRef(function ElevatedInteractiveCard(props, ref) {
  return <InteractiveCard ref={ref} elevated {...props} />;
}));

// ==================== SUB-COMPONENTS ====================

/**
 * Card header section
 */
export const CardHeader = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

/**
 * Card body section
 */
export const CardBody = styled.div`
  padding: ${theme.spacing.lg};
`;

/**
 * Card footer section
 */
export const CardFooter = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorderSubtle};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};

  /* Stack on mobile */
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column-reverse;
    gap: ${theme.spacing.xs};

    > * {
      width: 100%;
    }
  }
`;

/**
 * Card media section (for images)
 */
export const CardMedia = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${props => props.$aspectRatio || '16 / 9'};
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform ${timing.slow} ${easing.easeOut};
  }

  ${CardContainer}:hover & img,
  ${CardContainer}:hover & video {
    @media (hover: hover) and (pointer: fine) {
      transform: scale(1.03);
    }
  }
`;

/**
 * Card title
 */
export const CardTitle = styled.h3`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  line-height: ${theme.lineHeights.tight};
`;

/**
 * Card description
 */
export const CardDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.xs} 0 0;
  line-height: ${theme.lineHeights.normal};
`;

// Export everything
export default InteractiveCard;
export {
  InteractiveCard,
};
