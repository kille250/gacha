/**
 * Modal - Reusable modal wrapper component
 *
 * Features:
 * - Focus trap (keyboard navigation stays within modal)
 * - Escape key to close
 * - Click outside to close (optional)
 * - Proper ARIA attributes for accessibility
 * - Smooth animations with framer-motion
 * - Multiple size variants
 * - Portal rendering to document.body
 * - Reduced motion support
 *
 * Usage:
 * <Modal isOpen={isOpen} onClose={handleClose} title="My Modal">
 *   <p>Modal content here</p>
 * </Modal>
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { theme, motionVariants, IconButton } from '../../styles/DesignSystem';

// Size configurations
const SIZES = {
  sm: '400px',
  md: '560px',
  lg: '800px',
  xl: '1000px',
  full: '100%',
};

/**
 * Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Called when modal should close
 * @param {string} props.title - Modal title (required for accessibility)
 * @param {React.ReactNode} props.children - Modal body content
 * @param {React.ReactNode} props.footer - Optional footer content (buttons, etc.)
 * @param {string} props.size - Modal size: 'sm' | 'md' | 'lg' | 'xl' | 'full' (default: 'md')
 * @param {boolean} props.closeOnOverlay - Close when clicking overlay (default: true)
 * @param {boolean} props.closeOnEscape - Close when pressing Escape (default: true)
 * @param {boolean} props.showCloseButton - Show close button in header (default: true)
 * @param {string} props.className - Additional CSS class
 * @param {boolean} props.centered - Vertically center the modal (default: true)
 * @param {boolean} props.scrollable - Allow body to scroll if content overflows (default: true)
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  centered = true,
  scrollable = true,
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management - trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    // Focus the modal container
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements?.length > 0) {
      // Focus the close button or first focusable element
      setTimeout(() => {
        const closeBtn = modalRef.current?.querySelector('[data-modal-close]');
        (closeBtn || focusableElements[0])?.focus();
      }, 50);
    }

    // Restore focus when modal closes
    return () => {
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Focus trap - keep focus within modal
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: if on first element, go to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, go to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Animation variants
  const overlayVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : motionVariants.overlay;

  const modalVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : motionVariants.modal;

  // Don't render anything if not open (AnimatePresence handles exit animation)
  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Overlay
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
          $centered={centered}
        >
          <ModalContainer
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            $size={size}
            className={className}
          >
            {/* Header */}
            <ModalHeader>
              <ModalTitle id="modal-title">{title}</ModalTitle>
              {showCloseButton && (
                <CloseButton
                  onClick={onClose}
                  data-modal-close
                  aria-label="Close modal"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MdClose />
                </CloseButton>
              )}
            </ModalHeader>

            {/* Body */}
            <ModalBody id="modal-description" $scrollable={scrollable}>
              {children}
            </ModalBody>

            {/* Footer (optional) */}
            {footer && (
              <ModalFooter>
                {footer}
              </ModalFooter>
            )}
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );

  // Render to portal
  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

// ==================== STYLED COMPONENTS ====================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
  display: flex;
  align-items: ${props => props.$centered ? 'center' : 'flex-start'};
  justify-content: center;
  padding: ${theme.spacing.md};
  overflow-y: auto;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm};
    align-items: flex-end;
  }
`;

const ModalContainer = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.xl};
  width: 100%;
  max-width: ${props => SIZES[props.$size] || SIZES.md};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Full-screen on mobile for larger modals */
  ${props => (props.$size === 'lg' || props.$size === 'xl' || props.$size === 'full') && css`
    @media (max-width: ${theme.breakpoints.md}) {
      max-width: 100%;
      max-height: 100%;
      border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
      margin-top: auto;
    }
  `}

  /* Full-screen modal */
  ${props => props.$size === 'full' && css`
    max-width: calc(100% - ${theme.spacing.xl});
    max-height: calc(100% - ${theme.spacing.xl});

    @media (max-width: ${theme.breakpoints.sm}) {
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  `}
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const ModalTitle = styled.h2`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  line-height: ${theme.lineHeights.snug};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const CloseButton = styled(IconButton)`
  flex-shrink: 0;
  margin-left: ${theme.spacing.md};
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
  flex: 1;
  ${props => props.$scrollable && css`
    overflow-y: auto;
    overscroll-behavior: contain;
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundTertiary};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.glassBorder};
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    flex-direction: column-reverse;

    > * {
      width: 100%;
    }
  }
`;

// ==================== COMPOUND COMPONENTS ====================

/**
 * ConfirmModal - Pre-styled confirmation modal
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default', // 'default' | 'danger'
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <CancelButton onClick={onClose} disabled={loading}>
            {cancelText}
          </CancelButton>
          <ConfirmButton
            onClick={handleConfirm}
            disabled={loading}
            $variant={variant}
          >
            {loading ? 'Loading...' : confirmText}
          </ConfirmButton>
        </>
      }
    >
      <ConfirmMessage>{message}</ConfirmMessage>
    </Modal>
  );
};

const ConfirmMessage = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  line-height: ${theme.lineHeights.relaxed};
  margin: 0;
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
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ConfirmButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$variant === 'danger' ? theme.colors.error : theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${props => props.$variant === 'danger' ? theme.colors.error : theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default Modal;
