/**
 * LoadingState - Consistent loading state component
 *
 * Use for displaying loading states in pages and sections.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../tokens';
import { Spinner } from '../primitives';

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.$padding || theme.spacing['3xl']};
  min-height: ${props => props.$minHeight || '200px'};
  gap: ${theme.spacing.lg};
`;

const Message = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  text-align: center;
`;

/**
 * LoadingState Component
 *
 * @param {string} message - Loading message to display
 * @param {string} size - Spinner size (default: '48px')
 * @param {string} padding - Container padding
 * @param {string} minHeight - Minimum container height
 * @param {boolean} fullPage - Whether this is a full-page loader
 */
const LoadingState = ({
  message = 'Loading...',
  size = '48px',
  padding,
  minHeight,
  fullPage = false,
  ...props
}) => {
  return (
    <Container
      $padding={fullPage ? theme.spacing['4xl'] : padding}
      $minHeight={fullPage ? '60vh' : minHeight}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <Spinner size={size} />
      {message && <Message>{message}</Message>}
    </Container>
  );
};

export default LoadingState;
