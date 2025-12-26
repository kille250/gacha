/**
 * DojoPage Styled Components
 *
 * Consolidated styles for DojoPage sub-components.
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';

// ===========================================
// ANIMATIONS
// ===========================================

export const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

export const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(255, 200, 0, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 200, 0, 0.6); }
`;

// ===========================================
// PAGE LAYOUT
// ===========================================

export const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg,
    ${theme.colors.background} 0%,
    ${theme.colors.backgroundSecondary} 50%,
    ${theme.colors.background} 100%
  );
  padding-bottom: env(safe-area-inset-bottom, 20px);
`;

// NOTE: Prefer LoadingState from design-system for standard loading states.
// These are kept for Dojo-specific styling needs:

export const DojoLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: ${theme.spacing.lg};
`;

// Backward compatibility alias
/** @deprecated Use LoadingState from design-system */
export const LoadingContainer = DojoLoadingContainer;

export const MainContent = styled.main`
  max-width: 900px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
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
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  position: sticky;
  /* Use CSS variable for nav height - automatically adapts to orientation/viewport */
  top: var(--nav-top-height, 56px);
  z-index: 100;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.sm};
  }
`;

export const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  width: 100%;
  max-width: 900px;

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

export const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: ${theme.radius.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 20px;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex: 1;
  min-width: 0;
`;

export const HeaderIcon = styled.span`
  font-size: 28px;
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 24px;
  }
`;

export const HeaderTitle = styled.h1`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  white-space: nowrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

export const HeaderStats = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
`;

export const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.1));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #FFD700;

  svg {
    font-size: 14px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};

    svg {
      font-size: 12px;
    }
  }
`;

// ===========================================
// ERROR BANNER
// ===========================================

export const ErrorBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(255, 59, 48, 0.15);
  border-bottom: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
`;

export const ErrorBannerInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  gap: ${theme.spacing.md};
`;

export const CloseErrorBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.error};
  cursor: pointer;
  padding: ${theme.spacing.xs};
  display: flex;
  font-size: 18px;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
`;

// ===========================================
// CLAIM POPUP
// ===========================================

export const ClaimPopup = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

export const ClaimPopupContent = styled.div`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  text-align: center;
  box-shadow: ${theme.shadows.xl};
  animation: ${glow} 2s ease-in-out infinite;
  width: calc(100% - 32px);
  max-width: 320px;
  pointer-events: auto;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

export const ClaimPopupIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
  animation: ${float} 2s ease-in-out infinite;
`;

export const ClaimPopupTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg} 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

export const ClaimPopupRewards = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const RewardItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

export const ActiveBonusTag = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(48, 209, 88, 0.2), rgba(52, 199, 89, 0.1));
  border: 1px solid rgba(48, 209, 88, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #30d158;
  display: inline-block;
`;

export const CatchUpBonusTag = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 204, 0, 0.1));
  border: 1px solid rgba(255, 159, 10, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #ff9f0a;
  display: inline-block;
`;

// ===========================================
// ACCUMULATED CARD
// ===========================================

export const AccumulatedCard = styled.div`
  background: ${props => props.$isCapped
    ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.1), rgba(255, 69, 0, 0.05))'
    : theme.colors.surface};
  border: 1px solid ${props => props.$isCapped
    ? 'rgba(255, 159, 10, 0.4)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  ${props => props.$isCapped && css`animation: ${pulse} 2s ease-in-out infinite;`}

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

export const AccumulatedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const AccumulatedTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
    flex-shrink: 0;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

export const AccumulatedTime = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  background: ${theme.colors.glass};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
`;

export const ProgressBar = styled.div`
  height: 10px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  margin-bottom: ${theme.spacing.lg};
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$isCapped
    ? 'linear-gradient(90deg, #ff9f0a, #ff6b00)'
    : `linear-gradient(90deg, ${theme.colors.primary}, #00b4d8)`};
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
    border-radius: ${theme.radius.full} ${theme.radius.full} 0 0;
  }
`;

export const AccumulatedRewards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

export const AccumulatedReward = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${props => props.$premium ? 'rgba(191, 90, 242, 0.3)' : 'rgba(255, 215, 0, 0.2)'};

  span {
    font-size: ${theme.fontSizes.xl};
    font-weight: ${theme.fontWeights.bold};
    color: ${props => props.$premium ? '#bf5af2' : theme.colors.text};
  }

  svg {
    font-size: 20px;
    color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm};

    span {
      font-size: ${theme.fontSizes.lg};
    }

    svg {
      font-size: 16px;
    }
  }
`;

export const ClaimButton = styled(motion.button)`
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  min-height: 52px;
  background: ${props => props.$canClaim
    ? 'linear-gradient(135deg, #FFD700, #FFA500)'
    : theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canClaim ? '#1c1c1e' : theme.colors.textTertiary};
  cursor: ${props => props.$canClaim ? 'pointer' : 'default'};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

// ===========================================
// DAILY CAPS CARD
// ===========================================

export const DailyCapsCard = styled.div`
  background: ${props => props.$isCapped
    ? 'linear-gradient(135deg, rgba(255, 59, 48, 0.08), rgba(255, 149, 0, 0.05))'
    : theme.colors.surface};
  border: 1px solid ${props => props.$isCapped
    ? 'rgba(255, 149, 0, 0.3)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

export const DailyCapsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const DailyCapsTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

export const DailyCapsReset = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  background: ${theme.colors.glass};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
`;

export const DailyCapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const DailyCapItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${props => props.$isCapped
    ? 'rgba(255, 149, 0, 0.1)'
    : theme.colors.glass};
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => props.$isCapped
    ? 'rgba(255, 149, 0, 0.2)'
    : 'transparent'};
`;

export const DailyCapIcon = styled.div`
  width: 32px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
  font-size: 14px;
`;

export const DailyCapProgress = styled.div`
  flex: 1;
  min-width: 0;
`;

export const DailyCapLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: 4px;
`;

export const DailyCapBar = styled.div`
  height: 6px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  margin-bottom: 4px;
`;

export const DailyCapFill = styled.div`
  height: 100%;
  background: ${props => props.$isCapped
    ? 'linear-gradient(90deg, #ff9500, #ff3b30)'
    : props.$premium
      ? 'linear-gradient(90deg, #bf5af2, #af52de)'
      : 'linear-gradient(90deg, #30d158, #34c759)'};
  border-radius: ${theme.radius.full};
  transition: width 0.3s ease;
`;

export const DailyCapNumbers = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
`;

export const TicketProgressSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

export const TicketProgressLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

export const TicketProgressBars = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

export const TicketProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex: 1;
  min-width: 120px;

  svg {
    color: ${props => props.$premium ? '#bf5af2' : '#0a84ff'};
    font-size: 12px;
  }

  span {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.textSecondary};
    min-width: 36px;
    text-align: right;
  }
`;

export const TicketProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

export const TicketProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$premium
    ? 'linear-gradient(90deg, #bf5af2, #af52de)'
    : 'linear-gradient(90deg, #0a84ff, #5ac8fa)'};
  border-radius: ${theme.radius.full};
  transition: width 0.3s ease;
`;

// ===========================================
// HOURLY RATE CARD
// ===========================================

export const HourlyRateCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

export const HourlyRateHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};

  svg {
    color: #30d158;
    font-size: 20px;
  }
`;

export const HourlyRateStats = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.md};
  }
`;

export const HourlyStat = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.base};
  color: ${props => props.$premium ? '#bf5af2' : theme.colors.textSecondary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.md};

  svg {
    color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
    font-size: 14px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

export const LevelBonusSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

export const LevelBonusLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
  text-align: center;
`;

export const LevelBonusBadges = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  justify-content: center;
`;

export const LevelBonusBadge = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: linear-gradient(135deg, rgba(88, 86, 214, 0.15), rgba(175, 82, 222, 0.15));
  border: 1px solid rgba(88, 86, 214, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: #BF5AF2;
  white-space: nowrap;
`;

export const SynergyBadges = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
  justify-content: center;
`;

export const SynergyBadge = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(48, 209, 88, 0.15);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: #30d158;
  white-space: nowrap;
`;

export const CatchUpBonusBadge = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 204, 0, 0.15));
  border: 1px solid rgba(255, 159, 10, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #ff9f0a;
  text-align: center;
  font-weight: ${theme.fontWeights.semibold};
`;

export const EfficiencyIndicator = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(142, 142, 147, 0.1);
  border: 1px solid rgba(142, 142, 147, 0.2);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

// ===========================================
// TRAINING SLOTS
// ===========================================

export const SlotsSection = styled.section`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

export const SlotsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const SlotsTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;

  svg {
    color: ${theme.colors.primary};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

export const SlotsCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.glass};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
`;

export const SlotsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing.sm};
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const FilledSlot = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  box-shadow: 0 0 20px ${props => props.$glow || 'transparent'};
  cursor: default;

  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.lg};
  }
`;

export const SlotImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const SlotVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const SlotOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.sm};
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs};
  }
`;

export const SlotCharName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

export const SlotCharSeries = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 10px;
  }
`;

export const SlotBadgeRow = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  flex-wrap: wrap;
`;

export const SlotRarityBadge = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  text-transform: uppercase;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 1px 4px;
    font-size: 9px;
  }
`;

export const SlotLevelBadge = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.$isMaxLevel
    ? 'linear-gradient(135deg, #ffd700, #ff8c00)'
    : 'rgba(88, 86, 214, 0.9)'};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;

  ${props => props.$isMaxLevel && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 1px 4px;
    font-size: 9px;
  }
`;

export const RemoveButton = styled.button`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: all ${theme.transitions.fast};
  font-size: 14px;

  @media (hover: none) {
    opacity: 1;
  }

  @media (hover: hover) {
    opacity: 0;

    ${FilledSlot}:hover & {
      opacity: 1;
    }
  }

  &:hover, &:active {
    background: ${theme.colors.error};
    border-color: ${theme.colors.error};
    transform: scale(1.1);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    font-size: 12px;
  }
`;

export const SpecializeButton = styled.button`
  position: absolute;
  top: ${theme.spacing.xs};
  left: ${theme.spacing.xs};
  padding: 4px 8px;
  border-radius: ${theme.radius.sm};
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.9), rgba(103, 58, 183, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.9;
  transition: all ${theme.transitions.fast};
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};

  @media (hover: none) {
    opacity: 1;
  }

  @media (hover: hover) {
    opacity: 0;

    ${FilledSlot}:hover & {
      opacity: 1;
    }
  }

  &:hover, &:active {
    background: linear-gradient(135deg, rgba(186, 104, 200, 1), rgba(126, 87, 194, 1));
    transform: scale(1.05);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 3px 6px;
    font-size: 9px;
  }
`;

export const SlotSpecBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.xs};
  left: ${theme.spacing.xs};
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$color || '#9b59b6'};
  border: 2px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 24px;
    height: 24px;
  }
`;

export const EmptySlot = styled(motion.div)`
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  border: 2px dashed ${theme.colors.surfaceBorder};
  background: ${theme.colors.glass};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  cursor: pointer;
  color: ${theme.colors.textSecondary};
  transition: all ${theme.transitions.fast};
  min-height: 120px;

  svg {
    font-size: 28px;
  }

  span {
    font-size: ${theme.fontSizes.xs};
    text-align: center;
  }

  &:hover, &:active {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
    background: rgba(0, 113, 227, 0.08);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.lg};

    svg {
      font-size: 24px;
    }
  }
`;

export const LockedSlot = styled.div`
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  border: 1px dashed ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.textTertiary};
  opacity: 0.5;
  min-height: 120px;

  svg {
    font-size: 20px;
  }

  span {
    font-size: ${theme.fontSizes.xs};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.lg};

    svg {
      font-size: 16px;
    }
  }
`;

// ===========================================
// UPGRADES SECTION
// ===========================================

export const UpgradesSection = styled.section`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

export const UpgradesTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg} 0;

  &::before {
    content: '';
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

export const UpgradesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const UpgradeCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${props => props.$canAfford
    ? 'rgba(255, 215, 0, 0.2)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  transition: all ${theme.transitions.fast};
  min-height: 60px;
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: inherit;
  color: inherit;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:hover:not(:disabled), &:active:not(:disabled) {
    ${props => props.$canAfford && `
      background: ${theme.colors.surfaceHover};
      border-color: rgba(255, 215, 0, 0.4);
      transform: translateY(-1px);
    `}
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    flex-wrap: wrap;
  }
`;

export const UpgradeIcon = styled.div`
  font-size: 24px;
  width: 48px;
  height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.colors.surfaceBorder};

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 40px;
    height: 40px;
    min-width: 40px;
    font-size: 20px;
  }
`;

export const UpgradeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

export const UpgradeDesc = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

export const UpgradeCost = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$canAfford
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.15))'
    : theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$canAfford
    ? 'rgba(255, 215, 0, 0.3)'
    : 'transparent'};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canAfford ? '#FFD700' : theme.colors.textTertiary};
  white-space: nowrap;
  flex-shrink: 0;

  svg {
    font-size: 12px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
  }
`;

export const NoUpgrades = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
  border: 1px dashed ${theme.colors.surfaceBorder};
`;

// ===========================================
// CHARACTER PICKER MODAL
// ===========================================

export const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;

  @media (min-width: ${theme.breakpoints.sm}) {
    align-items: center;
    padding: ${theme.spacing.md};
  }
`;

export const ModalContent = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  height: 85vh;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (min-width: ${theme.breakpoints.sm}) {
    height: auto;
    max-height: 80vh;
    border-radius: ${theme.radius.xl};
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    background: ${theme.colors.surfaceBorder};
    border-radius: 2px;

    @media (min-width: ${theme.breakpoints.sm}) {
      display: none;
    }
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    padding-top: ${theme.spacing.lg};
  }
`;

export const ModalTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

export const ModalCloseBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: ${theme.radius.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all ${theme.transitions.fast};

  &:hover, &:active {
    background: ${theme.colors.surfaceHover};
    border-color: ${theme.colors.primary};
  }
`;

export const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.glass};
  flex-shrink: 0;

  svg {
    color: ${theme.colors.textSecondary};
    font-size: 20px;
    flex-shrink: 0;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  min-width: 0;
  height: 44px;

  &::placeholder {
    color: ${theme.colors.textTertiary};
  }
`;

export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${theme.spacing.md} ${theme.spacing.md};
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceBorder};
    border-radius: 3px;
  }
`;

export const ModalLoading = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
  min-height: 200px;
`;

export const NoCharacters = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const CharacterList = styled.div`
  padding-top: ${theme.spacing.sm};
`;

export const SeriesTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundSecondary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  position: sticky;
  top: 0;
  z-index: 10;
  margin-left: -${theme.spacing.md};
  margin-right: -${theme.spacing.md};
`;

export const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.sm};
  position: relative;
  z-index: 1;
  margin-bottom: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

export const CharacterCard = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover, &:active {
    box-shadow: 0 0 20px ${props => props.$color || theme.colors.primary};
    transform: scale(1.02);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.md};
  }
`;

export const CharImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CharVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CharOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.xs};
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
`;

export const CharName = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 10px;
  }
`;

export const CharRarity = styled.div`
  display: inline-block;
  padding: 1px 4px;
  background: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  text-transform: uppercase;
`;

export const CharBadges = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
`;

export const CharLevel = styled.div`
  display: inline-block;
  padding: 1px 4px;
  background: ${props => props.$isMaxLevel
    ? 'linear-gradient(135deg, #ffd700, #ff8c00)'
    : 'rgba(88, 86, 214, 0.9)'};
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
`;

export const CharPowerBonus = styled.div`
  font-size: 8px;
  color: #4ade80;
  font-weight: ${theme.fontWeights.bold};
  margin-top: 2px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
`;

export const CharSpecBadge = styled.div`
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$color || '#9b59b6'};
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;
