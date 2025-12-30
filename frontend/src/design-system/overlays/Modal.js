/**
 * Modal - Accessible modal dialog component
 *
 * Features:
 * - WAI-ARIA dialog pattern
 * - Focus trapping with roving tabindex
 * - Backdrop click handling
 * - Keyboard navigation (Escape, Tab)
 * - Smooth spring animations
 * - Mobile-optimized (full-screen on small screens)
 * - Reduced motion support
 * - Focus restoration on close
 */

import React, { useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { theme } from '../tokens';
import { IconButton } from '../primitives';

// Enhanced motion variants with spring physics
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      mass: 0.8,
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  /* Enhanced vignette backdrop for cinematic feel */
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.65) 50%,
    rgba(0, 0, 0, 0.8) 100%
  );
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  z-index: ${theme.zIndex.modal};
  overflow-y: auto;
  /* Improve touch scrolling */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`;

const ModalContainer = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius['2xl']};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.xl};
  max-width: ${props => props.$maxWidth || '500px'};
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  outline: none;
  margin: auto;
  /* Ensure the modal is above the overlay gradient */
  position: relative;

  /* Mobile: nearly full screen with subtle margin */
  @media (max-width: ${theme.breakpoints.sm}) {
    max-width: calc(100% - ${theme.spacing.md});
    max-height: calc(100vh - ${theme.spacing.xl});
    border-radius: ${theme.radius.xl};
    margin: ${theme.spacing.sm};
  }

  /* Very small screens: full screen modal */
  @media (max-width: 375px) {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
    margin: 0;
  }

  /* Full screen variant */
  ${props => props.$fullScreen && css`
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
    margin: 0;
    height: 100%;
  `}

  /* Reduced motion - instant appearance */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const Title = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  line-height: ${theme.lineHeights.tight};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.md};
  }
`;

const Body = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
  /* Improve touch scrolling */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  /* Custom scrollbar */
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

  &::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.textMuted};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
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

  /* Stack buttons vertically on mobile */
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column-reverse;
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.xs};

    > * {
      width: 100%;
    }
  }
`;

// Close button with enhanced touch target
const CloseButton = styled(IconButton)`
  /* Ensure adequate touch target */
  min-width: 44px;
  min-height: 44px;
`;

/**
 * Modal Component
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Called when modal should close
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal body content
 * @param {React.ReactNode} footer - Footer content (buttons)
 * @param {string} maxWidth - Maximum width (default: '500px')
 * @param {boolean} closeOnBackdrop - Close when clicking backdrop (default: true)
 * @param {boolean} closeOnEscape - Close on Escape key (default: true)
 * @param {boolean} showCloseButton - Show close button in header (default: true)
 * @param {boolean} fullScreen - Full screen modal mode
 * @param {string} ariaLabel - Custom aria-label (uses title if not provided)
 * @param {string} ariaDescription - aria-describedby content
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
  showCloseButton = true,
  fullScreen = false,
  ariaLabel,
  ariaDescription,
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const uniqueId = useId();
  const titleId = `modal-title-${uniqueId}`;
  const descriptionId = ariaDescription ? `modal-desc-${uniqueId}` : undefined;

  // Save active element when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  // Handle keyboard events and focus management
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Focus the modal container
    requestAnimationFrame(() => {
      modal.focus();
    });

    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );

        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable || document.activeElement === modal) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore focus to the element that opened the modal
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        // Small delay to ensure the modal is fully closed
        requestAnimationFrame(() => {
          previousActiveElement.current?.focus();
        });
      }
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Overlay
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
        >
          <ModalContainer
            ref={modalRef}
            $maxWidth={maxWidth}
            $fullScreen={fullScreen}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={!title ? ariaLabel : undefined}
            aria-describedby={descriptionId}
            tabIndex={-1}
          >
            {title && (
              <Header>
                <Title id={titleId}>{title}</Title>
                {showCloseButton && (
                  <CloseButton
                    size="sm"
                    variant="ghost"
                    aria-label="Close dialog"
                    onClick={onClose}
                  >
                    <MdClose />
                  </CloseButton>
                )}
              </Header>
            )}
            {ariaDescription && (
              <span id={descriptionId} style={{ display: 'none' }}>
                {ariaDescription}
              </span>
            )}
            <Body>{children}</Body>
            {footer && <Footer>{footer}</Footer>}
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};

// Export sub-components for composition
Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;
Modal.Title = Title;

export default Modal;
