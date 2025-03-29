import styled from 'styled-components';
import { motion } from 'framer-motion';

// Define your rarity colors here too so they're consistent
export const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};

// All of your styling components
export const LoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
`;

export const SpinnerContainer = styled.div`
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(110, 72, 170, 0.5);
`;

export const Spinner = styled.div`
  width: 70px;
  height: 70px;
  border: 6px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  border-top-color: #9e5594;
  border-left-color: #6e48aa;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const LoadingText = styled.p`
  margin-top: 20px;
  color: white;
  font-size: 18px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  letter-spacing: 0.5px;
`;

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

export const CoinIcon = styled.span`
  font-size: 20px;
  animation: coinPulse 3s infinite;
  
  @keyframes coinPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

export const PointsAmount = styled.span`
  font-weight: bold;
`;

export const RarityHistoryBar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 480px) {
    padding: 8px;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
`;

export const HistoryLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  
  @media (max-width: 480px) {
    width: 100%;
    text-align: center;
    margin-bottom: 5px;
  }
`;

export const RarityList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

export const RarityBubble = styled(motion.div)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => rarityColors[props.rarity]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

export const GachaSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px 0 40px 0;
  min-height: 400px;
  
  @media (max-width: 768px) {
    padding-bottom: 120px;  /* Increased bottom padding for mobile */
  }
`;

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
  transform-style: preserve-3d;
  perspective: 1000px;
  
  @media (max-width: 480px) {
    width: 280px;
    margin-bottom: 15px;
  }
`;

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

export const RarityGlow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => {
    const color = rarityColors[props.rarity] || rarityColors.common;
    return props.rarity === 'legendary' || props.rarity === 'epic' ? 
      `linear-gradient(45deg, ${color}33, transparent, ${color}33)` : 
      'none';
  }};
  pointer-events: none;
  z-index: 1;
`;

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

export const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

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

export const CardContent = styled.div`
  padding: 15px;
  position: relative;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8));
`;

export const CharName = styled.h2`
  margin: 0 0 5px 0;
  font-size: 22px;
  color: #333;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

export const CharSeries = styled.p`
  margin: 0;
  color: #666;
  font-style: italic;
  font-size: 14px;
`;

export const RarityBadge = styled.div`
  position: absolute;
  top: -15px;
  right: 20px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 6px 12px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 5;
  
  @keyframes shiny {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
    100% { filter: brightness(1); }
  }
  
  animation: ${props => ['legendary', 'epic'].includes(props.rarity) ? 'shiny 2s infinite' : 'none'};
  
  @media (max-width: 480px) {
    right: 10px;
    top: -12px;
    padding: 4px 10px;
    font-size: 10px;
  }
`;

export const CardActions = styled.div`
  display: flex;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

export const ActionButton = styled(motion.button)`
  flex: 1;
  background: ${props => {
    if (props.owned) return '#f1f8f1';
    return props.primary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'none';
  }};
  color: ${props => {
    if (props.owned) return '#28a745';
    return props.primary ? 'white' : '#555';
  }};
  border: none;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s;
  font-weight: ${props => (props.primary || props.owned) ? 'bold' : 'normal'};
  
  &:hover {
    background-color: ${props => {
      if (props.owned) return '#f1f8f1';
      return props.primary ? 'none' : '#f0f0f0';
    }};
  }
  
  &:first-child {
    border-right: 1px solid #eee;
  }
  
  &:disabled {
    opacity: ${props => props.owned ? 1 : 0.5};
  }
  
  @media (max-width: 480px) {
    font-size: 13px;
    padding: 10px 6px;
  }
`;

export const MultiRollSection = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 100%;
  max-width: 820px;
  margin: 0 auto 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  
  @media (max-width: 768px) {
    max-width: 95%;
  }
`;

export const MultiRollHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  padding: 15px 20px;
  color: white;
  
  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }
`;

export const MultiRollCloseButton = styled.button`
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
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export const MultiCharactersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-gap: 15px;
  padding: 20px;
  
  @media (max-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    padding: 15px;
    grid-gap: 10px;
  }
`;

export const MultiCardImageContainer = styled.div`
  position: relative;
  height: 160px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: 480px) {
    height: 140px;
  }
`;

export const RarityGlowMulti = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => {
    const color = rarityColors[props.rarity] || rarityColors.common;
    return props.rarity === 'legendary' || props.rarity === 'epic' ? 
      `linear-gradient(45deg, ${color}33, transparent, ${color}33)` : 
      'none';
  }};
  pointer-events: none;
  z-index: 1;
`;

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

export const MultiCardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

export const MultiCardContent = styled.div`
  padding: 10px;
  position: relative;
`;

export const MultiCharName = styled.h3`
  margin: 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MultiRarityBadge = styled.div`
  position: absolute;
  top: -10px;
  right: 10px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 3px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 5;
  
  @keyframes shiny {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
    100% { filter: brightness(1); }
  }
  
  animation: ${props => ['legendary', 'epic'].includes(props.rarity) ? 'shiny 2s infinite' : 'none'};
`;

export const MultiCardClaimButton = styled(motion.button)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.owned ? '#f1f8f1' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
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

export const EmptyState = styled(motion.div)`
  text-align: center;
  color: white;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  margin-bottom: 30px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 350px;
  
  h3 {
    font-size: 24px;
    margin: 0 0 15px 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    font-weight: 700;
    background: linear-gradient(135deg, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
    line-height: 1.5;
  }
`;

export const EmptyStateIcon = styled.div`
  font-size: 36px;
  margin-bottom: 15px;
  animation: float 3s ease-in-out infinite;
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
`;

export const RollButtonsContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  position: relative;
  z-index: 5;
  width: 100%;
  max-width: 580px;
  margin-left: auto;
  margin-right: auto;
  justify-content: center; // Center the buttons horizontally
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 10px;
  }
`;

export const RollButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa 0%, #9e5594 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(110, 72, 170, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  flex: 1; // Make buttons take equal space
  max-width: 280px; // But still cap their maximum width
  
  &::before {
    content: '';
    position: absolute;
    top: -10%;
    left: -10%;
    right: -10%;
    bottom: -10%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  
  &:hover::before {
    transform: translateX(100%);
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
  
  @media (max-width: 768px) {
    width: 100%; 
    flex: none; // Remove flex on mobile
    padding: 10px 20px;
    font-size: 15px;
  }
`;

export const RollCost = styled.span`
  font-size: 14px;
  opacity: 0.8;
  margin-left: 5px;
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

export const MultiPullContainer = styled.div`
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 300px;
  }
`;

export const MultiRollButton = styled(RollButton)`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #2c5282, #0f2942)' 
    : 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)'};
  width: 100%;
  max-width: 280px;
  position: relative;
  z-index: 2;
  
  /* Desktop styling with rounded top corners when active */
  @media (min-width: 769px) {
    ${props => props.active && `
      border-radius: 15px 15px 0 0;
      box-shadow: 0 5px 20px rgba(16, 29, 59, 0.4);
    `}
  }
  
  /* Mobile styling keeps full rounded corners */
  @media (max-width: 768px) {
    border-radius: 50px;
  }
`;

export const MultiPullMenu = styled(motion.div)`
  position: absolute;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #1a365d 0%, #2c5282 100%);
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 1;
  
  /* Position above button on mobile */
  @media (max-width: 768px) {
    bottom: 100%;
    margin-bottom: 10px;
    border-radius: 15px;
  }
  
  /* Position below button on desktop */
  @media (min-width: 769px) {
    top: 100%;
    border-radius: 0 0 15px 15px;
  }
`;

export const ClosePullMenuButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  z-index: 2;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const MultiPullAdjuster = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 5px;
`;

export const AdjustButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    background: ${props => props.disabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'};
  }
  
  /* Slightly larger buttons on mobile for better touch targets */
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
  }
`;

export const PullCountDisplay = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: white;
  width: 50px;
  text-align: center;
  
  /* Slightly larger text on mobile */
  @media (max-width: 768px) {
    font-size: 36px;
    width: 60px;
  }
`;

export const PullSlider = styled.input`
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: linear-gradient(90deg, #0f2942, #6e48aa);
  border-radius: 10px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #9e5594;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }
  
  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #9e5594;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }
  
  /* Larger touch target for mobile */
  @media (max-width: 768px) {
    height: 10px;
    margin: 5px 0;
    
    &::-webkit-slider-thumb {
      width: 30px;
      height: 30px;
    }
    
    &::-moz-range-thumb {
      width: 30px;
      height: 30px;
    }
  }
`;

export const DiscountInfo = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  
  strong {
    color: #ffda44;
  }
  
  @media (max-width: 768px) {
    font-size: 16px;
    margin-bottom: 5px;
  }
`;

export const ConfirmButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa 0%, #9e5594 100%);
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  margin-top: 5px;
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  @media (max-width: 768px) {
    padding: 15px;
    font-size: 18px;
    margin-top: 10px;
  }
`;

export const RollHint = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 15px;
  text-align: center;
`;

// New styles from BannerPage and GachaPage that were not in GachaStyles
export const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
`;

export const NewMultiPullPanel = styled(motion.div)`
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  overflow: hidden;
`;

export const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`;

export const PanelContent = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const CurrentSelection = styled.div`
  text-align: center;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
`;

export const SelectionValue = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #9e5594;
`;

export const SelectionCost = styled.div`
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DiscountTag = styled.span`
  background: #9e5594;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
`;

export const PresetOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

export const PresetButton = styled.button`
  padding: 8px 15px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, ${props => props.active ? 0.3 : 0.1});
  background: ${props => props.active ? 'rgba(158, 85, 148, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
  color: ${props => props.disabled ? 'rgba(255, 255, 255, 0.5)' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  position: relative;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: ${props => props.active ? 'rgba(158, 85, 148, 0.4)' : 'rgba(0, 0, 0, 0.3)'};
  }
  
  ${props => props.active && `
    font-weight: bold;
    box-shadow: 0 0 10px rgba(158, 85, 148, 0.5);
  `}
`;

export const DiscountBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #9e5594;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
`;

export const SliderContainer = styled.div`
  padding: 10px 5px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
`;

export const PullCountAdjuster = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

export const AdjustBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.4);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PullInfoGraphic = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
`;

export const PullInfoCard = styled.div`
  background: ${props => props.accent ? 'rgba(158, 85, 148, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 85px;
  flex: 1;
  gap: 5px;
  border: 1px solid ${props => props.accent ? 'rgba(158, 85, 148, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
`;

export const PullInfoIcon = styled.div`
  font-size: 20px;
  margin-bottom: 5px;
`;

export const PullInfoLabel = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

export const PullInfoValue = styled.div`
  font-weight: bold;
  font-size: 16px;
`;

export const ErrorNote = styled.div`
  font-size: 14px;
  color: #ff6b6b;
  text-align: center;
  
  span {
    font-weight: bold;
  }
`;