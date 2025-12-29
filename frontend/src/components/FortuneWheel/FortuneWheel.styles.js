/**
 * FortuneWheel Styled Components
 *
 * Styles for the fortune wheel mini-game with spinning animation.
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';

// ===========================================
// ANIMATIONS
// ===========================================

export const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
`;

export const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(255, 200, 0, 0.3); }
  50% { box-shadow: 0 0 50px rgba(255, 200, 0, 0.8); }
`;

export const sparkle = keyframes`
  0% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
  100% { opacity: 0; transform: scale(0) rotate(360deg); }
`;

export const slideInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ===========================================
// PAGE LAYOUT
// ===========================================

export const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg,
    ${theme.colors.background} 0%,
    #1a1a2e 50%,
    ${theme.colors.background} 100%
  );
  padding-bottom: env(safe-area-inset-bottom, 20px);
`;

export const MainContent = styled.main`
  max-width: 600px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xl};
  width: 100%;
  box-sizing: border-box;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.lg};
  }
`;

// ===========================================
// HEADER STYLES
// ===========================================

export const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  text-align: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

export const Title = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes['2xl']};
  }
`;

export const Subtitle = styled.p`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// ===========================================
// WHEEL CONTAINER
// ===========================================

export const WheelContainer = styled.div`
  position: relative;
  width: 320px;
  height: 320px;
  margin: ${theme.spacing.lg} 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 280px;
    height: 280px;
  }
`;

export const WheelOuter = styled.div`
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
  box-shadow:
    0 0 30px rgba(255, 200, 0, 0.4),
    inset 0 0 20px rgba(255, 255, 255, 0.2);

  ${props => props.$spinning && css`
    animation: ${glow} 0.5s ease-in-out infinite;
  `}
`;

export const WheelInner = styled.div`
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: ${theme.colors.surface};
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
`;

export const WheelSvg = styled.svg`
  width: 100%;
  height: 100%;
  transition: transform cubic-bezier(0.17, 0.67, 0.12, 0.99);
  transition-duration: ${props => props.$duration || 4000}ms;
  transform: rotate(${props => props.$rotation || 0}deg);
`;

export const WheelCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  box-shadow:
    0 0 20px rgba(255, 200, 0, 0.5),
    0 4px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 50px;
    height: 50px;
  }
`;

export const WheelCenterIcon = styled.span`
  font-size: 24px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 20px;
  }
`;

// ===========================================
// POINTER
// ===========================================

export const Pointer = styled.div`
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
`;

export const PointerTriangle = styled.div`
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-top: 30px solid #FFD700;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));

  ${props => props.$spinning && css`
    animation: ${pulse} 0.3s ease-in-out infinite;
  `}
`;

// ===========================================
// SPIN BUTTON
// ===========================================

export const SpinButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
`;

export const SpinButton = styled(motion.button)`
  padding: ${theme.spacing.lg} ${theme.spacing.xxl};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.background};
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: none;
  border-radius: ${theme.radius.xl};
  cursor: pointer;
  box-shadow:
    0 4px 15px rgba(255, 200, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(255, 200, 0, 0.5),
      0 4px 8px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.textMuted};
    box-shadow: none;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md} ${theme.spacing.xl};
    font-size: ${theme.fontSizes.lg};
  }
`;

export const SpinCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export const NextSpinTimer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.colors.surfaceBorder};
`;

export const TimerLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export const TimerValue = styled.span`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  font-variant-numeric: tabular-nums;
`;

// ===========================================
// STATS SECTION
// ===========================================

export const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  width: 100%;

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing.sm};
  }
`;

export const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.colors.surfaceBorder};
`;

export const StatIcon = styled.span`
  font-size: 24px;
`;

export const StatValue = styled.span`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

export const StatLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

// ===========================================
// STREAK SECTION
// ===========================================

export const StreakContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(255, 200, 0, 0.1) 0%, rgba(255, 150, 0, 0.1) 100%);
  border-radius: ${theme.radius.lg};
  border: 1px solid rgba(255, 200, 0, 0.3);
`;

export const StreakIcon = styled.span`
  font-size: 28px;
`;

export const StreakInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StreakValue = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: #FFD700;
`;

export const StreakLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

// ===========================================
// HISTORY SECTION
// ===========================================

export const HistoryContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const HistoryTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

export const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.surfaceBorder};

  ${props => props.$isJackpot && css`
    background: linear-gradient(135deg, rgba(255, 200, 0, 0.1) 0%, rgba(255, 150, 0, 0.1) 100%);
    border-color: rgba(255, 200, 0, 0.3);
  `}
`;

export const HistoryItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const HistoryItemIcon = styled.span`
  font-size: 20px;
`;

export const HistoryItemLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
`;

export const HistoryItemReward = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$isJackpot ? '#FFD700' : theme.colors.success};
`;

// ===========================================
// PRIZE POPUP
// ===========================================

export const PrizePopupOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.lg};
`;

export const PrizePopupContent = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xxl};
  max-width: 400px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(255, 200, 0, 0.3);

  ${props => props.$isJackpot && css`
    animation: ${glow} 1s ease-in-out infinite;
  `}
`;

export const PrizeIcon = styled(motion.span)`
  font-size: 80px;
  display: block;
`;

export const PrizeTitle = styled.h2`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isJackpot ? '#FFD700' : theme.colors.text};
  margin: 0;
`;

export const PrizeDescription = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const PrizeValue = styled.div`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.success};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const PrizeCloseButton = styled(motion.button)`
  padding: ${theme.spacing.md} ${theme.spacing.xxl};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  background: ${theme.colors.surfaceHover};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceActive};
  }
`;

// ===========================================
// MULTIPLIER INDICATOR
// ===========================================

export const MultiplierBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.2) 0%, rgba(156, 39, 176, 0.2) 100%);
  border-radius: ${theme.radius.lg};
  border: 1px solid rgba(233, 30, 99, 0.5);
  animation: ${pulse} 2s ease-in-out infinite;
`;

export const MultiplierIcon = styled.span`
  font-size: 20px;
`;

export const MultiplierText = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #E91E63;
`;

// ===========================================
// LOADING STATE
// ===========================================

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: ${theme.spacing.lg};
`;
