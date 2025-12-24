/**
 * EmptyState - Placeholder for empty data states
 *
 * Use when a list/grid/view has no data to display.
 * Provides helpful messaging and optional action.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';
import { Button } from '../buttons';

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['2xl']} ${theme.spacing.lg};
  text-align: center;
`;

const IconWrapper = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.lg};
  opacity: 0.5;
`;

const Title = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.sm};
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  max-width: 400px;
  margin: 0 0 ${theme.spacing.lg};
  line-height: 1.5;
`;

const ActionWrapper = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

/**
 * EmptyState Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon or emoji to display
 * @param {string} props.title - Main message
 * @param {string} props.description - Additional context
 * @param {string} props.actionLabel - Primary action button label
 * @param {Function} props.onAction - Primary action callback
 * @param {string} props.secondaryLabel - Secondary action label
 * @param {Function} props.onSecondaryAction - Secondary action callback
 */
const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction
}) => {
  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {icon && <IconWrapper>{icon}</IconWrapper>}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {(actionLabel || secondaryLabel) && (
        <ActionWrapper>
          {secondaryLabel && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </ActionWrapper>
      )}
    </Container>
  );
};

export default EmptyState;
