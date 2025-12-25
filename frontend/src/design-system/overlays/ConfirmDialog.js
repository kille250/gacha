/**
 * ConfirmDialog - Confirmation modal for destructive actions
 *
 * @accessibility
 * - Uses proper ARIA dialog role via Modal
 * - Focus trap prevents tabbing out of dialog
 * - Escape key closes dialog (unless loading)
 * - Confirm button is focused by default for keyboard users
 * - Screen reader announcements for state changes
 *
 * @features
 * - Optional preview section to show what will be affected
 * - Optional countdown timer for extra safety on critical actions
 * - Loading state with spinner
 * - Multiple variants (danger, warning, info)
 * - Undo capability for reversible actions
 * - Consequence preview to show before/after changes
 * - Impact summary for batch operations
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { MdWarning, MdInfo, MdErrorOutline, MdUndo, MdArrowForward } from 'react-icons/md';
import { theme } from '../tokens';
import { Button } from '../primitives';
import Modal from './Modal';

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} 0;
`;

const IconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$variant) {
      case 'danger': return 'rgba(255, 59, 48, 0.15)';
      case 'warning': return 'rgba(255, 159, 10, 0.15)';
      case 'info': return 'rgba(90, 200, 250, 0.15)';
      default: return 'rgba(255, 59, 48, 0.15)';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => {
    switch (props.$variant) {
      case 'danger': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'info': return theme.colors.info;
      default: return theme.colors.error;
    }
  }};
  font-size: 28px;
`;

const Title = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const Message = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
`;

const PreviewSection = styled.div`
  width: 100%;
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px dashed ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  text-align: left;
`;

const PreviewLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  margin-bottom: ${theme.spacing.sm};
`;

const PreviewContent = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};

  /* Style for preview items */
  .preview-item {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.xs} 0;
    border-bottom: 1px solid ${theme.colors.surfaceBorder};

    &:last-child {
      border-bottom: none;
    }

    img {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: ${theme.radius.sm};
    }
  }
`;

// Consequence preview - shows before/after
const ConsequenceSection = styled.div`
  width: 100%;
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const ConsequenceTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  margin-bottom: ${theme.spacing.sm};

  svg {
    font-size: 14px;
    color: ${theme.colors.warning};
  }
`;

const ConsequenceRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} 0;
  font-size: ${theme.fontSizes.sm};

  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.surfaceBorder};
    padding-bottom: ${theme.spacing.sm};
    margin-bottom: ${theme.spacing.sm};
  }
`;

const ConsequenceLabel = styled.span`
  color: ${theme.colors.textSecondary};
  flex-shrink: 0;
  min-width: 80px;
`;

const ConsequenceValue = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex: 1;
`;

const OldValue = styled.span`
  color: ${theme.colors.textMuted};
  text-decoration: line-through;
`;

const Arrow = styled(MdArrowForward)`
  color: ${theme.colors.warning};
  font-size: 16px;
  flex-shrink: 0;
`;

const NewValue = styled.span`
  color: ${props => props.$destructive ? theme.colors.error : theme.colors.success};
  font-weight: ${theme.fontWeights.medium};
`;

// Impact summary for batch operations
const ImpactSummary = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const ImpactItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${props => props.$highlight ? 'rgba(255, 59, 48, 0.1)' : theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$highlight ? 'rgba(255, 59, 48, 0.3)' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
`;

const ImpactValue = styled.span`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$highlight ? theme.colors.error : theme.colors.text};
`;

const ImpactLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

// Undo capability indicator
const UndoIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(48, 209, 88, 0.1);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.success};
  margin-top: ${theme.spacing.sm};

  svg {
    font-size: 14px;
  }
`;

const NoUndoWarning = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.error};
  margin-top: ${theme.spacing.sm};

  svg {
    font-size: 14px;
  }
`;

const countdown = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

const CountdownBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  margin-top: ${theme.spacing.sm};
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    background: ${theme.colors.error};
    animation: ${countdown} ${props => props.$duration}s linear forwards;
  }
`;

const CountdownText = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-top: ${theme.spacing.xs};
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  width: 100%;
  margin-top: ${theme.spacing.md};

  > * {
    flex: 1;
  }

  /* Stack buttons on very small screens */
  @media (max-width: 360px) {
    flex-direction: column-reverse;
  }
`;

/**
 * Get the appropriate icon for each variant
 */
const getVariantIcon = (variant) => {
  switch (variant) {
    case 'danger': return <MdErrorOutline />;
    case 'warning': return <MdWarning />;
    case 'info': return <MdInfo />;
    default: return <MdWarning />;
  }
};

/**
 * ConfirmDialog Component
 *
 * @param {boolean} isOpen - Whether dialog is visible
 * @param {Function} onClose - Cancel callback
 * @param {Function} onConfirm - Confirm callback
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmLabel - Confirm button label
 * @param {string} cancelLabel - Cancel button label
 * @param {'danger' | 'warning' | 'info'} variant - Dialog variant
 * @param {boolean} loading - Show loading state on confirm
 * @param {React.ReactNode} icon - Custom icon (overrides variant icon)
 * @param {React.ReactNode} preview - Optional preview content
 * @param {string} previewLabel - Label for preview section
 * @param {number} countdown - Optional countdown in seconds before confirm is enabled
 * @param {boolean} requireConfirmType - Require typing to confirm (for extra safety)
 * @param {string} confirmTypeText - Text user must type to confirm
 * @param {Array} consequences - Array of { label, oldValue, newValue, destructive } for before/after preview
 * @param {Array} impact - Array of { value, label, highlight } for batch operation summary
 * @param {boolean} canUndo - Whether this action can be undone
 * @param {string} undoMessage - Message explaining undo capability
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
  preview,
  previewLabel = 'This will affect:',
  countdownSeconds = 0,
  requireConfirmType = false,
  confirmTypeText = 'DELETE',
  consequences,
  impact,
  canUndo,
  undoMessage = 'This action can be undone',
  noUndoMessage = 'This action cannot be undone',
}) => {
  const confirmButtonRef = useRef(null);
  const [countdownActive, setCountdownActive] = useState(countdownSeconds > 0);
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);
  const [typedText, setTypedText] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCountdownActive(countdownSeconds > 0);
      setSecondsRemaining(countdownSeconds);
      setTypedText('');
    }
  }, [isOpen, countdownSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !countdownActive || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setCountdownActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdownActive, secondsRemaining]);

  // Focus confirm button when dialog opens (after countdown if applicable)
  useEffect(() => {
    if (isOpen && !countdownActive && confirmButtonRef.current) {
      // Small delay to ensure modal animation completes
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, countdownActive]);

  // Check if confirm is enabled
  const isConfirmDisabled = loading ||
    countdownActive ||
    (requireConfirmType && typedText !== confirmTypeText);

  // Handle confirm with keyboard
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !isConfirmDisabled) {
      e.preventDefault();
      onConfirm();
    }
  }, [isConfirmDisabled, onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="420px"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      showCloseButton={false}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <Content onKeyDown={handleKeyDown}>
        <IconWrapper $variant={variant} aria-hidden="true">
          {icon || getVariantIcon(variant)}
        </IconWrapper>

        <Title id="confirm-dialog-title">{title}</Title>

        {message && (
          <Message id="confirm-dialog-message">{message}</Message>
        )}

        {/* Preview section for showing what will be affected */}
        {preview && (
          <PreviewSection>
            <PreviewLabel>{previewLabel}</PreviewLabel>
            <PreviewContent>{preview}</PreviewContent>
          </PreviewSection>
        )}

        {/* Consequence preview - shows before/after changes */}
        {consequences && consequences.length > 0 && (
          <ConsequenceSection>
            <ConsequenceTitle>
              <MdWarning aria-hidden="true" />
              What will change:
            </ConsequenceTitle>
            {consequences.map((item, index) => (
              <ConsequenceRow key={index}>
                <ConsequenceLabel>{item.label}:</ConsequenceLabel>
                <ConsequenceValue>
                  {item.oldValue && <OldValue>{item.oldValue}</OldValue>}
                  <Arrow aria-hidden="true" />
                  <NewValue $destructive={item.destructive}>{item.newValue}</NewValue>
                </ConsequenceValue>
              </ConsequenceRow>
            ))}
          </ConsequenceSection>
        )}

        {/* Impact summary for batch operations */}
        {impact && impact.length > 0 && (
          <ImpactSummary role="list" aria-label="Impact summary">
            {impact.map((item, index) => (
              <ImpactItem key={index} $highlight={item.highlight} role="listitem">
                <ImpactValue $highlight={item.highlight}>{item.value}</ImpactValue>
                <ImpactLabel>{item.label}</ImpactLabel>
              </ImpactItem>
            ))}
          </ImpactSummary>
        )}

        {/* Undo capability indicator */}
        {canUndo === true && (
          <UndoIndicator>
            <MdUndo aria-hidden="true" />
            {undoMessage}
          </UndoIndicator>
        )}

        {/* No undo warning for permanent actions */}
        {canUndo === false && (
          <NoUndoWarning>
            <MdErrorOutline aria-hidden="true" />
            {noUndoMessage}
          </NoUndoWarning>
        )}

        {/* Countdown timer for extra safety */}
        {countdownSeconds > 0 && countdownActive && (
          <>
            <CountdownBar $duration={countdownSeconds} />
            <CountdownText aria-live="polite">
              Please wait {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}...
            </CountdownText>
          </>
        )}

        {/* Type-to-confirm for critical actions */}
        {requireConfirmType && (
          <TypeConfirmWrapper>
            <TypeConfirmLabel>
              Type <strong>{confirmTypeText}</strong> to confirm:
            </TypeConfirmLabel>
            <TypeConfirmInput
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value.toUpperCase())}
              placeholder={confirmTypeText}
              aria-label={`Type ${confirmTypeText} to confirm`}
              autoComplete="off"
              spellCheck="false"
            />
          </TypeConfirmWrapper>
        )}

        <Actions>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={variant}
            onClick={onConfirm}
            loading={loading}
            disabled={isConfirmDisabled}
          >
            {countdownActive ? `Wait (${secondsRemaining}s)` : confirmLabel}
          </Button>
        </Actions>
      </Content>
    </Modal>
  );
};

// Additional styled components for type-to-confirm feature
const TypeConfirmWrapper = styled.div`
  width: 100%;
  margin-top: ${theme.spacing.sm};
  text-align: left;
`;

const TypeConfirmLabel = styled.label`
  display: block;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};

  strong {
    color: ${theme.colors.error};
    font-family: monospace;
  }
`;

const TypeConfirmInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: ${theme.colors.error};
    box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.2);
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
    text-transform: uppercase;
  }
`;

export default ConfirmDialog;
