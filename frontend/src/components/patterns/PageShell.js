/**
 * PageShell - Consistent page wrapper with standardized layout
 *
 * Provides a unified page structure with:
 * - Loading, error, and empty state handling
 * - Optional hero section
 * - Page header with title/subtitle
 * - Stats section
 * - Actions slot
 * - Main content area
 * - Accessibility support (aria-live regions, reduced motion)
 *
 * Use this for all standard pages to ensure consistent layout.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  theme,
  motionVariants,
  useReducedMotion,
  AriaLiveRegion,
  Container as BaseContainer,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../design-system';
import { ICON_EMPTY } from '../../constants/icons';

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
 * @param {string} props.title - Page title (required, unless using loading/error states)
 * @param {string} props.subtitle - Page subtitle
 * @param {React.ReactNode} props.actions - Header action buttons
 * @param {React.ReactNode} props.hero - Hero section content
 * @param {React.ReactNode} props.stats - Stats section content
 * @param {React.ReactNode} props.children - Main page content
 * @param {boolean} props.animate - Whether to animate content entrance
 * @param {string} props.className - Additional CSS class
 * @param {string} props.statusMessage - Aria-live status message for screen readers
 * @param {string} props.alertMessage - Aria-live alert message for screen readers
 * @param {boolean} props.loading - Show loading state
 * @param {string} props.loadingMessage - Loading state message
 * @param {string} props.error - Error message (shows error state)
 * @param {Function} props.onRetry - Retry handler for error state
 * @param {boolean} props.empty - Show empty state
 * @param {string} props.emptyIcon - Empty state icon
 * @param {string} props.emptyTitle - Empty state title
 * @param {string} props.emptyDescription - Empty state description
 * @param {string} props.emptyActionLabel - Empty state action button label
 * @param {Function} props.onEmptyAction - Empty state action handler
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
  statusMessage,
  alertMessage,
  // State handling
  loading = false,
  loadingMessage = 'Loading...',
  error = null,
  onRetry,
  empty = false,
  emptyIcon = ICON_EMPTY,
  emptyTitle = 'Nothing here',
  emptyDescription = 'No items to display.',
  emptyActionLabel,
  onEmptyAction,
}) => {
  // Respect user's reduced motion preference
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const contentVariants = shouldAnimate ? motionVariants.fadeIn : undefined;

  // Loading state - full page
  if (loading) {
    return (
      <PageWrapper className={className}>
        <LoadingState message={loadingMessage} fullPage />
      </PageWrapper>
    );
  }

  // Error state - full page with retry
  if (error) {
    return (
      <PageWrapper className={className}>
        <ErrorState
          title="Something went wrong"
          message={error}
          onRetry={onRetry}
          retryLabel="Try Again"
        />
      </PageWrapper>
    );
  }

  // Empty state
  if (empty) {
    return (
      <PageWrapper className={className}>
        <Container>
          {title && (
            <HeaderSection>
              <HeaderContent>
                <Title>{title}</Title>
                {subtitle && <Subtitle>{subtitle}</Subtitle>}
              </HeaderContent>
              {actions && <HeaderActions>{actions}</HeaderActions>}
            </HeaderSection>
          )}
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className={className}>
      {/* Aria live regions for dynamic updates */}
      {statusMessage && (
        <AriaLiveRegion politeness="polite">
          {statusMessage}
        </AriaLiveRegion>
      )}
      {alertMessage && (
        <AriaLiveRegion politeness="assertive">
          {alertMessage}
        </AriaLiveRegion>
      )}

      <Container>
        {/* Hero Section */}
        {hero && (
          <HeroSection
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.4 }}
          >
            {hero}
          </HeroSection>
        )}

        {/* Header Section */}
        {title && (
          <HeaderSection>
            <HeaderContent>
              <Title>{title}</Title>
              {subtitle && <Subtitle>{subtitle}</Subtitle>}
            </HeaderContent>
            {actions && <HeaderActions>{actions}</HeaderActions>}
          </HeaderSection>
        )}

        {/* Stats Section */}
        {stats && (
          <StatsSection
            initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {stats}
          </StatsSection>
        )}

        {/* Main Content */}
        <MainContent
          id="main-content"
          variants={contentVariants}
          initial={shouldAnimate ? "hidden" : false}
          animate={shouldAnimate ? "visible" : false}
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
