/**
 * ErrorState - Consistent error state component
 *
 * Use for displaying error states in pages and sections.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MdError, MdRefresh } from 'react-icons/md';
import { theme } from '../tokens';
import { Button } from '../primitives';

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.$padding || theme.spacing['3xl']};
  min-height: ${props => props.$minHeight || '200px'};
  gap: ${theme.spacing.lg};
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 59, 48, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.error};
  font-size: 32px;
`;

const Title = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const Message = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  max-width: 400px;
`;

/**
 * ErrorState Component
 *
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {Function} onRetry - Retry callback
 * @param {string} retryLabel - Retry button label
 * @param {boolean} fullPage - Whether this is a full-page error
 * @param {React.ReactNode} icon - Custom icon
 */
const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  fullPage = false,
  icon,
  ...props
}) => {
  return (
    <Container
      $padding={fullPage ? theme.spacing['4xl'] : undefined}
      $minHeight={fullPage ? '60vh' : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="alert"
      {...props}
    >
      <IconWrapper>
        {icon || <MdError />}
      </IconWrapper>
      {title && <Title>{title}</Title>}
      {message && <Message>{message}</Message>}
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<MdRefresh />}
        >
          {retryLabel}
        </Button>
      )}
    </Container>
  );
};

export default ErrorState;
