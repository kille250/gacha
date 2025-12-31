/**
 * CollectionPage Styled Components
 *
 * Extracted from CollectionPage.js for better maintainability.
 * Uses design-system tokens for consistency.
 *
 * Updated with:
 * - Improved visual hierarchy
 * - Better filter panel design
 * - Enhanced transitions and animations
 * - Softer shadows
 */

import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme, PageWrapper, Section } from '../design-system';

// ==================== PAGE WRAPPER ====================

export const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.lg} 0;
  /* Use CSS variable for consistent bottom padding */
  padding-bottom: var(--page-bottom-padding, ${theme.spacing['3xl']});
`;

// ==================== HEADER ====================

export const HeaderSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

export const HeaderContent = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

export const PageTitle = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.semibold};
  letter-spacing: ${theme.letterSpacing.snug};
  line-height: ${theme.lineHeights.tight};
  margin: 0 0 ${theme.spacing.xs};
  color: ${theme.colors.text};
`;

export const PageSubtitle = styled.p`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: ${theme.lineHeights.normal};
`;

// ==================== STATS CARD ====================

export const StatsCard = styled(Section)`
  padding: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.card};
`;

export const StatsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.lg};
  }
`;

export const StatItem = styled.div`
  text-align: center;
`;

export const StatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  line-height: ${theme.lineHeights.tight};
`;

export const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin-top: 4px;
`;

export const StatDivider = styled.div`
  width: 1px;
  height: 40px;
  background: ${theme.colors.divider};
`;

export const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.success}, ${theme.colors.successHover});
  border-radius: ${theme.radius.full};
  transition: width 0.5s ${theme.easing.appleSpring};
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
  transition:
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.fast} ${theme.easing.easeOut};

  &:focus-within {
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primarySubtle};
  }
`;

export const SearchIcon = styled.span`
  color: ${theme.colors.textTertiary};
  margin-right: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  font-size: 18px;
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
  border-radius: ${theme.radius.md};
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
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
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$active ? theme.colors.primarySubtle : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  position: relative;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut};
  min-height: 44px;

  &:hover {
    background: ${props => props.$active ? theme.colors.primaryMuted : theme.colors.glassHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
  }
`;

export const FilterBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
  border: 2px solid ${theme.colors.background};
`;

export const ItemsSelect = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  padding-right: ${theme.spacing.xl};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  min-height: 44px;
  transition:
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    background ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.glassHover};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

// ==================== QUICK FILTERS (NEW) ====================

export const QuickFilters = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
`;

export const QuickFilterChip = styled.button`
  padding: 8px 16px;
  background: ${props => props.$active ? theme.colors.primarySubtle : 'transparent'};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.full};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
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
  box-shadow: ${theme.shadows.card};

  /* Fix: Prevent filter panel from exceeding viewport on mobile */
  @media (max-width: ${theme.breakpoints.md}) {
    max-height: 50vh;
    overflow-y: auto;
    overscroll-behavior: contain;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }
  }
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
    ? props.$color ? `${props.$color}20` : theme.colors.primarySubtle
    : theme.colors.glass};
  border: 1px solid ${props => props.$active
    ? props.$color || theme.colors.primary
    : theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.full};
  color: ${props => props.$active
    ? props.$color || theme.colors.primary
    : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  text-transform: capitalize;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  min-height: 36px;

  &:hover {
    background: ${props => props.$color ? `${props.$color}30` : theme.colors.primaryMuted};
    border-color: ${props => props.$color || theme.colors.primary};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.$color || theme.colors.focusRing};
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
  transition: border-color ${theme.timing.fast} ${theme.easing.easeOut};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

export const ClearFiltersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.errorMuted};
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  min-height: 36px;

  &:hover {
    background: rgba(255, 59, 48, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.error};
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
  background: ${theme.colors.accentMuted};
  border: 1px solid rgba(88, 86, 214, 0.2);
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
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

export const UpgradeAllButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${theme.colors.success};
  border: none;
  border-radius: ${theme.radius.full};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  box-shadow: ${theme.shadows.button};
  transition:
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    background ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};

  svg {
    font-size: 11px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${theme.colors.successHover};
      box-shadow: ${theme.shadows.buttonHover};
      transform: translateY(-1px);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: ${theme.shadows.buttonPressed};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.success};
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
  width: 22px;
  height: 22px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: bold;

  ${props => props.$type === 'shard' && css`
    background: rgba(175, 82, 222, 0.2);
    color: ${theme.colors.accentSecondary};
  `}

  ${props => props.$type === 'levelup' && css`
    background: ${theme.colors.successMuted};
    color: ${theme.colors.success};
  `}

  ${props => props.$type === 'max' && css`
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 140, 0, 0.3));
    color: #FFD700;
  `}
`;

// ==================== ERROR MESSAGE ====================

export const ErrorMessage = styled.div`
  background: ${theme.colors.errorMuted};
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
  font-size: ${theme.fontSizes.sm};
`;

// ==================== CHARACTER GRID ====================

// Stagger animation variants for grid items
export const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  }
};

export const gridItemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 25
    }
  }
};

export const CharacterGrid = styled(motion.div)`
  display: grid;
  /* Mobile: 2 columns with minimum card size for readability */
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};

  /* Small screens: 3 columns */
  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing.md};
  }

  /* Tablet: 4 columns */
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }

  /* Desktop: 5 columns */
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(5, 1fr);
    gap: ${theme.spacing.lg};
  }

  /* Large desktop: 6 columns */
  @media (min-width: ${theme.breakpoints.xl}) {
    grid-template-columns: repeat(6, 1fr);
  }

  /* Extra large desktop: 8 columns for maximum density */
  @media (min-width: 1600px) {
    grid-template-columns: repeat(8, 1fr);
  }

  /* Ultra-wide: 10 columns */
  @media (min-width: 2000px) {
    grid-template-columns: repeat(10, 1fr);
  }
`;

// Wrapper for individual grid items with stagger animation
export const CharacterGridItem = styled(motion.div)`
  /* Smooth appearance for staggered items */
  will-change: opacity, transform;
`;

// ==================== PAGINATION ====================

export const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
  flex-wrap: wrap;
  /* Add padding for mobile bottom nav */
  padding-bottom: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

export const PageButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;

  /* Desktop hover */
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${theme.colors.glassHover};
      border-color: ${theme.colors.glassBorder};
      transform: translateY(-1px);
    }
  }

  /* Touch active state */
  &:active:not(:disabled) {
    transform: scale(0.96);
    background: ${theme.colors.glassHover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
  }

  /* Mobile: icon-only or shorter text */
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: background ${theme.timing.fast} ${theme.easing.easeOut};
    &:hover, &:active {
      transform: none;
    }
  }
`;

export const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  min-width: 100px;
  text-align: center;
  white-space: nowrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
    min-width: 80px;
  }
`;
