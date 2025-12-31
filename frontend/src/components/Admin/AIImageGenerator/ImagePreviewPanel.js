/**
 * ImagePreviewPanel - Display and manage generated images
 *
 * Shows generated images with zoom, download, seed info,
 * and actions to accept or regenerate.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaDownload,
  FaRedo,
  FaCheck,
  FaExpand,
  FaCompress,
  FaCopy,
  FaInfoCircle,
  FaSeedling,
  FaMagic,
  FaTimes
} from 'react-icons/fa';
import { theme, motionVariants } from '../../../design-system';
import { useToast } from '../../../context/ToastContext';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const PreviewContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PreviewTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.success};
  }
`;

const ImageCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.normal};
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$single ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))'};
  gap: ${theme.spacing.md};
`;

const ImageCard = styled(motion.div)`
  position: relative;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
  border: 2px solid ${props => props.$selected ? theme.colors.primary : 'transparent'};
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary}80;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  aspect-ratio: ${props => props.$aspectRatio || '2/3'};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ImageCard}:hover & {
    opacity: 1;
  }
`;

const ImageActions = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.2s ease;

  ${ImageCard}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ImageActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${theme.colors.surface};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary};
    color: white;
  }
`;

const SeedBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 2px ${theme.spacing.xs};
  background: rgba(0,0,0,0.7);
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  color: white;
`;

const ModelBadge = styled(SeedBadge)`
  top: auto;
  bottom: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  right: auto;
`;

const InfoPanel = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${theme.fontSizes.sm};
`;

const InfoLabel = styled.span`
  color: ${theme.colors.textSecondary};
`;

const InfoValue = styled.span`
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
  font-family: monospace;
`;

const PromptPreview = styled.div`
  padding: ${theme.spacing.sm};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceBorder};
    border-radius: 2px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$primary ? theme.colors.primary : 'transparent'};
  border: 1px solid ${props => props.$primary ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${props => props.$primary ? 'white' : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? theme.colors.primaryHover : theme.colors.backgroundTertiary};
    border-color: ${props => props.$primary ? theme.colors.primaryHover : theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${props => props.$danger && `
    color: ${theme.colors.error};
    border-color: ${theme.colors.error}40;

    &:hover {
      background: ${theme.colors.error}10;
      border-color: ${theme.colors.error};
    }
  `}
`;

// Lightbox for full-size view
const LightboxOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.lg};
`;

const LightboxImage = styled(motion.img)`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: ${theme.radius.lg};
`;

const LightboxClose = styled.button`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${theme.colors.surface};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary};
    color: white;
  }
`;

// ===========================================
// COMPONENT
// ===========================================

const ImagePreviewPanel = ({
  result,
  onAccept,
  onRegenerate,
  onDiscard,
  selectedIndex,
  onSelectImage
}) => {
  const { success } = useToast();
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showInfo, setShowInfo] = useState(true);

  if (!result || !result.images || result.images.length === 0) {
    return null;
  }

  const images = result.images;
  const selectedImage = selectedIndex !== null ? images[selectedIndex] : images[0];

  /**
   * Download an image
   */
  const handleDownload = async (image, index) => {
    try {
      const response = await fetch(image.img);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-character-${image.seed || index}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Image downloaded');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  /**
   * Copy seed to clipboard
   */
  const handleCopySeed = async (seed) => {
    try {
      await navigator.clipboard.writeText(seed);
      success('Seed copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Copy prompt to clipboard
   */
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(result.prompt);
      success('Prompt copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <>
      <PreviewContainer
        variants={motionVariants.fadeIn}
        initial="hidden"
        animate="visible"
      >
        <PreviewHeader>
          <PreviewTitle>
            <FaMagic aria-hidden="true" />
            Generated Images
            <ImageCount>({images.length})</ImageCount>
          </PreviewTitle>

          <ActionButton
            onClick={() => setShowInfo(!showInfo)}
            aria-label={showInfo ? 'Hide info' : 'Show info'}
          >
            <FaInfoCircle aria-hidden="true" />
            {showInfo ? 'Hide Info' : 'Show Info'}
          </ActionButton>
        </PreviewHeader>

        {/* Image Grid */}
        <ImageGrid $single={images.length === 1}>
          <AnimatePresence>
            {images.map((image, index) => (
              <ImageCard
                key={image.id || index}
                $selected={selectedIndex === index}
                onClick={() => onSelectImage?.(index)}
                variants={motionVariants.card}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <ImageWrapper>
                  <img
                    src={image.img}
                    alt={`Generated image ${index + 1}`}
                    loading="lazy"
                  />
                  <ImageOverlay />

                  <SeedBadge title="Generation seed">
                    <FaSeedling aria-hidden="true" />
                    {image.seed?.slice(0, 8) || 'N/A'}
                  </SeedBadge>

                  {image.model && (
                    <ModelBadge title={`Model: ${image.model}`}>
                      {image.model.slice(0, 15)}
                    </ModelBadge>
                  )}

                  <ImageActions onClick={e => e.stopPropagation()}>
                    <ImageActionButton
                      onClick={() => setLightboxImage(image.img)}
                      aria-label="View full size"
                    >
                      <FaExpand />
                    </ImageActionButton>
                    <ImageActionButton
                      onClick={() => handleDownload(image, index)}
                      aria-label="Download image"
                    >
                      <FaDownload />
                    </ImageActionButton>
                    <ImageActionButton
                      onClick={() => handleCopySeed(image.seed)}
                      aria-label="Copy seed"
                    >
                      <FaCopy />
                    </ImageActionButton>
                  </ImageActions>
                </ImageWrapper>
              </ImageCard>
            ))}
          </AnimatePresence>
        </ImageGrid>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && result.prompt && (
            <InfoPanel
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <InfoRow>
                <InfoLabel>Model:</InfoLabel>
                <InfoValue>{result.model || 'Unknown'}</InfoValue>
              </InfoRow>

              {selectedImage?.seed && (
                <InfoRow>
                  <InfoLabel>Seed:</InfoLabel>
                  <InfoValue
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCopySeed(selectedImage.seed)}
                    title="Click to copy"
                  >
                    {selectedImage.seed}
                  </InfoValue>
                </InfoRow>
              )}

              <InfoRow>
                <InfoLabel>Generated:</InfoLabel>
                <InfoValue>
                  {result.timestamp
                    ? new Date(result.timestamp).toLocaleTimeString()
                    : 'Just now'}
                </InfoValue>
              </InfoRow>

              <div>
                <InfoRow style={{ marginBottom: theme.spacing.xs }}>
                  <InfoLabel>Prompt:</InfoLabel>
                  <ActionButton
                    onClick={handleCopyPrompt}
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                  >
                    <FaCopy aria-hidden="true" />
                    Copy
                  </ActionButton>
                </InfoRow>
                <PromptPreview>{result.prompt}</PromptPreview>
              </div>
            </InfoPanel>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <ActionBar>
          <ActionGroup>
            {onRegenerate && (
              <ActionButton onClick={onRegenerate}>
                <FaRedo aria-hidden="true" />
                Regenerate
              </ActionButton>
            )}
            {onDiscard && (
              <ActionButton $danger onClick={onDiscard}>
                <FaTimes aria-hidden="true" />
                Discard
              </ActionButton>
            )}
          </ActionGroup>

          {onAccept && (
            <ActionButton $primary onClick={() => onAccept(selectedImage || images[0])}>
              <FaCheck aria-hidden="true" />
              Use This Image
            </ActionButton>
          )}
        </ActionBar>
      </PreviewContainer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <LightboxOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
          >
            <LightboxClose
              onClick={() => setLightboxImage(null)}
              aria-label="Close lightbox"
            >
              <FaCompress />
            </LightboxClose>
            <LightboxImage
              src={lightboxImage}
              alt="Full size preview"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={e => e.stopPropagation()}
            />
          </LightboxOverlay>
        )}
      </AnimatePresence>
    </>
  );
};

ImagePreviewPanel.propTypes = {
  /** Generation result containing images */
  result: PropTypes.shape({
    images: PropTypes.arrayOf(PropTypes.shape({
      img: PropTypes.string.isRequired,
      seed: PropTypes.string,
      model: PropTypes.string,
      id: PropTypes.string
    })),
    prompt: PropTypes.string,
    negativePrompt: PropTypes.string,
    model: PropTypes.string,
    timestamp: PropTypes.string
  }),
  /** Handler for accepting/using an image */
  onAccept: PropTypes.func,
  /** Handler for regenerating */
  onRegenerate: PropTypes.func,
  /** Handler for discarding results */
  onDiscard: PropTypes.func,
  /** Currently selected image index */
  selectedIndex: PropTypes.number,
  /** Handler for selecting an image */
  onSelectImage: PropTypes.func
};

ImagePreviewPanel.defaultProps = {
  result: null,
  onAccept: null,
  onRegenerate: null,
  onDiscard: null,
  selectedIndex: 0,
  onSelectImage: null
};

export default ImagePreviewPanel;
