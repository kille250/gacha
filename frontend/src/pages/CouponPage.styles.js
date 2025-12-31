/**
 * CouponPage Styled Components
 *
 * Extracted from CouponPage.js for better maintainability.
 * Uses design-system tokens for consistency.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, PageWrapper, Section, Alert } from '../design-system';

// ==================== PAGE LAYOUT ====================

export const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.xl} 0;
  /* Use CSS variable for consistent bottom padding */
  padding-bottom: var(--page-bottom-padding, ${theme.spacing['3xl']});
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    text-align: center;
  }
`;

export const HeaderContent = styled.div``;

export const PageTitle = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  letter-spacing: -0.02em;

  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['2xl']};
  }
`;

export const TitleAccent = styled.span`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-left: ${theme.spacing.sm};
`;

export const PageSubtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.xs} 0 0;
`;

export const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
`;

// ==================== ALERTS ====================

export const StyledAlert = styled(Alert)`
  margin-bottom: ${theme.spacing.md};
`;

export const CloseBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  margin-left: auto;
  padding: 0;
  line-height: 1;
`;

// ==================== CONTENT GRID ====================

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

export const CouponSection = styled(Section)``;

export const RewardSection = styled(Section)``;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const SectionIcon = styled.span`
  font-size: ${theme.fontSizes.xl};
  color: ${theme.colors.accent};
`;

// ==================== COUPON FORM ====================

export const CouponCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  border: 1px solid ${theme.colors.surfaceBorder};
`;

export const CouponForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

export const CouponInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.lg};
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  color: ${theme.colors.text};
  text-align: center;
  transition: all ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(88, 86, 214, 0.2);
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
    letter-spacing: 1px;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

export const RedeemButton = styled(motion.button)`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(88, 86, 214, 0.4);
  transition: all ${theme.transitions.fast};

  &:disabled {
    background: ${theme.colors.backgroundTertiary};
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// ==================== INSTRUCTIONS ====================

export const Instructions = styled.div`
  background: ${theme.colors.background};
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.lg};
  border-left: 3px solid ${theme.colors.accent};
`;

export const InstructionTitle = styled.h4`
  margin: 0 0 ${theme.spacing.md};
  color: ${theme.colors.accent};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
`;

export const InstructionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const InstructionItem = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export const Bullet = styled.span`
  color: ${theme.colors.accent};
`;

// ==================== REWARD DISPLAY ====================

export const RewardDisplay = styled.div`
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const RewardCard = styled(motion.div)`
  width: 100%;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.lg};
`;

export const RewardHeader = styled.div`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: white;
`;

export const RewardContent = styled.div`
  padding: ${theme.spacing.xl};
`;

export const CoinReward = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

export const CoinIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 159, 10, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: ${theme.colors.warning};
`;

// ==================== TICKET REWARD ====================

export const TicketReward = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

export const TicketIcon = styled.div`
  width: 64px;
  height: 64px;
  background: ${props => props.$premium
    ? 'linear-gradient(135deg, rgba(175, 82, 222, 0.2), rgba(191, 90, 242, 0.2))'
    : 'linear-gradient(135deg, rgba(52, 199, 89, 0.2), rgba(48, 176, 80, 0.2))'
  };
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: ${props => props.$premium ? theme.colors.accentSecondary : theme.colors.success};
`;

export const TicketBadge = styled.span`
  display: inline-block;
  background: ${props => props.$premium
    ? `linear-gradient(135deg, ${theme.colors.accentSecondary}, ${theme.colors.rarity.epic})`
    : `linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.successHover})`
  };
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  margin-top: ${theme.spacing.xs};
`;

export const RewardDetails = styled.div``;

export const RewardAmount = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.xs};
`;

export const RewardDesc = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

export const CharacterReward = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    text-align: center;
  }
`;

export const CharacterImage = styled.img`
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: ${theme.radius.lg};
  border: 2px solid ${theme.colors.surfaceBorder};
`;

export const CharacterDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const CharacterName = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
`;

export const CharacterSeries = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

export const RarityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  background: ${props => props.$color};
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  width: fit-content;
`;

// ==================== EMPTY STATE ====================

export const EmptyState = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

export const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
`;

export const EmptyTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
`;

export const EmptyText = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;
