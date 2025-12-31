/**
 * PageErrorBoundary - Per-route error boundary with recovery options
 *
 * Provides isolated error handling for individual pages/routes with:
 * - Automatic retry capability
 * - Navigate to safe routes
 * - Error reporting
 * - Graceful degradation
 *
 * @architecture
 * Unlike the global ErrorBoundary, this is designed for wrapping individual
 * routes/pages, allowing partial app recovery without full reload.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MdRefresh, MdError, MdHome, MdBugReport } from 'react-icons/md';
import { withTranslation } from 'react-i18next';
import { theme, Button, Container } from '../../../design-system';

/**
 * Error recovery strategies
 */
const RECOVERY_STRATEGIES = {
  RETRY: 'retry',        // Reset error state and re-render
  NAVIGATE: 'navigate',  // Navigate to a safe page
  RELOAD: 'reload',      // Full page reload
};

/**
 * Styled Components
 */
const ErrorContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['2xl']} ${theme.spacing.lg};
  text-align: center;
  min-height: ${props => props.$fullHeight ? '70vh' : '400px'};
  background: ${theme.colors.background};
`;

const ErrorCard = styled.div`
  max-width: 500px;
  width: 100%;
  padding: ${theme.spacing['2xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const ErrorIconWrapper = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto ${theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.errorMuted};
  border-radius: 50%;
  color: ${theme.colors.error};
  font-size: 40px;
`;

const ErrorTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.sm};
`;

const ErrorMessage = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  margin: 0 0 ${theme.spacing.lg};
`;

const ErrorHint = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin: 0 0 ${theme.spacing.lg};
  font-style: italic;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: center;
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;

    > button {
      width: 100%;
    }
  }
`;

const RetryCount = styled.span`
  display: block;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-top: ${theme.spacing.md};
`;

const ErrorDetails = styled.details`
  margin-top: ${theme.spacing.lg};
  text-align: left;
  width: 100%;
`;

const ErrorSummary = styled.summary`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
  transition: all ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.textSecondary};
    background: ${theme.colors.backgroundTertiary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const ErrorStack = styled.pre`
  font-family: ${theme.fonts?.mono || 'monospace'};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.error};
  background: ${theme.colors.backgroundTertiary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  margin-top: ${theme.spacing.sm};
`;

/**
 * PageErrorBoundary Component
 *
 * Wraps page components to catch and handle errors gracefully.
 * Provides automatic retry with exponential backoff.
 */
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    };
    this.maxRetries = props.maxRetries ?? 3;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error
    console.error('PageErrorBoundary caught error:', error, errorInfo);

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo);
  }

  /**
   * Report error to external service
   */
  reportError = (_error, _errorInfo) => {
    // In production, you might send this to Sentry, LogRocket, etc.
    if (import.meta.env.PROD) {
      // Example: window.Sentry?.captureException(error, { extra: errorInfo });
    }
  };

  /**
   * Reset error state and attempt recovery
   */
  handleRetry = async () => {
    const { retryCount } = this.state;

    if (retryCount >= this.maxRetries) {
      // Max retries reached, suggest reload
      return;
    }

    this.setState({ isRecovering: true });

    // Exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
      isRecovering: false,
    });

    // Call optional onRetry callback
    if (this.props.onRetry) {
      this.props.onRetry(retryCount + 1);
    }
  };

  /**
   * Navigate to a safe route
   */
  handleNavigate = (path = '/gacha') => {
    // Use window.location for guaranteed navigation even if router is broken
    window.location.href = path;
  };

  /**
   * Full page reload
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo, retryCount, isRecovering } = this.state;
    const {
      children,
      fallback,
      pageName,
      fullHeight = true,
      showDetails = import.meta.env.DEV,
      t,
    } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback render
    if (typeof fallback === 'function') {
      return fallback({
        error,
        errorInfo,
        retry: this.handleRetry,
        navigate: this.handleNavigate,
        reload: this.handleReload,
        retryCount,
        maxRetries: this.maxRetries,
      });
    }

    if (fallback) {
      return fallback;
    }

    const canRetry = retryCount < this.maxRetries;

    return (
      <Container>
        <ErrorContainer
          $fullHeight={fullHeight}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          role="alert"
          aria-live="assertive"
        >
          <ErrorCard>
            <ErrorIconWrapper>
              <MdError aria-hidden="true" />
            </ErrorIconWrapper>

            <ErrorTitle>
              {pageName ? t('errorBoundary.errorInPage', { pageName }) : t('errorBoundary.title')}
            </ErrorTitle>

            <ErrorMessage>
              {t('errorBoundary.weEncounteredError')}
            </ErrorMessage>

            {canRetry && (
              <ErrorHint>
                {t('errorBoundary.clickTryAgain')}
              </ErrorHint>
            )}

            <ActionButtons>
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  aria-busy={isRecovering}
                >
                  <MdRefresh
                    style={{ marginRight: 8 }}
                    className={isRecovering ? 'spin' : ''}
                    aria-hidden="true"
                  />
                  {isRecovering ? t('errorBoundary.retrying') : t('errorBoundary.tryAgain')}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => this.handleNavigate('/gacha')}
              >
                <MdHome style={{ marginRight: 8 }} aria-hidden="true" />
                {t('errorBoundary.goHome')}
              </Button>

              {!canRetry && (
                <Button
                  variant="secondary"
                  onClick={this.handleReload}
                >
                  <MdRefresh style={{ marginRight: 8 }} aria-hidden="true" />
                  {t('errorBoundary.reloadPage')}
                </Button>
              )}
            </ActionButtons>

            {retryCount > 0 && (
              <RetryCount>
                {t('errorBoundary.retryAttempt', { current: retryCount, max: this.maxRetries })}
              </RetryCount>
            )}

            {showDetails && error && (
              <ErrorDetails>
                <ErrorSummary>
                  <MdBugReport style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  {t('errorBoundary.errorDetails')}
                </ErrorSummary>
                <ErrorStack>
                  {error.toString()}
                  {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
                </ErrorStack>
              </ErrorDetails>
            )}
          </ErrorCard>
        </ErrorContainer>
      </Container>
    );
  }
}

PageErrorBoundary.propTypes = {
  /** Child components to wrap */
  children: PropTypes.node.isRequired,
  /** Custom fallback UI or render function */
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  /** Page name for error messages */
  pageName: PropTypes.string,
  /** Maximum retry attempts */
  maxRetries: PropTypes.number,
  /** Whether to use full height for error container */
  fullHeight: PropTypes.bool,
  /** Whether to show error details */
  showDetails: PropTypes.bool,
  /** Callback when error occurs */
  onError: PropTypes.func,
  /** Callback on retry attempt */
  onRetry: PropTypes.func,
  /** Translation function from i18next */
  t: PropTypes.func.isRequired,
};

export default withTranslation()(PageErrorBoundary);

// Named exports for strategies
export { RECOVERY_STRATEGIES };
