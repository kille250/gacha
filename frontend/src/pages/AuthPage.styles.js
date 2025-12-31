/**
 * Auth Pages Styled Components (Login & Register)
 *
 * Shared styles for authentication pages.
 * Uses design-system tokens for consistency.
 */

import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { theme } from '../design-system';

// ==================== ANIMATIONS ====================

export const float = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(10px, -15px) scale(1.01); }
`;

export const floatLarge = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

// ==================== PAGE LAYOUT ====================

export const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.pageGradient};
  font-family: ${theme.fonts.primary};
  position: relative;
  overflow: hidden;
  padding: ${theme.spacing.lg};
`;

export const BackgroundEffects = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

export const GradientOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: ${float} 50s infinite ease-in-out;

  &.orb-1 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(0, 113, 227, 0.18), transparent 70%);
    top: -15%;
    left: -10%;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(88, 86, 214, 0.14), transparent 70%);
    bottom: -10%;
    right: -10%;
    animation-delay: -12s;
  }

  &.orb-3 {
    width: 280px;
    height: 280px;
    background: radial-gradient(circle, rgba(175, 82, 222, 0.10), transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -25s;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const GradientOrbLarge = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: ${floatLarge} 20s infinite ease-in-out;

  &.orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(88, 86, 214, 0.3), transparent 70%);
    top: -20%;
    right: -10%;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0, 113, 227, 0.25), transparent 70%);
    bottom: -15%;
    left: -10%;
    animation-delay: -7s;
  }

  &.orb-3 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(175, 82, 222, 0.2), transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -14s;
  }
`;

export const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: ${pulse} 8s infinite ease-in-out;
`;

export const ContentWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
`;

// ==================== BRAND SECTION ====================

export const BrandSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

export const LogoWrapper = styled.div`
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin-bottom: ${theme.spacing.md};
  box-shadow: ${theme.shadows.glowSubtle(theme.colors.primary)};
  cursor: pointer;
`;

export const LogoWrapperAccent = styled.div`
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin-bottom: ${theme.spacing.md};
  box-shadow: 0 8px 32px rgba(88, 86, 214, 0.4);
`;

export const BrandTitle = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  letter-spacing: -0.02em;
`;

export const BrandTitleLarge = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  letter-spacing: -0.02em;
`;

export const BrandSubtitle = styled.p`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.xs} 0 0;
`;

export const BrandSubtitleTertiary = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textTertiary};
  margin: ${theme.spacing.xs} 0 0;
`;

// ==================== FEATURE LIST ====================

export const FeatureList = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

export const FeatureItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  svg {
    font-size: 14px;
    color: ${theme.colors.primary};
  }
`;

// ==================== AUTH CARD ====================

export const AuthCard = styled(motion.div)`
  width: 100%;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border-radius: ${theme.radius['2xl']};
  border: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing['2xl']};
  box-shadow: ${theme.shadows.card};
`;

export const AuthCardXl = styled(motion.div)`
  width: 100%;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.lg};
`;

export const CardHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.lg};
`;

export const WelcomeText = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  margin: 0;
`;

export const WelcomeTextXl = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

export const SubText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin: ${theme.spacing.xs} 0 0;
`;

// ==================== ERROR MESSAGE ====================

export const ErrorMessage = styled(motion.div)`
  background: ${theme.colors.errorMuted};
  border: 1px solid rgba(255, 59, 48, 0.25);
  color: ${theme.colors.error};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
  overflow: hidden;
`;

// ==================== FORM ====================

export const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const AuthFormMd = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const InputLabel = styled.label`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  &:focus-within > div {
    color: ${theme.colors.primary};
  }
`;

export const InputIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: 14px;
  pointer-events: none;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};
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
  transition:
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.fast} ${theme.easing.easeOut};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.focusRing};
  }
`;

export const StyledInputAccent = styled.input`
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

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(88, 86, 214, 0.2);

    & + ${InputIcon}, ~ ${InputIcon} {
      color: ${theme.colors.accent};
    }
  }
`;

// ==================== BUTTONS ====================

export const SubmitButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  box-shadow: ${theme.shadows.buttonPrimary};
  margin-top: ${theme.spacing.sm};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${theme.colors.primaryHover};
      box-shadow: ${theme.shadows.buttonPrimaryHover};
      transform: translateY(-1px);
    }
  }

  &:active:not(:disabled) {
    background: ${theme.colors.primaryActive};
    transform: translateY(0);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      ${theme.shadows.buttonPrimaryHover},
      0 0 0 3px ${theme.colors.focusRing};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 14px;
  }
`;

export const SubmitButtonAccent = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: 0 4px 16px rgba(88, 86, 214, 0.4);
  margin-top: ${theme.spacing.sm};

  &:hover:not(:disabled) {
    box-shadow: 0 6px 24px rgba(88, 86, 214, 0.5);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 14px;
  }
`;

// ==================== DIVIDER ====================

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.lg} 0;
`;

export const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${theme.colors.surfaceBorder};
`;

export const DividerText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
`;

// ==================== NAVIGATION PROMPTS ====================

export const NavigationPrompt = styled.p`
  text-align: center;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const NavigationLink = styled(Link)`
  color: ${theme.colors.primary};
  text-decoration: none;
  font-weight: ${theme.fontWeights.medium};
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};
  border-radius: ${theme.radius.sm};
  padding: 2px 4px;
  margin: -2px -4px;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${theme.colors.primaryHover};
      text-decoration: underline;
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

export const NavigationLinkAccent = styled(Link)`
  color: ${theme.colors.accent};
  text-decoration: none;
  font-weight: ${theme.fontWeights.semibold};
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.accentSecondary};
    text-decoration: underline;
  }
`;

// ==================== GOOGLE LOGIN ====================

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

// ==================== LANGUAGE SELECTOR ====================

export const LanguageSelectorContainer = styled.div`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  z-index: 100;
`;

export const LanguageButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 16px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }

  svg {
    font-size: 18px;
  }
`;

export const LanguageDropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.dropdown};
  overflow: hidden;
  min-width: 160px;
`;

export const LanguageDropdownSimple = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  overflow: hidden;
  min-width: 150px;
`;

export const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  background: ${props => props.$active ? theme.colors.primarySubtle : 'transparent'};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.glass};
  }
`;

export const LanguageOptionAccent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.accent : theme.colors.text};
  background: ${props => props.$active ? 'rgba(88, 86, 214, 0.1)' : 'transparent'};
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glass};
  }
`;

// ==================== BONUS INFO (Register) ====================

export const BonusInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.2);
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.success};

  svg {
    font-size: 16px;
  }

  strong {
    font-weight: ${theme.fontWeights.semibold};
  }
`;
