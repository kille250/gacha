/**
 * CollectionPage Styled Components
 *
 * Extracted from CollectionPage.js for better maintainability.
 * Uses design-system tokens for consistency.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, PageWrapper, Section } from '../design-system';

// ==================== PAGE WRAPPER ====================

export const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.xl} 0 ${theme.spacing['3xl']};
`;

// ==================== HEADER ====================

export const HeaderSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

export const HeaderContent = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

export const PageTitle = styled.h1`
  font-size: ${theme.fontSizes['4xl']};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.02em;
  margin: 0 0 ${theme.spacing.xs};
`;

export const PageSubtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// ==================== STATS CARD ====================

export const StatsCard = styled(Section)`
  padding: ${theme.spacing.lg};
`;

export const StatsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

export const StatItem = styled.div`
  text-align: center;
`;

export const StatValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

export const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

export const StatDivider = styled.div`
  width: 1px;
  height: 40px;
  background: ${theme.colors.surfaceBorder};
`;

export const ProgressBar = styled.div`
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.success}, #4ade80);
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
`;

// ==================== CONTROLS BAR ====================

export const ControlsBar = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
  }
`;

export const SearchWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: 0 ${theme.spacing.md};
  min-width: 250px;

  &:focus-within {
    border-color: ${theme.colors.primary};
  }
`;

export const SearchIcon = styled.span`
  color: ${theme.colors.textTertiary};
  margin-right: ${theme.spacing.sm};
  display: flex;
  align-items: center;
`;

export const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  min-height: 44px;

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:focus {
    outline: none;
  }
`;

export const ClearSearch = styled.button`
  color: ${theme.colors.textTertiary};
  padding: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;

  &:hover {
    color: ${theme.colors.text};
  }
`;

export const ControlsRight = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

export const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.$active ? 'rgba(88, 86, 214, 0.15)' : theme.colors.surface};
  border: 1px solid ${props => props.$active ? theme.colors.accent : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$active ? theme.colors.accent : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  position: relative;
  transition: all ${theme.transitions.fast};
  min-height: 44px;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

export const FilterBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: ${theme.colors.primary};
  border-radius: 50%;
`;

export const ItemsSelect = styled.select`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  min-height: 44px;

  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

// ==================== FILTERS PANEL ====================

export const FiltersPanel = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

export const FilterGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};

  &:last-of-type {
    margin-bottom: 0;
  }
`;

export const FilterLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

export const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const FilterChip = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active
    ? props.$color ? `${props.$color}20` : 'rgba(88, 86, 214, 0.15)'
    : theme.colors.glass};
  border: 1px solid ${props => props.$active
    ? props.$color || theme.colors.accent
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.$active
    ? props.$color || theme.colors.accent
    : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  text-transform: capitalize;
  transition: all ${theme.transitions.fast};
  min-height: 36px;

  &:hover {
    background: ${props => props.$color ? `${props.$color}30` : 'rgba(88, 86, 214, 0.2)'};
    border-color: ${props => props.$color || theme.colors.accent};
  }

  @media (hover: none) {
    min-height: 44px;
  }
`;

export const SeriesSelect = styled.select`
  width: 100%;
  max-width: 300px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;

  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

export const ClearFiltersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  min-height: 36px;

  &:hover {
    background: rgba(255, 59, 48, 0.2);
  }

  @media (hover: none) {
    min-height: 44px;
  }
`;

// ==================== RESULTS ====================

export const ResultsInfo = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin-bottom: ${theme.spacing.md};
`;

export const LevelingLegend = styled.div`
  background: rgba(88, 86, 214, 0.08);
  border: 1px solid rgba(88, 86, 214, 0.15);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

export const LegendHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const LegendTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

export const UpgradeAllButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #34C759, #30B350);
  border: none;
  border-radius: ${theme.radius.full};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.3);

  svg {
    font-size: 11px;
  }

  &:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(52, 199, 89, 0.4);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 6px 12px;
    font-size: 11px;
  }
`;

export const LegendItems = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md} ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm} ${theme.spacing.lg};
  }
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

export const LegendIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: bold;

  ${props => props.$type === 'shard' && `
    background: rgba(175, 82, 222, 0.2);
    color: #AF52DE;
  `}

  ${props => props.$type === 'levelup' && `
    background: rgba(52, 199, 89, 0.2);
    color: #34C759;
  `}

  ${props => props.$type === 'max' && `
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 140, 0, 0.3));
    color: #FFD700;
  `}
`;

// ==================== ERROR & LOADING ====================

export const ErrorMessage = styled.div`
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  gap: ${theme.spacing.lg};
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

export const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
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

// ==================== CHARACTER GRID ====================

export const CharacterGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
`;

// ==================== DEPRECATED: CHARACTER CARD COMPONENTS ====================
// These components are deprecated. Use CharacterCard from components/patterns/CharacterCard.js
// Kept for backwards compatibility - will be removed in a future release.

/** @deprecated Use CharacterCard from components/patterns/CharacterCard.js */
export const CharacterCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  cursor: pointer;
  border: 1px solid ${props => props.$isOwned
    ? theme.colors.surfaceBorder
    : 'rgba(255, 255, 255, 0.03)'};
  transition: all ${theme.transitions.fast};

  &:hover {
    border-color: ${props => props.$color};
    box-shadow: ${props => props.$glow};
  }
`;

export const CardImageWrapper = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
`;

export const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: all ${theme.transitions.slow};

  ${CharacterCard}:hover & {
    transform: scale(1.05);
    filter: ${props => props.$isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

export const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: filter ${theme.transitions.slow};

  ${CharacterCard}:hover & {
    filter: ${props => props.$isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

export const NotOwnedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const NotOwnedLabel = styled.div`
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: white;
`;

export const RarityIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => props.$color};
`;

export const LevelBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: ${props => {
    if (props.$isMaxLevel) return 'linear-gradient(135deg, #ffd700, #ff8c00)';
    if (props.$canLevelUp) return 'linear-gradient(135deg, #34C759, #30B350)';
    return 'rgba(0, 0, 0, 0.75)';
  }};
  backdrop-filter: blur(4px);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => (props.$isMaxLevel || props.$canLevelUp) ? '#fff' : 'rgba(255,255,255,0.9)'};
  box-shadow: ${props => {
    if (props.$isMaxLevel) return '0 0 10px rgba(255, 215, 0, 0.5)';
    if (props.$canLevelUp) return '0 0 10px rgba(52, 199, 89, 0.5)';
    return '0 2px 4px rgba(0, 0, 0, 0.3)';
  }};
  z-index: 2;

  ${props => (props.$isMaxLevel || props.$canLevelUp) && `
    animation: pulse 2s ease-in-out infinite;

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `}
`;

export const ShardBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 6px;
  background: ${props => props.$canLevelUp
    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95), rgba(48, 179, 80, 0.95))'
    : 'rgba(175, 82, 222, 0.9)'};
  backdrop-filter: blur(4px);
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  z-index: 2;
  ${props => props.$canLevelUp && `
    box-shadow: 0 0 8px rgba(52, 199, 89, 0.5);
  `}
`;

export const CardContent = styled.div`
  padding: ${theme.spacing.md};
`;

export const CharName = styled.h3`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$isOwned ? theme.colors.text : theme.colors.textSecondary};
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CharSeries = styled.p`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$isOwned ? theme.colors.textSecondary : theme.colors.textMuted};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ==================== PAGINATION ====================

export const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
  flex-wrap: wrap;
`;

export const PageButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  min-height: 44px;

  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  min-width: 120px;
  text-align: center;
`;
