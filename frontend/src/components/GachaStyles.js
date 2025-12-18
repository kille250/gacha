/**
 * GachaStyles.js - Centralized styling for Gacha components
 * 
 * This file re-exports components from PullComponents for backwards compatibility
 * and defines additional shared styles used across the gacha system.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

// Re-export everything from PullComponents and PullAnimations
export * from './PullAnimations';
export {
  rarityColors,
  theme,
  // Loading
  LoadingWrapper as LoadingContainer,
  SpinnerOrb as SpinnerContainer,
  SpinnerRing as Spinner,
  LoadingLabel as LoadingText,
  // Points
  PointsChip,
  CoinEmoji as CoinIcon,
  // Character Card
  CharacterCardWrapper,
  CardMediaWrapper,
  RarityGlowOverlay,
  CollectedBadge,
  BannerCharBadge,
  CharacterMedia,
  CharacterMediaVideo,
  ZoomHint,
  CardDetails,
  CharacterName as CharName,
  CharacterSeries as CharSeries,
  RarityTag as RarityBadge,
  CardButtonRow as CardActions,
  CardActionBtn as ActionButton,
  // Multi-roll
  MultiResultContainer as MultiRollSection,
  MultiResultHeader as MultiRollHeader,
  CloseHeaderBtn as MultiRollCloseButton,
  MultiCardGrid as MultiCharactersGrid,
  MiniCardWrapper,
  MiniCardMedia as MultiCardImage,
  MiniCardMediaVideo,
  MiniCollectedDot,
  MiniBannerStar,
  MiniCardInfo as MultiCardContent,
  MiniCharName as MultiCharName,
  MiniRarityTag as MultiRarityBadge,
  // Empty State
  EmptyStateBox as EmptyState,
  EmptyIcon as EmptyStateIcon,
  // Roll Buttons
  RollButtonGroup as RollButtonsContainer,
  PullButton as RollButton,
  MultiPullButton as MultiRollButton,
  CostLabel as RollCost,
  RollHintText as RollHint,
  // Rarity Tracker
  RarityTrackerBar as RarityHistoryBar,
  TrackerLabel as HistoryLabel,
  RarityDots as RarityList,
  RarityDot as RarityBubble,
  // Modal Components
  ModalBackdrop as ModalOverlay,
  PullSettingsPanel as NewMultiPullPanel,
  PanelHead as PanelHeader,
  PanelCloseBtn as CloseButton,
  PanelBody as PanelContent,
  SelectionDisplay as CurrentSelection,
  SelectionCount as SelectionValue,
  SelectionCost,
  DiscountChip as DiscountTag,
  PresetGrid as PresetOptions,
  PresetChip as PresetButton,
  DiscountLabel as DiscountBadge,
  SliderBox as SliderContainer,
  CountAdjuster as PullCountAdjuster,
  AdjustButton as AdjustBtn,
  CountDisplay as PullCountDisplay,
  PullSliderInput as PullSlider,
  InfoCardRow as PullInfoGraphic,
  InfoCard as PullInfoCard,
  InfoIcon as PullInfoIcon,
  InfoLabel as PullInfoLabel,
  InfoValue as PullInfoValue,
  ConfirmPullBtn as ConfirmButton,
  ErrorHint as ErrorNote,
  // Fast Mode
  FastModeTag as FastModeIndicator,
} from './PullComponents';

// ==================== LEGACY EXPORTS (for compatibility) ====================

export const rarityColors = {
  common: '#78909c',
  uncommon: '#66bb6a',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffa726'
};

// Points Amount (simple styled span)
export const PointsAmount = styled.span`
  font-weight: bold;
`;

// Multi-pull container (wrapper for positioning)
export const MultiPullContainer = styled.div`
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }
`;

// Gacha Section wrapper
export const GachaSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px 0 40px 0;
  min-height: 400px;
  
  @media (max-width: 768px) {
    padding-bottom: 120px;
  }
`;

// Error Message component
export const ErrorMessage = styled(motion.div)`
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin: 15px auto;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  font-weight: 500;
  border-left: 5px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &::before {
    content: "⚠️";
    font-size: 18px;
  }
  
  @media (max-width: 480px) {
    padding: 10px 15px;
    font-size: 14px;
    margin: 10px auto;
  }
`;

// Points Counter wrapper
export const PointsCounter = styled.div`
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 480px) {
    padding: 6px 12px;
    font-size: 16px;
  }
`;

// Card Image Component (for legacy support)
export const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

// Card Image Container
export const CardImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: 480px) {
    height: 280px;
  }
`;

// Rarity Glow overlay
export const RarityGlow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => {
    const color = rarityColors[props.rarity] || rarityColors.common;
    return props.rarity === 'legendary' || props.rarity === 'epic' 
      ? `linear-gradient(45deg, ${color}33, transparent, ${color}33)` 
      : 'none';
  }};
  pointer-events: none;
  z-index: 1;
`;

// Collection Badge
export const CollectionBadge = styled.div`
  position: absolute;
  left: 10px;
  top: 10px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 30px;
  z-index: 5;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
  
  &::before {
    content: "✓";
    font-size: 14px;
    font-weight: bold;
  }
`;

// Zoom Icon Overlay
export const ZoomIconOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  
  ${CardImageContainer}:hover & {
    opacity: 1;
  }
`;

// Zoom Icon
export const ZoomIcon = styled.div`
  font-size: 28px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Character Card wrapper
export const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 320px;
  max-width: 90vw;
  overflow: hidden;
  box-shadow: ${props => `0 15px 40px rgba(
    ${props.rarity === 'legendary' ? '255, 152, 0' : 
      props.rarity === 'epic' ? '156, 39, 176' : 
      props.rarity === 'rare' ? '33, 150, 243' : '0, 0, 0'}, 
    ${props.rarity === 'common' ? '0.3' : '0.5'})`};
  margin-bottom: 20px;
  border: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  
  @media (max-width: 480px) {
    width: 280px;
    margin-bottom: 15px;
  }
`;

// Mini Collection Badge
export const CollectionBadgeMini = styled.div`
  position: absolute;
  top: 5px;
  left: 5px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  font-size: 11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

// Multi Card Image Container
export const MultiCardImageContainer = styled.div`
  position: relative;
  height: 160px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: 480px) {
    height: 140px;
  }
`;

// Rarity Glow for Multi cards
export const RarityGlowMulti = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => {
    const color = rarityColors[props.rarity] || rarityColors.common;
    return props.rarity === 'legendary' || props.rarity === 'epic' 
      ? `linear-gradient(45deg, ${color}33, transparent, ${color}33)` 
      : 'none';
  }};
  pointer-events: none;
  z-index: 1;
`;

// Multi Card Claim Button
export const MultiCardClaimButton = styled(motion.button)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.owned 
    ? '#f1f8f1' 
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: ${props => props.owned ? '#28a745' : 'white'};
  border: none;
  padding: 8px 0;
  font-weight: 600;
  font-size: 13px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:disabled {
    opacity: ${props => props.owned ? 1 : 0.5};
  }
  
  &:before {
    content: ${props => props.owned ? '"✓ "' : '""'};
  }
`;

// Coin Icon with animation
export const CoinIcon = styled.span`
  font-size: 20px;
  animation: coinPulse 3s infinite;
  
  @keyframes coinPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;
