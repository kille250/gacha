/**
 * LoadingState - Consistent loading state component
 *
 * Use for displaying loading states in pages and sections.
 *
 * Accessibility:
 * - Uses role="status" for ARIA live region
 * - aria-live="polite" ensures screen readers announce without interrupting
 * - aria-busy="true" indicates content is loading
 * - Visually hidden text provides context for screen readers
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

// Visually hidden text for screen readers
const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * LoadingState Component
 *
 * @param {string} message - Loading message to display
 * @param {string} size - Spinner size (default: '48px')
 * @param {string} padding - Container padding
 * @param {string} minHeight - Minimum container height
 * @param {boolean} fullPage - Whether this is a full-page loader
 * @param {string} srAnnouncement - Custom screen reader announcement
 */
const LoadingState = ({
  message = 'Loading...',
  size = '48px',
  padding,
  minHeight,
  fullPage = false,
  srAnnouncement,
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
      <Spinner size={size} aria-hidden="true" />
      {message && <Message aria-hidden={!!srAnnouncement}>{message}</Message>}
      {srAnnouncement && <ScreenReaderOnly>{srAnnouncement}</ScreenReaderOnly>}
    </Container>
  );
};

export default LoadingState;
