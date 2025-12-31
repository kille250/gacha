/**
 * ImageModal - Full-size image viewer with prompt details
 *
 * Modal overlay for viewing images at full size with complete
 * generation metadata and copy/use actions.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaCopy,
  FaCheck,
  FaMagic,
  FaDownload,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { theme } from '../../design-system';
import { NSFW_LEVELS, STORAGE_KEYS } from '../../constants/civitai';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
`;

const ModalContainer = styled(motion.div)`
  position: relative;
  display: flex;
  max-width: 95vw;
  max-height: 90vh;
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  box-shadow: ${theme.shadows.xl};

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    max-height: 95vh;
  }
`;

const ImageSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 60vw;
  max-height: 90vh;
  background: ${theme.colors.background};
  overflow: hidden;

  @media (max-width: ${theme.breakpoints.md}) {
    max-width: 100%;
    max-height: 50vh;
  }
`;

const Image = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const DetailsSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: 90vh;
  overflow-y: auto;

  @media (max-width: ${theme.breakpoints.md}) {
    width: 100%;
    max-height: 45vh;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceBorder};
    border-radius: 3px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.text};
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  overflow-y: auto;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const SectionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  cursor: ${props => props.$collapsible ? 'pointer' : 'default'};
`;

const SectionLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PromptText = styled.p`
  margin: 0;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  line-height: 1.6;
  color: ${theme.colors.text};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceBorder};
    border-radius: 2px;
  }
`;

const ParamsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};
`;

const ParamItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const ParamLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const ParamValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const ModelSection = styled.div`
  padding: ${theme.spacing.sm};
  background: ${theme.colors.primaryMuted};
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.primary}30;
`;

const ModelName = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.primary};
`;

const Footer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const ActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$primary
    ? theme.colors.primary
    : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  color: ${props => props.$primary ? 'white' : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary
      ? theme.colors.primaryHover
      : theme.colors.surfaceHover};
  }

  svg {
    font-size: ${theme.fontSizes.xs};
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.text};
  }
`;

const NsfwBadge = styled.span`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.error}cc;
  border-radius: ${theme.radius.sm};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;
`;

// ===========================================
// COMPONENT
// ===========================================

function ImageModal({
  image,
  isOpen,
  onClose,
  onUsePrompt,
  showUseButton = true
}) {
  const [copied, setCopied] = useState(false);
  const [showNegative, setShowNegative] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!image) return null;

  // Extract generation metadata
  const meta = image.meta || {};
  const prompt = meta.prompt || image.prompt || '';
  const negativePrompt = meta.negativePrompt || '';
  const steps = meta.steps;
  const cfgScale = meta.cfgScale;
  const sampler = meta.sampler;
  const seed = meta.seed;
  const model = meta.Model || image.modelName;
  const size = image.width && image.height ? `${image.width} x ${image.height}` : null;

  // Check if NSFW
  const isNsfw = image.nsfw && image.nsfw !== NSFW_LEVELS.NONE && image.nsfw !== 'None';

  const handleCopy = async () => {
    let textToCopy = prompt;
    if (negativePrompt) {
      textToCopy += `\n\nNegative prompt: ${negativePrompt}`;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleUse = () => {
    onUsePrompt?.({
      prompt,
      negativePrompt,
      steps,
      cfgScale,
      sampler,
      model
    });
    onClose();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `civitai-${image.id || 'image'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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
          >
            <ImageSection>
              <Image
                src={image.url}
                alt={prompt ? prompt.slice(0, 50) : 'Generated image'}
              />
            </ImageSection>

            <DetailsSection>
              <Header>
                <Title>
                  Image Details
                  {isNsfw && <NsfwBadge style={{ marginLeft: '8px' }}>{image.nsfw}</NsfwBadge>}
                </Title>
                <CloseButton onClick={onClose} aria-label="Close modal">
                  <FaTimes />
                </CloseButton>
              </Header>

              <Content>
                {prompt && (
                  <Section>
                    <SectionLabel>Prompt</SectionLabel>
                    <PromptText>{prompt}</PromptText>
                  </Section>
                )}

                {negativePrompt && (
                  <Section>
                    <SectionHeader
                      $collapsible
                      onClick={() => setShowNegative(!showNegative)}
                    >
                      <SectionLabel>Negative Prompt</SectionLabel>
                      {showNegative ? <FaChevronUp /> : <FaChevronDown />}
                    </SectionHeader>
                    <AnimatePresence>
                      {showNegative && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <PromptText>{negativePrompt}</PromptText>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Section>
                )}

                {model && (
                  <Section>
                    <SectionLabel>Model</SectionLabel>
                    <ModelSection>
                      <ModelName>{model}</ModelName>
                    </ModelSection>
                  </Section>
                )}

                <Section>
                  <SectionLabel>Generation Parameters</SectionLabel>
                  <ParamsGrid>
                    {steps && (
                      <ParamItem>
                        <ParamLabel>Steps</ParamLabel>
                        <ParamValue>{steps}</ParamValue>
                      </ParamItem>
                    )}
                    {cfgScale && (
                      <ParamItem>
                        <ParamLabel>CFG Scale</ParamLabel>
                        <ParamValue>{cfgScale}</ParamValue>
                      </ParamItem>
                    )}
                    {sampler && (
                      <ParamItem>
                        <ParamLabel>Sampler</ParamLabel>
                        <ParamValue>{sampler}</ParamValue>
                      </ParamItem>
                    )}
                    {seed && (
                      <ParamItem>
                        <ParamLabel>Seed</ParamLabel>
                        <ParamValue>{seed}</ParamValue>
                      </ParamItem>
                    )}
                    {size && (
                      <ParamItem>
                        <ParamLabel>Size</ParamLabel>
                        <ParamValue>{size}</ParamValue>
                      </ParamItem>
                    )}
                  </ParamsGrid>
                </Section>
              </Content>

              <Footer>
                <ActionButton onClick={handleCopy} disabled={!prompt}>
                  {copied ? <FaCheck /> : <FaCopy />}
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </ActionButton>

                {showUseButton && (
                  <ActionButton $primary onClick={handleUse} disabled={!prompt}>
                    <FaMagic />
                    Use Prompt
                  </ActionButton>
                )}

                <IconButton onClick={handleDownload} title="Download image">
                  <FaDownload />
                </IconButton>
              </Footer>
            </DetailsSection>
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

ImageModal.propTypes = {
  image: PropTypes.shape({
    id: PropTypes.number,
    url: PropTypes.string.isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    nsfw: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    prompt: PropTypes.string,
    meta: PropTypes.shape({
      prompt: PropTypes.string,
      negativePrompt: PropTypes.string,
      steps: PropTypes.number,
      cfgScale: PropTypes.number,
      sampler: PropTypes.string,
      seed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Model: PropTypes.string
    }),
    modelName: PropTypes.string
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUsePrompt: PropTypes.func,
  showUseButton: PropTypes.bool
};

export default ImageModal;
