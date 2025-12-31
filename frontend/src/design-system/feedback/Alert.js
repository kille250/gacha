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
    background: linear-gradient(135deg, rgba(90, 200, 250, 0.12) 0%, rgba(90, 200, 250, 0.08) 100%);
    border-color: rgba(90, 200, 250, 0.2);
    --alert-accent: ${theme.colors.info};
  `,
  success: css`
    background: linear-gradient(135deg, rgba(52, 199, 89, 0.12) 0%, rgba(52, 199, 89, 0.08) 100%);
    border-color: rgba(52, 199, 89, 0.2);
    --alert-accent: ${theme.colors.success};
  `,
  warning: css`
    background: linear-gradient(135deg, rgba(255, 159, 10, 0.12) 0%, rgba(255, 159, 10, 0.08) 100%);
    border-color: rgba(255, 159, 10, 0.2);
    --alert-accent: ${theme.colors.warning};
  `,
  error: css`
    background: linear-gradient(135deg, rgba(255, 59, 48, 0.12) 0%, rgba(255, 59, 48, 0.08) 100%);
    border-color: rgba(255, 59, 48, 0.2);
    --alert-accent: ${theme.colors.error};
  `
};

const Container = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  ${props => alertVariants[props.$variant || 'info']}
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--alert-accent);
  font-size: 16px;
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
