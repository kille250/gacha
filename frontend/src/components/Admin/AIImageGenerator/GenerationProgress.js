/**
 * GenerationProgress - Visual progress indicator for AI image generation
 *
 * Shows queue position, estimated wait time, and generation phase
 * with animated progress indication.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaUsers, FaCog, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { theme, motionVariants } from '../../../design-system';
import { GENERATION_STATUS } from '../../../hooks/useImageGeneration';
import stableHordeService from '../../../services/stableHordeService';

// ===========================================
// ANIMATIONS
// ===========================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const progressGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px ${theme.colors.primary}40; }
  50% { box-shadow: 0 0 20px ${theme.colors.primary}80; }
`;

// ===========================================
// STYLED COMPONENTS
// ===========================================

const ProgressContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => {
    switch (props.$status) {
      case GENERATION_STATUS.QUEUED:
        return `${theme.colors.warning}20`;
      case GENERATION_STATUS.PROCESSING:
        return `${theme.colors.primary}20`;
      case GENERATION_STATUS.COMPLETED:
        return `${theme.colors.success}20`;
      case GENERATION_STATUS.FAILED:
      case GENERATION_STATUS.CANCELLED:
        return `${theme.colors.error}20`;
      default:
        return theme.colors.backgroundTertiary;
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case GENERATION_STATUS.QUEUED:
        return theme.colors.warning;
      case GENERATION_STATUS.PROCESSING:
        return theme.colors.primary;
      case GENERATION_STATUS.COMPLETED:
        return theme.colors.success;
      case GENERATION_STATUS.FAILED:
      case GENERATION_STATUS.CANCELLED:
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  }};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};

  svg {
    animation: ${props => props.$status === GENERATION_STATUS.PROCESSING ? rotate : 'none'} 2s linear infinite;
  }
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: transparent;
  border: 1px solid ${theme.colors.error}40;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.error}10;
    border-color: ${theme.colors.error};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressBarContainer = styled.div`
  position: relative;
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressBarFill = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    ${theme.colors.primary},
    ${theme.colors.secondary}
  );
  border-radius: ${theme.radius.full};
  animation: ${progressGlow} 2s ease-in-out infinite;
`;

const ProgressBarIndeterminate = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 30%;
  background: linear-gradient(
    90deg,
    transparent,
    ${theme.colors.primary},
    transparent
  );
  border-radius: ${theme.radius.full};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${props => props.$color || theme.colors.primary}20;
  color: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.md};
  font-size: 16px;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  animation: ${props => props.$pulse ? pulse : 'none'} 1.5s ease-in-out infinite;
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const PhaseIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

const Phase = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
  opacity: ${props => props.$active ? 1 : 0.4};
  transition: opacity 0.3s ease;
`;

const PhaseDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  transition: background 0.3s ease;
  animation: ${props => props.$active ? `${pulse} 1s ease-in-out infinite` : 'none'};
`;

const PhaseLine = styled.div`
  width: 40px;
  height: 2px;
  background: ${props => props.$completed ? theme.colors.primary : theme.colors.surfaceBorder};
  transition: background 0.3s ease;
`;

const PhaseLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$active ? theme.colors.text : theme.colors.textSecondary};
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.error}10;
  border: 1px solid ${theme.colors.error}40;
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};

  svg {
    flex-shrink: 0;
  }
`;

// ===========================================
// COMPONENT
// ===========================================

const GenerationProgress = ({
  status,
  progress,
  error,
  onCancel
}) => {
  // Calculate progress percentage (estimated)
  const getProgressPercent = () => {
    if (status === GENERATION_STATUS.COMPLETED) return 100;
    if (status === GENERATION_STATUS.FAILED || status === GENERATION_STATUS.CANCELLED) return 0;
    if (!progress) return 0;

    // If processing, estimate based on typical generation time
    if (progress.processing > 0) {
      return 70 + (progress.finished / Math.max(progress.waiting + progress.finished, 1)) * 30;
    }

    // If in queue, estimate based on position
    if (progress.queuePosition > 0) {
      return Math.min(60, 60 - (progress.queuePosition * 5));
    }

    return 10;
  };

  // Get status label
  const getStatusLabel = () => {
    switch (status) {
      case GENERATION_STATUS.SUBMITTING:
        return 'Submitting...';
      case GENERATION_STATUS.QUEUED:
        return 'In Queue';
      case GENERATION_STATUS.PROCESSING:
        return 'Generating...';
      case GENERATION_STATUS.COMPLETED:
        return 'Completed';
      case GENERATION_STATUS.FAILED:
        return 'Failed';
      case GENERATION_STATUS.CANCELLED:
        return 'Cancelled';
      default:
        return 'Idle';
    }
  };

  // Get current phase
  const getCurrentPhase = () => {
    switch (status) {
      case GENERATION_STATUS.SUBMITTING:
        return 0;
      case GENERATION_STATUS.QUEUED:
        return 1;
      case GENERATION_STATUS.PROCESSING:
        return 2;
      case GENERATION_STATUS.COMPLETED:
        return 3;
      default:
        return 0;
    }
  };

  const isGenerating = status === GENERATION_STATUS.SUBMITTING ||
    status === GENERATION_STATUS.QUEUED ||
    status === GENERATION_STATUS.PROCESSING;

  const currentPhase = getCurrentPhase();
  const progressPercent = getProgressPercent();

  return (
    <ProgressContainer
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <ProgressHeader>
        <StatusBadge $status={status}>
          <FaCog aria-hidden="true" />
          {getStatusLabel()}
        </StatusBadge>

        {isGenerating && onCancel && (
          <CancelButton
            onClick={onCancel}
            aria-label="Cancel generation"
          >
            <FaTimes aria-hidden="true" />
            Cancel
          </CancelButton>
        )}
      </ProgressHeader>

      {/* Progress Bar */}
      <ProgressBarContainer>
        {isGenerating && status !== GENERATION_STATUS.SUBMITTING ? (
          progressPercent > 0 ? (
            <ProgressBarFill
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <ProgressBarIndeterminate
              animate={{
                x: ['0%', '233%', '0%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )
        ) : status === GENERATION_STATUS.COMPLETED ? (
          <ProgressBarFill
            initial={{ width: `${progressPercent}%` }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.3 }}
          />
        ) : null}
      </ProgressBarContainer>

      {/* Stats */}
      <AnimatePresence mode="wait">
        {progress && isGenerating && (
          <StatsGrid
            as={motion.div}
            variants={motionVariants.staggerContainer}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <StatCard as={motion.div} variants={motionVariants.staggerItem}>
              <StatIcon $color={theme.colors.warning}>
                <FaUsers aria-hidden="true" />
              </StatIcon>
              <StatValue $pulse={progress.queuePosition > 0}>
                {progress.queuePosition || '-'}
              </StatValue>
              <StatLabel>Queue Position</StatLabel>
            </StatCard>

            <StatCard as={motion.div} variants={motionVariants.staggerItem}>
              <StatIcon $color={theme.colors.primary}>
                <FaClock aria-hidden="true" />
              </StatIcon>
              <StatValue>
                {progress.waitTime ? stableHordeService.formatWaitTime(progress.waitTime) : '-'}
              </StatValue>
              <StatLabel>Est. Wait Time</StatLabel>
            </StatCard>

            <StatCard as={motion.div} variants={motionVariants.staggerItem}>
              <StatIcon $color={theme.colors.success}>
                <FaCog aria-hidden="true" />
              </StatIcon>
              <StatValue>
                {progress.processing || 0}
              </StatValue>
              <StatLabel>Processing</StatLabel>
            </StatCard>
          </StatsGrid>
        )}
      </AnimatePresence>

      {/* Phase Indicator */}
      <PhaseIndicator>
        <Phase $active={currentPhase >= 0}>
          <PhaseDot $active={currentPhase === 0} />
          <PhaseLabel $active={currentPhase >= 0}>Submit</PhaseLabel>
        </Phase>

        <PhaseLine $completed={currentPhase > 0} />

        <Phase $active={currentPhase >= 1}>
          <PhaseDot $active={currentPhase === 1} />
          <PhaseLabel $active={currentPhase >= 1}>Queue</PhaseLabel>
        </Phase>

        <PhaseLine $completed={currentPhase > 1} />

        <Phase $active={currentPhase >= 2}>
          <PhaseDot $active={currentPhase === 2} />
          <PhaseLabel $active={currentPhase >= 2}>Generate</PhaseLabel>
        </Phase>

        <PhaseLine $completed={currentPhase > 2} />

        <Phase $active={currentPhase >= 3}>
          <PhaseDot $active={currentPhase === 3} />
          <PhaseLabel $active={currentPhase >= 3}>Done</PhaseLabel>
        </Phase>
      </PhaseIndicator>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <ErrorMessage
            as={motion.div}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <FaExclamationTriangle aria-hidden="true" />
            {error.message}
          </ErrorMessage>
        )}
      </AnimatePresence>
    </ProgressContainer>
  );
};

GenerationProgress.propTypes = {
  /** Current generation status */
  status: PropTypes.oneOf(Object.values(GENERATION_STATUS)).isRequired,
  /** Progress data from generation */
  progress: PropTypes.shape({
    queuePosition: PropTypes.number,
    waitTime: PropTypes.number,
    processing: PropTypes.number,
    finished: PropTypes.number,
    waiting: PropTypes.number,
    isPossible: PropTypes.bool
  }),
  /** Error object if generation failed */
  error: PropTypes.shape({
    message: PropTypes.string,
    code: PropTypes.string
  }),
  /** Handler for cancel button */
  onCancel: PropTypes.func
};

GenerationProgress.defaultProps = {
  progress: null,
  error: null,
  onCancel: null
};

export default GenerationProgress;
