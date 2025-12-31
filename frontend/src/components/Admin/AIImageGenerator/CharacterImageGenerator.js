/**
 * CharacterImageGenerator - Main component for AI-powered character image generation
 *
 * Combines the PromptBuilder, GenerationProgress, and ImagePreviewPanel
 * to provide a complete image generation workflow in the admin panel.
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMagic,
  FaRobot,
  FaTimes,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import { theme, motionVariants } from '../../../design-system';
import {
  useImageGeneration,
  useAvailableModels,
  useStableHordeHealth,
  GENERATION_STATUS
} from '../../../hooks/useImageGeneration';
import { useToast } from '../../../context/ToastContext';
import PromptBuilder from './PromptBuilder';
import GenerationProgress from './GenerationProgress';
import ImagePreviewPanel from './ImagePreviewPanel';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const GeneratorContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  max-width: 100%;
`;

const GeneratorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const GeneratorTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$healthy
    ? `${theme.colors.success}15`
    : `${theme.colors.error}15`
  };
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$healthy ? theme.colors.success : theme.colors.error};

  svg {
    font-size: 10px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const HeaderButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    border-color: ${theme.colors.primary};
  }

  ${props => props.$active && `
    background: ${theme.colors.primary}10;
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  `}
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.error}10;
    border-color: ${theme.colors.error};
    color: ${theme.colors.error};
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: ${props => props.$showHistory ? '1fr 300px' : '1fr'};
  }
`;

const GeneratorContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const HistorySidebar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  max-height: 600px;
  overflow-y: auto;
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HistoryTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
  }
`;

const ClearHistoryBtn = styled.button`
  padding: ${theme.spacing.xs};
  background: transparent;
  border: none;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.error};
  }
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const HistoryItem = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary}10;
  }
`;

const HistoryThumb = styled.div`
  width: 48px;
  height: 64px;
  border-radius: ${theme.radius.sm};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const HistoryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const HistoryModel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HistoryTime = styled.span`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
`;

const EmptyHistory = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  text-align: center;
  color: ${theme.colors.textSecondary};

  svg {
    font-size: 24px;
    opacity: 0.5;
  }
`;

const ApiWarning = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.warning}10;
  border: 1px solid ${theme.colors.warning}40;
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.warning};
  font-size: ${theme.fontSizes.sm};

  svg {
    flex-shrink: 0;
  }
`;

// ===========================================
// COMPONENT
// ===========================================

const CharacterImageGenerator = ({
  onImageGenerated,
  onClose
}) => {
  const { success, error: showError } = useToast();

  // Image generation state
  const {
    status,
    progress,
    result,
    error,
    history,
    isGenerating,
    generate,
    cancel,
    reset,
    clearHistory
  } = useImageGeneration();

  // Available models
  const { models: allModels, refresh: refreshModels } = useAvailableModels();

  // API health check
  const { isHealthy, checking: checkingHealth } = useStableHordeHealth();

  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lastRequest, setLastRequest] = useState(null);

  // Refresh models on mount
  useEffect(() => {
    refreshModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle generation request from PromptBuilder
   * PromptBuilder sends a complete request object with prompt, negative_prompt, models, params
   */
  const handleGenerate = useCallback(async (request) => {
    setLastRequest(request);
    setSelectedImageIndex(0);

    try {
      await generate(request);
    } catch (err) {
      console.error('Generation failed:', err);
      showError('Generation failed', err.message);
    }
  }, [generate, showError]);

  /**
   * Handle regeneration with same request
   */
  const handleRegenerate = useCallback(() => {
    if (lastRequest) {
      handleGenerate(lastRequest);
    }
  }, [lastRequest, handleGenerate]);

  /**
   * Handle accepting generated image
   */
  const handleAcceptImage = useCallback((image) => {
    if (onImageGenerated) {
      onImageGenerated({
        url: image.img,
        seed: image.seed,
        model: image.model,
        prompt: lastRequest?.prompt,
        negativePrompt: lastRequest?.negative_prompt
      });
      success('Image selected for character');
    }
  }, [onImageGenerated, lastRequest, success]);

  /**
   * Handle discarding results
   */
  const handleDiscard = useCallback(() => {
    reset();
  }, [reset]);

  /**
   * Load from history
   */
  const handleLoadFromHistory = useCallback((historyItem) => {
    // Could implement loading historical generation settings
    console.log('Load from history:', historyItem);
  }, []);

  return (
    <GeneratorContainer
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <GeneratorHeader>
        <HeaderLeft>
          <GeneratorTitle>
            <FaRobot aria-hidden="true" />
            AI Image Generator
          </GeneratorTitle>
          <StatusIndicator $healthy={isHealthy}>
            {checkingHealth ? (
              'Checking...'
            ) : isHealthy ? (
              <>
                <FaCheckCircle aria-hidden="true" />
                API Online
              </>
            ) : (
              <>
                <FaExclamationTriangle aria-hidden="true" />
                API Offline
              </>
            )}
          </StatusIndicator>
        </HeaderLeft>

        <HeaderActions>
          <HeaderButton
            $active={showHistory}
            onClick={() => setShowHistory(!showHistory)}
          >
            <FaHistory aria-hidden="true" />
            History ({history.length})
          </HeaderButton>
          {onClose && (
            <CloseButton onClick={onClose} aria-label="Close generator">
              <FaTimes />
            </CloseButton>
          )}
        </HeaderActions>
      </GeneratorHeader>

      {/* API Warning */}
      <AnimatePresence>
        {isHealthy === false && (
          <ApiWarning
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <FaExclamationTriangle aria-hidden="true" />
            StableHorde API is currently unavailable. Image generation may not work. Please try again later.
          </ApiWarning>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <MainContent $showHistory={showHistory}>
        <GeneratorContent>
          {/* Prompt Builder */}
          <PromptBuilder
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            availableModels={allModels}
          />

          {/* Generation Progress */}
          <AnimatePresence mode="wait">
            {isGenerating && (
              <GenerationProgress
                key="progress"
                status={status}
                progress={progress}
                error={error}
                onCancel={cancel}
              />
            )}
          </AnimatePresence>

          {/* Results Preview */}
          <AnimatePresence mode="wait">
            {result && status === GENERATION_STATUS.COMPLETED && (
              <ImagePreviewPanel
                key="preview"
                result={result}
                onAccept={handleAcceptImage}
                onRegenerate={handleRegenerate}
                onDiscard={handleDiscard}
                selectedIndex={selectedImageIndex}
                onSelectImage={setSelectedImageIndex}
              />
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {error && status === GENERATION_STATUS.FAILED && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  padding: theme.spacing.md,
                  background: `${theme.colors.error}10`,
                  border: `1px solid ${theme.colors.error}40`,
                  borderRadius: theme.radius.lg,
                  color: theme.colors.error,
                  fontSize: theme.fontSizes.sm
                }}
              >
                <strong>Generation Failed:</strong> {error.message}
              </motion.div>
            )}
          </AnimatePresence>
        </GeneratorContent>

        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <HistorySidebar
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <HistoryHeader>
                <HistoryTitle>
                  <FaHistory aria-hidden="true" />
                  Recent Generations
                </HistoryTitle>
                {history.length > 0 && (
                  <ClearHistoryBtn onClick={clearHistory}>
                    Clear
                  </ClearHistoryBtn>
                )}
              </HistoryHeader>

              {history.length > 0 ? (
                <HistoryList>
                  {history.map((item, index) => (
                    <HistoryItem
                      key={index}
                      onClick={() => handleLoadFromHistory(item)}
                    >
                      {item.images?.[0] && (
                        <HistoryThumb>
                          <img src={item.images[0].img} alt="Generated" />
                        </HistoryThumb>
                      )}
                      <HistoryInfo>
                        <HistoryModel>
                          {item.model || 'Unknown model'}
                        </HistoryModel>
                        <HistoryTime>
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleTimeString()
                            : 'Unknown time'}
                        </HistoryTime>
                      </HistoryInfo>
                    </HistoryItem>
                  ))}
                </HistoryList>
              ) : (
                <EmptyHistory>
                  <FaMagic aria-hidden="true" />
                  <span>No generations yet</span>
                </EmptyHistory>
              )}
            </HistorySidebar>
          )}
        </AnimatePresence>
      </MainContent>
    </GeneratorContainer>
  );
};

CharacterImageGenerator.propTypes = {
  /** Handler called when an image is selected/accepted */
  onImageGenerated: PropTypes.func,
  /** Handler for closing the generator */
  onClose: PropTypes.func
};

CharacterImageGenerator.defaultProps = {
  onImageGenerated: null,
  onClose: null
};

export default CharacterImageGenerator;
