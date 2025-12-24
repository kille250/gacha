/**
 * Alert - Inline alert/message component
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { MdClose, MdInfo, MdCheckCircle, MdWarning, MdError } from 'react-icons/md';
import { theme } from '../tokens';
import { IconButton } from '../primitives';

const alertVariants = {
  info: css`
    background: rgba(90, 200, 250, 0.15);
    border-color: rgba(90, 200, 250, 0.3);
    color: ${theme.colors.info};
  `,
  success: css`
    background: rgba(52, 199, 89, 0.15);
    border-color: rgba(52, 199, 89, 0.3);
    color: ${theme.colors.success};
  `,
  warning: css`
    background: rgba(255, 159, 10, 0.15);
    border-color: rgba(255, 159, 10, 0.3);
    color: ${theme.colors.warning};
  `,
  error: css`
    background: rgba(255, 59, 48, 0.15);
    border-color: rgba(255, 59, 48, 0.3);
    color: ${theme.colors.error};
  `
};

const Container = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  border: 1px solid;
  font-size: ${theme.fontSizes.sm};

  ${props => alertVariants[props.$variant || 'info']}
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Title = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const Message = styled.span`
  color: ${theme.colors.textSecondary};
`;

const variantIcons = {
  info: MdInfo,
  success: MdCheckCircle,
  warning: MdWarning,
  error: MdError
};

/**
 * Alert Component
 *
 * @param {'info' | 'success' | 'warning' | 'error'} variant - Alert type
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {boolean} dismissible - Show close button
 * @param {Function} onDismiss - Dismiss callback
 * @param {boolean} showIcon - Show type icon
 */
const Alert = ({
  variant = 'info',
  title,
  message,
  children,
  dismissible = false,
  onDismiss,
  showIcon = true,
  ...props
}) => {
  const Icon = variantIcons[variant];

  return (
    <Container
      $variant={variant}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      role="alert"
      {...props}
    >
      {showIcon && (
        <IconWrapper>
          <Icon />
        </IconWrapper>
      )}
      <Content>
        {title && <Title>{title}</Title>}
        {(message || children) && <Message>{message || children}</Message>}
      </Content>
      {dismissible && onDismiss && (
        <IconButton
          size="xs"
          variant="ghost"
          label="Dismiss"
          onClick={onDismiss}
        >
          <MdClose />
        </IconButton>
      )}
    </Container>
  );
};

export default Alert;
