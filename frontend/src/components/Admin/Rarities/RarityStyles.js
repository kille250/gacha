/**
 * RarityStyles - Styled components for Rarity admin interface
 *
 * Organized into logical sections for maintainability:
 * - Info/Guide boxes
 * - Simulator styles
 * - Warning/validation displays
 * - Rarity card display
 * - Form modal styles
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';

// ============================================
// INFO & GUIDE BOX STYLES
// ============================================

export const InfoBox = styled.div`
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

export const InfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(10, 132, 255, 0.15);
  color: ${theme.colors.info || '#0a84ff'};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};

  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

export const InfoContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

export const QuickGuideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

export const GuideItem = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: flex-start;
`;

export const GuideIcon = styled.span`
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  color: ${theme.colors.primary};

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const GuideText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.4;

  strong {
    color: ${theme.colors.text};
    display: block;
    margin-bottom: 2px;
  }
`;

// ============================================
// SIMULATOR STYLES
// ============================================

export const SimulatorBox = styled(motion.div)`
  background: rgba(48, 209, 88, 0.08);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

export const SimulatorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(48, 209, 88, 0.15);
  color: ${theme.colors.success};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  flex-wrap: wrap;

  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

export const SimulatorControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.fontWeights.normal};
  color: ${theme.colors.textSecondary};
`;

export const SimulatorInput = styled.input`
  width: 80px;
  padding: 4px 8px;
  border: 1px solid rgba(48, 209, 88, 0.4);
  border-radius: ${theme.radius.sm};
  background: rgba(0, 0, 0, 0.2);
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

export const SimulatorContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

export const SimulatorNote = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
  margin-bottom: ${theme.spacing.md};
`;

export const SimulatorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

export const SimulatorPool = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.sm};
`;

export const SimulatorPoolTitle = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

export const SimulatorRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: ${theme.fontSizes.xs};
`;

export const SimulatorRarity = styled.span`
  color: ${props => props.$color};
  font-weight: ${theme.fontWeights.semibold};
`;

export const SimulatorValue = styled.span`
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.bold};
`;

export const SimulatorPercent = styled.span`
  color: ${theme.colors.textMuted};
  font-weight: ${theme.fontWeights.normal};
  font-size: 10px;
  margin-left: 4px;
`;

export const SimulatorMainRate = styled.span`
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

// ============================================
// WARNING & VALIDATION STYLES
// ============================================

export const WarningBox = styled.div`
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

export const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 159, 10, 0.15);
  color: ${theme.colors.warning};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};

  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

export const WarningContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

export const WarningText = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

export const RateTotalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

export const RateTotalItem = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$isValid
    ? 'rgba(48, 209, 88, 0.1)'
    : 'rgba(255, 69, 58, 0.1)'};
  border: 1px solid ${props => props.$isValid
    ? 'rgba(48, 209, 88, 0.3)'
    : 'rgba(255, 69, 58, 0.3)'};
  border-radius: ${theme.radius.md};
`;

export const RateTotalLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-bottom: 2px;
`;

export const RateTotalValue = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isValid ? theme.colors.success : theme.colors.error};

  span {
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.normal};
    color: ${theme.colors.textMuted};
  }
`;

// ============================================
// RARITY CARD STYLES
// ============================================

export const RarityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const RarityCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$color};
  }
`;

export const RarityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const RarityName = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

export const RarityBadge = styled.span`
  padding: 4px 12px;
  background: ${props => props.$color}20;
  border: 1px solid ${props => props.$color}40;
  border-radius: ${theme.radius.full};
  color: ${props => props.$color};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
`;

export const RarityBody = styled.div`
  padding: ${theme.spacing.lg};
`;

export const RaritySection = styled.div`
  margin-bottom: ${theme.spacing.md};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.sm};

  svg {
    font-size: 10px;
  }
`;

export const RateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.sm};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const RateItem = styled.div`
  text-align: center;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

export const RateLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  margin-bottom: 2px;
`;

export const RateValue = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

export const EffectiveRate = styled.div`
  font-size: 9px;
  color: ${theme.colors.textMuted};
  margin-top: 2px;
  font-style: italic;
`;

export const VisualRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

export const ColorSwatch = styled.div`
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$color};
  border: 2px solid ${theme.colors.surfaceBorder};
`;

export const VisualInfo = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

export const RarityMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

export const MetaItem = styled.span`
  font-size: ${theme.fontSizes.xs};
  padding: 2px 8px;
  border-radius: ${theme.radius.md};
  background: ${props =>
    props.$highlight ? 'rgba(48, 209, 88, 0.15)' :
    props.$warning ? 'rgba(255, 159, 10, 0.15)' :
    theme.colors.backgroundTertiary};
  color: ${props =>
    props.$highlight ? theme.colors.success :
    props.$warning ? theme.colors.warning :
    props.$muted ? theme.colors.textMuted :
    theme.colors.textSecondary};
`;

export const RarityActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
`;

// ============================================
// FORM MODAL STYLES
// ============================================

export const PresetSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.2);
  border-radius: ${theme.radius.lg};
`;

export const PresetLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.warning};
  margin-bottom: ${theme.spacing.sm};

  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

export const PresetGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const PresetButton = styled.button`
  padding: 6px 12px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover, &:focus {
    background: rgba(255, 159, 10, 0.2);
    border-color: ${theme.colors.warning};
    color: ${theme.colors.warning};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing || theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const CollapsibleSection = styled.div`
  margin-bottom: ${theme.spacing.md};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  background: ${props => props.$expanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent'};
`;

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  border-radius: ${theme.radius.md};

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing || theme.colors.primary};
    outline-offset: -2px;
    background: rgba(10, 132, 255, 0.08);
  }

  svg:last-child {
    color: ${theme.colors.textMuted};
    font-size: 12px;
  }
`;

export const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
    font-size: ${theme.fontSizes.sm};
  }
`;

export const SectionBadge = styled.span`
  font-size: 10px;
  font-weight: ${theme.fontWeights.normal};
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$muted ? 'rgba(255, 255, 255, 0.05)' : 'rgba(10, 132, 255, 0.15)'};
  color: ${props => props.$muted ? theme.colors.textMuted : theme.colors.primary};
`;

export const SectionContent = styled(motion.div)`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
  overflow: hidden;
`;

export const CopyButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
`;

export const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 6px 12px;
  min-height: 44px;
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover, &:focus {
    background: rgba(10, 132, 255, 0.2);
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing || theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    font-size: 10px;
  }
`;

export const RateGroupLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};

  &:first-child {
    margin-top: 0;
  }
`;

export const AdvancedNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(10, 132, 255, 0.08);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
  line-height: 1.4;

  svg {
    color: ${theme.colors.info};
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

export const LabelWithTooltip = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

export const Tooltip = styled.span`
  color: ${theme.colors.textMuted};
  cursor: help;

  svg {
    font-size: 11px;
  }

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const FieldHint = styled.div`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  margin-top: 4px;
  line-height: 1.3;
`;

export const ColorInputWrapper = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

export const ColorInput = styled.input`
  width: 48px;
  height: 48px;
  padding: 0;
  border: 2px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing || theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const ColorPreview = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => props.$color}40;
`;

export const ColorPreviewSwatch = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$color};
  box-shadow: 0 0 20px ${props => props.$color}50;
`;

export const ColorPreviewText = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
  text-shadow: 0 0 10px ${props => props.$color}50;
`;
