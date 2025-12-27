/**
 * NetworkStatusBanner - Banner that shows network connectivity status
 *
 * Features:
 * - Shows when offline with reconnection indicator
 * - Shows brief "back online" message when reconnected
 * - Respects prefers-reduced-motion
 * - Accessible with proper ARIA attributes
 * - Non-intrusive slide-in animation
 * - Can be dismissed (persists reconnect until online)
 *
 * @example
 * // In App.js or MainLayout
 * <NetworkStatusBanner />
 *
 * @example
 * // With custom callbacks
 * <NetworkStatusBanner
 *   onRetry={() => refetchData()}
 *   showSlowWarning
 * />
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdWifiOff, MdWifi, MdRefresh, MdClose, MdSignalWifi1Bar } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../design-system';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

// ============================================
// ANIMATIONS
// ============================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ============================================
// STYLED COMPONENTS
// ============================================

const BannerWrapper = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${theme.zIndex?.banner || 1000};
  padding: ${theme.spacing.sm};
  padding-top: calc(${theme.spacing.sm} + env(safe-area-inset-top, 0px));

  /* Ensure it's above the navigation */
  @supports (padding: max(0px)) {
    padding-left: max(${theme.spacing.sm}, env(safe-area-inset-left));
    padding-right: max(${theme.spacing.sm}, env(safe-area-inset-right));
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  max-width: 500px;
  margin: 0 auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  ${props => {
    switch (props.$variant) {
      case 'offline':
        return css`
          background: linear-gradient(135deg, rgba(255, 59, 48, 0.95) 0%, rgba(200, 45, 38, 0.95) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      case 'reconnecting':
        return css`
          background: linear-gradient(135deg, rgba(255, 159, 10, 0.95) 0%, rgba(200, 125, 8, 0.95) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      case 'online':
        return css`
          background: linear-gradient(135deg, rgba(52, 199, 89, 0.95) 0%, rgba(40, 160, 70, 0.95) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      case 'slow':
        return css`
          background: linear-gradient(135deg, rgba(255, 159, 10, 0.9) 0%, rgba(200, 125, 8, 0.9) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      default:
        return '';
    }
  }}
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;

  ${props => props.$pulse && css`
    animation: ${pulse} 1.5s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}

  ${props => props.$spin && css`
    animation: ${spin} 1s linear infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const Message = styled.span`
  flex: 1;
  text-align: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  gap: ${theme.spacing.xs};
  min-height: 32px;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.95);
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
      background: rgba(255, 255, 255, 0.4);
    }
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: ${theme.radius.full};
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

// ============================================
// ANIMATION VARIANTS
// ============================================

const bannerVariants = {
  hidden: {
    y: -100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ============================================
// COMPONENT
// ============================================

/**
 * NetworkStatusBanner Component
 *
 * @param {Function} onRetry - Callback when retry button is clicked
 * @param {boolean} showSlowWarning - Show warning for slow connections
 * @param {boolean} dismissible - Whether the banner can be dismissed when online
 * @param {number} onlineDisplayDuration - How long to show "back online" message (ms)
 */
const NetworkStatusBanner = ({
  onRetry,
  showSlowWarning = false,
  dismissible = true,
  onlineDisplayDuration = 3000,
}) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    isOnline,
    isSlowConnection,
    wasRecentlyOffline,
  } = useNetworkStatus({
    onOnline: () => {
      // Reset dismissed state when coming back online
      setDismissed(false);
      setIsRetrying(false);
    },
    onOffline: () => {
      // Always show banner when going offline
      setDismissed(false);
    },
  });

  // Handle retry action
  const handleRetry = useCallback(async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } catch (e) {
        // Ignore errors - the offline state will persist
      } finally {
        setIsRetrying(false);
      }
    }
  }, [onRetry]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Check if we should show reduced motion variants
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Determine what to show
  const shouldShowOffline = !isOnline && !dismissed;
  const shouldShowOnline = isOnline && wasRecentlyOffline && !dismissed;
  const shouldShowSlow = isOnline && showSlowWarning && isSlowConnection && !wasRecentlyOffline && !dismissed;

  // Determine banner variant
  let variant = null;
  let icon = null;
  let message = '';
  let showRetry = false;

  if (shouldShowOffline) {
    variant = isRetrying ? 'reconnecting' : 'offline';
    icon = isRetrying ? (
      <IconWrapper $spin><MdRefresh /></IconWrapper>
    ) : (
      <IconWrapper $pulse><MdWifiOff /></IconWrapper>
    );
    message = isRetrying ? t('network.reconnecting') : t('network.offline');
    showRetry = !isRetrying && onRetry;
  } else if (shouldShowOnline) {
    variant = 'online';
    icon = <IconWrapper><MdWifi /></IconWrapper>;
    message = t('network.backOnline');
  } else if (shouldShowSlow) {
    variant = 'slow';
    icon = <IconWrapper><MdSignalWifi1Bar /></IconWrapper>;
    message = t('network.slowConnection');
  }

  // Don't render if nothing to show
  if (!variant) {
    return null;
  }

  return (
    <AnimatePresence>
      <BannerWrapper
        key={variant}
        variants={prefersReducedMotion ? reducedMotionVariants : bannerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="alert"
        aria-live="polite"
      >
        <BannerContent $variant={variant}>
          {icon}
          <Message>{message}</Message>

          {showRetry && (
            <ActionButton
              onClick={handleRetry}
              aria-label={t('network.retryConnection')}
            >
              <MdRefresh aria-hidden="true" />
              {t('network.retry')}
            </ActionButton>
          )}

          {dismissible && (shouldShowOnline || shouldShowSlow) && (
            <CloseButton
              onClick={handleDismiss}
              aria-label={t('network.dismissNotification')}
            >
              <MdClose aria-hidden="true" />
            </CloseButton>
          )}
        </BannerContent>
      </BannerWrapper>
    </AnimatePresence>
  );
};

NetworkStatusBanner.propTypes = {
  /** Callback when retry button is clicked */
  onRetry: PropTypes.func,
  /** Show warning for slow connections */
  showSlowWarning: PropTypes.bool,
  /** Whether the banner can be dismissed when online */
  dismissible: PropTypes.bool,
  /** How long to show "back online" message (ms) */
  onlineDisplayDuration: PropTypes.number,
};

export default NetworkStatusBanner;
