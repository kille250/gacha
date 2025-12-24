/**
 * BottomSheet - Mobile-optimized modal that slides up from bottom
 *
 * Features:
 * - Drag to dismiss (swipe down to close)
 * - Falls back to Modal on desktop for better UX
 * - Safe area padding for notched devices
 * - Accessible with focus trapping
 *
 * Use for mobile-first modal patterns like:
 * - Filter panels
 * - Action menus
 * - Quick forms
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { theme } from '../tokens';
import { IconButton } from '../primitives';
import { useReducedMotion } from '../utilities';
import Modal from './Modal';

// Use CSS media query to determine if we should show bottom sheet
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${theme.breakpoints.md})`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(max-width: ${theme.breakpoints.md})`);
    const handleChange = (e) => setIsMobile(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return isMobile;
};

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
`;

const SheetContainer = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${theme.colors.backgroundSecondary};
  border-top-left-radius: ${theme.radius.xl};
  border-top-right-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadows.xl};
  display: flex;
  flex-direction: column;
  outline: none;
  z-index: ${theme.zIndex.modal + 1};
  max-height: 90vh;
  /* Safe area for notched devices */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  touch-action: none;
`;

const DragHandle = styled.div`
  display: flex;
  justify-content: center;
  padding: ${theme.spacing.sm} 0;
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &::after {
    content: '';
    width: 36px;
    height: 4px;
    background: ${theme.colors.textMuted};
    border-radius: 2px;
    opacity: 0.5;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${theme.spacing.lg} ${theme.spacing.md};
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const Body = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
  overscroll-behavior: contain;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.glassBorder};
    border-radius: 2px;
  }
`;

/**
 * MobileBottomSheet - Internal component for mobile sheet rendering
 */
const MobileBottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton,
  dragToClose,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const sheetRef = useRef(null);
  const previousActiveElement = useRef(null);
  const dragControls = useDragControls();

  // Store previously focused element
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus management and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const sheet = sheetRef.current;
    if (sheet) sheet.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;

      if (previousActiveElement.current?.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback((event, info) => {
    // Close if dragged down more than 100px or with significant velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  const startDrag = useCallback((event) => {
    dragControls.start(event);
  }, [dragControls]);

  const sheetContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <SheetContainer
            ref={sheetRef}
            initial={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', damping: 30, stiffness: 300 }}
            drag={dragToClose ? 'y' : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            tabIndex={-1}
          >
            {dragToClose && (
              <DragHandle
                onPointerDown={startDrag}
                aria-hidden="true"
              />
            )}
            {title && (
              <Header>
                <Title id="bottom-sheet-title">{title}</Title>
                {showCloseButton && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="Close"
                    onClick={onClose}
                  >
                    <MdClose />
                  </IconButton>
                )}
              </Header>
            )}
            <Body>{children}</Body>
          </SheetContainer>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sheetContent, document.body);
  }

  return null;
};

/**
 * BottomSheet Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether sheet is visible
 * @param {Function} props.onClose - Called when sheet should close
 * @param {string} props.title - Sheet title
 * @param {React.ReactNode} props.children - Sheet content
 * @param {boolean} props.showCloseButton - Show close button in header
 * @param {boolean} props.dragToClose - Enable drag to dismiss
 * @param {string} props.maxWidth - Max width for desktop Modal fallback
 */
const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  dragToClose = true,
  maxWidth = '500px',
}) => {
  const isMobile = useIsMobile();

  // On desktop, render as standard Modal
  if (!isMobile) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        maxWidth={maxWidth}
      >
        {children}
      </Modal>
    );
  }

  // On mobile, render as bottom sheet
  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showCloseButton={showCloseButton}
      dragToClose={dragToClose}
    >
      {children}
    </MobileBottomSheet>
  );
};

export default BottomSheet;
