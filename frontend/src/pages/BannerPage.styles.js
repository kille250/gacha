/**
 * BannerPage Styled Components
 *
 * Banner-specific styles. Common gacha styles are imported from GachaShared.styles.js
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, scrollbarStyles } from '../design-system';

// Re-export all shared styles
export * from './GachaShared.styles';

// ==================== HERO SECTION ====================

export const HeroSection = styled.section`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

export const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

export const BannerTitle = styled.h1`
  font-size: ${theme.fontSizes.hero};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.03em;
  margin: 0 0 ${theme.spacing.sm};

  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['3xl']};
  }
`;

export const BannerSeries = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.warning};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 ${theme.spacing.md};
`;

export const BannerDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  line-height: ${theme.lineHeights.relaxed};
  margin: 0 0 ${theme.spacing.lg};
`;

export const BadgeRow = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

export const CostBadge = styled.div`
  background: rgba(255, 159, 10, 0.15);
  border: 1px solid rgba(255, 159, 10, 0.3);
  color: ${theme.colors.warning};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
`;

export const DateBadge = styled.div`
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
`;

// ==================== FEATURED CHARACTERS ====================

export const FeaturedSection = styled.div`
  margin-top: ${theme.spacing.xl};
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

export const FeaturedLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${theme.spacing.md};
`;

export const CharacterAvatars = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const Avatar = styled(motion.div)`
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.full};
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => props.$color};
  position: relative;
  box-shadow: ${props => props.$glow};

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  ${props => props.$owned && `
    &::after {
      content: "";
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
    }
  `}
`;

export const OwnedMark = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${theme.fontWeights.bold};
  font-size: 12px;
  z-index: 2;
`;

export const MoreAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

// ==================== VIDEO SECTION ====================

export const VideoSection = styled.div`
  max-width: 800px;
  margin: 0 auto ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

export const VideoContainer = styled.div`
  position: relative;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
`;

export const BannerVideo = styled.video`
  width: 100%;
  display: block;
`;

export const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  svg {
    font-size: 48px;
    color: white;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
  }

  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`;

export const VideoCaption = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  text-align: center;
  margin-top: ${theme.spacing.sm};
`;

// ==================== BANNER CHARACTER BADGE ====================

export const BannerCharBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  padding: 6px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  z-index: 3;
`;

export const MiniBannerMark = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

// ==================== TICKET SECTION ====================

export const TicketWarning = styled.div`
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  color: ${theme.colors.warning || '#ffa500'};
  background: rgba(255, 165, 0, 0.1);
  border-radius: 6px;
  text-align: center;
`;

export const TicketSection = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

export const TicketSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
`;

export const TicketSectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
`;

export const TicketCounts = styled.div`
  display: flex;
  gap: 12px;
`;

export const TicketCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${props => props.$premium ? '#ffc107' : '#e1bee7'};

  strong {
    font-size: 16px;
    font-weight: 800;
  }
`;

export const TicketButtonsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
`;

export const TicketPullButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.25), rgba(103, 58, 183, 0.2));
  border: 1px solid rgba(156, 39, 176, 0.4);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.35), rgba(103, 58, 183, 0.3));
    border-color: rgba(186, 104, 200, 0.6);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 10px 12px;
  }
`;

export const PremiumPullButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.25), rgba(255, 152, 0, 0.2));
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.15);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.35), rgba(255, 152, 0, 0.3));
    border-color: rgba(255, 215, 0, 0.7);
    box-shadow: 0 0 30px rgba(255, 193, 7, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 10px 12px;
  }
`;

export const TicketButtonIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`;

export const TicketButtonText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  span {
    font-size: 14px;
    font-weight: 600;
    color: white;
  }

  small {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    span {
      font-size: 12px;
    }
    small {
      font-size: 10px;
    }
  }
`;

// ==================== INFO PANEL ====================

export const InfoPanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 90%;
  max-width: 420px;
  background: ${theme.colors.backgroundSecondary};
  border-left: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadows.xl};
`;

export const InfoPanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const InfoPanelContent = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  ${scrollbarStyles}
`;

export const InfoBlock = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

export const InfoBlockTitle = styled.h3`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.accent};
  margin: 0 0 ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const InfoNote = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  margin-top: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
`;

export const InfoNoteAccent = styled(InfoNote)`
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.2);
  color: ${theme.colors.warning};
`;

// ==================== DROP RATES ====================

export const DropRatesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const DropRateSection = styled.div`
  background: ${props => props.$premium
    ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.05))'
    : theme.colors.glass};
  border: 1px solid ${props => props.$premium
    ? 'rgba(255, 193, 7, 0.3)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

export const DropRateSectionTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

export const DropRateGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

export const DropRateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => props.$color}40;
`;

export const RarityIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: ${props => props.$color};
  font-size: 10px;
`;

export const DropRateLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  text-transform: capitalize;
  color: ${theme.colors.textSecondary};
`;

export const DropRateValue = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
  margin-left: auto;
`;

export const PremiumNote = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.warning};
  margin-top: ${theme.spacing.sm};
  text-align: center;
  font-weight: ${theme.fontWeights.medium};
`;

// ==================== FEATURED LIST ====================

export const FeaturedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const FeaturedItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  transition: background ${theme.transitions.fast};
`;

export const FeaturedThumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.radius.md};
  overflow: hidden;
  border: 2px solid ${props => props.$color};
  flex-shrink: 0;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const FeaturedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const FeaturedName = styled.div`
  font-weight: ${theme.fontWeights.medium};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const FeaturedRarity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  background: rgba(0, 0, 0, 0.3);
  color: ${props => props.$color};
  text-transform: capitalize;
`;

export const OwnedLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.success};
  margin-top: 4px;
`;

export const RollFromPanelBtn = styled(motion.button)`
  width: 100%;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  margin-top: ${theme.spacing.lg};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
