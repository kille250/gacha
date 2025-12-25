/**
 * ConfirmActionModal - Enhanced confirmation dialog with action preview
 *
 * Provides a comprehensive confirmation experience for destructive actions:
 * - Action preview showing what will happen
 * - Multiple confirmation methods (click, type to confirm)
 * - Undo timer option for soft confirmation
 * - Clear visual hierarchy based on severity
 *
 * @accessibility
 * - Focus trap within modal
 * - Escape key to cancel
 * - Screen reader announcements
 * - Proper heading hierarchy
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaExclamationTriangle,
  FaTrash,
  FaCheck,
  FaTimes,
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, useReducedMotion } from '../../design-system';
import ActionPreview from './ActionPreview';

// Severity configurations
const SEVERITY_CONFIG = {
  info: {
    icon: FaInfoCircle,
    color: theme.colors.info,
    background: 'rgba(90, 200, 250, 0.1)',
    border: 'rgba(90, 200, 250, 0.3)',
    confirmLabel: 'common.confirm'
  },
  warning: {
    icon: FaExclamationTriangle,
    color: theme.colors.warning,
    background: 'rgba(255, 159, 10, 0.1)',
    border: 'rgba(255, 159, 10, 0.3)',
    confirmLabel: 'common.confirm'
  },
  danger: {
    icon: FaTrash,
    color: theme.colors.error,
    background: 'rgba(255, 59, 48, 0.1)',
    border: 'rgba(255, 59, 48, 0.3)',
    confirmLabel: 'common.delete'
  },
  critical: {
    icon: FaShieldAlt,
    color: '#ff3b30',
    background: 'rgba(255, 59, 48, 0.15)',
    border: 'rgba(255, 59, 48, 0.4)',
    confirmLabel: 'common.confirm'
  }
};

const ConfirmActionModal = ({
  // Modal state
  isOpen = false,
  onClose,
  onConfirm,

  // Content
  title,
  message,
  severity = 'warning',

  // Preview data (optional, for showing what will happen)
  preview,

  // Confirmation options
  confirmationType = 'click', // 'click' | 'type' | 'timer'
  typeConfirmText, // Text user must type for 'type' confirmation
  timerDuration = 5, // Seconds for 'timer' confirmation

  // Button labels
  confirmLabel,
  cancelLabel,

  // Loading state
  isLoading = false,

  // Additional options
  showPreview = true,
  allowCancel = true
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  // State
  const [typedText, setTypedText] = useState('');
  const [timerRemaining, setTimerRemaining] = useState(timerDuration);
  const [isTimerComplete, setIsTimerComplete] = useState(false);

  // Refs
  const inputRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Get severity config
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.warning;
  const SeverityIcon = config.icon;

  // Focus management
  useEffect(() => {
    if (isOpen) {
      if (confirmationType === 'type' && inputRef.current) {
        inputRef.current.focus();
      } else if (confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      }
    }
  }, [isOpen, confirmationType]);

  // Timer logic
  useEffect(() => {
    if (!isOpen || confirmationType !== 'timer') return;

    setTimerRemaining(timerDuration);
    setIsTimerComplete(false);

    const interval = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          setIsTimerComplete(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, confirmationType, timerDuration]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setTypedText('');
      setTimerRemaining(timerDuration);
      setIsTimerComplete(false);
    }
  }, [isOpen, timerDuration]);

  // Check if confirmation is valid
  const isConfirmValid = useCallback(() => {
    switch (confirmationType) {
      case 'type':
        return typedText.toLowerCase() === (typeConfirmText || '').toLowerCase();
      case 'timer':
        return isTimerComplete;
      default:
        return true;
    }
  }, [confirmationType, typedText, typeConfirmText, isTimerComplete]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (isConfirmValid() && !isLoading) {
      onConfirm?.();
    }
  }, [isConfirmValid, isLoading, onConfirm]);

  // Handle key down
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && allowCancel) {
      onClose?.();
    } else if (e.key === 'Enter' && isConfirmValid()) {
      handleConfirm();
    }
  }, [allowCancel, onClose, isConfirmValid, handleConfirm]);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0.1 }
        : { type: 'spring', stiffness: 400, damping: 30 }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: { duration: 0.15 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={allowCancel ? onClose : undefined}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-description"
        >
          <ModalContent
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            $severity={severity}
            $config={config}
          >
            {/* Header */}
            <ModalHeader>
              <IconWrapper $color={config.color}>
                <SeverityIcon aria-hidden="true" />
              </IconWrapper>
              <HeaderText>
                <ModalTitle id="confirm-modal-title">{title}</ModalTitle>
                {message && (
                  <ModalMessage id="confirm-modal-description">{message}</ModalMessage>
                )}
              </HeaderText>
              {allowCancel && (
                <CloseButton
                  onClick={onClose}
                  aria-label={t('common.close', 'Close')}
                >
                  <FaTimes />
                </CloseButton>
              )}
            </ModalHeader>

            {/* Preview Section */}
            {showPreview && preview && (
              <PreviewSection>
                <ActionPreview {...preview} />
              </PreviewSection>
            )}

            {/* Type Confirmation */}
            {confirmationType === 'type' && (
              <TypeConfirmSection>
                <TypeLabel>
                  {t('admin.typeToConfirm', 'Type "{{text}}" to confirm', { text: typeConfirmText })}
                </TypeLabel>
                <TypeInput
                  ref={inputRef}
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={typeConfirmText}
                  $isValid={typedText.toLowerCase() === (typeConfirmText || '').toLowerCase()}
                  autoComplete="off"
                  spellCheck="false"
                />
              </TypeConfirmSection>
            )}

            {/* Timer Confirmation */}
            {confirmationType === 'timer' && (
              <TimerSection>
                <TimerRing $progress={(timerDuration - timerRemaining) / timerDuration}>
                  <TimerText>{timerRemaining}</TimerText>
                </TimerRing>
                <TimerLabel>
                  {isTimerComplete
                    ? t('admin.confirmReady', 'Ready to confirm')
                    : t('admin.waitToConfirm', 'Please wait...')
                  }
                </TimerLabel>
              </TimerSection>
            )}

            {/* Actions */}
            <ModalActions>
              {allowCancel && (
                <CancelButton onClick={onClose} disabled={isLoading}>
                  {cancelLabel || t('common.cancel', 'Cancel')}
                </CancelButton>
              )}
              <ConfirmButton
                ref={confirmButtonRef}
                onClick={handleConfirm}
                disabled={!isConfirmValid() || isLoading}
                $severity={severity}
                $config={config}
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    {severity === 'danger' && <FaTrash aria-hidden="true" />}
                    {severity !== 'danger' && <FaCheck aria-hidden="true" />}
                    {confirmLabel || t(config.confirmLabel, 'Confirm')}
                  </>
                )}
              </ConfirmButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

// ============================================
// ANIMATIONS
// ============================================

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

// ============================================
// STYLED COMPONENTS
// ============================================

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.lg};
  z-index: ${theme.zIndex.modal};
`;

const ModalContent = styled(motion.div)`
  background: ${theme.colors.surfaceSolid};
  border: 1px solid ${props => props.$config?.border || theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => `${props.$color}20`};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color};
  font-size: 22px;
  flex-shrink: 0;
`;

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const ModalMessage = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    background: ${theme.colors.hoverOverlay};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const PreviewSection = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const TypeConfirmSection = styled.div`
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const TypeLabel = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const TypeInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 2px solid ${props =>
    props.$isValid ? theme.colors.success : theme.colors.surfaceBorder
  };
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  font-family: ${theme.fonts.mono};
  transition: border-color ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textMuted};
    font-family: ${theme.fonts.primary};
  }

  &:focus {
    outline: none;
    border-color: ${props =>
      props.$isValid ? theme.colors.success : theme.colors.primary
    };
  }
`;

const TimerSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const TimerRing = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: conic-gradient(
    ${theme.colors.primary} ${props => props.$progress * 360}deg,
    ${theme.colors.surfaceBorder} ${props => props.$progress * 360}deg
  );
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    inset: 4px;
    background: ${theme.colors.surfaceSolid};
    border-radius: 50%;
  }
`;

const TimerText = styled.span`
  position: relative;
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.text};
`;

const TimerLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
`;

const CancelButton = styled.button`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${theme.colors.surface};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${props => props.$config?.color || theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// PropTypes
ConfirmActionModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool,
  /** Callback when modal should close */
  onClose: PropTypes.func,
  /** Callback when action is confirmed */
  onConfirm: PropTypes.func,
  /** Modal title */
  title: PropTypes.string.isRequired,
  /** Modal message/description */
  message: PropTypes.string,
  /** Severity level affecting styling */
  severity: PropTypes.oneOf(['info', 'warning', 'danger', 'critical']),
  /** Preview data for ActionPreview component */
  preview: PropTypes.object,
  /** Type of confirmation required */
  confirmationType: PropTypes.oneOf(['click', 'type', 'timer']),
  /** Text user must type for 'type' confirmation */
  typeConfirmText: PropTypes.string,
  /** Duration in seconds for 'timer' confirmation */
  timerDuration: PropTypes.number,
  /** Custom confirm button label */
  confirmLabel: PropTypes.string,
  /** Custom cancel button label */
  cancelLabel: PropTypes.string,
  /** Whether an action is in progress */
  isLoading: PropTypes.bool,
  /** Whether to show the preview section */
  showPreview: PropTypes.bool,
  /** Whether the user can cancel */
  allowCancel: PropTypes.bool
};

export default ConfirmActionModal;
