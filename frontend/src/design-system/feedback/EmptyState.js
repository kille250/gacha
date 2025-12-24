/**
 * EmptyState - Consistent empty state component
 *
 * Use when a list or section has no content to display.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../tokens';
import { ICON_EMPTY } from '../../constants/icons';
import { Button } from '../primitives';

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  gap: ${theme.spacing.md};
  text-align: center;
`;

const IconWrapper = styled.div`
  font-size: 48px;
  line-height: 1;
  opacity: 0.8;
`;

const Title = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  max-width: 300px;
`;

/**
 * EmptyState Component
 *
 * @param {string} icon - Emoji or icon character
 * @param {string} title - Empty state title
 * @param {string} description - Empty state description
 * @param {string} actionLabel - Action button label
 * @param {Function} onAction - Action button callback
 */
const EmptyState = ({
  icon = ICON_EMPTY,
  title = 'Nothing here',
  description,
  actionLabel,
  onAction,
  ...props
}) => {
  return (
    <Container
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {icon && <IconWrapper>{icon}</IconWrapper>}
      {title && <Title>{title}</Title>}
      {description && <Description>{description}</Description>}
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Container>
  );
};

export default EmptyState;
