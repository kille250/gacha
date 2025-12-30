/**
 * SummonAnimation Styles
 *
 * Styled components for the React wrapper.
 * Updated to match collection card styling for visual consistency.
 */

import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';

// ==================== CONTAINER ====================

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  background: #05050a;
  transform: translateZ(0);
  will-change: transform;
`;

export const CanvasContainer = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

// ==================== UI OVERLAY ====================

export const UIOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

export const TopArea = styled.div`
  flex: 1;
`;

export const BottomArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: max(32px, env(safe-area-inset-bottom, 32px));
  gap: 16px;
`;

// ==================== PROGRESS ====================

export const ProgressBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const ProgressText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
`;

export const ProgressTrack = styled.div`
  width: 140px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 2px;
  transition: width 0.3s ease;
`;

// ==================== BUTTONS ====================

export const ContinueButton = styled(motion.button)`
  padding: 16px 40px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  letter-spacing: 0.02em;
  transition: background 0.15s ease, box-shadow 0.2s ease;

  &:hover {
    background: #4f46e5;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
  }

  &:active {
    background: #4338ca;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

export const SkipAllButton = styled(motion.button)`
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

export const SkipHint = styled(motion.div)`
  position: absolute;
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  padding: 8px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 100px;
  backdrop-filter: blur(10px);
  letter-spacing: 0.02em;
`;

// ==================== SHOWCASE CARD (Collection-style) ====================

// Premium shimmer animation for legendary cards (matches CharacterCard)
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
    opacity: 0;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    background-position: 200% 0;
    opacity: 0;
  }
`;

// Legendary shimmer effect (matches CharacterCard)
const legendaryShimmer = css`
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 25%,
      rgba(255, 167, 38, 0.08) 45%,
      rgba(255, 215, 0, 0.12) 50%,
      rgba(255, 167, 38, 0.08) 55%,
      transparent 75%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 4s ease-in-out infinite;
    pointer-events: none;
    z-index: 3;
    border-radius: inherit;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 0;
    }
  }
`;

// Showcase card container - centered and scaled up as the main reveal element
// Uses collection card styling for visual consistency
export const ShowcaseCard = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 320px;
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  box-shadow:
    ${theme.shadows.card},
    0 0 30px ${props => props.$color ? `${props.$color}60` : 'transparent'},
    0 0 60px ${props => props.$color ? `${props.$color}40` : 'transparent'},
    0 0 100px ${props => props.$color ? `${props.$color}25` : 'transparent'};
  pointer-events: none;

  /* Apply legendary shimmer effect */
  ${props => props.$rarity === 'legendary' && legendaryShimmer}

  @media (max-width: 480px) {
    max-width: 280px;
  }

  @media (min-width: 768px) {
    max-width: 360px;
  }
`;

export const ShowcaseImageWrapper = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

export const ShowcaseImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const ShowcaseVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// Rarity indicator bar at bottom of image (matches CharacterCard)
export const ShowcaseRarityIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => props.$color};
  box-shadow: 0 0 12px ${props => props.$color}80;
`;

// NEW badge for newly summoned characters
export const ShowcaseNewBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 5px 10px;
  background: linear-gradient(135deg, #34C759, #2FB64E);
  backdrop-filter: blur(8px);
  border-radius: ${theme.radius.full};
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.4);
  z-index: 2;
`;

export const ShowcaseContent = styled.div`
  padding: ${theme.spacing.md};
`;

export const ShowcaseName = styled.h3`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  color: ${theme.colors.text};
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ShowcaseSeries = styled.p`
  font-size: ${theme.fontSizes.xs};
  line-height: ${theme.lineHeights.snug};
  color: ${theme.colors.textTertiary};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Rarity symbol for accessibility (matches CharacterCard)
export const ShowcaseRaritySymbol = styled.span`
  margin-right: 4px;
  opacity: 0.7;
`;

// ==================== CHARACTER INFO (Legacy - kept for backwards compatibility) ====================

export const CharacterInfo = styled(motion.div)`
  position: absolute;
  bottom: 20%;
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: white;
  pointer-events: none;
`;

export const RarityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: ${props => props.$color || '#6366f1'};
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  border-radius: 100px;
  margin-bottom: 14px;
  box-shadow: 0 4px 12px ${props => props.$color ? `${props.$color}80` : 'rgba(99, 102, 241, 0.5)'};
  text-transform: uppercase;

  svg {
    font-size: 12px;
  }
`;

export const CharacterName = styled.h2`
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

export const CharacterSeries = styled.p`
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.02em;
`;

// ==================== MULTI-PULL RESULTS ====================

export const ResultsOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(5, 5, 10, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

export const ResultsContent = styled(motion.div)`
  max-width: 900px;
  width: 100%;
  max-height: 100vh;
  max-height: 100dvh;
  padding: 20px;
  padding-top: 60px;
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (min-height: 700px) {
    padding-top: 20px;
  }
`;

export const ResultsHeader = styled.div`
  text-align: center;
  margin-bottom: 28px;
`;

export const ResultsTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
`;

export const ResultsSubtitle = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
`;

export const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
  max-height: 55vh;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
  }
`;

// Result card wrapper - provides animation wrapper for CharacterCard
export const ResultCardWrapper = styled(motion.div)`
  /* Minimal wrapper - CharacterCard provides all styling */
`;

// Legacy ResultCard styles kept for backwards compatibility but deprecated
export const ResultCard = styled(motion.div)`
  background: rgba(20, 20, 28, 1);
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--rarity-color, #6366f1);
  box-shadow: 0 0 16px var(--rarity-color-alpha, rgba(99, 102, 241, 0.25));
`;

export const ResultImageWrapper = styled.div`
  height: 120px;
  overflow: hidden;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    height: 100px;
  }
`;

export const ResultInfo = styled.div`
  padding: 10px;
  text-align: center;
`;

export const ResultName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`;

export const ResultRarity = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--rarity-color, #6366f1);
  letter-spacing: 0.5px;
`;

export const CloseButton = styled(motion.button)`
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  padding: 16px 32px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transition: background 0.15s ease, box-shadow 0.2s ease;

  &:hover {
    background: #4f46e5;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
  }

  &:active {
    background: #4338ca;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

// ==================== ACCESSIBILITY ====================

export const ScreenReaderOnly = styled.span`
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
