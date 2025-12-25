/**
 * RollPage Styled Components
 *
 * Roll-specific styles. Common gacha styles are imported from GachaShared.styles.js
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, Section, Chip } from '../design-system';

// Re-export all shared styles (these can be overridden below)
export * from './GachaShared.styles';

// ==================== ROLL-SPECIFIC COMPONENTS ====================

// Background for standard roll page (unique to RollPage)
export const BackgroundGradient = styled.div`
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(88, 86, 214, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(175, 82, 222, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
`;

// ==================== HERO SECTION (Roll-specific) ====================

export const HeroSection = styled(Section)`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

export const HeroTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.sm};
  background: linear-gradient(135deg, ${theme.colors.text} 0%, ${theme.colors.textSecondary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
`;

export const HeroSubtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// ==================== RARITY TRACKER (Roll-specific - centered) ====================

export const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

export const RarityHistoryContainer = styled.div`
  display: flex;
  gap: 6px;
`;

export const RarityDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: 0 2px 10px ${props => props.$color}50;
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// ==================== GACHA CONTAINER (Roll-specific - centered narrow) ====================

export const GachaContainer = styled.section`
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
  padding-bottom: 100px;
`;

// ==================== EMPTY STATE (Roll-specific - enhanced) ====================

export const EmptyState = styled(motion.div)`
  text-align: center;
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  max-width: 300px;
  position: relative;
  overflow: hidden;

  /* Subtle ambient animation */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 30%,
      rgba(88, 86, 214, 0.08) 0%,
      transparent 60%
    );
    opacity: 0;
    animation: ambientPulse 4s ease-in-out infinite;
  }

  @keyframes ambientPulse {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
      opacity: 0.5;
    }
  }
`;

export const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.9;
  position: relative;
  z-index: 1;

  @media (prefers-reduced-motion: no-preference) {
    animation: float 4s ease-in-out infinite;

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  }
`;

export const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
`;

export const EmptyText = styled.p`
  font-size: 15px;
  color: ${theme.colors.textTertiary};
  margin: 0;
  line-height: 1.5;
  position: relative;
  z-index: 1;
`;

// ==================== LOADING STATE (Roll-specific) ====================

export const LoadingState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

export const LoadingText = styled.p`
  font-size: 17px;
  color: ${theme.colors.textTertiary};
  font-weight: 500;
`;

// ==================== CHARACTER CARD (Roll-specific) ====================

export const CardImageWrapper = styled.div`
  position: relative;
  height: 280px;
  cursor: pointer;
  overflow: hidden;
  border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
`;

export const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 100%, ${props => props.$color}30 0%, transparent 60%);
  pointer-events: none;
  z-index: 1;
`;

// ==================== NAVIGATION (Roll uses same as shared but define for explicit import) ====================

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
