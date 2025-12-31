/**
 * SettingsPage Styled Components
 *
 * Extracted from SettingsPage.js for better maintainability.
 * Uses design-system tokens for consistency.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../design-system';

// ==================== PAGE LAYOUT ====================

// Re-export PageWrapper directly as PageContainer for backwards compatibility
export { PageWrapper as PageContainer } from '../design-system';

export const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  background: ${theme.colors.backgroundSecondary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  /* Minimum 44px for touch targets (WCAG 2.5.5) */
  width: 44px;
  height: 44px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.surface};
    }
  }

  &:active {
    background: ${theme.colors.surfaceHover};
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const Title = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
`;

export const Content = styled.main`
  max-width: 700px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
`;

// ==================== TABS ====================

export const TabsContainer = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
`;

export const TabList = styled.div`
  display: flex;
  gap: 2px;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  overflow-x: auto;

  /* Hide scrollbar but allow scrolling on mobile */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

export const Tab = styled(motion.button)`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: transparent;
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$active
    ? (props.$danger ? theme.colors.error : theme.colors.text)
    : theme.colors.textSecondary};
  cursor: pointer;
  transition: color ${theme.transitions.fast};
  white-space: nowrap;
  flex: 1;
  justify-content: center;
  min-width: 100px;

  svg {
    font-size: 16px;
    color: ${props => props.$active
      ? (props.$danger ? theme.colors.error : theme.colors.primary)
      : theme.colors.textMuted};
  }

  &:hover {
    color: ${props => props.$danger ? theme.colors.error : theme.colors.text};

    svg {
      color: ${props => props.$danger ? theme.colors.error : theme.colors.primary};
    }
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};

    span {
      display: none;
    }
  }
`;

export const TabIndicator = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
`;

export const TabPanel = styled.div`
  padding: ${theme.spacing.xl};
  min-height: 400px;
`;

export const TabContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const TabHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid ${props => props.$danger
    ? 'rgba(255, 59, 48, 0.2)'
    : theme.colors.surfaceBorder};
`;

export const TabIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.$danger
    ? 'rgba(255, 59, 48, 0.15)'
    : props.$google
      ? 'rgba(66, 133, 244, 0.15)'
      : `rgba(0, 113, 227, 0.15)`};
  border-radius: ${theme.radius.lg};

  svg {
    font-size: 22px;
    color: ${props => props.$danger
      ? theme.colors.error
      : props.$google
        ? '#4285f4'
        : theme.colors.primary};
  }
`;

export const TabTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.text};
`;

export const TabDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

// ==================== SECTIONS ====================

export const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const SubSectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0;
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
    font-size: 14px;
  }
`;

export const SubSectionDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

export const Divider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
  margin: ${theme.spacing.md} 0;
`;

// ==================== INFO CARD ====================

export const InfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

export const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};

  &:last-child {
    border-bottom: none;
  }
`;

export const InfoLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};

  svg {
    font-size: 14px;
  }
`;

export const InfoValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
`;

export const LinkedBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${theme.colors.success};

  svg {
    font-size: 12px;
  }
`;

export const NotLinkedBadge = styled.span`
  color: ${theme.colors.textMuted};
`;

export const GoogleEmailBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(66, 133, 244, 0.15);
  border: 1px solid rgba(66, 133, 244, 0.3);
  border-radius: ${theme.radius.full};
  color: #4285f4;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
`;

// ==================== FORMS ====================

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const InputIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: 14px;
  pointer-events: none;
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-left: 44px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

export const SubmitButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${props => props.$variant === 'warning'
    ? 'linear-gradient(135deg, #ff9500, #ff6b00)'
    : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`};
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

// ==================== ALERTS ====================

export const WarningBox = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 149, 0, 0.15);
  border: 1px solid rgba(255, 149, 0, 0.3);
  border-radius: ${theme.radius.lg};
  color: #ff9500;
  font-size: ${theme.fontSizes.sm};
  line-height: 1.5;
`;

export const DisabledSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};

  svg {
    font-size: 20px;
  }
`;

// ==================== GOOGLE SECTION ====================

export const GoogleButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const GoogleActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #4285f4, #34a853);
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export const GoogleUnlinkButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.error};
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.error};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: rgba(255, 59, 48, 0.1);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export const RelinkConfirmBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};

  p {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.textSecondary};
    margin: 0;
    text-align: center;
  }
`;

export const GoogleButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;

  /* Google Sign-In button container needs full width */
  > div {
    width: 100%;
    max-width: 100%;
  }

  /* Google iframe also needs full width */
  iframe {
    width: 100%;
    max-width: 100%;
  }
`;

export const GoogleLoadingButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: not-allowed;
  opacity: 0.7;
`;

export const CancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glass};
  }
`;

// ==================== DANGER ZONE ====================

export const DangerButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #ff3b30, #d63030);
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.textMuted};
  }
`;

export const ResetConfirmBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.lg};
`;

export const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.error};

  svg {
    font-size: 24px;
  }
`;

export const WarningList = styled.ul`
  margin: 0;
  padding-left: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.8;

  li {
    margin-bottom: ${theme.spacing.xs};

    &::marker {
      color: ${theme.colors.error};
    }
  }
`;

export const KeepList = styled.ul`
  margin: 0;
  padding: ${theme.spacing.md};
  padding-left: calc(${theme.spacing.md} + ${theme.spacing.lg});
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.6;

  strong {
    display: block;
    margin-bottom: ${theme.spacing.sm};
    margin-left: -${theme.spacing.lg};
    color: ${theme.colors.success};
  }

  li::marker {
    color: ${theme.colors.success};
  }
`;

export const DangerButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

export const ResetForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const ResetLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};

  svg {
    font-size: 14px;
  }
`;
