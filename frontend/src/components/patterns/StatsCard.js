/**
 * StatsCard - Displays statistics in a visually appealing card format
 *
 * Used for showing collection progress, game stats, etc.
 * Supports multiple stat items with optional progress bar.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';

const Card = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-bottom: ${props => props.$hasProgress ? theme.spacing.md : '0'};
`;

const StatItem = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const StatValue = styled.span`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['3xl']};
  }
`;

const StatLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDivider = styled.div`
  width: 1px;
  background: ${theme.colors.surfaceBorder};
  margin: 0 ${theme.spacing.md};
`;

const ProgressBar = styled.div`
  height: 6px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${theme.colors.primary},
    ${theme.colors.accent}
  );
  border-radius: 3px;
`;

/**
 * StatsCard Component
 *
 * @param {Object} props
 * @param {Array} props.stats - Array of stat objects: { value, label, color? }
 * @param {number} props.progress - Optional progress value (0-100)
 * @param {boolean} props.showProgress - Whether to show progress bar
 * @param {string} props.className - Additional CSS class
 */
const StatsCard = ({
  stats = [],
  progress,
  showProgress = false,
  className,
}) => {
  const hasProgress = showProgress && typeof progress === 'number';

  return (
    <Card
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <StatsRow $hasProgress={hasProgress}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            {index > 0 && <StatDivider />}
            <StatItem>
              <StatValue $color={stat.color}>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatItem>
          </React.Fragment>
        ))}
      </StatsRow>

      {hasProgress && (
        <ProgressBar>
          <ProgressFill
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </ProgressBar>
      )}
    </Card>
  );
};

export default StatsCard;
