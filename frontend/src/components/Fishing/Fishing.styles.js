/**
 * Fishing Page Shared Styles
 * 
 * Complete styled components for the fishing minigame.
 * Extracted from FishingPage.js to reduce file size and enable component splitting.
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { ModalContent, IconButton } from '../../design-system';

// ===========================================
// ANIMATIONS
// ===========================================

export const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const twinkle = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

export const glow = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export const getTimeGradient = (timeOfDay) => {
  switch (timeOfDay) {
    case 'dawn': return 'linear-gradient(180deg, #ffcc80 0%, #81d4fa 50%, #4db6ac 100%)';
    case 'dusk': return 'linear-gradient(180deg, #ff7043 0%, #7e57c2 50%, #3949ab 100%)';
    case 'night': return 'linear-gradient(180deg, #1a237e 0%, #0d1b3e 50%, #0a1628 100%)';
    default: return 'linear-gradient(180deg, #81d4fa 0%, #aed581 50%, #98d8c8 100%)';
  }
};

export const getPrestigeGradient = (level) => {
  switch (level) {
    case 1: return 'linear-gradient(180deg, #cd7f32 0%, #8b4513 100%)'; // Bronze
    case 2: return 'linear-gradient(180deg, #c0c0c0 0%, #808080 100%)'; // Silver
    case 3: return 'linear-gradient(180deg, #ffd700 0%, #b8860b 100%)'; // Gold
    case 4: return 'linear-gradient(180deg, #ff6b00 0%, #cc5500 100%)'; // Legendary
    case 5: return 'linear-gradient(180deg, #9c27b0 0%, #6a1b9a 100%)'; // Mythic
    default: return 'linear-gradient(180deg, #78909c 0%, #546e7a 100%)'; // Novice
  }
};

export const getPrestigeBorder = (level) => {
  switch (level) {
    case 1: return '#5a3d0a';
    case 2: return '#606060';
    case 3: return '#8b6914';
    case 4: return '#993d00';
    case 5: return '#4a148c';
    default: return '#37474f';
  }
};

// ===========================================
// PAGE CONTAINER & LAYOUT
// ===========================================

export const PageContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${props => getTimeGradient(props.$timeOfDay)};
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Nunito', 'Helvetica Neue', sans-serif;
  user-select: none;
  overflow-x: hidden;
  overflow-y: auto;
  transition: background 5s ease;
  position: relative;
  touch-action: manipulation;
  -webkit-overflow-scrolling: touch;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: inherit;
    z-index: -1;
  }
  
  @supports (-webkit-touch-callout: none) {
    min-height: -webkit-fill-available;
    height: -webkit-fill-available;
  }
`;

export const StarsOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: 
    radial-gradient(1px 1px at 20px 30px, white, transparent),
    radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
    radial-gradient(2px 2px at 160px 120px, white, transparent),
    radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 250px 90px, white, transparent),
    radial-gradient(1px 1px at 300px 140px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 350px 60px, white, transparent);
  background-size: 400px 200px;
  animation: ${twinkle} 3s ease-in-out infinite;
`;

// ===========================================
// HEADER COMPONENTS
// ===========================================

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 50%, #5a3d0a 100%);
  border-bottom: 4px solid #3e2a06;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 220, 150, 0.3);
  z-index: 200;
  position: relative;
  overflow: visible;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    padding: 8px 10px;
    border-bottom-width: 3px;
  }
  
  @media (max-width: 400px) {
    padding: 6px 8px;
  }
`;

export const HeaderWoodGrain = styled.div`
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(0, 0, 0, 0.03) 2px,
    transparent 4px,
    rgba(0, 0, 0, 0.02) 8px
  );
  pointer-events: none;
`;

export const LocationSign = styled.div`
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, #a07830 0%, #8b6914 30%, #7a5820 70%, #6d4c10 100%);
  border: 3px solid #5a3d0a;
  border-radius: 8px;
  padding: 6px 16px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 2px 0 rgba(255, 220, 150, 0.25),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  z-index: 50;
  
  @media (max-width: 600px) {
    padding: 4px 12px;
    top: 6px;
  }
  
  @media (max-width: 400px) {
    display: none;
  }
`;

export const SignWoodGrain = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(0, 0, 0, 0.04) 3px,
    transparent 6px,
    rgba(0, 0, 0, 0.02) 12px
  );
  pointer-events: none;
`;

export const SignContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 
    1px 1px 0 #5a3d0a,
    -1px -1px 0 rgba(90, 61, 10, 0.5);
  white-space: nowrap;
  position: relative;
  z-index: 1;
  
  @media (max-width: 700px) {
    font-size: 14px;
    gap: 6px;
  }
`;

export const BackButton = styled.button`
  width: clamp(32px, 9vw, 40px);
  height: clamp(32px, 9vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  border-radius: 10px;
  color: #fff8e1;
  font-size: clamp(16px, 4.5vw, 22px);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008,
    0 5px 8px rgba(0,0,0,0.3);
  flex-shrink: 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 14px;
  }
  
  @media (max-width: 600px) {
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 360px) {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      inset 0 2px 0 rgba(255,255,255,0.2),
      0 5px 0 #4a3008,
      0 8px 12px rgba(0,0,0,0.3);
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: 
      inset 0 2px 0 rgba(0,0,0,0.1),
      0 1px 0 #4a3008;
  }
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    gap: 8px;
  }
  
  @media (max-width: 400px) {
    gap: 6px;
  }
  
  @media (max-width: 360px) {
    gap: 4px;
  }
`;

export const CoinDot = styled.div`
  width: ${props => props.$small ? '10px' : '14px'};
  height: ${props => props.$small ? '10px' : '14px'};
  background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%);
  border-radius: 50%;
  border: 2px solid #e65100;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: ${props => props.$small ? '8px' : '10px'};
    height: ${props => props.$small ? '8px' : '10px'};
    border-width: 1px;
  }
`;

export const WoodButton = styled.button`
  width: clamp(32px, 9vw, 40px);
  height: clamp(32px, 9vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  border-radius: 10px;
  color: #fff8e1;
  font-size: clamp(16px, 4.5vw, 22px);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008;
  flex-shrink: 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 14px;
  }
  
  @media (max-width: 600px) {
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 360px) {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  &:hover {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }
`;

export const MultiplayerBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${props => props.$connected 
    ? 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)' 
    : 'linear-gradient(180deg, #78909c 0%, #546e7a 100%)'};
  border: 3px solid ${props => props.$connected ? '#2e7d32' : '#455a64'};
  border-radius: 20px;
  color: white;
  font-weight: 800;
  font-size: 13px;
  box-shadow: ${props => props.$connected
    ? 'inset 0 2px 0 rgba(255,255,255,0.3), 0 3px 0 #1b5e20'
    : 'inset 0 2px 0 rgba(255,255,255,0.2), 0 3px 0 #37474f'};
  flex-shrink: 0;
  
  svg {
    font-size: 16px;
  }
  
  @media (max-width: 600px) {
    padding: 6px 8px;
    font-size: 11px;
    gap: 4px;
    border-width: 2px;
    
    svg {
      font-size: 14px;
    }
  }
  
  @media (max-width: 400px) {
    span {
      display: none;
    }
    padding: 6px;
  }
`;

export const AutofishButton = styled.button`
  width: clamp(32px, 9vw, 40px);
  height: clamp(32px, 9vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$active 
    ? 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)' 
    : props.$lowQuota 
      ? 'linear-gradient(180deg, #ff9800 0%, #f57c00 100%)'
      : 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'};
  border: 3px solid ${props => props.$active ? '#2e7d32' : props.$lowQuota ? '#e65100' : '#5a4010'};
  border-radius: 10px;
  color: ${props => props.$active ? '#e8f5e9' : '#fff8e1'};
  font-size: clamp(16px, 4.5vw, 22px);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => props.$active
    ? '0 0 15px rgba(102, 187, 106, 0.5), inset 0 2px 0 rgba(255,255,255,0.3)'
    : 'inset 0 2px 0 rgba(255,255,255,0.2), 0 3px 0 #4a3008'};
  flex-shrink: 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 14px;
  }
  
  ${props => props.$inFlight && props.$active && css`
    &::after {
      content: '';
      position: absolute;
      inset: -4px;
      border: 2px solid rgba(102, 187, 106, 0.8);
      border-radius: 14px;
      animation: pulse-ring 1s ease-out infinite;
    }
    
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.2); opacity: 0; }
    }
  `}
  
  @media (max-width: 600px) {
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 360px) {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  svg.spinning { animation: ${spin} 1s linear infinite; }
`;

export const LowQuotaDot = styled.div`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #ff5252;
  border-radius: 50%;
  border: 2px solid #fff;
  animation: ${pulse} 1s ease-in-out infinite;
`;

// ===========================================
// STATS BAR
// ===========================================

export const StatsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(180deg, 
    rgba(139, 105, 20, 0.9) 0%, 
    rgba(109, 76, 16, 0.95) 50%, 
    rgba(90, 61, 10, 0.9) 100%);
  border-bottom: 2px solid rgba(62, 42, 6, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 220, 150, 0.2);
  z-index: 100;
  flex-shrink: 0;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  
  .hide-on-tiny {
    @media (max-width: 360px) {
      display: none;
    }
  }
  
  @media (max-width: 600px) {
    gap: 4px;
    padding: 3px 8px;
  }
  
  @media (max-width: 400px) {
    padding: 2px 6px;
    gap: 3px;
  }
`;

export const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  border: 2px solid rgba(255, 220, 150, 0.15);
  flex-shrink: 0;
  
  ${props => props.$primary && css`
    background: rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.4);
    padding: 6px 16px;
  `}
  
  ${props => props.$secondary && css`
    opacity: 0.85;
  `}
  
  ${props => props.$highlight && css`
    background: rgba(255, 193, 7, 0.15);
    border-color: rgba(255, 193, 7, 0.3);
  `}
  
  ${props => props.$pity && css`
    background: rgba(255, 193, 7, 0.1);
    border-color: rgba(255, 193, 7, 0.25);
  `}
  
  @media (max-width: 600px) {
    padding: 4px 10px;
    border-radius: 10px;
    gap: 1px;
  }
  
  @media (max-width: 400px) {
    padding: 3px 8px;
    border-radius: 8px;
  }
`;

export const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
  
  ${props => props.$success && css`
    color: #a5d6a7;
    font-size: 20px;
    
    @media (max-width: 600px) {
      font-size: 18px;
    }
    
    @media (max-width: 400px) {
      font-size: 16px;
    }
  `}
  
  @media (max-width: 600px) {
    font-size: 16px;
  }
  
  @media (max-width: 400px) {
    font-size: 14px;
  }
`;

export const StatLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 248, 225, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
  
  @media (max-width: 600px) {
    font-size: 10px;
    letter-spacing: 0.2px;
  }
  
  @media (max-width: 400px) {
    font-size: 9px;
  }
`;

export const StatDivider = styled.div`
  width: 2px;
  height: 32px;
  background: linear-gradient(180deg, transparent, rgba(255, 220, 150, 0.3), transparent);
`;

// ===========================================
// GAME AREA
// ===========================================

export const GameContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 16px;
  min-height: 0;
  overflow: visible;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
  
  @media (max-width: 480px) {
    padding: 6px;
  }
`;

export const CanvasFrame = styled.div`
  position: relative;
  border-radius: 8px;
  background: linear-gradient(180deg, #5a3d0a 0%, #3e2a06 100%);
  padding: 8px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 2px 0 rgba(255, 220, 150, 0.2),
    inset 0 -2px 0 rgba(0, 0, 0, 0.3);
  max-width: calc(100vw - 16px);
  max-height: calc(100% - 8px);
  overflow: visible;
  
  @media (max-width: 1000px) {
    padding: 6px;
    border-radius: 6px;
  }
  
  @media (max-width: 600px) {
    padding: 4px;
    border-radius: 4px;
    max-width: calc(100vw - 12px);
  }
`;


export const CanvasCorner = styled.div`
  position: absolute;
  width: 16px;
  height: 16px;
  background: #8b6914;
  border-radius: 50%;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3);
  
  ${props => {
    switch (props.$position) {
      case 'tl': return 'top: -4px; left: -4px;';
      case 'tr': return 'top: -4px; right: -4px;';
      case 'bl': return 'bottom: -4px; left: -4px;';
      case 'br': return 'bottom: -4px; right: -4px;';
      default: return '';
    }
  }}
`;

// ===========================================
// GAME PROMPTS & INDICATORS
// ===========================================

export const FishPrompt = styled(motion.div)`
  position: fixed;
  bottom: 110px;
  left: 50%;
  padding: 14px 24px;
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 4px solid #8b6914;
  border-radius: 16px;
  color: #5d4037;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 
    0 6px 20px rgba(0,0,0,0.3),
    inset 0 2px 0 rgba(255,255,255,0.5);
  z-index: 150;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    bottom: 180px;
    font-size: 15px;
    padding: 12px 18px;
    gap: 8px;
    border-width: 3px;
  }
  
  @media (max-width: 400px) {
    bottom: 165px;
    font-size: 14px;
    padding: 10px 14px;
  }
`;

export const KeyHint = styled.span`
  padding: 6px 12px;
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 100%);
  border: 2px solid #5a3d0a;
  border-radius: 8px;
  font-weight: 800;
  color: #fff8e1;
  box-shadow: 0 2px 0 #4a3008;
`;

export const DesktopOnly = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export const MobileOnly = styled.span`
  display: none;
  align-items: center;
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

export const StateIndicator = styled(motion.div)`
  position: fixed;
  top: 140px;
  left: 50%;
  z-index: 150;
`;

export const WaitingBubble = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 4px solid #8b6914;
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
`;

export const WaitingDots = styled.span`
  font-size: 24px;
  font-weight: 800;
  color: #8b6914;
  letter-spacing: 2px;
`;

export const WaitingText = styled.div`
  color: #5d4037;
  font-size: 17px;
  font-weight: 600;
`;

export const CatchAlert = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 32px;
  background: linear-gradient(180deg, #ff5252 0%, #d32f2f 100%);
  border: 4px solid #b71c1c;
  border-radius: 20px;
  animation: ${pulse} 0.2s ease-in-out infinite;
  box-shadow: 
    0 0 40px rgba(255, 82, 82, 0.6),
    0 8px 24px rgba(0,0,0,0.4);
`;

export const AlertIcon = styled.span`
  font-size: 32px;
  font-weight: 800;
  color: white;
  animation: ${pulse} 0.15s ease-in-out infinite;
`;

export const CatchText = styled.div`
  color: white;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
`;

// ===========================================
// RESULT POPUP
// ===========================================

export const ResultPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 36px;
  background: ${props => props.$success 
    ? 'linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%)' 
    : 'linear-gradient(180deg, #bcaaa4 0%, #a1887f 100%)'};
  border: 5px solid ${props => props.$success ? '#8b6914' : '#6d4c41'};
  border-radius: 24px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    ${props => props.$success && props.$glow ? `0 0 30px ${props.$glow}` : 'none'};
  z-index: 200;
  overflow: hidden;
  max-width: calc(100vw - 40px);
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 12px;
    padding: 20px 24px;
    border-width: 4px;
    border-radius: 20px;
    text-align: center;
  }
  
  @media (max-width: 400px) {
    padding: 16px 20px;
    gap: 10px;
  }
`;

export const ResultGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, ${props => props.$glow || 'transparent'} 0%, transparent 70%);
  animation: ${glow} 1.5s ease-in-out infinite;
  pointer-events: none;
`;

export const ResultEmoji = styled.div`
  font-size: 64px;
  filter: drop-shadow(3px 3px 5px rgba(0,0,0,0.3));
  animation: ${float} 2s ease-in-out infinite;
  z-index: 1;
  
  @media (max-width: 600px) {
    font-size: 52px;
  }
  
  @media (max-width: 400px) {
    font-size: 44px;
  }
`;

export const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1;
  
  @media (max-width: 600px) {
    gap: 6px;
    align-items: center;
  }
`;

export const ResultTitle = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.$success ? '#2e7d32' : '#5d4037'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

export const ResultFishName = styled.div`
  font-size: 21px;
  font-weight: 600;
  color: ${props => props.$color || '#5d4037'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
`;

export const ResultReward = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${props => props.$quality === 'perfect' ? '30px' : props.$quality === 'great' ? '28px' : '26px'};
  font-weight: 700;
  color: ${props => props.$quality === 'perfect' ? '#ffd700' : props.$quality === 'great' ? '#4caf50' : '#e65100'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
  ${props => props.$quality === 'perfect' && css`
    animation: ${pulse} 0.5s ease-in-out infinite;
  `}
`;

// ===========================================
// MOBILE CONTROLS
// ===========================================

export const MobileControls = styled.div`
  display: none;
  align-items: center;
  justify-content: space-around;
  padding: 16px 24px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, 
    rgba(139, 105, 20, 0.98) 0%, 
    rgba(109, 76, 16, 0.99) 50%, 
    rgba(90, 61, 10, 0.98) 100%);
  border-top: 4px solid rgba(255, 220, 150, 0.25);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  touch-action: manipulation;
  min-height: 160px;
  
  @media (max-width: 768px) { 
    display: flex; 
  }
  
  @media (max-width: 400px) {
    padding: 12px 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    min-height: 140px;
  }
`;

export const DPad = styled.div`
  position: relative;
  width: 140px;
  height: 140px;
  touch-action: manipulation;
  
  @media (max-width: 400px) {
    width: 120px;
    height: 120px;
  }
`;

export const DPadCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #5d4037 0%, #4e342e 100%);
  border-radius: 12px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  
  @media (max-width: 400px) {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
`;

export const DPadButton = styled.button`
  position: absolute;
  width: 48px;
  height: 48px;
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  border-radius: 12px;
  color: #fff8e1;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008,
    0 5px 8px rgba(0,0,0,0.3);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  ${props => {
    switch (props.$position) {
      case 'up': return 'top: 0; left: 50%; transform: translateX(-50%);';
      case 'down': return 'bottom: 0; left: 50%; transform: translateX(-50%);';
      case 'left': return 'top: 50%; left: 0; transform: translateY(-50%);';
      case 'right': return 'top: 50%; right: 0; transform: translateY(-50%);';
      default: return '';
    }
  }}
  
  @media (max-width: 400px) {
    width: 42px;
    height: 42px;
    font-size: 24px;
    border-radius: 10px;
    border-width: 2px;
  }
  
  &:active {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
    transform: ${props => {
      switch (props.$position) {
        case 'up': return 'translateX(-50%) translateY(2px)';
        case 'down': return 'translateX(-50%) translateY(-2px)';
        case 'left': return 'translateY(-50%) translateX(2px)';
        case 'right': return 'translateY(-50%) translateX(-2px)';
        default: return '';
      }
    }};
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  }
`;

export const ActionButton = styled(motion.button)`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  color: #fff8e1;
  background: ${props => {
    if (props.$state === 'fish_appeared') return 'linear-gradient(180deg, #ff5252 0%, #d32f2f 100%)';
    if (props.$canFish) return 'linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%)';
    return 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)';
  }};
  border: 4px solid ${props => {
    if (props.$state === 'fish_appeared') return '#b71c1c';
    if (props.$canFish) return '#1565c0';
    return '#5a4010';
  }};
  box-shadow: 
    inset 0 3px 0 rgba(255,255,255,0.3),
    0 4px 0 ${props => {
      if (props.$state === 'fish_appeared') return '#7f0000';
      if (props.$canFish) return '#0d47a1';
      return '#4a3008';
    }},
    0 6px 12px rgba(0,0,0,0.4);
  
  @media (max-width: 400px) {
    width: 76px;
    height: 76px;
    font-size: 32px;
    border-width: 3px;
  }
  
  ${props => props.$state === 'fish_appeared' && css`
    animation: ${pulse} 0.25s ease-in-out infinite;
    box-shadow: 
      inset 0 3px 0 rgba(255,255,255,0.3),
      0 4px 0 #7f0000,
      0 0 30px rgba(255, 82, 82, 0.6);
  `}
  
  &:disabled { opacity: 0.5; }
`;

// ===========================================
// NOTIFICATIONS
// ===========================================

export const Notification = styled(motion.div)`
  position: fixed;
  top: 120px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 28px;
  border-radius: 16px;
  font-weight: 700;
  z-index: 1000;
  background: ${props => props.$type === 'error' 
    ? 'linear-gradient(180deg, #ff5252 0%, #d32f2f 100%)' 
    : 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)'};
  border: 3px solid ${props => props.$type === 'error' ? '#b71c1c' : '#2e7d32'};
  color: white;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
`;

// ===========================================
// AUTOFISH BUBBLES
// ===========================================

export const AutofishBubblesContainer = styled.div`
  position: fixed;
  bottom: 160px;
  right: 16px;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  z-index: 500;
  pointer-events: none;
  
  @media (max-width: 768px) { 
    bottom: 200px; 
    right: 10px; 
  }
  
  @media (max-width: 400px) {
    bottom: 180px;
    right: 8px;
  }
`;

export const AutofishBubble = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  min-width: 180px;
  background: ${props => {
    if (!props.$success) return 'linear-gradient(180deg, #78909c 0%, #546e7a 100%)';
    switch (props.$rarity) {
      case 'legendary': return 'linear-gradient(180deg, #ffd54f 0%, #ffb300 100%)';
      case 'epic': return 'linear-gradient(180deg, #ce93d8 0%, #ab47bc 100%)';
      case 'rare': return 'linear-gradient(180deg, #64b5f6 0%, #1e88e5 100%)';
      case 'uncommon': return 'linear-gradient(180deg, #81c784 0%, #4caf50 100%)';
      default: return 'linear-gradient(180deg, #a1887f 0%, #795548 100%)';
    }
  }};
  border-radius: 16px;
  border: 3px solid ${props => {
    if (!props.$success) return '#455a64';
    switch (props.$rarity) {
      case 'legendary': return '#e65100';
      case 'epic': return '#7b1fa2';
      case 'rare': return '#1565c0';
      case 'uncommon': return '#2e7d32';
      default: return '#5d4037';
    }
  }};
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    ${props => props.$success && props.$rarity === 'legendary' ? '0 0 20px rgba(255, 193, 7, 0.4)' : 'none'};
  pointer-events: auto;
  
  @media (max-width: 500px) {
    min-width: 140px;
    padding: 8px 12px;
    gap: 8px;
    border-radius: 12px;
    border-width: 2px;
  }
`;

export const BubbleEmoji = styled.div`
  font-size: 36px;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
  
  @media (max-width: 500px) {
    font-size: 28px;
  }
`;

export const BubbleContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  @media (max-width: 500px) {
    gap: 2px;
  }
`;

export const BubbleFishName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 500px) {
    font-size: 14px;
    font-weight: 600;
  }
`;

export const BubbleReward = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$success ? '#fff9c4' : 'rgba(255, 255, 255, 0.7)'};
`;

// ===========================================
// MODALS - COMMON
// ===========================================

export const CozyModal = styled(ModalContent)`
  max-width: 540px;
  max-height: 85vh;
  width: calc(100vw - 32px);
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 5px solid #8b6914;
  border-radius: 20px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    inset 0 2px 0 rgba(255,255,255,0.5);
  position: relative;
  overflow: hidden;
  
  @media (max-width: 600px) {
    max-height: 80vh;
    border-width: 4px;
    border-radius: 16px;
  }
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      rgba(139, 105, 20, 0.03) 2px,
      transparent 4px
    );
    pointer-events: none;
  }
`;

export const ModalTitle = styled.h2`
  display: flex;
  align-items: center;
  font-size: 22px;
  font-weight: 700;
  color: #5d4037;
  margin: 0;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
  
  @media (max-width: 500px) {
    font-size: 19px;
    font-weight: 600;
  }
`;

export const CloseButton = styled(IconButton)`
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  color: #fff8e1;
  
  &:hover {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
  }
`;

// ===========================================
// HELP MODAL
// ===========================================

export const HelpSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(139, 105, 20, 0.1);
  border-radius: 16px;
  border: 2px solid rgba(139, 105, 20, 0.2);
  
  &:last-child { margin-bottom: 0; }
  
  @media (max-width: 500px) {
    gap: 12px;
    padding: 12px;
    margin-bottom: 16px;
  }
`;

export const HelpNumber = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 100%);
  border-radius: 50%;
  color: #fff8e1;
  font-weight: 800;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 0 #4a3008;
`;

export const HelpContent = styled.div`
  flex: 1;
`;

export const HelpTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #5d4037;
  
  @media (max-width: 500px) {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 6px;
  }
`;

export const HelpText = styled.p`
  font-size: 15px;
  color: #5d4037;
  margin: 0;
  line-height: 1.55;
  
  @media (max-width: 500px) {
    font-size: 14px;
    line-height: 1.5;
  }
`;

export const FishList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
`;

export const FishItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.5);
  border-radius: 12px;
  border-left: 5px solid ${props => props.$color || '#666'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const FishEmoji = styled.span`
  font-size: 28px;
`;

export const FishRarity = styled.span`
  font-weight: 800;
  color: ${props => props.$color || '#5d4037'};
  min-width: 90px;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

export const FishDifficulty = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #795548;
  margin-left: auto;
  padding: 4px 8px;
  background: rgba(0,0,0,0.1);
  border-radius: 8px;
`;

// ===========================================
// LEADERBOARD MODAL
// ===========================================

export const YourRankSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
`;

export const RankBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 32px;
  background: ${props => props.$canAutofish 
    ? 'linear-gradient(180deg, #ffd54f 0%, #ffb300 100%)' 
    : 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'};
  border-radius: 20px;
  border: 4px solid ${props => props.$canAutofish ? '#e65100' : '#5a4010'};
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 4px 12px rgba(0,0,0,0.3);
`;

export const YourRankValue = styled.div`
  font-size: 40px;
  font-weight: 900;
  color: #5d4037;
  text-shadow: 2px 2px 0 rgba(255,255,255,0.5);
`;

export const RankSubtext = styled.div`
  font-size: 14px;
  color: rgba(93, 64, 55, 0.7);
  font-weight: 600;
`;

export const AutofishUnlockStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: ${props => props.$unlocked 
    ? 'linear-gradient(180deg, rgba(102, 187, 106, 0.3) 0%, rgba(76, 175, 80, 0.2) 100%)' 
    : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 20px;
  border: 2px solid ${props => props.$unlocked ? '#43a047' : 'rgba(0,0,0,0.1)'};
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$unlocked ? '#2e7d32' : '#795548'};
`;

export const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(139, 105, 20, 0.1);
    border-radius: 5px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #a07830, #7a5820);
    border-radius: 5px;
    border: 2px solid rgba(139, 105, 20, 0.2);
  }
`;

export const LeaderboardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: ${props => {
    if (props.$isYou) return 'linear-gradient(180deg, rgba(66, 165, 245, 0.2) 0%, rgba(30, 136, 229, 0.15) 100%)';
    if (props.$rank <= 3) return 'linear-gradient(180deg, rgba(255, 213, 79, 0.15) 0%, rgba(255, 179, 0, 0.1) 100%)';
    return 'rgba(255, 255, 255, 0.4)';
  }};
  border-radius: 14px;
  border: 3px solid ${props => {
    if (props.$isYou) return 'rgba(66, 165, 245, 0.4)';
    if (props.$rank <= 3) return 'rgba(255, 179, 0, 0.3)';
    return 'rgba(139, 105, 20, 0.15)';
  }};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const LeaderboardRank = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank <= 3 ? '28px' : '16px'};
  font-weight: 900;
  color: ${props => props.$rank <= 3 ? 'inherit' : '#795548'};
`;

export const LeaderboardName = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #5d4037;
`;

export const LeaderboardPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #e65100;
`;

export const AutofishBadge = styled.div`
  font-size: 20px;
`;

// ===========================================
// PITY SYSTEM
// ===========================================

export const PityBar = styled.div`
  width: 50px;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  
  @media (max-width: 600px) {
    width: 40px;
    height: 6px;
  }
`;

export const PityFill = styled.div`
  height: 100%;
  width: ${props => props.$progress}%;
  background: ${props => props.$inSoftPity 
    ? `linear-gradient(90deg, ${props.$color} 0%, #ff4444 100%)`
    : props.$color};
  border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
  box-shadow: ${props => props.$inSoftPity ? '0 0 8px rgba(255, 68, 68, 0.6)' : 'none'};
`;

// ===========================================
// MORE MENU
// ===========================================

export const MoreMenuWrapper = styled.div`
  position: relative;
`;

export const MoreButton = styled.button`
  width: clamp(32px, 9vw, 40px);
  height: clamp(32px, 9vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$isOpen 
    ? 'linear-gradient(180deg, #8a6828 0%, #6a4818 100%)'
    : 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'};
  border: 3px solid #5a4010;
  border-radius: 10px;
  color: #fff8e1;
  font-size: clamp(16px, 4.5vw, 22px);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008;
  flex-shrink: 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 14px;
  }
  
  @media (max-width: 600px) {
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 360px) {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  &:hover {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
  }
`;

export const MoreMenuDropdown = styled(motion.div)`
  position: fixed;
  top: 60px;
  right: 50px;
  min-width: 200px;
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 3px solid #8b6914;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  overflow: hidden;
  
  @media (max-width: 600px) {
    top: 54px;
    right: 44px;
  }
  
  @media (max-width: 400px) {
    min-width: 180px;
    top: 48px;
    right: 40px;
  }
`;

export const MoreMenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #5d4037;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  
  svg {
    font-size: 18px;
    color: #8b6914;
  }
  
  &:hover {
    background: rgba(139, 105, 20, 0.15);
  }
  
  &:active {
    background: rgba(139, 105, 20, 0.25);
  }
`;

export const MoreMenuItemMobile = styled(MoreMenuItem)`
  @media (min-width: 769px) {
    display: none;
  }
  
  ${props => props.$hasNotification && css`
    background: rgba(255, 193, 7, 0.15);
  `}
`;

export const MoreMenuInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #795548;
  font-size: 12px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.05);
  
  svg {
    font-size: 14px;
    color: #66bb6a;
  }
`;

export const MoreMenuDivider = styled.div`
  height: 1px;
  background: rgba(139, 105, 20, 0.2);
  margin: 4px 0;
`;

export const MoreMenuBadge = styled.span`
  margin-left: auto;
  padding: 2px 6px;
  background: #ffc107;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #5d4037;
`;

// ===========================================
// CHALLENGES BUTTON
// ===========================================

export const ChallengesButton = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  border: 3px solid #e65100;
  border-radius: 10px;
  color: #5d4037;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 3px 0 #bf360c;
  flex-shrink: 0;
  
  ${props => props.$hasCompleted && css`
    &::after {
      content: '!';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      background: #ff3333;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 800;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: ${pulse} 1s ease-in-out infinite;
    }
  `}
  
  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-width: 2px;
    border-radius: 8px;
  }
  
  &:hover {
    transform: translateY(-1px);
    background: linear-gradient(180deg, #ffd54f 0%, #ffa726 100%);
  }
`;

export const ChallengesButtonDesktop = styled(ChallengesButton)`
  @media (max-width: 768px) {
    display: none;
  }
`;

// ===========================================
// PRESTIGE BADGE
// ===========================================

export const PrestigeBadge = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${props => getPrestigeGradient(props.$level)};
  border: 2px solid ${props => getPrestigeBorder(props.$level)};
  border-radius: 16px;
  color: #fff8e1;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.3),
    0 2px 4px rgba(0,0,0,0.3),
    ${props => props.$level > 0 ? `0 0 8px ${props.$level >= 3 ? 'rgba(255, 215, 0, 0.4)' : 'rgba(200, 160, 80, 0.3)'}` : 'none'};
  flex-shrink: 0;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 
      inset 0 1px 0 rgba(255,255,255,0.3),
      0 3px 6px rgba(0,0,0,0.3),
      ${props => props.$level > 0 ? `0 0 12px ${props.$level >= 3 ? 'rgba(255, 215, 0, 0.6)' : 'rgba(200, 160, 80, 0.5)'}` : 'none'};
  }
  
  @media (max-width: 600px) {
    padding: 5px 8px;
    font-size: 11px;
    gap: 4px;
  }
  
  @media (max-width: 400px) {
    padding: 5px 6px;
    
    span:last-child {
      display: none;
    }
  }
`;

export const PrestigeEmoji = styled.span`
  font-size: 14px;
  
  @media (max-width: 600px) {
    font-size: 12px;
  }
`;

export const PrestigeName = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
  
  @media (max-width: 600px) {
    max-width: 50px;
  }
`;

// ===========================================
// LOADING STATES
// ===========================================

export const TradingLoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  color: #795548;
  font-size: 18px;
  font-weight: 600;
  
  .loading-fish {
    font-size: 48px;
    color: #64b5f6;
    animation: fishBob 1.5s ease-in-out infinite;
  }
  
  @keyframes fishBob {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
  }
`;

// ===========================================
// PROGRESS BARS (shared)
// ===========================================

export const ProgressBarContainer = styled.div`
  height: 6px;
  background: rgba(139, 105, 20, 0.15);
  border-radius: 3px;
  overflow: hidden;
`;

export const ProgressBarFill = styled.div`
  height: 100%;
  width: ${props => props.$progress}%;
  background: ${props => props.$color || '#8b6914'};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

// ===========================================
// CANVAS WRAPPER (with dynamic dimensions)
// ===========================================

export const CanvasWrapper = styled.div`
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
  
  canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    width: 100% !important;
    height: 100% !important;
  }
`;

// ===========================================
// TRADING POST MODAL
// ===========================================

export const TradingPostModal = styled(motion.div)`
  background: linear-gradient(180deg, #fff8e1 0%, #ffecb3 100%);
  border-radius: 20px;
  border: 5px solid #8b6914;
  box-shadow: 
    0 0 0 2px #d4a020,
    inset 0 2px 0 rgba(255,255,255,0.5),
    0 20px 60px rgba(0, 0, 0, 0.4);
  width: calc(100% - 24px);
  max-width: 420px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 600px) {
    border-width: 4px;
    border-radius: 16px;
    max-height: 80vh;
    max-width: 100%;
  }
`;

export const ShopHeader = styled.div`
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 100%);
  padding: 14px 18px 12px;
  border-bottom: 4px solid #3e2a06;
`;

export const ShopTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

export const ShopIcon = styled.div`
  font-size: 26px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
`;

export const ShopTitle = styled.h2`
  flex: 1;
  font-size: 18px;
  font-weight: 800;
  color: #fff8e1;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  letter-spacing: 0.5px;
`;

export const ShopBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: linear-gradient(180deg, rgba(139, 105, 20, 0.05) 0%, rgba(139, 105, 20, 0.1) 100%);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(139, 105, 20, 0.1);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #a07830, #7a5820);
    border-radius: 4px;
  }
`;

export const WalletStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 6px 14px;
  border: 2px solid rgba(255,248,225,0.2);
`;

export const WalletItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  
  span:first-child {
    font-size: 16px;
  }
`;

export const WalletDivider = styled.div`
  width: 1px;
  height: 20px;
  background: rgba(255,248,225,0.3);
`;

export const WalletValue = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: ${props => props.$highlight ? '#ffd54f' : '#fff8e1'};
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
`;

export const DailyLimitsStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 4px 12px;
  margin-top: 8px;
  border: 1px solid rgba(255,248,225,0.15);
`;

export const DailyLimitItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  opacity: ${props => props.$atLimit ? 0.7 : 1};
  
  span:first-child {
    font-size: 12px;
  }
`;

export const DailyLimitDivider = styled.div`
  width: 1px;
  height: 16px;
  background: rgba(255,248,225,0.2);
`;

export const DailyLimitText = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$atLimit ? '#ff8a80' : 'rgba(255,248,225,0.7)'};
`;

export const LimitReachedBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

// ===========================================
// FISH INVENTORY BAR
// ===========================================

export const FishBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px;
  background: rgba(139, 105, 20, 0.1);
  border-radius: 12px;
  margin-bottom: 14px;
  border: 2px solid rgba(139, 105, 20, 0.2);
  
  @media (max-width: 400px) {
    gap: 4px;
    padding: 8px 6px;
  }
`;

export const FishChip = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: ${props => props.$hasAny 
    ? 'rgba(255,255,255,0.7)'
    : 'rgba(255,255,255,0.3)'};
  border-radius: 10px;
  border: 2px solid ${props => props.$hasAny 
    ? `${props.$color}60`
    : 'rgba(139, 105, 20, 0.15)'};
  opacity: ${props => props.$hasAny ? 1 : 0.6};
  transition: all 0.2s;
  
  @media (max-width: 400px) {
    padding: 6px 2px;
    gap: 2px;
    border-radius: 8px;
  }
`;

export const FishChipEmoji = styled.div`
  font-size: 20px;
  
  @media (max-width: 400px) {
    font-size: 16px;
  }
`;

export const FishChipCount = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${props => props.$color || '#5d4037'};
  
  @media (max-width: 400px) {
    font-size: 12px;
  }
`;

// ===========================================
// TRADE COMPONENTS
// ===========================================

export const TradeSection = styled.div`
  margin-bottom: 14px;
  opacity: ${props => props.$locked ? 0.9 : 1};
`;

export const TradeSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${props => props.$available 
    ? 'rgba(76, 175, 80, 0.4)' 
    : props.$limitReached 
      ? 'rgba(255, 152, 0, 0.4)'
      : 'rgba(139, 105, 20, 0.2)'};
`;

export const TradeSectionBadge = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: ${props => props.$available 
    ? 'linear-gradient(180deg, #4caf50 0%, #388e3c 100%)'
    : props.$limitReached
      ? 'linear-gradient(180deg, #ff9800 0%, #f57c00 100%)'
      : 'rgba(139, 105, 20, 0.2)'};
  color: ${props => (props.$available || props.$limitReached) ? '#fff' : '#795548'};
  box-shadow: ${props => props.$available 
    ? '0 2px 0 #2e7d32' 
    : props.$limitReached 
      ? '0 2px 0 #e65100' 
      : 'none'};
`;

export const TradeSectionTitle = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #5d4037;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const TradeSectionCount = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #8b6914;
  background: rgba(139, 105, 20, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
`;

export const TradeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
  
  @media (max-width: 400px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

export const QuickTradeCard = styled(motion.div)`
  background: rgba(255,255,255,0.8);
  border-radius: 14px;
  border: 3px solid ${props => `${props.$color}50` || 'rgba(139, 105, 20, 0.3)'};
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  
  &:hover {
    border-color: ${props => props.$color || '#8b6914'};
    background: rgba(255,255,255,0.95);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    transform: translateY(-2px);
  }
  
  @media (max-width: 400px) {
    padding: 10px 8px;
    gap: 8px;
    border-radius: 12px;
  }
`;

export const TradeCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

export const TradeGiveSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

export const TradeLabel = styled.div`
  font-size: 9px;
  font-weight: 700;
  color: #8b6914;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const TradeGiveContent = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

export const TradeGiveEmoji = styled.div`
  font-size: 22px;
  
  @media (max-width: 400px) {
    font-size: 18px;
  }
`;

export const TradeGiveAmount = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #c62828;
  
  @media (max-width: 400px) {
    font-size: 13px;
  }
`;

export const TradeArrow = styled.div`
  font-size: 16px;
  color: #8b6914;
  margin: 0 2px;
`;

export const TradeGetSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

export const TradeGetContent = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

export const TradeGetEmoji = styled.div`
  font-size: 22px;
  
  @media (max-width: 400px) {
    font-size: 18px;
  }
`;

export const TradeGetAmount = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #2e7d32;
  
  @media (max-width: 400px) {
    font-size: 13px;
  }
`;

export const QuickTradeButton = styled(motion.button)`
  width: 100%;
  padding: 9px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(180deg, #43a047 0%, #2e7d32 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 
    0 3px 0 #1b5e20,
    0 4px 10px rgba(0,0,0,0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.15s;
  
  &:hover {
    background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 
      0 1px 0 #1b5e20,
      0 2px 5px rgba(0,0,0,0.2);
  }
  
  &:disabled {
    background: linear-gradient(180deg, #9e9e9e 0%, #757575 100%);
    cursor: not-allowed;
    box-shadow: 0 2px 0 #616161;
  }
`;

export const SoftCapWarning = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  margin: 0 0 6px 0;
  background: linear-gradient(180deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%);
  border: 1px solid rgba(255, 152, 0, 0.4);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #ff9800;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: help;
`;

export const NearLimitWarning = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  margin: 0 0 6px 0;
  background: linear-gradient(180deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.1) 100%);
  border: 1px solid rgba(76, 175, 80, 0.4);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #4caf50;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  animation: ${pulse} 2s infinite;
`;

export const BottleneckInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  margin: 0 0 6px 0;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid ${props => props.$color || 'rgba(139, 105, 20, 0.3)'};
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  color: ${props => props.$color || '#8b6914'};
  text-transform: capitalize;
`;

export const LimitReachedNote = styled.div`
  font-size: 11px;
  color: #e65100;
  background: rgba(255, 152, 0, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
  text-align: center;
  font-weight: 500;
`;

export const LockedTradesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const LockedTradeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: ${props => props.$limitReached ? 'rgba(255, 152, 0, 0.08)' : 'rgba(255,255,255,0.5)'};
  border-radius: 10px;
  border: 2px solid ${props => props.$limitReached ? 'rgba(255, 152, 0, 0.25)' : 'rgba(139, 105, 20, 0.15)'};
`;

export const LockedTradeInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const LockedTradeEmoji = styled.div`
  font-size: 20px;
  opacity: 0.6;
`;

export const LockedTradeText = styled.div`
  flex: 1;
  min-width: 0;
`;

export const LockedTradeName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #795548;
  margin-bottom: 4px;
`;

export const LockedTradeReward = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: ${props => props.$limitReached ? '#e65100' : '#795548'};
  opacity: ${props => props.$limitReached ? 0.7 : 1};
  
  span:first-child {
    font-size: 15px;
  }
`;

export const EmptyTradeState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #795548;
  text-align: center;
  
  span {
    font-size: 48px;
    opacity: 0.5;
  }
  
  p {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
`;

export const TradeSuccessOverlay = styled(motion.div)`
  position: fixed;
  top: 100px;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: fit-content;
  background: linear-gradient(180deg, rgba(76, 175, 80, 0.98) 0%, rgba(56, 142, 60, 0.98) 100%);
  border-radius: 16px;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 2000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  pointer-events: none;
`;

export const TradeSuccessIcon = styled.div`
  font-size: 28px;
`;

export const TradeSuccessText = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
`;

// ===========================================
// CHALLENGES MODAL
// ===========================================

export const ChallengesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const ChallengeCard = styled.div`
  padding: 16px;
  background: ${props => props.$completed 
    ? 'linear-gradient(180deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.1) 100%)'
    : 'rgba(255, 255, 255, 0.5)'};
  border-radius: 14px;
  border: 3px solid ${props => {
    if (props.$completed) return 'rgba(76, 175, 80, 0.4)';
    switch (props.$difficulty) {
      case 'legendary': return '#ffc107';
      case 'hard': return '#ab47bc';
      case 'medium': return '#42a5f5';
      default: return 'rgba(139, 105, 20, 0.2)';
    }
  }};
  position: relative;
  opacity: ${props => props.$completed ? 0.7 : 1};
`;

export const ChallengeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

export const ChallengeName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #5d4037;
`;

export const DifficultyBadge = styled.span`
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$difficulty) {
      case 'legendary': return 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)';
      case 'hard': return 'linear-gradient(180deg, #ce93d8 0%, #ab47bc 100%)';
      case 'medium': return 'linear-gradient(180deg, #64b5f6 0%, #42a5f5 100%)';
      default: return 'linear-gradient(180deg, #a5d6a7 0%, #81c784 100%)';
    }
  }};
  color: ${props => props.$difficulty === 'easy' ? '#2e7d32' : '#fff'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

export const ChallengeDescription = styled.div`
  font-size: 14px;
  color: #795548;
  margin-bottom: 12px;
`;

export const ChallengeProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`;

export const ProgressText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #5d4037;
  min-width: 50px;
`;

export const ChallengeReward = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  
  span {
    font-size: 14px;
    font-weight: 600;
    color: #795548;
  }
`;

export const ClaimButton = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 0 #2e7d32, 0 4px 8px rgba(0,0,0,0.2);
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #66bb6a 0%, #43a047 100%);
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 1px 0 #2e7d32;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: linear-gradient(180deg, #78909c 0%, #607d8b 100%);
    box-shadow: 0 3px 0 #455a64, 0 4px 8px rgba(0,0,0,0.2);
  }
  
  .spinning {
    animation: ${spin} 1s linear infinite;
  }
`;

export const CompletedBadge = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  color: #2e7d32;
  font-size: 14px;
  font-weight: 700;
`;

// ===========================================
// EQUIPMENT MODAL
// ===========================================

export const EquipmentTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: rgba(139, 105, 20, 0.1);
  border-radius: 12px;
`;

export const EquipmentTab = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active 
    ? 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'
    : 'transparent'};
  color: ${props => props.$active ? '#fff8e1' : '#795548'};
  box-shadow: ${props => props.$active ? '0 3px 0 #4a3008' : 'none'};
  
  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'
      : 'rgba(139, 105, 20, 0.1)'};
  }
`;

export const EquipmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
`;

export const EquipmentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: ${props => {
    if (props.$current) return 'linear-gradient(180deg, rgba(102, 187, 106, 0.2) 0%, rgba(76, 175, 80, 0.15) 100%)';
    if (!props.$unlocked) return 'rgba(0, 0, 0, 0.05)';
    return 'rgba(255, 255, 255, 0.5)';
  }};
  border-radius: 14px;
  border: 3px solid ${props => {
    if (props.$current) return 'rgba(76, 175, 80, 0.5)';
    if (props.$locked) return 'rgba(0, 0, 0, 0.2)';
    if (!props.$unlocked) return 'rgba(139, 105, 20, 0.15)';
    return 'rgba(139, 105, 20, 0.2)';
  }};
  opacity: ${props => props.$locked ? 0.6 : 1};
`;

export const EquipmentIcon = styled.div`
  font-size: 36px;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.2));
`;

export const EquipmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const EquipmentName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #5d4037;
  margin-bottom: 4px;
`;

export const EquipmentDesc = styled.div`
  font-size: 12px;
  color: #795548;
  margin-bottom: 4px;
`;

export const EquipmentBonus = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #4caf50;
`;

export const RodBonuses = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  
  span {
    font-size: 11px;
    font-weight: 600;
    color: #4caf50;
    padding: 2px 6px;
    background: rgba(76, 175, 80, 0.15);
    border-radius: 6px;
  }
`;

export const CurrentBadge = styled.div`
  padding: 8px 14px;
  background: linear-gradient(180deg, #66bb6a 0%, #4caf50 100%);
  border-radius: 10px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 0 #2e7d32;
`;

export const SelectButton = styled.button`
  padding: 8px 14px;
  background: linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 0 #1565c0;
  
  &:hover {
    background: linear-gradient(180deg, #64b5f6 0%, #42a5f5 100%);
    transform: translateY(-1px);
  }
`;

export const BuyButton = styled.button`
  padding: 8px 14px;
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  border: none;
  border-radius: 10px;
  color: #5d4037;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 0 #e65100;
  
  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #ffd54f 0%, #ffa726 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const UnlockButton = styled.button`
  padding: 8px 14px;
  background: ${props => props.$canAfford 
    ? 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)'
    : 'linear-gradient(180deg, #9e9e9e 0%, #757575 100%)'};
  border: none;
  border-radius: 10px;
  color: ${props => props.$canAfford ? '#5d4037' : '#ffffff'};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${props => props.$canAfford ? '0 2px 0 #e65100' : '0 2px 0 #424242'};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
  
  &:hover:not(:disabled) {
    background: ${props => props.$canAfford 
      ? 'linear-gradient(180deg, #ffd54f 0%, #ffa726 100%)'
      : 'linear-gradient(180deg, #bdbdbd 0%, #9e9e9e 100%)'};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const LockedBadge = styled.div`
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  color: #795548;
  font-size: 12px;
  font-weight: 600;
`;

// ===========================================
// PRESTIGE MODAL
// ===========================================

export const PrestigeCurrentLevel = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: ${props => getPrestigeGradient(props.$level)};
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 4px 12px rgba(0,0,0,0.3);
`;

export const PrestigeLevelEmoji = styled.div`
  font-size: 48px;
  line-height: 1;
  
  @media (max-width: 400px) {
    font-size: 36px;
  }
`;

export const PrestigeLevelInfo = styled.div`
  flex: 1;
`;

export const PrestigeLevelTitle = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  
  @media (max-width: 400px) {
    font-size: 16px;
  }
`;

export const PrestigeLevelSubtitle = styled.div`
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  margin-top: 4px;
`;

export const PrestigeBonusSection = styled.div`
  background: rgba(76, 175, 80, 0.1);
  border: 2px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
`;

export const PrestigeSectionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #5d4037;
  margin-bottom: 12px;
`;

export const PrestigeBonusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const PrestigeBonusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4caf50;
  font-weight: 600;
  
  span:first-child {
    font-size: 16px;
  }
`;

export const PrestigeProgressSection = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 2px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
`;

export const PrestigeDescription = styled.div`
  font-size: 12px;
  color: #795548;
  font-style: italic;
  margin-bottom: 16px;
`;

export const PrestigeOverallProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

export const PrestigeProgressBarWrapper = styled.div`
  flex: 1;
  height: 12px;
  background: rgba(0,0,0,0.1);
  border-radius: 6px;
  overflow: hidden;
`;

export const PrestigeProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #ffc107 0%, #ff9800 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
`;

export const PrestigeProgressPercent = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #ff9800;
  min-width: 40px;
  text-align: right;
`;

export const PrestigeRequirementsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const PrestigeRequirementItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  opacity: ${props => props.$complete ? 0.7 : 1};
`;

export const PrestigeReqIcon = styled.div`
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
`;

export const PrestigeReqContent = styled.div`
  flex: 1;
`;

export const PrestigeReqLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #5d4037;
  margin-bottom: 4px;
`;

export const PrestigeReqBar = styled.div`
  height: 6px;
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 2px;
`;

export const PrestigeReqFill = styled.div`
  height: 100%;
  width: ${props => Math.min(props.$percent, 100)}%;
  background: ${props => props.$percent >= 100 
    ? 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)' 
    : 'linear-gradient(90deg, #ffc107 0%, #ff9800 100%)'};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

export const PrestigeReqValue = styled.div`
  font-size: 11px;
  color: #8d6e63;
`;

export const PrestigeClaimButton = styled(motion.button)`
  width: 100%;
  padding: 14px 20px;
  margin-top: 16px;
  background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
  border: 3px solid #2e7d32;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 4px 0 #1b5e20,
    0 0 20px rgba(76, 175, 80, 0.5);
  
  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #66bb6a 0%, #4caf50 100%);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export const PrestigeMaxLevel = styled.div`
  text-align: center;
  padding: 30px 20px;
  background: linear-gradient(180deg, rgba(156, 39, 176, 0.15) 0%, rgba(106, 27, 154, 0.15) 100%);
  border: 2px solid rgba(156, 39, 176, 0.3);
  border-radius: 16px;
  margin-bottom: 20px;
`;

export const PrestigeMaxIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

export const PrestigeMaxText = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: #9c27b0;
  margin-bottom: 8px;
`;

export const PrestigeMaxSubtext = styled.div`
  font-size: 13px;
  color: #7b1fa2;
`;

export const PrestigeLevelsOverview = styled.div`
  margin-top: 20px;
`;

export const PrestigeLevelsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const PrestigeLevelCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.$current 
    ? 'linear-gradient(180deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%)'
    : props.$unlocked 
      ? 'rgba(76, 175, 80, 0.1)' 
      : 'rgba(0, 0, 0, 0.05)'};
  border: 2px solid ${props => props.$current 
    ? 'rgba(255, 193, 7, 0.5)' 
    : props.$unlocked 
      ? 'rgba(76, 175, 80, 0.3)' 
      : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 12px;
  opacity: ${props => props.$unlocked ? 1 : 0.6};
`;

export const PrestigeLevelCardEmoji = styled.div`
  font-size: 24px;
`;

export const PrestigeLevelCardInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PrestigeLevelCardName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$unlocked ? '#5d4037' : '#9e9e9e'};
`;

export const PrestigeLevelCardBadge = styled.div`
  padding: 2px 8px;
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  color: #5d4037;
`;

export const PrestigeLevelCardCheck = styled.div`
  color: #4caf50;
  font-weight: 700;
  font-size: 16px;
`;

export const PrestigeLevelCardLock = styled.div`
  font-size: 16px;
  opacity: 0.5;
`;

// Re-export for convenience
export { ModalOverlay, ModalHeader, ModalBody } from '../../design-system';
