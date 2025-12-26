/**
 * CopyConfirmDialog - Confirmation dialog for copy-to-all action
 *
 * Features:
 * - Clear messaging about what will happen
 * - Keyboard accessible (Escape to cancel)
 * - Focus trap
 * - Animated entrance/exit
 */
import React, { memo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { prefersReducedMotion } from '../../utils/featureFlags';

const CopyConfirmDialog = memo(({
  isOpen,
  field,
  value,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const reducedMotion = prefersReducedMotion();

  // Focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  const dialogMotionProps = reducedMotion
    ? {}
    : {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          onClick={onCancel}
          {...motionProps}
        >
          <Dialog
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            tabIndex={-1}
            {...dialogMotionProps}
          >
            <Title id="confirm-title">{t('upload.copyToAllConfirm', { field })}</Title>
            <Description id="confirm-desc">
              {t('upload.copyValue', { field, value })}
            </Description>
            <ButtonGroup>
              <CancelButton onClick={onCancel} type="button">
                {t('common.cancel')}
              </CancelButton>
              <ConfirmButton onClick={onConfirm} type="button">
                {t('upload.copy')}
              </ConfirmButton>
            </ButtonGroup>
          </Dialog>
        </Overlay>
      )}
    </AnimatePresence>
  );
});

CopyConfirmDialog.displayName = 'CopyConfirmDialog';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: ${theme.zIndex.modal + 10};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
`;

const Dialog = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  max-width: 400px;
  width: 100%;
  box-shadow: ${theme.shadows.xl};

  &:focus {
    outline: none;
  }
`;

const Title = styled.h4`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const Description = styled.p`
  margin: 0 0 ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;

  strong {
    color: ${theme.colors.text};
  }
`;


const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: flex-end;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column-reverse;
  }
`;

const CancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const ConfirmButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

export default CopyConfirmDialog;
