/**
 * Card - Glass morphism card components
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../tokens';

/**
 * GlassCard - Base card with glass morphism effect
 */
export const GlassCard = styled(motion.div)`
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.md};
  transition: all ${theme.transitions.base};

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }
`;

/**
 * Section - Card with padding for content sections
 */
export const Section = styled(GlassCard)`
  padding: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.xl};
  }
`;

/**
 * PageWrapper - Full-page wrapper with gradient background
 */
export const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
  color: ${theme.colors.text};
  font-family: ${theme.fonts.primary};
  position: relative;
  overflow-x: hidden;

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168, 85, 247, 0.1), transparent),
      radial-gradient(ellipse 50% 30% at 20% 80%, rgba(14, 165, 233, 0.08), transparent);
    pointer-events: none;
    z-index: 0;
  }
`;

const CardComponents = { GlassCard, Section, PageWrapper };
export default CardComponents;
