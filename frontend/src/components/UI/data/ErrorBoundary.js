/**
 * ErrorBoundary - Catches and displays React errors
 *
 * Wraps components to catch errors and display a fallback UI.
 */

import React, { Component } from 'react';
import styled from 'styled-components';
import { MdRefresh, MdError } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme, Button } from '../../../design-system';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['2xl']};
  text-align: center;
  min-height: ${props => props.$fullScreen ? '100vh' : '300px'};
  background: ${theme.colors.background};
`;

const ErrorIcon = styled.div`
  font-size: 64px;
  color: ${theme.colors.error};
  margin-bottom: ${theme.spacing.lg};
`;

const ErrorTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.sm};
`;

const ErrorMessage = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  max-width: 500px;
  margin: 0 0 ${theme.spacing.lg};
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-top: ${theme.spacing.lg};
  text-align: left;
  max-width: 600px;
  width: 100%;
`;

const ErrorSummary = styled.summary`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  cursor: pointer;
  margin-bottom: ${theme.spacing.sm};

  &:hover {
    color: ${theme.colors.textSecondary};
  }
`;

const ErrorStack = styled.pre`
  font-family: ${theme.fonts.mono};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.error};
  background: ${theme.colors.backgroundTertiary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

/**
 * Default fallback component
 */
const DefaultFallback = ({ error, resetError, fullScreen }) => {
  const { t } = useTranslation();

  return (
    <ErrorContainer $fullScreen={fullScreen}>
      <ErrorIcon>
        <MdError />
      </ErrorIcon>
      <ErrorTitle>{t('errorBoundary.title')}</ErrorTitle>
      <ErrorMessage>
        {t('errorBoundary.message')}
      </ErrorMessage>
      <Actions>
        <Button onClick={() => window.location.reload()} variant="secondary">
          {t('errorBoundary.reloadPage')}
        </Button>
        {resetError && (
          <Button onClick={resetError}>
            <MdRefresh style={{ marginRight: 8 }} />
            {t('errorBoundary.tryAgain')}
          </Button>
        )}
      </Actions>
      {import.meta.env.DEV && error && (
        <ErrorDetails>
          <ErrorSummary>{t('errorBoundary.errorDetails')}</ErrorSummary>
          <ErrorStack>
            {error.toString()}
            {error.stack && `\n\n${error.stack}`}
          </ErrorStack>
        </ErrorDetails>
      )}
    </ErrorContainer>
  );
};

/**
 * ErrorBoundary Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to wrap
 * @param {React.ReactNode | Function} props.fallback - Custom fallback UI or render function
 * @param {Function} props.onError - Called when error is caught
 * @param {boolean} props.fullScreen - Whether fallback should be full screen
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, fullScreen = false } = this.props;
      const { error } = this.state;

      // If fallback is a function, call it with error info
      if (typeof fallback === 'function') {
        return fallback({
          error,
          resetError: this.resetError
        });
      }

      // If fallback is a component, render it
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <DefaultFallback
          error={error}
          resetError={this.resetError}
          fullScreen={fullScreen}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
