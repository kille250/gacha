/**
 * ErrorState - Consistent error state component
 *
 * Use for displaying error states in pages and sections.
 * Provides error message with optional retry action.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MdError, MdRefresh } from 'react-icons/md';
import { theme } from '../../../styles/DesignSystem';
import { Button } from '../buttons';

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.$padding || theme.spacing['2xl']};
  text-align: center;
  gap: ${theme.spacing.md};
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 59, 48, 0.15);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.error};
  font-size: 32px;
`;

const Title = styled.h3`
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
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

/**
 * ErrorState Component
 *
 * @param {Object} props
 * @param {string} props.title - Error title (default: 'Something went wrong')
 * @param {string} props.message - Error message to display
 * @param {Function} props.onRetry - Retry callback (shows retry button if provided)
 * @param {string} props.retryLabel - Retry button label
 * @param {React.ReactNode} props.actions - Additional action buttons
 * @param {boolean} props.showIcon - Whether to show error icon (default: true)
 * @param {string} props.padding - Container padding
 */
const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  actions,
  showIcon = true,
  padding,
  ...props
}) => {
  return (
    <Container
      $padding={padding}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="alert"
      {...props}
    >
      {showIcon && (
        <IconWrapper>
          <MdError />
        </IconWrapper>
      )}
      <Title>{title}</Title>
      {message && <Message>{message}</Message>}
      {(onRetry || actions) && (
        <Actions>
          {onRetry && (
            <Button onClick={onRetry} variant="secondary">
              <MdRefresh />
              {retryLabel}
            </Button>
          )}
          {actions}
        </Actions>
      )}
    </Container>
  );
};

export default ErrorState;
