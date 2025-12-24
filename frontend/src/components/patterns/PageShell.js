/**
 * PageShell - Consistent page wrapper with standardized layout
 *
 * Provides a unified page structure with:
 * - Optional hero section
 * - Page header with title/subtitle
 * - Stats section
 * - Actions slot
 * - Main content area
 *
 * Use this for all standard pages to ensure consistent layout.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { Container as BaseContainer } from '../UI/layout';

const PageWrapper = styled.div`
  min-height: 100vh;
  padding-bottom: ${theme.spacing['2xl']};
  position: relative;
  z-index: 1;
`;

const Container = styled(BaseContainer)`
  padding-top: ${theme.spacing.xl};
  padding-bottom: ${theme.spacing.xl};
`;

const HeroSection = styled(motion.div)`
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};

  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.02em;
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.xs};

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['4xl']};
  }
`;

const Subtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
`;

const StatsSection = styled(motion.div)`
  margin-bottom: ${theme.spacing.xl};
`;

const MainContent = styled(motion.main)`
  /* Main content area */
`;

/**
 * PageShell Component
 *
 * @param {Object} props
 * @param {string} props.title - Page title (required)
 * @param {string} props.subtitle - Page subtitle
 * @param {React.ReactNode} props.actions - Header action buttons
 * @param {React.ReactNode} props.hero - Hero section content
 * @param {React.ReactNode} props.stats - Stats section content
 * @param {React.ReactNode} props.children - Main page content
 * @param {boolean} props.animate - Whether to animate content entrance
 * @param {string} props.className - Additional CSS class
 */
const PageShell = ({
  title,
  subtitle,
  actions,
  hero,
  stats,
  children,
  animate = true,
  className,
}) => {
  const contentVariants = animate ? motionVariants.fadeIn : undefined;

  return (
    <PageWrapper className={className}>
      <Container>
        {/* Hero Section */}
        {hero && (
          <HeroSection
            initial={animate ? { opacity: 0, y: 20 } : false}
            animate={animate ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.4 }}
          >
            {hero}
          </HeroSection>
        )}

        {/* Header Section */}
        <HeaderSection>
          <HeaderContent>
            <Title>{title}</Title>
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
          </HeaderContent>
          {actions && <HeaderActions>{actions}</HeaderActions>}
        </HeaderSection>

        {/* Stats Section */}
        {stats && (
          <StatsSection
            initial={animate ? { opacity: 0, y: 10 } : false}
            animate={animate ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {stats}
          </StatsSection>
        )}

        {/* Main Content */}
        <MainContent
          variants={contentVariants}
          initial={animate ? "hidden" : false}
          animate={animate ? "visible" : false}
        >
          {children}
        </MainContent>
      </Container>
    </PageWrapper>
  );
};

// Export sub-components for custom layouts
PageShell.Title = Title;
PageShell.Subtitle = Subtitle;
PageShell.Actions = HeaderActions;

export default PageShell;
