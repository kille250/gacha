/**
 * PageHeader - Consistent page header with title and subtitle
 *
 * Provides standardized page header styling across the app.
 */

import React from 'react';
import styled from 'styled-components';
import { theme } from '../../design-system';

const HeaderSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderContent = styled.div`
  margin-bottom: ${props => props.$hasStats ? theme.spacing.lg : '0'};
`;

const Title = styled.h1`
  font-size: ${theme.fontSizes['4xl']};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.02em;
  margin: 0 0 ${theme.spacing.xs};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes['2xl']};
  }
`;

const Subtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    position: absolute;
    right: 0;
    top: 0;
    margin-top: 0;
  }
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

/**
 * PageHeader Component
 *
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {React.ReactNode} props.actions - Action buttons for header
 * @param {React.ReactNode} props.children - Additional content (stats, etc.)
 */
const PageHeader = ({ title, subtitle, actions, children }) => {
  return (
    <HeaderSection>
      <HeaderWrapper>
        <HeaderContent $hasStats={!!children}>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
          {actions && <HeaderActions>{actions}</HeaderActions>}
        </HeaderContent>
      </HeaderWrapper>
      {children}
    </HeaderSection>
  );
};

export default PageHeader;
