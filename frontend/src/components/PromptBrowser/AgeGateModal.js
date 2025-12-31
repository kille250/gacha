/**
 * AgeGateModal - Age verification dialog for NSFW content
 *
 * Requires user confirmation before enabling mature content filters.
 */

import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { theme } from '../../design-system';
import { setAgeVerified } from '../../hooks/useCivitaiSearch';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${theme.zIndex.modal + 10};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
`;

const ModalContainer = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: 420px;
  width: 100%;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  box-shadow: ${theme.shadows.xl};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.warningMuted};
  border-bottom: 1px solid ${theme.colors.warning}30;
`;

const WarningIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${theme.colors.warning};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textInverse};
  font-size: 24px;
`;

const HeaderText = styled.div`
  flex: 1;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const Subtitle = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.text};
  }
`;

const Content = styled.div`
  padding: ${theme.spacing.lg};
`;

const WarningList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const WarningItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;

  &::before {
    content: '•';
    color: ${theme.colors.warning};
    font-weight: bold;
    flex-shrink: 0;
  }
`;

const AgeConfirmation = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${theme.colors.primary};
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  cursor: pointer;
  user-select: none;
`;

const Footer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  padding-top: 0;
`;

const Button = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$primary
    ? theme.colors.warning
    : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  color: ${props => props.$primary ? theme.colors.textInverse : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$primary
      ? theme.colors.warningHover
      : theme.colors.surfaceHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ===========================================
// COMPONENT
// ===========================================

function AgeGateModal({
  isOpen,
  onClose,
  onConfirm,
  requestedLevel
}) {
  const [confirmed, setConfirmed] = React.useState(false);

  const handleConfirm = useCallback(() => {
    if (!confirmed) return;

    // Store age verification
    setAgeVerified(true);

    // Call the confirm callback with the requested NSFW level
    onConfirm?.(requestedLevel);
    onClose();
  }, [confirmed, requestedLevel, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setConfirmed(false);
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <ModalContainer
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="age-gate-title"
          >
            <Header>
              <WarningIcon>
                <FaExclamationTriangle />
              </WarningIcon>
              <HeaderText>
                <Title id="age-gate-title">Age Verification Required</Title>
                <Subtitle>Adult content filter requested</Subtitle>
              </HeaderText>
            </Header>

            <CloseButton onClick={handleClose} aria-label="Cancel">
              <FaTimes />
            </CloseButton>

            <Content>
              <WarningList>
                <WarningItem>
                  This filter enables viewing of adult and explicit content
                </WarningItem>
                <WarningItem>
                  You must be 18 years or older to enable this feature
                </WarningItem>
                <WarningItem>
                  Content may include nudity, sexual themes, or mature imagery
                </WarningItem>
                <WarningItem>
                  Your preference will be saved for future sessions
                </WarningItem>
              </WarningList>

              <AgeConfirmation>
                <Checkbox
                  type="checkbox"
                  id="age-confirm"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <CheckboxLabel htmlFor="age-confirm">
                  I confirm that I am at least 18 years old
                </CheckboxLabel>
              </AgeConfirmation>
            </Content>

            <Footer>
              <Button onClick={handleClose}>
                Cancel
              </Button>
              <Button
                $primary
                onClick={handleConfirm}
                disabled={!confirmed}
              >
                Enable Adult Content
              </Button>
            </Footer>
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

AgeGateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  requestedLevel: PropTypes.string
};

export default AgeGateModal;
