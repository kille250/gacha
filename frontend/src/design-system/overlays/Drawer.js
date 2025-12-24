/**
 * Drawer - Slide-in panel component
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { theme } from '../tokens';
import { IconButton } from '../primitives';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
`;

const positionStyles = {
  left: css`
    left: 0;
    top: 0;
    bottom: 0;
    transform-origin: left;
  `,
  right: css`
    right: 0;
    top: 0;
    bottom: 0;
    transform-origin: right;
  `,
  top: css`
    top: 0;
    left: 0;
    right: 0;
    transform-origin: top;
  `,
  bottom: css`
    bottom: 0;
    left: 0;
    right: 0;
    transform-origin: bottom;
  `
};

const DrawerContainer = styled(motion.div)`
  position: fixed;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.xl};
  display: flex;
  flex-direction: column;
  outline: none;
  z-index: ${theme.zIndex.modal + 1};

  ${props => positionStyles[props.$position || 'right']}

  ${props => (props.$position === 'left' || props.$position === 'right') && css`
    width: ${props.$width || '320px'};
    max-width: 90vw;
  `}

  ${props => (props.$position === 'top' || props.$position === 'bottom') && css`
    height: ${props.$height || '320px'};
    max-height: 90vh;
  `}
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

const getMotionVariants = (position) => {
  const axis = position === 'left' || position === 'right' ? 'x' : 'y';
  const direction = position === 'left' || position === 'top' ? -1 : 1;

  return {
    hidden: { [axis]: `${direction * 100}%`, opacity: 0 },
    visible: { [axis]: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { [axis]: `${direction * 100}%`, opacity: 0, transition: { duration: 0.2 } }
  };
};

/**
 * Drawer Component
 *
 * @param {boolean} isOpen - Whether drawer is visible
 * @param {Function} onClose - Called when drawer should close
 * @param {string} title - Drawer title
 * @param {'left' | 'right' | 'top' | 'bottom'} position - Drawer position
 * @param {string} width - Drawer width (for left/right)
 * @param {string} height - Drawer height (for top/bottom)
 * @param {React.ReactNode} children - Drawer content
 */
const Drawer = ({
  isOpen,
  onClose,
  title,
  position = 'right',
  width,
  height,
  children,
  showCloseButton = true
}) => {
  const drawerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const drawer = drawerRef.current;
    if (drawer) drawer.focus();

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

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

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
            $width={width}
            $height={height}
            variants={getMotionVariants(position)}
            initial="hidden"
            animate="visible"
            exit="exit"
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
