/**
 * PageTransition - Animated page wrapper for smooth transitions
 *
 * Provides cinematic page transitions with multiple animation modes.
 * Wrap page content to get smooth enter/exit animations.
 *
 * Features:
 * - Multiple transition modes (fade, slide, scale, slideUp)
 * - Respects reduced motion preferences
 * - Staggered children animations
 * - GPU-accelerated for smooth performance
 *
 * @example
 * <PageTransition mode="slideUp">
 *   <YourPageContent />
 * </PageTransition>
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useReducedMotion } from '../utilities/accessibility';
import { springs } from '../tokens';

// ==================== ANIMATION VARIANTS ====================

const pageVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { ...springs.gentle, duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { ...springs.gentle, duration: 0.35 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1, transition: { ...springs.snappy, duration: 0.25 } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }
  },
  none: {
    initial: {},
    animate: {},
    exit: {}
  }
};

// Stagger container for child elements
export const staggerContainer = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { opacity: 0 }
};

// Stagger item for children
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springs.gentle }
  },
  exit: { opacity: 0, y: -5, transition: { duration: 0.1 } }
};

// ==================== STYLED COMPONENTS ====================

const PageWrapper = styled(motion.div)`
  min-height: 100%;
  width: 100%;
  /* GPU acceleration for smooth animations */
  will-change: opacity, transform;
`;

// ==================== COMPONENT ====================

/**
 * PageTransition Component
 *
 * @param {'fade' | 'slide' | 'slideUp' | 'scale' | 'none'} mode - Animation mode
 * @param {boolean} stagger - Enable staggered children animations
 * @param {React.ReactNode} children - Page content
 */
const PageTransition = memo(function PageTransition({
  children,
  mode = 'slideUp',
  stagger = false,
  className,
  ...props
}) {
  const prefersReducedMotion = useReducedMotion();

  // Use reduced motion variant if user prefers
  const selectedMode = prefersReducedMotion ? 'fade' : mode;
  const variants = stagger ? staggerContainer : pageVariants[selectedMode];

  return (
    <PageWrapper
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      {...props}
    >
      {children}
    </PageWrapper>
  );
});

/**
 * StaggerChild - Wrapper for staggered children
 */
export const StaggerChild = memo(function StaggerChild({
  children,
  className,
  ...props
}) {
  return (
    <motion.div
      className={className}
      variants={staggerItem}
      {...props}
    >
      {children}
    </motion.div>
  );
});

/**
 * FadeIn - Simple fade-in wrapper
 */
export const FadeIn = memo(function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className,
  ...props
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
});

/**
 * SlideIn - Slide-in wrapper with direction control
 */
export const SlideIn = memo(function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  distance = 20,
  className,
  ...props
}) {
  const prefersReducedMotion = useReducedMotion();

  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  };

  const initialPosition = directionMap[direction] || directionMap.up;

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, ...initialPosition }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        ...springs.gentle,
        delay: prefersReducedMotion ? 0 : delay
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
});

/**
 * ScaleIn - Scale-in wrapper
 */
export const ScaleIn = memo(function ScaleIn({
  children,
  delay = 0,
  initialScale = 0.95,
  className,
  ...props
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        ...springs.snappy,
        delay: prefersReducedMotion ? 0 : delay
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export default PageTransition;
