/**
 * PromptCard - Display a single Civitai image with prompt info
 *
 * Shows thumbnail (with NSFW blur), prompt text, generation params,
 * and copy/use actions.
 */

import React, { useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCopy,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaMagic,
  FaEye,
  FaEyeSlash,
  FaExpand
} from 'react-icons/fa';
import { theme, Badge } from '../../design-system';
import { NSFW_LEVELS, STORAGE_KEYS } from '../../constants/civitai';

// ===========================================
// UTILITIES
// ===========================================

/**
 * Check if blur is enabled for NSFW content
 */
const shouldBlurNsfw = () => {
  try {
    const setting = localStorage.getItem(STORAGE_KEYS.BLUR_NSFW);
    // Default to true (blur) if not set
    return setting !== 'false';
  } catch {
    return true;
  }
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// ===========================================
// STYLED COMPONENTS
// ===========================================

const Card = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary}50;
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.lg};
  }
`;

const ImageContainer = styled.div`
  position: relative;
  aspect-ratio: ${props => props.$aspectRatio || '1'};
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.3s ease, transform 0.3s ease;

  ${props => props.$blur && css`
    filter: blur(20px);
  `}

  ${Card}:hover & {
    transform: scale(1.05);
    ${props => props.$blur && props.$revealOnHover && css`
      filter: blur(0);
    `}
  }
`;

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    transparent 50%
  );
  opacity: 0;
  transition: opacity 0.2s ease;

  ${Card}:hover & {
    opacity: 1;
  }
`;

const ExpandButton = styled.button`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${theme.colors.overlay};
  border-radius: ${theme.radius.md};
  color: white;
  opacity: 0;
  transition: all 0.2s ease;

  ${Card}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${theme.colors.primary};
    transform: scale(1.1);
  }
`;

const NsfwBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.error}cc;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const RevealButton = styled.button`
  position: absolute;
  bottom: ${theme.spacing.sm};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.overlay};
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.xs};
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary};
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
`;

const PromptSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const PromptLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PromptText = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  line-height: 1.5;
  color: ${theme.colors.text};
  word-break: break-word;
`;

const ExpandablePrompt = styled.div`
  position: relative;
`;

const PromptToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  transition: color 0.2s ease;

  &:hover {
    color: ${theme.colors.primaryHover};
  }
`;

const NegativePrompt = styled(motion.div)`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const NegativePromptText = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.xs};
  line-height: 1.5;
  color: ${theme.colors.textSecondary};
  word-break: break-word;
`;

const ParamsBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

const ParamBadge = styled.span`
  padding: 2px ${theme.spacing.xs};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  padding-top: 0;
`;

const ActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: ${theme.fontSizes.xs};
  }
`;

// ===========================================
// COMPONENT
// ===========================================

function PromptCard({
  image,
  onImageClick,
  onUsePrompt,
  showUseButton = true
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Determine if this image is NSFW
  const isNsfw = image.nsfw && image.nsfw !== NSFW_LEVELS.NONE && image.nsfw !== 'None';
  const shouldBlur = isNsfw && shouldBlurNsfw() && !revealed;

  // Extract generation metadata
  const meta = image.meta || {};
  const prompt = meta.prompt || image.prompt || '';
  const negativePrompt = meta.negativePrompt || '';
  const steps = meta.steps;
  const cfgScale = meta.cfgScale;
  const sampler = meta.sampler;
  const model = meta.Model || image.modelName;

  // Calculate aspect ratio from image dimensions
  const aspectRatio = image.width && image.height
    ? `${image.width} / ${image.height}`
    : '1';

  // Truncate prompt for display
  const displayPrompt = isExpanded ? prompt : truncateText(prompt, 150);
  const canExpand = prompt.length > 150;

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation();

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
  }, [prompt, negativePrompt]);

  const handleUse = useCallback((e) => {
    e.stopPropagation();
    onUsePrompt?.({
      prompt,
      negativePrompt,
      steps,
      cfgScale,
      sampler,
      model
    });
  }, [prompt, negativePrompt, steps, cfgScale, sampler, model, onUsePrompt]);

  const handleReveal = useCallback((e) => {
    e.stopPropagation();
    setRevealed(true);
  }, []);

  const handleCardClick = useCallback(() => {
    onImageClick?.(image);
  }, [image, onImageClick]);

  const handleExpandClick = useCallback((e) => {
    e.stopPropagation();
    onImageClick?.(image);
  }, [image, onImageClick]);

  return (
    <Card
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <ImageContainer $aspectRatio={aspectRatio}>
        <Image
          src={image.url}
          alt={prompt ? truncateText(prompt, 50) : 'Generated image'}
          loading="lazy"
          $blur={shouldBlur}
          $revealOnHover={isNsfw}
        />
        <ImageOverlay />

        {isNsfw && (
          <NsfwBadge>{image.nsfw}</NsfwBadge>
        )}

        {shouldBlur && (
          <RevealButton onClick={handleReveal}>
            <FaEye />
            Click to reveal
          </RevealButton>
        )}

        <ExpandButton onClick={handleExpandClick} aria-label="View full size">
          <FaExpand />
        </ExpandButton>
      </ImageContainer>

      <Content onClick={(e) => e.stopPropagation()}>
        {prompt && (
          <PromptSection>
            <PromptLabel>Prompt</PromptLabel>
            <ExpandablePrompt>
              <PromptText>{displayPrompt}</PromptText>
              {canExpand && (
                <PromptToggle onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? (
                    <>Show less <FaChevronUp /></>
                  ) : (
                    <>Show more <FaChevronDown /></>
                  )}
                </PromptToggle>
              )}
            </ExpandablePrompt>
          </PromptSection>
        )}

        {negativePrompt && (
          <PromptSection>
            <PromptToggle onClick={() => setShowNegative(!showNegative)}>
              Negative prompt
              {showNegative ? <FaChevronUp /> : <FaChevronDown />}
            </PromptToggle>
            <AnimatePresence>
              {showNegative && (
                <NegativePrompt
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <NegativePromptText>{negativePrompt}</NegativePromptText>
                </NegativePrompt>
              )}
            </AnimatePresence>
          </PromptSection>
        )}

        <ParamsBadges>
          {steps && <ParamBadge>Steps: {steps}</ParamBadge>}
          {cfgScale && <ParamBadge>CFG: {cfgScale}</ParamBadge>}
          {sampler && <ParamBadge>{sampler}</ParamBadge>}
          {model && <ParamBadge>{truncateText(model, 20)}</ParamBadge>}
        </ParamsBadges>
      </Content>

      <Actions onClick={(e) => e.stopPropagation()}>
        <ActionButton onClick={handleCopy} disabled={!prompt}>
          {copied ? <FaCheck /> : <FaCopy />}
          {copied ? 'Copied!' : 'Copy'}
        </ActionButton>

        {showUseButton && (
          <ActionButton $primary onClick={handleUse} disabled={!prompt}>
            <FaMagic />
            Use
          </ActionButton>
        )}
      </Actions>
    </Card>
  );
}

PromptCard.propTypes = {
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
      Model: PropTypes.string
    }),
    modelName: PropTypes.string
  }).isRequired,
  onImageClick: PropTypes.func,
  onUsePrompt: PropTypes.func,
  showUseButton: PropTypes.bool
};

export default memo(PromptCard);
