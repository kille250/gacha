/**
 * UndoToast - Toast notification with undo action
 *
 * Features:
 * - Shows removed file info
 * - Countdown timer
 * - Undo button
 * - Auto-dismiss
 * - Accessible
 */
import React, { memo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUndo, FaTimes } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import { prefersReducedMotion } from '../../utils/featureFlags';

const TOAST_DURATION = 8000; // 8 seconds

const UndoToast = memo(({
  isVisible,
  fileName,
  onUndo,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(TOAST_DURATION);
  const reducedMotion = prefersReducedMotion();

  // Countdown timer
  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(TOAST_DURATION);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          onDismiss?.();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, onDismiss]);

  // Reset timer when new file is removed
  useEffect(() => {
    if (isVisible) {
      setTimeLeft(TOAST_DURATION);
    }
  }, [fileName, isVisible]);

  const progress = (timeLeft / TOAST_DURATION) * 100;

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 50, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.95 },
        transition: { type: 'spring', damping: 25, stiffness: 300 },
      };

  return (
    <AnimatePresence>
      {isVisible && (
        <ToastContainer
          role="alert"
          aria-live="polite"
          {...motionProps}
        >
          <ProgressBar style={{ width: `${progress}%` }} />
          <ToastContent>
            <ToastMessage>
              <strong>File removed:</strong> {fileName || 'Unknown file'}
            </ToastMessage>
            <ToastActions>
              <UndoButton onClick={onUndo} type="button">
                <FaUndo aria-hidden="true" />
                <span>Undo</span>
              </UndoButton>
              <DismissButton
                onClick={onDismiss}
                aria-label="Dismiss"
                type="button"
              >
                <FaTimes aria-hidden="true" />
              </DismissButton>
            </ToastActions>
          </ToastContent>
        </ToastContainer>
      )}
    </AnimatePresence>
  );
});

UndoToast.displayName = 'UndoToast';

const ToastContainer = styled(motion.div)`
  position: fixed;
  bottom: ${theme.spacing.lg};
  left: 50%;
  transform: translateX(-50%);
  z-index: ${theme.zIndex.toast};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  overflow: hidden;
  min-width: 300px;
  max-width: calc(100vw - ${theme.spacing.lg} * 2);

  @media (max-width: ${theme.breakpoints.sm}) {
    left: ${theme.spacing.md};
    right: ${theme.spacing.md};
    transform: none;
    bottom: ${theme.spacing.md};
  }
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  background: ${theme.colors.primary};
  transition: width 0.1s linear;
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

const ToastMessage = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  strong {
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.fontWeights.medium};
  }
`;

const ToastActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
`;

const UndoButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primaryHover};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  svg {
    font-size: 12px;
  }
`;

const DismissButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.textMuted};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.colors.text};
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default UndoToast;
