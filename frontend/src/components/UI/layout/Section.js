/**
 * Section - Content section with consistent spacing
 *
 * Groups related content with optional title and description.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme, motionVariants } from '../../../design-system';

const SectionWrapper = styled(motion.section)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};

  ${props => props.$glass && css`
    background: ${theme.colors.surface};
    backdrop-filter: blur(${theme.blur.lg});
    -webkit-backdrop-filter: blur(${theme.blur.lg});
    border-radius: ${theme.radius.xl};
    border: 1px solid ${theme.colors.surfaceBorder};
    padding: ${theme.spacing.lg};

    @media (min-width: ${theme.breakpoints.md}) {
      padding: ${theme.spacing.xl};
    }
  `}

  ${props => props.$compact && css`
    gap: ${theme.spacing.md};
  `}
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  ${props => props.$row && css`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.spacing.md};
  `}
`;

const SectionTitle = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.xl};
  }
`;

const SectionDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const SectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const SectionContent = styled.div`
  ${props => props.$columns && css`
    display: grid;
    gap: ${theme.spacing.lg};
    grid-template-columns: repeat(${props.$columns}, 1fr);

    @media (max-width: ${theme.breakpoints.md}) {
      grid-template-columns: 1fr;
    }
  `}
`;

/**
 * Section Component
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.titleIcon - Icon before title
 * @param {string} props.description - Section description
 * @param {React.ReactNode} props.actions - Actions in header
 * @param {boolean} props.glass - Apply glass morphism background
 * @param {boolean} props.compact - Reduce spacing
 * @param {number} props.columns - Number of content columns
 * @param {boolean} props.animate - Animate entrance
 * @param {React.ReactNode} props.children - Section content
 */
const Section = ({
  title,
  titleIcon,
  description,
  actions,
  glass = false,
  compact = false,
  columns,
  animate = false,
  children,
  ...props
}) => {
  const showHeader = title || description || actions;

  return (
    <SectionWrapper
      $glass={glass}
      $compact={compact}
      variants={animate ? motionVariants.slideUp : undefined}
      initial={animate ? 'hidden' : undefined}
      animate={animate ? 'visible' : undefined}
      {...props}
    >
      {showHeader && (
        <SectionHeader $row={!!actions}>
          <div>
            {title && (
              <SectionTitle>
                {titleIcon}
                {title}
              </SectionTitle>
            )}
            {description && (
              <SectionDescription>{description}</SectionDescription>
            )}
          </div>
          {actions && <SectionActions>{actions}</SectionActions>}
        </SectionHeader>
      )}
      {columns ? (
        <SectionContent $columns={columns}>{children}</SectionContent>
      ) : (
        children
      )}
    </SectionWrapper>
  );
};

// Export sub-components
Section.Header = SectionHeader;
Section.Title = SectionTitle;
Section.Description = SectionDescription;
Section.Actions = SectionActions;
Section.Content = SectionContent;

export default Section;
