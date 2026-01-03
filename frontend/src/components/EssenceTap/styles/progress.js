/**
 * Progress Bar Styled Components
 *
 * Progress indicators and bars for Essence Tap.
 */

import styled, { keyframes } from 'styled-components';
import { theme } from '../../../design-system';

/**
 * Shimmer animation for loading states
 */
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/**
 * Progress section container
 */
export const ProgressSection = styled.div`
  margin-bottom: ${props => props.$spacing || theme.spacing.md};
`;

/**
 * Progress header with label and value
 */
export const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xs};
`;

/**
 * Progress label
 */
export const ProgressLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || theme.colors.textSecondary};
`;

/**
 * Progress value display
 */
export const ProgressValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color || theme.colors.text};
`;

/**
 * Progress bar container/track
 */
export const ProgressBarContainer = styled.div`
  width: 100%;
  height: ${props => props.$height || '8px'};
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${props => props.$radius || theme.radius.full};
  overflow: hidden;
`;

/**
 * Progress bar fill
 */
export const ProgressBarFill = styled.div`
  height: 100%;
  width: ${props => Math.min(100, Math.max(0, props.$percent || 0))}%;
  background: ${props => props.$gradient || props.$color || 'linear-gradient(90deg, #A855F7, #C084FC)'};
  border-radius: ${props => props.$radius || theme.radius.full};
  transition: width ${props => props.$animated ? '0.5s' : '0.2s'} ease-out;

  ${props => props.$shimmer && `
    background: linear-gradient(
      90deg,
      ${props.$color || '#A855F7'} 0%,
      ${props.$highlightColor || '#C084FC'} 50%,
      ${props.$color || '#A855F7'} 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite linear;
  `}
`;

/**
 * Segmented progress (for multi-step progress)
 */
export const SegmentedProgress = styled.div`
  display: flex;
  gap: 2px;
  height: ${props => props.$height || '8px'};
`;

/**
 * Individual segment in segmented progress
 */
export const ProgressSegment = styled.div`
  flex: 1;
  height: 100%;
  background: ${props => props.$active
    ? props.$color || 'linear-gradient(90deg, #A855F7, #C084FC)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.sm};
  transition: background 0.3s ease;
`;

/**
 * Circular progress container
 */
export const CircularProgressContainer = styled.div`
  position: relative;
  width: ${props => props.$size || '60px'};
  height: ${props => props.$size || '60px'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Circular progress SVG
 */
export const CircularProgressSVG = styled.svg`
  transform: rotate(-90deg);
  position: absolute;
  top: 0;
  left: 0;
`;

/**
 * Circular progress background circle
 */
export const CircularProgressTrack = styled.circle`
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: ${props => props.$strokeWidth || 4};
`;

/**
 * Circular progress fill circle
 */
export const CircularProgressFillPath = styled.circle`
  fill: none;
  stroke: ${props => props.$color || '#A855F7'};
  stroke-width: ${props => props.$strokeWidth || 4};
  stroke-linecap: round;
  stroke-dasharray: ${props => props.$circumference || 188};
  stroke-dashoffset: ${props => {
    const circumference = props.$circumference || 188;
    const percent = Math.min(100, Math.max(0, props.$percent || 0));
    return circumference - (percent / 100) * circumference;
  }};
  transition: stroke-dashoffset 0.5s ease-out;
`;

/**
 * Content inside circular progress
 */
export const CircularProgressContent = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
`;

/**
 * XP/Level progress bar
 */
export const XPProgressBar = styled(ProgressBarContainer)`
  height: ${props => props.$height || '6px'};
  background: rgba(168, 85, 247, 0.2);
`;

/**
 * XP progress fill
 */
export const XPProgressFill = styled(ProgressBarFill)`
  background: linear-gradient(90deg, #A855F7, #C084FC);
`;

/**
 * Milestone progress indicator
 */
export const MilestoneProgress = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

/**
 * Individual milestone dot
 */
export const MilestoneDot = styled.div`
  width: ${props => props.$size || '12px'};
  height: ${props => props.$size || '12px'};
  border-radius: 50%;
  background: ${props => {
    if (props.$completed) return props.$completedColor || '#10B981';
    if (props.$current) return props.$currentColor || '#A855F7';
    return 'rgba(255, 255, 255, 0.2)';
  }};
  border: 2px solid ${props => {
    if (props.$completed) return 'transparent';
    if (props.$current) return props.$currentColor || '#A855F7';
    return 'transparent';
  }};
  transition: all 0.3s ease;
`;

/**
 * Connector line between milestones
 */
export const MilestoneConnector = styled.div`
  flex: 1;
  height: 2px;
  background: ${props => props.$completed
    ? props.$completedColor || '#10B981'
    : 'rgba(255, 255, 255, 0.1)'};
  transition: background 0.3s ease;
`;
