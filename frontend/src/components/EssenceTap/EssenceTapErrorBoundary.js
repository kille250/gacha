/**
 * EssenceTapErrorBoundary - Error boundary for the Essence Tap game
 *
 * Catches rendering errors and provides a fallback UI
 * with options to retry or report the issue.
 */

import React, { Component } from 'react';
import styled from 'styled-components';
import { theme, GlassCard, Button } from '../../design-system';
import { IconAlertTriangle, IconRefresh } from '../../constants/icons';

const ErrorContainer = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xxl};
  min-height: 400px;
  gap: ${theme.spacing.lg};
`;

const ErrorIcon = styled.div`
  font-size: 64px;
  color: #EF4444;
  margin-bottom: ${theme.spacing.md};
`;

const ErrorTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
`;

const ErrorMessage = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  max-width: 400px;
  margin: 0;
`;

const ErrorDetails = styled.details`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: ${theme.radius.md};
  max-width: 100%;
  overflow: auto;
  text-align: left;

  summary {
    cursor: pointer;
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.textSecondary};
    margin-bottom: ${theme.spacing.sm};
  }

  pre {
    font-size: ${theme.fontSizes.xs};
    color: #EF4444;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  justify-content: center;
`;

class EssenceTapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console
    console.error('Essence Tap Error:', error);
    console.error('Error Info:', errorInfo);

    // You could also send to an error reporting service here
    // Example: reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorIcon>
            <IconAlertTriangle size={64} />
          </ErrorIcon>

          <ErrorTitle>Something went wrong</ErrorTitle>

          <ErrorMessage>
            The Essence Tap game encountered an error. Your progress has been saved automatically.
            Try refreshing the page or click the button below to retry.
          </ErrorMessage>

          {this.state.error && (
            <ErrorDetails>
              <summary>View error details</summary>
              <pre>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </ErrorDetails>
          )}

          <ButtonGroup>
            <Button variant="primary" onClick={this.handleRetry}>
              <IconRefresh size={16} style={{ marginRight: '8px' }} />
              Try Again
            </Button>

            <Button variant="secondary" onClick={this.handleReload}>
              Reload Page
            </Button>
          </ButtonGroup>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default EssenceTapErrorBoundary;
