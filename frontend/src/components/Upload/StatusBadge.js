/**
 * StatusBadge - Visual indicator for file upload status
 *
 * Features:
 * - Accessible status announcements
 * - Color + icon + text for clarity (not color-only)
 * - Compact and full display modes
 * - Animation for checking state
 */
import React, { memo, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  FaSpinner,
  FaCheck,
  FaExclamationTriangle,
  FaTimesCircle,
  FaClock,
  FaCloudUploadAlt,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { FILE_STATUS } from '../../hooks/useUploadState';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// Status style configuration (non-translatable)
const STATUS_STYLES = {
  [FILE_STATUS.PENDING]: {
    icon: FaClock,
    color: theme.colors.textMuted,
    bgColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  [FILE_STATUS.CHECKING]: {
    icon: FaSpinner,
    color: theme.colors.info,
    bgColor: 'rgba(90, 200, 250, 0.15)',
    borderColor: 'rgba(90, 200, 250, 0.3)',
    animate: 'spin',
  },
  [FILE_STATUS.UPLOADING]: {
    icon: FaCloudUploadAlt,
    color: theme.colors.info,
    bgColor: 'rgba(90, 200, 250, 0.15)',
    borderColor: 'rgba(90, 200, 250, 0.3)',
    animate: 'pulse',
  },
  [FILE_STATUS.ACCEPTED]: {
    icon: FaCheck,
    color: theme.colors.success,
    bgColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  [FILE_STATUS.WARNING]: {
    icon: FaExclamationTriangle,
    color: theme.colors.warning,
    bgColor: 'rgba(255, 159, 10, 0.15)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
  },
  [FILE_STATUS.BLOCKED]: {
    icon: FaTimesCircle,
    color: theme.colors.error,
    bgColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  [FILE_STATUS.ERROR]: {
    icon: FaTimesCircle,
    color: theme.colors.error,
    bgColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
};

// Hook to get translated status config
const useStatusConfig = () => {
  const { t } = useTranslation();

  return useMemo(() => ({
    [FILE_STATUS.PENDING]: {
      ...STATUS_STYLES[FILE_STATUS.PENDING],
      label: t('uploadStatus.ready'),
      description: t('uploadStatus.readyDesc'),
    },
    [FILE_STATUS.CHECKING]: {
      ...STATUS_STYLES[FILE_STATUS.CHECKING],
      label: t('uploadStatus.analyzing'),
      description: t('uploadStatus.analyzingDesc'),
    },
    [FILE_STATUS.UPLOADING]: {
      ...STATUS_STYLES[FILE_STATUS.UPLOADING],
      label: t('uploadStatus.uploading'),
      description: t('uploadStatus.uploadingDesc'),
    },
    [FILE_STATUS.ACCEPTED]: {
      ...STATUS_STYLES[FILE_STATUS.ACCEPTED],
      label: t('uploadStatus.valid'),
      description: t('uploadStatus.validDesc'),
    },
    [FILE_STATUS.WARNING]: {
      ...STATUS_STYLES[FILE_STATUS.WARNING],
      label: t('uploadStatus.warning'),
      description: t('uploadStatus.warningDesc'),
    },
    [FILE_STATUS.BLOCKED]: {
      ...STATUS_STYLES[FILE_STATUS.BLOCKED],
      label: t('uploadStatus.blocked'),
      description: t('uploadStatus.blockedDesc'),
    },
    [FILE_STATUS.ERROR]: {
      ...STATUS_STYLES[FILE_STATUS.ERROR],
      label: t('uploadStatus.error'),
      description: t('uploadStatus.errorDesc'),
    },
  }), [t]);
};

const StatusBadge = memo(({
  status,
  compact = false,
  showLabel = true,
  className,
  title,
}) => {
  const STATUS_CONFIG = useStatusConfig();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[FILE_STATUS.PENDING];
  const Icon = config.icon;

  if (compact) {
    return (
      <CompactBadge
        $color={config.color}
        $bgColor={config.bgColor}
        $animate={config.animate}
        role="status"
        aria-label={config.description}
        title={title || config.description}
        className={className}
      >
        <Icon />
      </CompactBadge>
    );
  }

  return (
    <FullBadge
      $color={config.color}
      $bgColor={config.bgColor}
      $borderColor={config.borderColor}
      $animate={config.animate}
      role="status"
      aria-label={config.description}
      className={className}
    >
      <IconWrapper $animate={config.animate}>
        <Icon />
      </IconWrapper>
      {showLabel && <Label>{config.label}</Label>}
    </FullBadge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Styled components
const CompactBadge = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${props => props.$bgColor};
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;

  ${props => props.$animate === 'spin' && css`
    svg {
      animation: ${spin} 1s linear infinite;
    }
  `}

  ${props => props.$animate === 'pulse' && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

const FullBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor};
  border-radius: ${theme.radius.full};
  color: ${props => props.$color};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};

  ${props => props.$animate === 'pulse' && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  font-size: 10px;

  ${props => props.$animate === 'spin' && css`
    svg {
      animation: ${spin} 1s linear infinite;
    }
  `}
`;

const Label = styled.span`
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Export status styles for external use (non-translated)
export { STATUS_STYLES };
export default StatusBadge;
