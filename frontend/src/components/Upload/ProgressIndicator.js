/**
 * ProgressIndicator - Enhanced upload progress display
 *
 * Features:
 * - Step-by-step progress
 * - Time estimates
 * - File count progress
 * - Visual progress bar
 * - Accessible announcements
 */
import React, { memo, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  FaCheckCircle,
  FaSpinner,
  FaClock,
  FaUpload,
} from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import { prefersReducedMotion } from '../../utils/featureFlags';

export const UPLOAD_STEPS = {
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  ANALYZING: 'analyzing',
  FINALIZING: 'finalizing',
  COMPLETE: 'complete',
};

const STEP_CONFIG = {
  [UPLOAD_STEPS.PREPARING]: {
    label: 'Preparing files...',
    icon: FaSpinner,
    animate: true,
  },
  [UPLOAD_STEPS.UPLOADING]: {
    label: 'Uploading files...',
    icon: FaUpload,
    animate: true,
  },
  [UPLOAD_STEPS.ANALYZING]: {
    label: 'Checking for duplicates...',
    icon: FaSpinner,
    animate: true,
  },
  [UPLOAD_STEPS.FINALIZING]: {
    label: 'Finalizing...',
    icon: FaSpinner,
    animate: true,
  },
  [UPLOAD_STEPS.COMPLETE]: {
    label: 'Complete!',
    icon: FaCheckCircle,
    animate: false,
  },
};

const ProgressIndicator = memo(({
  step = UPLOAD_STEPS.UPLOADING,
  progress = 0,
  filesCompleted = 0,
  filesTotal = 0,
  estimatedTime,
  compact = false,
}) => {
  const reducedMotion = prefersReducedMotion();
  const stepConfig = STEP_CONFIG[step] || STEP_CONFIG[UPLOAD_STEPS.UPLOADING];
  const Icon = stepConfig.icon;

  const timeDisplay = useMemo(() => {
    if (!estimatedTime || step === UPLOAD_STEPS.COMPLETE) return null;

    const remaining = Math.max(0, estimatedTime.seconds * (1 - progress / 100));
    if (remaining < 5) return 'Almost done...';
    if (remaining < 60) return `${Math.ceil(remaining)} seconds remaining`;
    return `${Math.ceil(remaining / 60)} minute${remaining >= 120 ? 's' : ''} remaining`;
  }, [estimatedTime, progress, step]);

  if (compact) {
    return (
      <CompactContainer role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <CompactProgress $progress={progress} />
        <CompactLabel>{Math.round(progress)}%</CompactLabel>
      </CompactContainer>
    );
  }

  return (
    <Container
      role="region"
      aria-label="Upload progress"
      aria-live="polite"
    >
      <Header>
        <StepInfo>
          <IconWrapper $animate={stepConfig.animate && !reducedMotion} $complete={step === UPLOAD_STEPS.COMPLETE}>
            <Icon aria-hidden="true" />
          </IconWrapper>
          <StepLabel>{stepConfig.label}</StepLabel>
        </StepInfo>
        <ProgressPercent>{Math.round(progress)}%</ProgressPercent>
      </Header>

      <ProgressBarContainer>
        <ProgressBar
          as={motion.div}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          $complete={step === UPLOAD_STEPS.COMPLETE}
        />
        {step !== UPLOAD_STEPS.COMPLETE && !reducedMotion && (
          <ProgressShimmer style={{ left: `${progress - 20}%` }} />
        )}
      </ProgressBarContainer>

      <Footer>
        <FileProgress>
          {filesCompleted} of {filesTotal} files
        </FileProgress>
        {timeDisplay && (
          <TimeEstimate>
            <FaClock aria-hidden="true" />
            <span>{timeDisplay}</span>
          </TimeEstimate>
        )}
      </Footer>

      {/* Screen reader announcement */}
      <SrOnly role="status" aria-live="assertive">
        {stepConfig.label} {Math.round(progress)}% complete.
        {filesCompleted} of {filesTotal} files uploaded.
      </SrOnly>
    </Container>
  );
});

ProgressIndicator.displayName = 'ProgressIndicator';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
`;

const Container = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const StepInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => props.$complete ? theme.colors.success : theme.colors.primary};

  svg {
    font-size: 16px;
    animation: ${props => props.$animate ? `${spin} 1s linear infinite` : 'none'};
  }
`;

const StepLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const ProgressPercent = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.primary};
`;

const ProgressBarContainer = styled.div`
  position: relative;
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: ${props => props.$complete
    ? theme.colors.success
    : `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent})`};
  border-radius: ${theme.radius.full};
  min-width: 4px;
`;

const ProgressShimmer = styled.div`
  position: absolute;
  top: 0;
  width: 20%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: ${shimmer} 1.5s infinite;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${theme.spacing.sm};
`;

const FileProgress = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const TimeEstimate = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};

  svg {
    font-size: 10px;
  }
`;

const CompactContainer = styled.div`
  position: relative;
  height: 24px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const CompactProgress = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent});
  transition: width 0.3s ease;
`;

const CompactLabel = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export default ProgressIndicator;
