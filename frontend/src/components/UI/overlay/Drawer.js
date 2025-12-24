/**
 * Drawer - Slide-in panel component
 *
 * Use for side panels, mobile menus, and secondary content.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { theme } from '../../../design-system';
import { IconButton } from '../buttons';

const positionStyles = {
  left: css`
    left: 0;
    top: 0;
    bottom: 0;
  `,
  right: css`
    right: 0;
    top: 0;
    bottom: 0;
  `,
  top: css`
    top: 0;
    left: 0;
    right: 0;
  `,
  bottom: css`
    bottom: 0;
    left: 0;
    right: 0;
  `
};

const sizeStyles = {
  left: css`
    width: ${props => props.$size || '320px'};
    max-width: 90vw;
    height: 100%;
  `,
  right: css`
    width: ${props => props.$size || '320px'};
    max-width: 90vw;
    height: 100%;
  `,
  top: css`
    height: ${props => props.$size || '320px'};
    max-height: 90vh;
    width: 100%;
  `,
  bottom: css`
    height: ${props => props.$size || '320px'};
    max-height: 90vh;
    width: 100%;
  `
};

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
`;

const DrawerContainer = styled(motion.div)`
  position: fixed;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.xl};
  display: flex;
  flex-direction: column;
  outline: none;
  z-index: ${theme.zIndex.modal + 1};

  ${props => positionStyles[props.$position]}
  ${props => sizeStyles[props.$position]}
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
`;

const getMotionProps = (position) => {
  const variants = {
    left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
    right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
    top: { initial: { y: '-100%' }, animate: { y: 0 }, exit: { y: '-100%' } },
    bottom: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
  };
  return variants[position];
};

/**
 * Drawer Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether drawer is visible
 * @param {Function} props.onClose - Called when drawer should close
 * @param {string} props.title - Drawer title
 * @param {React.ReactNode} props.children - Drawer content
 * @param {'left' | 'right' | 'top' | 'bottom'} props.position - Slide direction
 * @param {string} props.size - Drawer size (width for left/right, height for top/bottom)
 * @param {boolean} props.closeOnBackdrop - Close when clicking backdrop (default: true)
 * @param {boolean} props.showCloseButton - Show close button (default: true)
 */
const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = '320px',
  closeOnBackdrop = true,
  showCloseButton = true
}) => {
  const drawerRef = useRef(null);
  const motionProps = getMotionProps(position);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />
          <DrawerContainer
            ref={drawerRef}
            $position={position}
            $size={size}
            initial={motionProps.initial}
            animate={motionProps.animate}
            exit={motionProps.exit}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            tabIndex={-1}
          >
            {title && (
              <Header>
                <Title id="drawer-title">{title}</Title>
                {showCloseButton && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="Close drawer"
                    onClick={onClose}
                  >
                    <MdClose />
                  </IconButton>
                )}
              </Header>
            )}
            <Body>{children}</Body>
          </DrawerContainer>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(drawerContent, document.body);
  }

  return null;
};

export default Drawer;
