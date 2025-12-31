/**
 * ProfilePage Styled Components
 *
 * Extracted from ProfilePage.js for better maintainability.
 * Uses design-system tokens for consistency.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../design-system';

// ==================== PAGE LAYOUT ====================

export const PageWrapper = styled.div`
  min-height: 100vh;
  padding: ${theme.spacing.lg} 0;
  padding-bottom: calc(${theme.spacing.xl} + 80px);
  background: ${theme.colors.pageGradient};
`;

// ==================== PROFILE HEADER ====================

export const ProfileHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

export const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

export const Avatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  box-shadow: 0 4px 20px rgba(0, 113, 227, 0.3);
`;

export const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const Username = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
`;

export const PointsBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  width: fit-content;
`;

// ==================== STATS GRID ====================

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

export const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${theme.radius.lg};
  background: ${props => props.$color ? `${props.$color}20` : theme.colors.glass};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color || theme.colors.primary};
  font-size: 22px;
  flex-shrink: 0;
`;

export const StatContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StatLabel = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

export const StatHint = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

export const ChevronIcon = styled.div`
  color: ${theme.colors.textMuted};
  font-size: 20px;
  display: flex;
  align-items: center;
`;

// ==================== SETTINGS SECTION ====================

export const SectionTitle = styled.h2`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.md};
  padding-left: ${theme.spacing.xs};
`;

export const SettingsCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  margin-bottom: ${theme.spacing.xl};
`;

export const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};
  font-family: inherit;
  color: inherit;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: none;
    background: ${theme.colors.glass};
    box-shadow: inset 0 0 0 2px ${theme.colors.focusRing};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${props => props.$admin && `
    background: rgba(88, 86, 214, 0.05);

    &:hover {
      background: rgba(88, 86, 214, 0.1);
    }
  `}
`;

export const SettingsIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$admin ? 'rgba(88, 86, 214, 0.15)' : theme.colors.glass};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$admin ? theme.colors.accent : theme.colors.textSecondary};
  font-size: 18px;
  flex-shrink: 0;
`;

export const SettingsLabel = styled.div`
  flex: 1;
  min-width: 0;

  > span:first-child {
    display: block;
    font-size: ${theme.fontSizes.base};
    font-weight: ${theme.fontWeights.medium};
    color: ${theme.colors.text};
  }
`;

export const SettingsHint = styled.span`
  display: block;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

export const ToggleSwitch = styled.div`
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: ${props => props.$active
    ? theme.colors.primary
    : theme.colors.backgroundTertiary};
  position: relative;
  transition: all ${theme.timing.fast} ${theme.easing.easeOut};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$active ? '21px' : '3px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all ${theme.timing.fast} ${theme.easing.easeOut};
  }
`;

export const LanguageFlag = styled.span`
  font-size: 20px;
`;

export const LanguageSelectorWrapper = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

// ==================== LOGOUT & VERSION ====================

export const LogoutButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.lg};
  background: transparent;
  border: 1px solid ${theme.colors.error};
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: rgba(255, 59, 48, 0.1);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.error};
  }

  svg {
    font-size: 20px;
  }
`;

export const VersionText = styled.div`
  text-align: center;
  margin-top: ${theme.spacing.xl};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

// ==================== ACCOUNT LEVEL SECTION ====================

export const LevelSection = styled.section`
  margin-bottom: ${theme.spacing.xl};
`;

export const LevelCard = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: border-color ${theme.timing.fast} ${theme.easing.easeOut};
  font-family: inherit;

  &:hover {
    border-color: rgba(88, 86, 214, 0.5);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }

  @media (max-width: 480px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const LevelCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: ${theme.fontWeights.bold};
  box-shadow: 0 4px 16px rgba(88, 86, 214, 0.3);
  flex-shrink: 0;
`;

export const LevelInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const LevelTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

export const LevelProgressBar = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: ${theme.spacing.xs};
`;

export const LevelProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #5856d6 0%, #af52de 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
`;

export const LevelProgressText = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

export const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;
