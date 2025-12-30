/**
 * Summon Animation Styles
 *
 * All styled components for the summon animation system.
 * Uses CSS custom properties for easy theming and rarity colors.
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';
import {
  CARD_CONFIGS,
  ORB_CONFIG,
  RING_CONFIG,
  Z_LAYERS,
} from './constants';

// ==================== KEYFRAMES ====================

const rotate = keyframes`
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
`;

const rotateReverse = keyframes`
  from { transform: translate(-50%, -50%) rotate(360deg); }
  to { transform: translate(-50%, -50%) rotate(0deg); }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(${ORB_CONFIG.pulseScale});
    opacity: 1;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(2);
    opacity: 0;
  }
`;

const shimmer = keyframes`
  0% { transform: translateX(-100%) rotate(25deg); }
  100% { transform: translateX(200%) rotate(25deg); }
`;

const floatUpDown = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const orbitPath = keyframes`
  0% { transform: rotate(0deg) translateX(var(--orbit-radius, 120px)) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(var(--orbit-radius, 120px)) rotate(-360deg); }
`;

const energyGather = keyframes`
  0% {
    transform: translate(var(--start-x), var(--start-y)) scale(1);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(0, 0) scale(0.3);
    opacity: 0;
  }
`;

const legendaryGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px var(--rarity-color-alpha, rgba(255, 167, 38, 0.35)),
                inset 0 0 20px var(--rarity-color-alpha-weak, rgba(255, 167, 38, 0.1));
  }
  50% {
    box-shadow: 0 0 30px var(--rarity-color-alpha, rgba(255, 167, 38, 0.5)),
                inset 0 0 25px var(--rarity-color-alpha-weak, rgba(255, 167, 38, 0.15));
  }
`;

const epicGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 18px var(--rarity-color-alpha, rgba(191, 90, 242, 0.3)),
                inset 0 0 18px var(--rarity-color-alpha-weak, rgba(191, 90, 242, 0.08));
  }
  50% {
    box-shadow: 0 0 25px var(--rarity-color-alpha, rgba(191, 90, 242, 0.42)),
                inset 0 0 22px var(--rarity-color-alpha-weak, rgba(191, 90, 242, 0.12));
  }
`;

// ==================== CONTAINER STYLES ====================

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

  /* GPU acceleration */
  transform: translateZ(0);
  will-change: transform;
`;

export const Container = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg,
    #0a0a0f 0%,
    #05050a 100%
  );
  overflow: hidden;

  /* CSS custom properties for rarity theming */
  --rarity-color: ${props => props.$color || '#8e8e93'};
  --rarity-color-rgb: ${props => props.$colorRgb || '142, 142, 147'};
  --rarity-color-alpha: rgba(var(--rarity-color-rgb), 0.35);
  --rarity-color-alpha-weak: rgba(var(--rarity-color-rgb), 0.1);
  --rarity-glow-intensity: ${props => props.$glowIntensity || 0.25};
`;

// ==================== BACKGROUND EFFECTS ====================

export const AmbientGlow = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 50% 40%,
    rgba(var(--rarity-color-rgb), calc(var(--rarity-glow-intensity) * 0.8)) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: ${Z_LAYERS.background};
`;

export const Vignette = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 35%,
    rgba(0, 0, 0, 0.75) 100%
  );
  pointer-events: none;
  z-index: ${Z_LAYERS.background};
`;

export const DimOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: ${Z_LAYERS.background};
`;

// ==================== INITIATION PHASE ====================

export const InitiationContainer = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_LAYERS.orb};
`;

export const EnergyGatherPoint = styled.div`
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--rarity-color);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--rarity-color);
  --start-x: ${props => props.$startX || '0px'};
  --start-y: ${props => props.$startY || '0px'};
  animation: ${energyGather} ${props => props.$duration || 0.8}s ease-in forwards;
  animation-delay: ${props => props.$delay || 0}s;
`;

// ==================== BUILDUP PHASE ====================

export const BuildupContainer = styled(motion.div)`
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: ${Z_LAYERS.orb};

  /* GPU acceleration for faster initial render on mobile */
  transform: translateZ(0);
  will-change: opacity, transform;
`;

export const CentralOrb = styled.div`
  /* Use absolute positioning with transform centering for bulletproof initial positioning on mobile */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${ORB_CONFIG.baseSize}px;
  height: ${ORB_CONFIG.baseSize}px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    width: ${ORB_CONFIG.baseSizeMobile}px;
    height: ${ORB_CONFIG.baseSizeMobile}px;
  }
`;

export const OrbCore = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    ${props => props.$accentColor || 'var(--rarity-color)'},
    var(--rarity-color)
  );
  box-shadow:
    0 0 40px rgba(var(--rarity-color-rgb), 0.5),
    0 0 80px rgba(var(--rarity-color-rgb), 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.3);
  animation: ${pulse} ${ORB_CONFIG.pulseDuration}s ease-in-out infinite;

  /* GPU acceleration */
  transform: translateZ(0);
  will-change: transform, opacity;
`;

export const OrbPulseRing = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--rarity-color);
  animation: ${pulseGlow} 1.5s ease-out infinite;
  animation-delay: ${props => props.$delay || 0}s;
  will-change: transform, opacity;
`;

export const Ring = styled.div`
  position: absolute;
  /* Center the ring within the container */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${props => RING_CONFIG.baseSize + props.$index * RING_CONFIG.sizeIncrement}px;
  height: ${props => RING_CONFIG.baseSize + props.$index * RING_CONFIG.sizeIncrement}px;
  border: 1.5px solid rgba(var(--rarity-color-rgb), 0.4);
  border-radius: 50%;
  /* Combine centering transform with rotation animation */
  animation: ${props => props.$index % 2 === 0 ? rotate : rotateReverse}
             ${props => RING_CONFIG.rotationDuration + props.$index * 2}s linear infinite;
  z-index: ${Z_LAYERS.rings};
  will-change: transform;

  &::before {
    content: '';
    position: absolute;
    width: ${RING_CONFIG.dotSize}px;
    height: ${RING_CONFIG.dotSize}px;
    background: var(--rarity-color);
    border-radius: 50%;
    top: -${RING_CONFIG.dotSize / 2}px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 12px var(--rarity-color);
  }

  @media (max-width: 768px) {
    width: ${props => RING_CONFIG.baseSizeMobile + props.$index * RING_CONFIG.sizeIncrementMobile}px;
    height: ${props => RING_CONFIG.baseSizeMobile + props.$index * RING_CONFIG.sizeIncrementMobile}px;
  }
`;

export const OrbField = styled.div`
  position: absolute;
  /* Center the orb field within container */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

export const FloatingOrb = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  background: var(--rarity-color);
  border-radius: 50%;
  box-shadow: 0 0 12px var(--rarity-color);
  --orbit-radius: ${props => 100 + (props.$index % 3) * 30}px;
  animation: ${orbitPath} ${props => 3 + (props.$index * 0.5)}s linear infinite;
  animation-delay: ${props => (props.$index / props.$total) * -3}s;
  transform-origin: center center;
  will-change: transform;

  @media (max-width: 768px) {
    width: 5px;
    height: 5px;
    --orbit-radius: ${props => 80 + (props.$index % 3) * 25}px;
  }
`;

export const RarityIconContainer = styled(motion.div)`
  position: absolute;
  /* Center the icon within the container */
  top: 50%;
  left: 50%;
  font-size: 28px;
  color: var(--rarity-color);
  filter: drop-shadow(0 0 15px var(--rarity-color));
  z-index: ${Z_LAYERS.orb + 1};

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

// ==================== REVEAL PHASE ====================

export const FlashOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: var(--rarity-color);
  pointer-events: none;
  z-index: ${Z_LAYERS.flash};
  will-change: opacity;
`;

// ==================== CARD STYLES ====================

export const CardContainer = styled(motion.div)`
  /* Use absolute positioning with transform centering for bulletproof initial positioning */
  /* This ensures the card is centered even before parent flexbox is calculated */
  position: absolute;
  top: 50%;
  left: 50%;
  perspective: 1000px;
  z-index: ${Z_LAYERS.card};

  /* GPU acceleration for smooth animations */
  /* Note: Framer Motion will combine its transforms with this base transform */
  will-change: transform, opacity, filter;
`;

export const CharacterCard = styled.div`
  position: relative;
  width: ${CARD_CONFIGS.width}px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(165deg,
    ${theme.colors.backgroundSecondary} 0%,
    rgba(20, 20, 28, 1) 100%
  );
  box-shadow:
    0 25px 60px -12px rgba(0, 0, 0, 0.7),
    0 0 1px 0 rgba(255, 255, 255, 0.1) inset;

  @media (max-width: 768px) {
    width: ${CARD_CONFIGS.widthMobile}px;
  }
`;

export const CardShine = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.03) 45%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 55%,
    transparent 100%
  );
  animation: ${shimmer} ${CARD_CONFIGS.shimmerDuration}s ease-in-out infinite;
  animation-delay: ${CARD_CONFIGS.shimmerDelay}s;
  pointer-events: none;
  z-index: 5;
`;

export const CardGlowBorder = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 2px solid var(--rarity-color);
  box-shadow:
    0 0 18px var(--rarity-color-alpha),
    inset 0 0 20px var(--rarity-color-alpha-weak);
  pointer-events: none;

  ${props => props.$rarity === 'legendary' && css`
    animation: ${legendaryGlow} 2.5s ease-in-out infinite;
  `}

  ${props => props.$rarity === 'epic' && css`
    animation: ${epicGlow} 3s ease-in-out infinite;
  `}
`;

export const CardImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: ${CARD_CONFIGS.imageHeight}px;
  overflow: hidden;

  @media (max-width: 768px) {
    height: ${CARD_CONFIGS.imageHeightMobile}px;
  }
`;

export const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const ImageGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(var(--rarity-color-rgb), 0.15) 80%,
    rgba(10, 10, 15, 0.95) 100%
  );
  pointer-events: none;
`;

export const CardInfo = styled(motion.div)`
  padding: 20px 24px 28px;
  text-align: center;
  position: relative;
`;

export const RarityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--rarity-color);
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  border-radius: 100px;
  margin-bottom: 14px;
  box-shadow: 0 4px 12px rgba(var(--rarity-color-rgb), 0.5);

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

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

export const CharacterSeries = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  letter-spacing: 0.02em;
  opacity: 0.85;
`;

// ==================== SHOWCASE PHASE ====================

export const ShowcaseContainer = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_LAYERS.card};

  /* GPU acceleration to ensure faster layout calculation on mobile */
  transform: translateZ(0);
  will-change: opacity;

  /* Ensure children are properly centered on mobile from first render */
  & > * {
    flex-shrink: 0;
    /* Fallback centering using margin auto in case flexbox isn't calculated yet */
    margin: auto;
  }
`;

export const CardFloat = styled.div`
  /* Explicit centering - using regular div to avoid Framer Motion transform conflicts */
  position: relative;

  /* Ensure the card starts at transform origin for proper centering on mobile */
  /* Using !important to prevent any race conditions with animation-fill-mode */
  transform: translateY(0);

  /* Float animation starts immediately - no delay needed since we have a stable initial transform */
  /* Removed animation-fill-mode: backwards as it caused race conditions on mobile */
  /* where the first keyframe styles weren't applied fast enough on initial render */
  animation: ${floatUpDown} 3s ease-in-out 0.3s infinite;
`;

// ==================== UI ELEMENTS ====================

export const BottomArea = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: max(32px, env(safe-area-inset-bottom, 32px));
  gap: 16px;
  z-index: ${Z_LAYERS.ui};
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

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
  background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: 2px;
  transition: width 0.3s ease;
`;

export const ContinueButton = styled(motion.button)`
  padding: 16px 40px;
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: ${theme.shadows.buttonPrimary};
  letter-spacing: 0.02em;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.primaryHover};
    box-shadow: ${theme.shadows.buttonPrimaryHover};
  }

  &:active {
    background: ${theme.colors.primaryActive};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
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
    outline: 2px solid ${theme.colors.focusRing};
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
  z-index: ${Z_LAYERS.skipHint};
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
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 14px;
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
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
`;

export const ResultCard = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--rarity-color);
  box-shadow: 0 0 16px rgba(var(--rarity-color-rgb), 0.25);
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
  color: var(--rarity-color);
  letter-spacing: 0.5px;
`;

export const CloseButton = styled(motion.button)`
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  padding: 16px 32px;
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: ${theme.shadows.buttonPrimary};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.primaryHover};
    box-shadow: ${theme.shadows.buttonPrimaryHover};
  }

  &:active {
    background: ${theme.colors.primaryActive};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
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

// ==================== REDUCED MOTION VARIANTS ====================

export const ReducedMotionCard = styled(motion.div)`
  position: relative;
  z-index: ${Z_LAYERS.card};
`;
