import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, rarityColors } from './theme';
import { glow } from './animations';

// ==================== MAIN CHARACTER CARD ====================

export const CharacterCard = styled(motion.div)`
  background: white;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  width: 100%;
  max-width: 340px;
  position: relative;
  
  /* Rarity border glow */
  border: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  box-shadow: 
    ${theme.shadow.large},
    ${props => rarityColors[props.rarity] 
      ? `0 0 30px ${rarityColors[props.rarity]}50` 
      : 'none'};
  
  /* Legendary/Epic animation */
  ${props => ['legendary', 'epic'].includes(props.rarity) && `
    &::before {
      content: "";
      position: absolute;
      inset: -3px;
      background: ${rarityColors[props.rarity]};
      border-radius: inherit;
      z-index: -1;
      animation: ${glow} 2s ease-in-out infinite;
    }
  `}
  
  @media (max-width: ${theme.breakpoints.mobile}) {
    max-width: 300px;
  }
`;

export const CardMediaContainer = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: ${theme.breakpoints.mobile}) {
    height: 260px;
  }
`;

export const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: ${props => {
    const color = rarityColors[props.rarity];
    if (!color) return 'none';
    return `radial-gradient(circle at 50% 100%, ${color}40 0%, transparent 70%)`;
  }};
  pointer-events: none;
  z-index: 1;
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

export const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

export const CollectedBadge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: 12px;
  font-weight: 700;
  z-index: 5;
  box-shadow: ${theme.shadow.small};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const BannerCharBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${theme.gradient.gold};
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: 12px;
  font-weight: 700;
  z-index: 5;
  box-shadow: ${theme.shadow.small};
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: "★";
  }
`;

export const ZoomHint = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${CardMediaContainer}:hover & {
    opacity: 1;
  }
`;

export const CardDetails = styled.div`
  padding: ${theme.spacing.lg};
  position: relative;
  background: linear-gradient(to bottom, white, #fafafa);
`;

export const CharacterName = styled.h2`
  margin: 0 0 4px;
  font-size: 22px;
  color: ${theme.text.dark};
  font-weight: 800;
  letter-spacing: -0.3px;
`;

export const CharacterSeries = styled.p`
  margin: 0;
  color: #666;
  font-style: italic;
  font-size: 14px;
`;

export const RarityBadge = styled.div`
  position: absolute;
  top: -14px;
  right: 16px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: ${props => `0 4px 12px ${rarityColors[props.rarity]}60`};
  z-index: 10;
  
  svg {
    font-size: 14px;
  }
  
  ${props => ['legendary', 'epic'].includes(props.rarity) && `
    animation: pulse-badge 2s ease-in-out infinite;
    
    @keyframes pulse-badge {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.2); }
    }
  `}
`;

export const CardActions = styled.div`
  display: flex;
  border-top: 1px solid #eee;
`;

export const ActionButton = styled(motion.button)`
  flex: 1;
  padding: 14px;
  border: none;
  font-size: 14px;
  font-weight: ${props => props.primary ? '700' : '500'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  background: ${props => props.primary ? theme.gradient.primary : 'white'};
  color: ${props => props.primary ? 'white' : '#555'};
  
  &:first-child {
    border-right: 1px solid #eee;
  }
  
  &:hover:not(:disabled) {
    background: ${props => props.primary ? theme.gradient.primary : '#f5f5f5'};
  }
  
  &:disabled {
    opacity: 0.5;
  }
  
  svg {
    font-size: 18px;
  }
`;

// ==================== MINI CARDS FOR MULTI-ROLL ====================

export const MultiResultsPanel = styled(motion.div)`
  background: white;
  border-radius: ${theme.radius.lg};
  width: 100%;
  max-width: 1000px;
  overflow: hidden;
  box-shadow: ${theme.shadow.large};
`;

export const MultiHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${theme.gradient.blue};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  color: white;
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
`;

export const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

export const MultiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  max-height: calc(70vh - 80px);
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f0f0f0;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
    
    &:hover {
      background: #aaa;
    }
  }
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: ${theme.spacing.sm};
  }
`;

export const MiniCard = styled(motion.div)`
  background: white;
  border-radius: ${theme.radius.md};
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => props.isBanner 
    ? theme.colors.accent 
    : rarityColors[props.rarity] || '#ddd'};
  box-shadow: ${theme.shadow.small};
  transition: transform 0.2s, box-shadow 0.2s;
  
  ${props => props.isBanner && `
    background: linear-gradient(to bottom, rgba(255, 215, 0, 0.08), white);
  `}
`;

export const MiniCardMedia = styled.div`
  position: relative;
  height: 140px;
  overflow: hidden;
  
  @media (max-width: ${theme.breakpoints.mobile}) {
    height: 120px;
  }
`;

export const MiniCardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const MiniCardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const MiniCollectedDot = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  z-index: 5;
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
  font-size: 11px;
  z-index: 5;
`;

export const MiniCardInfo = styled.div`
  padding: 10px;
  position: relative;
`;

export const MiniCharName = styled.h3`
  margin: 0;
  font-size: 13px;
  color: ${theme.text.dark};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MiniRarityBadge = styled.div`
  position: absolute;
  top: -10px;
  right: 8px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 3px 8px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 3px;
  box-shadow: ${theme.shadow.small};
  z-index: 5;
  
  svg {
    font-size: 10px;
  }
`;

