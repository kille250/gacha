/**
 * AIGeneratorModal - Modal wrapper for the AI Image Generator
 *
 * Provides a full-screen modal experience for generating
 * character images with AI.
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../../design-system';
import CharacterImageGenerator from './CharacterImageGenerator';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: ${theme.zIndex.modal};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
`;

const ModalContent = styled(motion.div)`
  width: 100%;
  max-width: 1000px;
  margin: ${theme.spacing.xl} auto;
  background: ${theme.colors.background};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  position: relative;

  @media (max-width: ${theme.breakpoints.md}) {
    margin: ${theme.spacing.md} auto;
    border-radius: ${theme.radius.lg};
  }
`;

const ModalPadding = styled.div`
  padding: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

// ===========================================
// COMPONENT
// ===========================================

const AIGeneratorModal = ({
  isOpen,
  onClose,
  characterData,
  onImageGenerated
}) => {
  /**
   * Handle image generated - pass to parent and optionally close
   */
  const handleImageGenerated = useCallback((imageData) => {
    onImageGenerated?.(imageData);
    // Don't auto-close - let user decide
  }, [onImageGenerated]);

  /**
   * Handle click on overlay (close modal)
   */
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }, [onClose]);

  /**
   * Handle escape key
   */
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="AI Image Generator"
        >
          <ModalContent
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <ModalPadding>
              <CharacterImageGenerator
                characterData={characterData}
                onImageGenerated={handleImageGenerated}
                onClose={onClose}
              />
            </ModalPadding>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

AIGeneratorModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Handler for closing the modal */
  onClose: PropTypes.func.isRequired,
  /** Pre-filled character data */
  characterData: PropTypes.shape({
    name: PropTypes.string,
    series: PropTypes.string,
    rarity: PropTypes.string,
    characterClass: PropTypes.string
  }),
  /** Handler called when an image is generated and accepted */
  onImageGenerated: PropTypes.func
};

AIGeneratorModal.defaultProps = {
  characterData: null,
  onImageGenerated: null
};

export default AIGeneratorModal;
