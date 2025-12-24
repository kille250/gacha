/**
 * Alert - Inline alert/message component
 *
 * Use for displaying important messages inline within the page.
 * For temporary notifications, use Toast instead.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { MdCheck, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';
import { theme } from '../../../design-system';

const alertStyles = {
  success: css`
    background: rgba(52, 199, 89, 0.15);
    border: 1px solid rgba(52, 199, 89, 0.3);
    color: ${theme.colors.success};
  `,
  error: css`
    background: rgba(255, 59, 48, 0.15);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: ${theme.colors.error};
  `,
  warning: css`
    background: rgba(255, 159, 10, 0.15);
    border: 1px solid rgba(255, 159, 10, 0.3);
    color: ${theme.colors.warning};
  `,
  info: css`
    background: rgba(90, 200, 250, 0.15);
    border: 1px solid rgba(90, 200, 250, 0.3);
    color: ${theme.colors.info};
  `
};

const alertIcons = {
  success: MdCheck,
  error: MdError,
  warning: MdWarning,
  info: MdInfo
};

const AlertContainer = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};

  ${props => alertStyles[props.$variant]}

  ${props => props.$compact && css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  `}
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  margin-top: 1px;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  margin-bottom: ${props => props.$hasDescription ? '4px' : '0'};
  color: ${theme.colors.text};
`;

const Description = styled.div`
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: ${theme.radius.sm};
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

/**
 * Alert Component
 *
 * @param {Object} props
 * @param {'success' | 'error' | 'warning' | 'info'} props.variant - Alert type
 * @param {string} props.title - Optional title
 * @param {React.ReactNode} props.children - Alert content/description
 * @param {boolean} props.showIcon - Whether to show icon (default: true)
 * @param {boolean} props.dismissible - Whether to show close button
 * @param {Function} props.onDismiss - Called when alert is dismissed
 * @param {React.ReactNode} props.actions - Optional action buttons
 * @param {boolean} props.compact - Use compact padding
 */
const Alert = ({
  variant = 'info',
  title,
  children,
  showIcon = true,
  dismissible = false,
  onDismiss,
  actions,
  compact = false,
  ...props
}) => {
  const Icon = alertIcons[variant];

  return (
    <AlertContainer
      $variant={variant}
      $compact={compact}
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
        {title && <Title $hasDescription={!!children}>{title}</Title>}
        {children && <Description>{children}</Description>}
        {actions && <Actions>{actions}</Actions>}
      </Content>
      {dismissible && onDismiss && (
        <CloseButton
          onClick={onDismiss}
          aria-label="Dismiss"
          type="button"
        >
          <MdClose size={16} />
        </CloseButton>
      )}
    </AlertContainer>
  );
};

export default Alert;
