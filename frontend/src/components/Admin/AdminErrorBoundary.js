/**
 * AdminErrorBoundary - Error boundary specifically for the admin section
 *
 * Catches JavaScript errors in the admin component tree and displays
 * a user-friendly error message instead of crashing the entire app.
 *
 * Features:
 * - Catches render errors, lifecycle errors, and errors in event handlers
 * - Provides a "Try Again" action to reset the error state
 * - Reports errors for debugging
 * - Maintains admin page structure during error state
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';
import { withTranslation } from 'react-i18next';
import { theme, Button, Container } from '../../design-system';

class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Admin Error Boundary caught an error:', error, errorInfo);

    this.setState({ errorInfo });

    // Report to error tracking service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleNavigateHome = () => {
    // Navigate to a safe page
    window.location.href = '/gacha';
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      const { error } = this.state;
      const isDevelopment = import.meta.env.DEV;

      return (
        <ErrorContainer>
          <Container>
            <ErrorCard>
              <IconWrapper>
                <FaExclamationTriangle />
              </IconWrapper>

              <ErrorTitle>{t('errorBoundary.title')}</ErrorTitle>

              <ErrorMessage>
                {t('errorBoundary.adminPanelError')}
              </ErrorMessage>

              {isDevelopment && error && (
                <ErrorDetails>
                  <DetailLabel>Error:</DetailLabel>
                  <DetailValue>{error.toString()}</DetailValue>
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <DetailLabel>Component Stack:</DetailLabel>
                      <DetailCode>
                        {this.state.errorInfo.componentStack}
                      </DetailCode>
                    </>
                  )}
                </ErrorDetails>
              )}

              <ActionButtons>
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                >
                  <FaRedo /> {t('errorBoundary.tryAgain')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={this.handleNavigateHome}
                >
                  <FaHome /> {t('errorBoundary.goHome')}
                </Button>
              </ActionButtons>
            </ErrorCard>
          </Container>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

// Styled components
const ErrorContainer = styled.div`
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
`;

const ErrorCard = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: ${theme.spacing['2xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto ${theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.errorMuted};
  border-radius: 50%;
  color: ${theme.colors.error};
  font-size: 28px;
`;

const ErrorTitle = styled.h2`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const ErrorMessage = styled.p`
  margin: 0 0 ${theme.spacing.lg};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
`;

const ErrorDetails = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  text-align: left;
  font-size: ${theme.fontSizes.sm};
`;

const DetailLabel = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.xs};

  &:first-child {
    margin-top: 0;
  }
`;

const DetailValue = styled.div`
  color: ${theme.colors.error};
  word-break: break-word;
`;

const DetailCode = styled.pre`
  margin: 0;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  overflow-x: auto;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: center;
  flex-wrap: wrap;
`;

// PropTypes
AdminErrorBoundary.propTypes = {
  /** Child components to wrap */
  children: PropTypes.node.isRequired,
  /** Optional callback when an error is caught */
  onError: PropTypes.func,
  /** Optional callback when reset is triggered */
  onReset: PropTypes.func,
  /** Translation function from i18next */
  t: PropTypes.func.isRequired,
};

AdminErrorBoundary.defaultProps = {
  onError: null,
  onReset: null,
};

export default withTranslation()(AdminErrorBoundary);
