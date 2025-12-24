/**
 * Toast - Auto-dismissing notification component
 *
 * Displays feedback messages that automatically disappear.
 * Use with ToastProvider for global toast management.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCheck, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';
import { theme } from '../../../styles/DesignSystem';

const toastVariants = {
  success: {
    icon: MdCheck,
    bg: 'rgba(52, 199, 89, 0.15)',
    border: 'rgba(52, 199, 89, 0.3)',
    color: theme.colors.success
  },
  error: {
    icon: MdError,
    bg: 'rgba(255, 59, 48, 0.15)',
    border: 'rgba(255, 59, 48, 0.3)',
    color: theme.colors.error
  },
  warning: {
    icon: MdWarning,
    bg: 'rgba(255, 159, 10, 0.15)',
    border: 'rgba(255, 159, 10, 0.3)',
    color: theme.colors.warning
  },
  info: {
    icon: MdInfo,
    bg: 'rgba(90, 200, 250, 0.15)',
    border: 'rgba(90, 200, 250, 0.3)',
    color: theme.colors.info
  }
};

const ToastContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => toastVariants[props.$variant].bg};
  border: 1px solid ${props => toastVariants[props.$variant].border};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  max-width: 400px;
  width: calc(100vw - 32px);

  @media (min-width: ${theme.breakpoints.sm}) {
    width: auto;
    min-width: 300px;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => toastVariants[props.$variant].color};
  font-size: 20px;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: 2px;

  ${props => !props.$hasDescription && css`
    margin-bottom: 0;
  `}
`;

const Description = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.4;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textTertiary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    background: ${theme.colors.glass};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Toast Component
 *
 * @param {Object} props
 * @param {'success' | 'error' | 'warning' | 'info'} props.variant - Toast type
 * @param {string} props.title - Toast title (required)
 * @param {string} props.description - Optional description text
 * @param {boolean} props.dismissible - Whether to show close button
 * @param {Function} props.onDismiss - Called when toast is dismissed
 */
const Toast = ({
  variant = 'info',
  title,
  description,
  dismissible = true,
  onDismiss
}) => {
  const Icon = toastVariants[variant].icon;

  return (
    <ToastContainer
      $variant={variant}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      role="alert"
      aria-live="polite"
    >
      <IconWrapper $variant={variant}>
        <Icon />
      </IconWrapper>
      <Content>
        <Title $hasDescription={!!description}>{title}</Title>
        {description && <Description>{description}</Description>}
      </Content>
      {dismissible && onDismiss && (
        <CloseButton
          onClick={onDismiss}
          aria-label="Dismiss notification"
          type="button"
        >
          <MdClose />
        </CloseButton>
      )}
    </ToastContainer>
  );
};

/**
 * ToastList - Container for multiple toasts
 */
const ToastListWrapper = styled.div`
  position: fixed;
  bottom: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  z-index: ${theme.zIndex.toast};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  pointer-events: none;

  > * {
    pointer-events: auto;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    left: ${theme.spacing.md};
    right: ${theme.spacing.md};
    bottom: ${theme.spacing.md};
  }
`;

export const ToastList = ({ toasts, onDismiss }) => (
  <ToastListWrapper>
    <AnimatePresence mode="popLayout">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </AnimatePresence>
  </ToastListWrapper>
);

export default Toast;
