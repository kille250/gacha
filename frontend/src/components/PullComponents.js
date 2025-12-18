import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  spin, float, shimmer, glowPulse, shineSweep,
  cardVariants, cardVariantsFast, gridItemVariants, 
  containerVariants, modalVariants, overlayVariants 
} from './PullAnimations';

// ==================== COLOR PALETTE ====================

export const rarityColors = {
  common: '#78909c',
  uncommon: '#66bb6a',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffa726'
};

export const theme = {
  primary: '#6e48aa',
  secondary: '#9e5594',
  accent: '#ffd700',
  background: {
    dark: '#141e30',
    darker: '#0f172a',
    card: 'rgba(0, 0, 0, 0.2)',
    glass: 'rgba(255, 255, 255, 0.05)'
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)'
  },
  border: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)'
  },
  gradient: {
    primary: 'linear-gradient(135deg, #6e48aa 0%, #9e5594 100%)',
    secondary: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
    gold: 'linear-gradient(135deg, #ffd700, #ff9500)'
  }
};

// ==================== BASE COMPONENTS ====================

// Loading Components
export const LoadingWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

export const SpinnerOrb = styled.div`
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.background.card};
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(110, 72, 170, 0.5);
`;

export const SpinnerRing = styled.div`
  width: 70px;
  height: 70px;
  border: 6px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  border-top-color: ${theme.secondary};
  border-left-color: ${theme.primary};
  animation: ${spin} 1s linear infinite;
`;

export const LoadingLabel = styled.p`
  margin-top: 20px;
  color: ${theme.text.primary};
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

// Points Display
export const PointsChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${theme.background.card};
  padding: 8px 16px;
  border-radius: 24px;
  font-weight: 600;
  border: 1px solid ${theme.border.medium};
  font-size: 16px;
  color: ${theme.text.primary};
`;

export const CoinEmoji = styled.span`
  font-size: 20px;
  animation: coinPulse 3s infinite;
  
  @keyframes coinPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

// ==================== CHARACTER CARD COMPONENTS ====================

export const CharacterCardWrapper = styled(motion.div)`
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 350px;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.2),
    0 0 15px ${props => rarityColors[props.rarity] || 'transparent'};
  border: 2px solid ${props => rarityColors[props.rarity] || '#ddd'};
  
  @media (max-width: 480px) {
    max-width: 300px;
  }
`;

export const CardMediaWrapper = styled.div`
  position: relative;
  height: 300px;
  cursor: pointer;
  overflow: hidden;
  
  @media (max-width: 480px) {
    height: 250px;
  }
`;

export const RarityGlowOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 80%,
    ${props => rarityColors[props.rarity] || 'transparent'} 0%,
    transparent 60%
  );
  opacity: 0.7;
  z-index: 1;
  pointer-events: none;
`;

export const CollectedBadge = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: white;
  padding: 5px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

export const BannerCharBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: ${theme.gradient.gold};
  color: white;
  padding: 5px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  &::before {
    content: "★";
  }
`;

export const CharacterMedia = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

export const CharacterMediaVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

export const ZoomHint = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  font-size: 14px;
`;

export const CardDetails = styled.div`
  padding: 16px;
  position: relative;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8));
`;

export const CharacterName = styled.h2`
  margin: 0 0 4px 0;
  font-size: 22px;
  color: #333;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

export const CharacterSeries = styled.p`
  margin: 0;
  color: #666;
  font-style: italic;
  font-size: 14px;
`;

export const RarityTag = styled.div`
  position: absolute;
  top: -15px;
  right: 16px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  z-index: 3;
  
  ${props => ['legendary', 'epic'].includes(props.rarity) && `
    animation: shiny 2s infinite;
    
    @keyframes shiny {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }
  `}
`;

export const CardButtonRow = styled.div`
  display: flex;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

export const CardActionBtn = styled(motion.button)`
  flex: 1;
  padding: 14px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: ${props => props.primary ? 'bold' : 'normal'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  
  background: ${props => {
    if (props.owned) return '#f1f8f1';
    return props.primary ? theme.gradient.primary : 'transparent';
  }};
  
  color: ${props => {
    if (props.owned) return '#43a047';
    return props.primary ? 'white' : '#555';
  }};
  
  &:hover:not(:disabled) {
    background: ${props => {
      if (props.owned) return '#f1f8f1';
      return props.primary ? theme.gradient.primary : '#f5f5f5';
    }};
  }
  
  &:first-child {
    border-right: 1px solid #eee;
  }
  
  &:disabled {
    opacity: ${props => props.owned ? 1 : 0.5};
  }
`;

// ==================== MULTI-ROLL COMPONENTS ====================

export const MultiResultContainer = styled(motion.div)`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  color: #333;
  max-height: 70vh;
`;

export const MultiResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${theme.gradient.secondary};
  padding: 16px 20px;
  color: white;
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
`;

export const CloseHeaderBtn = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export const MultiCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  max-height: calc(70vh - 60px);
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
    padding: 16px;
  }
`;

export const MiniCardWrapper = styled(motion.div)`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  border: 2px solid ${props => props.isBanner 
    ? theme.accent 
    : rarityColors[props.rarity] || '#ddd'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  
  ${props => props.isBanner && `
    background: linear-gradient(to bottom, rgba(255, 215, 0, 0.05), white);
  `}
`;

export const MiniCardMedia = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`;

export const MiniCardMediaVideo = styled.video`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`;

export const MiniCollectedDot = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
`;

export const MiniBannerStar = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: ${theme.gradient.gold};
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
`;

export const MiniCardInfo = styled.div`
  padding: 10px;
  position: relative;
`;

export const MiniCharName = styled.h3`
  margin: 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MiniRarityTag = styled.div`
  position: absolute;
  top: -10px;
  right: 8px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  z-index: 3;
  
  ${props => ['legendary', 'epic'].includes(props.rarity) && `
    animation: shiny 2s infinite;
    
    @keyframes shiny {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }
  `}
`;

// ==================== EMPTY STATE ====================

export const EmptyStateBox = styled(motion.div)`
  text-align: center;
  color: white;
  padding: 48px 32px;
  background: ${theme.background.glass};
  border-radius: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid ${theme.border.light};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 350px;
  
  h3 {
    font-size: 24px;
    margin: 0 0 12px 0;
    background: linear-gradient(135deg, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    color: ${theme.text.secondary};
    line-height: 1.5;
  }
`;

export const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  animation: ${float} 3s ease-in-out infinite;
`;

// ==================== ROLL BUTTONS ====================

export const RollButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
`;

export const PullButton = styled(motion.button)`
  background: ${theme.gradient.primary};
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 5px 20px rgba(110, 72, 170, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
  
  @media (max-width: 768px) {
    width: 80%;
    max-width: 280px;
    padding: 10px 20px;
    font-size: 14px;
  }
`;

export const MultiPullButton = styled(PullButton)`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #2c5282, #0f2942)' 
    : theme.gradient.secondary};
`;

export const CostLabel = styled.span`
  font-size: 14px;
  opacity: 0.8;
  margin-left: 4px;
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

export const RollHintText = styled.p`
  color: ${theme.text.secondary};
  font-size: 14px;
  text-align: center;
  margin: 0;
  
  strong {
    color: ${theme.text.primary};
  }
`;

// ==================== RARITY TRACKER ====================

export const RarityTrackerBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: ${theme.background.card};
  border-radius: 24px;
  padding: 12px 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
  }
`;

export const TrackerLabel = styled.span`
  font-weight: 500;
  color: ${theme.text.secondary};
  white-space: nowrap;
`;

export const RarityDots = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const RarityDot = styled(motion.div)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => rarityColors[props.rarity] || '#555'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

// ==================== MODAL COMPONENTS ====================

export const ModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
`;

export const PullSettingsPanel = styled(motion.div)`
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid ${theme.border.light};
  color: white;
  overflow: hidden;
`;

export const PanelHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  padding: 16px 20px;
  border-bottom: 1px solid ${theme.border.light};
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
`;

export const PanelCloseBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  
  &:hover {
    opacity: 0.8;
  }
`;

export const PanelBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const SelectionDisplay = styled.div`
  text-align: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

export const SelectionCount = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: ${theme.secondary};
`;

export const SelectionCost = styled.div`
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DiscountChip = styled.span`
  background: ${theme.secondary};
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
`;

export const PresetGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

export const PresetChip = styled.button`
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.active 
    ? 'rgba(255, 255, 255, 0.3)' 
    : theme.border.light};
  background: ${props => props.active 
    ? 'rgba(158, 85, 148, 0.3)' 
    : theme.background.card};
  color: ${props => props.disabled 
    ? theme.text.muted 
    : theme.text.primary};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  position: relative;
  
  &:hover:not(:disabled) {
    background: ${props => props.active 
      ? 'rgba(158, 85, 148, 0.4)' 
      : 'rgba(0, 0, 0, 0.3)'};
  }
  
  ${props => props.active && `
    font-weight: bold;
    box-shadow: 0 0 10px rgba(158, 85, 148, 0.5);
  `}
`;

export const DiscountLabel = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${theme.secondary};
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
`;

export const SliderBox = styled.div`
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
`;

export const CountAdjuster = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const AdjustButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid ${theme.border.medium};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.4);
  }
`;

export const CountDisplay = styled.div`
  font-size: 36px;
  font-weight: bold;
  color: white;
  min-width: 60px;
  text-align: center;
`;

export const PullSliderInput = styled.input`
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: linear-gradient(90deg, ${theme.background.darker}, ${theme.primary});
  border-radius: 10px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${theme.secondary};
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
  }
  
  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${theme.secondary};
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
  }
`;

export const InfoCardRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

export const InfoCard = styled.div`
  background: ${props => props.accent 
    ? 'rgba(158, 85, 148, 0.3)' 
    : theme.background.card};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
  flex: 1;
  gap: 6px;
  border: 1px solid ${props => props.accent 
    ? 'rgba(158, 85, 148, 0.5)' 
    : theme.border.light};
`;

export const InfoIcon = styled.div`
  font-size: 22px;
`;

export const InfoLabel = styled.div`
  font-size: 12px;
  color: ${theme.text.secondary};
`;

export const InfoValue = styled.div`
  font-weight: bold;
  font-size: 16px;
`;

export const ConfirmPullBtn = styled(motion.button)`
  background: ${theme.gradient.primary};
  color: white;
  border: none;
  border-radius: 30px;
  padding: 14px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export const ErrorHint = styled.div`
  font-size: 14px;
  color: #ff6b6b;
  text-align: center;
  
  span {
    font-weight: bold;
  }
`;

// ==================== FAST MODE INDICATOR ====================

export const FastModeTag = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${theme.secondary};
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  margin-top: 16px;
`;

