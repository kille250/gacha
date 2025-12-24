/**
 * Modal - Accessible modal dialog component
 *
 * Provides focus trapping, backdrop click handling, and keyboard navigation.
 * Follows WAI-ARIA dialog pattern.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { theme, motionVariants } from '../../../styles/DesignSystem';
import { IconButton } from '../buttons';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  z-index: ${theme.zIndex.modal};
  overflow-y: auto;
`;

const ModalContainer = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.xl};
  max-width: ${props => props.$maxWidth || '500px'};
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  outline: none;
  margin: auto;

  @media (max-width: ${theme.breakpoints.sm}) {
    max-width: 100%;
    max-height: 100%;
    border-radius: ${theme.radius.lg};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const Body = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.glassBorder};
    border-radius: 4px;
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
`;

/**
 * Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Called when modal should close
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal body content
 * @param {React.ReactNode} props.footer - Footer content (buttons)
 * @param {string} props.maxWidth - Maximum width (default: '500px')
 * @param {boolean} props.closeOnBackdrop - Close when clicking backdrop (default: true)
 * @param {boolean} props.closeOnEscape - Close on Escape key (default: true)
 * @param {boolean} props.showCloseButton - Show close button in header (default: true)
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Store the previously focused element
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Focus the modal
    modal.focus();

    // Handle keyboard events
    const handleKeyDown = (e) => {
      // Close on Escape
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // Restore focus to previously focused element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Render portal
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          variants={motionVariants.overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
        >
          <ModalContainer
            ref={modalRef}
            $maxWidth={maxWidth}
            variants={motionVariants.modal}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            tabIndex={-1}
          >
            {title && (
              <Header>
                <Title id="modal-title">{title}</Title>
                {showCloseButton && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="Close modal"
                    onClick={onClose}
                  >
                    <MdClose />
                  </IconButton>
                )}
              </Header>
            )}
            <Body>{children}</Body>
            {footer && <Footer>{footer}</Footer>}
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};

// Named exports for modal parts (for custom layouts)
Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;
Modal.Title = Title;

export default Modal;
