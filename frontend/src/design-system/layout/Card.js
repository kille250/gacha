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
 * PageWrapper - Full-page wrapper with ambient gradient background
 *
 * Uses the default page gradient for a premium atmospheric effect.
 * Individual pages can override with specific gradients (gacha, collection, dojo).
 */
export const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${theme.colors.pageGradient.default};
  color: ${theme.colors.text};
  font-family: ${theme.fonts.primary};
  position: relative;
  overflow-x: hidden;
`;

const CardComponents = { GlassCard, Section, PageWrapper };
export default CardComponents;
