/**
 * ActionButton - Button with built-in loading state and disabled reason tooltip
 *
 * Use for buttons that trigger async operations. Automatically shows
 * loading spinner and can display a tooltip explaining why the button
 * is disabled.
 */

import React, { forwardRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme, Button } from '../../../design-system';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  width: ${props => props.$size || '16px'};
  height: ${props => props.$size || '16px'};
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  flex-shrink: 0;
`;

const ButtonContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;

  ${props => props.$fullWidth && `
    width: 100%;
  `}
`;

const Tooltip = styled(motion.div)`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  z-index: ${theme.zIndex.tooltip};
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${theme.colors.backgroundTertiary};
  }
`;

/**
 * ActionButton Component
 *
 * @param {Object} props
 * @param {boolean} props.loading - Whether the action is in progress
 * @param {string} props.loadingText - Text to show while loading (optional)
 * @param {string} props.disabledReason - Tooltip text explaining why button is disabled
 * @param {React.ReactNode} props.icon - Optional icon to show before text
 * @param {boolean} props.showTooltip - Force show/hide tooltip (default: show when disabled with reason)
 * @param {...} props - All other props passed to Button
 */
const ActionButton = forwardRef(({
  children,
  loading = false,
  loadingText,
  disabled = false,
  disabledReason,
  icon,
  showTooltip,
  fullWidth = false,
  ...props
}, ref) => {
  const isDisabled = loading || disabled;
  const shouldShowTooltip = showTooltip ?? (isDisabled && disabledReason);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <TooltipWrapper
      $fullWidth={fullWidth}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        ref={ref}
        disabled={isDisabled}
        fullWidth={fullWidth}
        aria-busy={loading}
        aria-describedby={shouldShowTooltip ? 'action-tooltip' : undefined}
        {...props}
      >
        <ButtonContent>
          {loading ? (
            <>
              <LoadingSpinner />
              <span>{loadingText || children}</span>
            </>
          ) : (
            <>
              {icon}
              {children}
            </>
          )}
        </ButtonContent>
      </Button>

      {shouldShowTooltip && isHovered && (
        <Tooltip
          id="action-tooltip"
          role="tooltip"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
        >
          {disabledReason}
        </Tooltip>
      )}
    </TooltipWrapper>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;
