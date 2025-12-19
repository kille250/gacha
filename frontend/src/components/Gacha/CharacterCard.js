import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme, getRarityColor, getRarityGlow } from '../../styles/DesignSystem';

// Glow animation for rare cards
const glow = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.15); }
`;

// ==================== MAIN CHARACTER CARD ====================

export const CharacterCard = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  width: 100%;
  max-width: 340px;
  position: relative;
  
  /* Rarity border glow */
  border: 2px solid ${props => getRarityColor(props.rarity)};
  box-shadow: ${props => getRarityGlow(props.rarity)}, ${theme.shadows.lg};
  
  /* Legendary/Epic glow animation */
  &::before {
    content: "";
    position: absolute;
    inset: -2px;
    background: ${props => getRarityColor(props.rarity)};
    border-radius: inherit;
    z-index: -1;
    opacity: ${props => ['legendary', 'epic'].includes(props.rarity) ? 1 : 0};
    animation: ${glow} 2s ease-in-out infinite;
    pointer-events: none;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    max-width: 300px;
  }
`;

export const CardMediaContainer = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    height: 260px;
  }
`;

export const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 100%, ${props => getRarityColor(props.rarity)}40 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
`;

export const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.transitions.slow};
  
  &:hover {
    transform: scale(1.05);
  }
`;

export const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.transitions.slow};
  
  &:hover {
    transform: scale(1.05);
  }
`;

export const CollectedBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.success}, #059669);
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  z-index: 5;
  box-shadow: ${theme.shadows.sm};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const BannerCharBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  z-index: 5;
  box-shadow: ${theme.shadows.sm};
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: "★";
  }
`;

export const ZoomHint = styled.div`
  position: absolute;
  bottom: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.sm});
  color: white;
  width: 36px;
  height: 36px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  font-size: 16px;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  
  ${CardMediaContainer}:hover & {
    opacity: 1;
  }
`;

export const CardDetails = styled.div`
  padding: ${theme.spacing.lg};
  position: relative;
  background: ${theme.colors.backgroundTertiary};
`;

export const CharacterName = styled.h2`
  margin: 0 0 4px;
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.02em;
`;

export const CharacterSeries = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

export const RarityBadge = styled.div`
  position: absolute;
  top: -14px;
  right: ${theme.spacing.lg};
  background: ${props => getRarityColor(props.rarity)};
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px ${props => getRarityColor(props.rarity)}60;
  z-index: 10;
  
  svg {
    font-size: 12px;
  }
  
  animation: ${props => ['legendary', 'epic'].includes(props.rarity) ? `${pulse} 2s ease-in-out infinite` : 'none'};
`;

export const CardActions = styled.div`
  display: flex;
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

export const ActionButton = styled(motion.button)`
  flex: 1;
  padding: ${theme.spacing.md};
  border: none;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.primary ? theme.fontWeights.semibold : theme.fontWeights.medium};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  
  background: ${props => props.primary 
    ? `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary})` 
    : theme.colors.backgroundTertiary};
  color: ${props => props.primary ? 'white' : theme.colors.textSecondary};
  
  &:first-child {
    border-right: 1px solid ${theme.colors.surfaceBorder};
  }
  
  &:hover:not(:disabled) {
    background: ${props => props.primary 
      ? `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary})` 
      : theme.colors.surfaceHover};
  }
  
  &:disabled {
    opacity: 0.5;
  }
  
  svg {
    font-size: 16px;
  }
`;

// ==================== MINI CARDS FOR MULTI-ROLL ====================

export const MultiResultsPanel = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 1000px;
  overflow: hidden;
  box-shadow: ${theme.shadows.lg};
  border: 1px solid ${theme.colors.surfaceBorder};
`;

export const MultiHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  color: white;
  
  h2 {
    margin: 0;
    font-size: ${theme.fontSizes.lg};
    font-weight: ${theme.fontWeights.semibold};
  }
`;

export const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: background ${theme.transitions.fast};
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

export const MultiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  max-height: 60vh;
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundTertiary};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceBorder};
    border-radius: 4px;
    
    &:hover {
      background: ${theme.colors.surfaceHover};
    }
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: ${theme.spacing.sm};
  }
`;

export const MiniCard = styled(motion.div)`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => props.isBanner 
    ? theme.colors.warning
    : getRarityColor(props.rarity)};
  box-shadow: ${theme.shadows.sm};
  transition: transform ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};
  
  ${props => props.isBanner && `
    background: linear-gradient(to bottom, rgba(255, 159, 10, 0.1), ${theme.colors.backgroundTertiary});
  `}
`;

export const MiniCardMedia = styled.div`
  position: relative;
  height: 130px;
  overflow: hidden;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    height: 110px;
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
  background: linear-gradient(135deg, ${theme.colors.success}, #059669);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: ${theme.fontWeights.bold};
  z-index: 5;
`;

export const MiniBannerStar = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  z-index: 5;
`;

export const MiniCardInfo = styled.div`
  padding: ${theme.spacing.sm};
  position: relative;
`;

export const MiniCharName = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MiniRarityBadge = styled.div`
  position: absolute;
  top: -10px;
  right: 8px;
  background: ${props => getRarityColor(props.rarity)};
  color: white;
  padding: 3px 8px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 3px;
  box-shadow: ${theme.shadows.sm};
  z-index: 5;
  
  svg {
    font-size: 9px;
  }
`;
