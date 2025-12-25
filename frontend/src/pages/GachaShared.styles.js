/**
 * Shared Gacha Page Styled Components
 *
 * Common styles used by BannerPage and RollPage.
 * Extracted for code reuse and consistency.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  theme,
  PageWrapper,
  Section,
  Chip,
  scrollbarStyles,
} from '../design-system';

// ==================== PAGE LAYOUT ====================

export const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

export const HeroBackground = styled.div`
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center top;
  opacity: 0.15;
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, ${theme.colors.background} 100%);
  }
`;

// ==================== LOADING & ERROR PAGES ====================

export const LoadingPage = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
  gap: ${theme.spacing.lg};
`;

export const LoadingText = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;

export const ErrorPage = styled(LoadingPage)``;

export const ErrorBox = styled.div`
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-radius: ${theme.radius.lg};
  font-weight: ${theme.fontWeights.medium};
  margin-bottom: ${theme.spacing.lg};
`;

// ==================== NAVIGATION ====================

export const NavBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg} 0;
  position: relative;
  z-index: 10;
`;

export const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.md});
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surfaceHover};
    transform: translateX(-2px);
  }
`;

export const NavStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const StatPill = styled(Chip)`
  font-size: ${theme.fontSizes.sm};
`;

export const PointsPill = styled(StatPill)`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-color: transparent;
  color: white;
  font-weight: ${theme.fontWeights.semibold};
`;

// ==================== ERROR ALERT ====================

export const CloseAlertBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 18px;
`;

// ==================== RARITY TRACKER ====================

export const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.md});
  border: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.radius.full};
  margin-bottom: ${theme.spacing.lg};
  width: fit-content;
  position: relative;
  z-index: 1;
`;

export const RarityLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
`;

export const RarityHistory = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

export const RarityDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: ${props => props.$glow};
`;

// ==================== GACHA CONTAINER ====================

export const GachaContainer = styled(Section)`
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

export const ResultsArea = styled.div`
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
`;

// ==================== CHARACTER CARD ====================

export const CharacterCard = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  width: 100%;
  max-width: 340px;
  border: 2px solid ${props => props.$color};
  box-shadow: ${props => props.$glow}, ${theme.shadows.lg};
`;

export const CardImageWrapper = styled.div`
  position: relative;
  height: 320px;
  cursor: pointer;
  overflow: hidden;
`;

export const RarityGlowEffect = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 100%, ${props => props.$color}40 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
`;

export const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.transitions.slow};

  ${CardImageWrapper}:hover & {
    transform: scale(1.05);
  }
`;

export const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CardOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  z-index: 2;

  span {
    background: ${theme.colors.glass};
    backdrop-filter: blur(${theme.blur.sm});
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.radius.full};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
  }

  ${CardImageWrapper}:hover & {
    opacity: 1;
  }
`;

export const CollectedBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  background: ${theme.colors.success};
  color: white;
  padding: 6px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  z-index: 3;
`;

export const CardContent = styled.div`
  padding: ${theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${theme.spacing.md};
`;

export const CardMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

export const CharName = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 4px;
  color: ${theme.colors.text};
`;

export const CharSeries = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const CardActions = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
`;

export const RollAgainBtn = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ==================== MULTI RESULTS ====================

export const MultiResultsContainer = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  width: 100%;
  max-width: 1000px;
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.lg};
`;

export const MultiResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});

  h2 {
    margin: 0;
    font-size: ${theme.fontSizes.lg};
    font-weight: ${theme.fontWeights.semibold};
  }
`;

export const MultiResultsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  max-height: 60vh;
  overflow-y: auto;
  ${scrollbarStyles}
`;

export const MiniCard = styled(motion.div)`
  background: ${props => props.$isBanner
    ? `linear-gradient(to bottom, rgba(255, 159, 10, 0.1), ${theme.colors.backgroundTertiary})`
    : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.$isBanner ? theme.colors.warning : props.$color};
  cursor: pointer;
`;

export const MiniCardImage = styled.div`
  position: relative;
  height: 140px;
  overflow: hidden;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const MiniCollected = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: ${theme.colors.success};
  color: white;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: ${theme.fontWeights.bold};
`;

export const MiniCardInfo = styled.div`
  padding: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.xs};
`;

export const MiniName = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

export const MiniRarityDot = styled.div`
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 9px;
  flex-shrink: 0;
`;

// ==================== LOADING & EMPTY STATES ====================

export const LoadingState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

export const LoadingStateText = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;

export const EmptyState = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing['2xl']};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  max-width: 320px;
`;

export const EmptyIcon = styled.div`
  font-size: 56px;
  margin-bottom: ${theme.spacing.md};
  animation: float 3s ease-in-out infinite;

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
`;

export const EmptyTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
`;

export const EmptyText = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// ==================== CONTROLS SECTION ====================

export const ControlsSection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 16px;
    border-radius: 20px;
  }
`;

export const PullActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// ==================== PRIMARY PULL CARD ====================

export const PrimaryPullCard = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px 24px;
  background: linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentSecondary} 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow:
    0 8px 32px rgba(88, 86, 214, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 16px 20px;
    gap: 12px;
  }
`;

export const PullCardIcon = styled.span`
  font-size: 32px;
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 28px;
  }
`;

export const PullCardContent = styled.div`
  flex: 1;
  text-align: left;
`;

export const PullCardTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: 2px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 16px;
  }
`;

export const PullCardCost = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

export const CostAmount = styled.span`
  font-size: 24px;
  font-weight: 800;
  color: white;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 20px;
  }
`;

export const CostUnit = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

export const PullCardArrow = styled.span`
  font-size: 24px;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
`;

// ==================== MULTI PULL GRID ====================

export const MultiPullGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
`;

export const MultiPullCard = styled(motion.button)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  min-height: 90px;
  background: ${props => props.$canAfford
    ? props.$isRecommended
      ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 120, 0, 0.15))'
      : 'rgba(255, 255, 255, 0.06)'
    : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$canAfford
    ? props.$isRecommended
      ? 'rgba(255, 159, 10, 0.5)'
      : 'rgba(255, 255, 255, 0.12)'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 14px;
  cursor: ${props => props.$canAfford ? 'pointer' : 'not-allowed'};
  transition: all 0.2s ease;
  overflow: hidden;

  &:disabled {
    opacity: ${props => props.$canAfford ? 1 : 0.4};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 12px 8px;
    min-height: 80px;
  }
`;

export const RecommendedTag = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #ff9f0a, #ff6b00);
  color: white;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 0;
  text-align: center;
`;

export const MultiPullCount = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: white;
  margin-top: 4px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 18px;
  }
`;

export const MultiPullCost = styled.div`
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-top: 4px;

  span {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);

    @media (max-width: ${theme.breakpoints.sm}) {
      font-size: 13px;
    }
  }

  small {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }
`;

export const MultiPullDiscount = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.success};
  background: rgba(48, 209, 88, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 6px;
`;

// ==================== FOOTER ====================

export const ControlsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

export const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PointsIcon = styled.span`
  font-size: 20px;
`;

export const PointsValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: white;
`;

export const PointsLabel = styled.span`
  font-size: 13px;
  color: ${theme.colors.textTertiary};

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

export const FastModeToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.$active ? 'rgba(88, 86, 214, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${props => props.$active ? 'rgba(88, 86, 214, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 100px;
  color: ${props => props.$active ? theme.colors.accent : 'rgba(255, 255, 255, 0.6)'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(88, 86, 214, 0.2);
    border-color: rgba(88, 86, 214, 0.4);
  }

  svg {
    font-size: 16px;
  }
`;
