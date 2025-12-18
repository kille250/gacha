import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, rarityColors } from './theme';
import { spin, float } from './animations';

// ==================== PAGE LAYOUT ====================

export const PageContainer = styled.div`
  min-height: 100vh;
  background: ${theme.background.page};
  color: ${theme.text.primary};
  position: relative;
  overflow-x: hidden;
  
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: 
      radial-gradient(ellipse at 20% 0%, rgba(110, 72, 170, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(158, 85, 148, 0.1) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

export const PageContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md};
  }
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

// ==================== HEADER ====================

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.background.card};
  backdrop-filter: blur(12px);
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.border.subtle};
  margin-bottom: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: ${theme.spacing.md};
    padding: ${theme.spacing.md};
  }
`;

export const Logo = styled.div`
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  
  span:first-child {
    background: ${theme.gradient.primary};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.mobile}) {
    flex-wrap: wrap;
    justify-content: center;
    gap: ${theme.spacing.sm};
  }
`;

export const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.background.glass};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-weight: 500;
  font-size: 14px;
  border: 1px solid ${theme.border.subtle};
  
  svg {
    font-size: 16px;
    opacity: 0.8;
  }
`;

export const PointsBadge = styled(StatBadge)`
  background: ${theme.gradient.purple};
  border: none;
  font-weight: 700;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
`;

export const IconButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.full};
  background: ${theme.background.glass};
  border: 1px solid ${theme.border.subtle};
  color: ${theme.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${theme.background.card};
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// ==================== SECTIONS ====================

export const Section = styled.section`
  background: ${theme.background.card};
  backdrop-filter: blur(12px);
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.border.subtle};
  padding: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.lg};
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

export const SectionIcon = styled.span`
  font-size: 28px;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  position: relative;
  
  &::after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 40px;
    height: 3px;
    background: ${theme.gradient.primary};
    border-radius: 2px;
  }
`;

// ==================== LOADING STATES ====================

export const LoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xxl};
  min-height: 300px;
`;

export const LoadingSpinner = styled.div`
  width: 80px;
  height: 80px;
  position: relative;
  
  &::before, &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 4px solid transparent;
  }
  
  &::before {
    border-top-color: ${theme.colors.primary};
    border-left-color: ${theme.colors.secondary};
    animation: ${spin} 1s linear infinite;
  }
  
  &::after {
    inset: 8px;
    border-bottom-color: ${theme.colors.accent};
    border-right-color: ${theme.colors.primary};
    animation: ${spin} 1.5s linear infinite reverse;
  }
`;

export const LoadingText = styled.p`
  margin-top: ${theme.spacing.lg};
  font-size: 18px;
  font-weight: 500;
  color: ${theme.text.secondary};
  animation: ${float} 2s ease-in-out infinite;
`;

// ==================== ERROR & ALERTS ====================

export const AlertBar = styled(motion.div)`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  
  ${props => {
    switch(props.variant) {
      case 'error':
        return `
          background: linear-gradient(135deg, #e53935, #c62828);
          box-shadow: 0 4px 15px rgba(229, 57, 53, 0.3);
        `;
      case 'success':
        return `
          background: linear-gradient(135deg, #43a047, #2e7d32);
          box-shadow: 0 4px 15px rgba(67, 160, 71, 0.3);
        `;
      case 'warning':
        return `
          background: linear-gradient(135deg, #ffa000, #ff8f00);
          box-shadow: 0 4px 15px rgba(255, 160, 0, 0.3);
        `;
      default:
        return `
          background: ${theme.background.card};
          border: 1px solid ${theme.border.light};
        `;
    }
  }}
`;

export const AlertCloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

// ==================== RARITY TRACKER ====================

export const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  background: ${theme.background.glass};
  border-radius: ${theme.radius.full};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  border: 1px solid ${theme.border.subtle};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-wrap: wrap;
    justify-content: center;
    border-radius: ${theme.radius.lg};
    padding: ${theme.spacing.md};
  }
`;

export const TrackerLabel = styled.span`
  font-size: 14px;
  color: ${theme.text.secondary};
  font-weight: 500;
`;

export const RarityDots = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

export const RarityDot = styled(motion.div)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => rarityColors[props.rarity] || '#555'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: ${props => `0 2px 10px ${rarityColors[props.rarity]}60`};
  
  svg {
    font-size: 16px;
  }
`;

// ==================== RESULTS AREA ====================

export const ResultsArea = styled.div`
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    min-height: 350px;
  }
`;

// ==================== EMPTY STATE ====================

export const EmptyState = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.xxl};
  background: ${theme.background.glass};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.border.subtle};
  max-width: 380px;
`;

export const EmptyIcon = styled.div`
  font-size: 56px;
  margin-bottom: ${theme.spacing.lg};
  animation: ${float} 3s ease-in-out infinite;
`;

export const EmptyTitle = styled.h3`
  margin: 0 0 ${theme.spacing.sm};
  font-size: 24px;
  font-weight: 700;
  background: ${theme.gradient.primary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const EmptyText = styled.p`
  margin: 0;
  color: ${theme.text.secondary};
  font-size: 16px;
  line-height: 1.5;
`;

// ==================== SETTINGS PANEL ====================

export const SettingsPanel = styled(motion.div)`
  background: ${theme.background.card};
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.border.subtle};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

export const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SettingLabel = styled.span`
  font-size: 15px;
  color: ${theme.text.primary};
`;

export const ToggleSwitch = styled.label`
  position: relative;
  width: 52px;
  height: 28px;
  cursor: pointer;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    inset: 0;
    background: ${theme.background.glass};
    border-radius: ${theme.radius.full};
    border: 1px solid ${theme.border.light};
    transition: all 0.3s;
    
    &::before {
      content: "";
      position: absolute;
      width: 22px;
      height: 22px;
      left: 2px;
      top: 2px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
  
  input:checked + span {
    background: ${theme.gradient.purple};
    border-color: transparent;
    
    &::before {
      transform: translateX(24px);
    }
  }
`;

export const FastModeIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${props => props.active 
    ? 'rgba(158, 85, 148, 0.2)' 
    : theme.background.glass};
  color: ${props => props.active ? theme.colors.secondary : theme.text.secondary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: 13px;
  font-weight: 500;
  margin-top: ${theme.spacing.md};
  cursor: pointer;
  border: 1px solid ${props => props.active 
    ? 'rgba(158, 85, 148, 0.3)' 
    : theme.border.subtle};
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.active 
      ? 'rgba(158, 85, 148, 0.3)' 
      : 'rgba(255, 255, 255, 0.1)'};
  }
  
  svg {
    font-size: 16px;
  }
`;

