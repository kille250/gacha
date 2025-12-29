/**
 * StreakDisplay - Shows login/activity streak with fire animation
 *
 * Displays the current streak with visual urgency when streak is at risk.
 * Encourages daily engagement through loss aversion psychology.
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';

// Animations
const fireFlicker = keyframes`
  0%, 100% { transform: scale(1) rotate(-2deg); opacity: 1; }
  25% { transform: scale(1.05) rotate(1deg); opacity: 0.95; }
  50% { transform: scale(0.98) rotate(-1deg); opacity: 1; }
  75% { transform: scale(1.03) rotate(2deg); opacity: 0.97; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Container
const Container = styled(motion.div)`
  background: ${props => props.$atRisk
    ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 87, 34, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(255, 193, 7, 0.05) 100%)'};
  border: 1px solid ${props => props.$atRisk
    ? 'rgba(255, 152, 0, 0.4)'
    : 'rgba(255, 193, 7, 0.2)'};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  position: relative;
  overflow: hidden;
  animation: ${fadeInUp} 0.3s ease-out;
`;

const FireIcon = styled.span`
  font-size: 2rem;
  animation: ${fireFlicker} 0.8s ease-in-out infinite;
  filter: drop-shadow(0 0 6px rgba(255, 152, 0, 0.5));
`;

const StreakContent = styled.div`
  flex: 1;
`;

const StreakTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${theme.spacing.sm};
`;

const StreakCount = styled.span`
  font-size: 1.8rem;
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(
    90deg,
    #ff9800 0%,
    #ffc107 25%,
    #ff9800 50%,
    #ffc107 75%,
    #ff9800 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const StreakLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StreakSubtext = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$atRisk ? '#ff9800' : theme.colors.textTertiary};
  margin-top: 2px;
  font-weight: ${props => props.$atRisk ? '600' : '400'};
`;

const BonusIndicator = styled(motion.div)`
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: ${theme.radius.md};
  padding: 4px 8px;
  font-size: ${theme.fontSizes.xs};
  color: #4caf50;
  font-weight: ${theme.fontWeights.semibold};
`;

const AtRiskBadge = styled(motion.div)`
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #ff5722 0%, #f44336 100%);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 0 ${theme.radius.lg} 0 ${theme.radius.md};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Milestone markers
const MilestoneMarkers = styled.div`
  display: flex;
  gap: 4px;
  margin-top: ${theme.spacing.sm};
`;

const MilestoneMarker = styled.div`
  width: 24px;
  height: 4px;
  border-radius: 2px;
  background: ${props => props.$achieved
    ? 'linear-gradient(90deg, #ff9800, #ffc107)'
    : 'rgba(255, 255, 255, 0.1)'};
  transition: all 0.3s ease;
`;

/**
 * StreakDisplay Component
 *
 * @param {Object} props
 * @param {number} props.streakDays - Current streak in days
 * @param {string} props.lastActivityTime - ISO timestamp of last activity
 * @param {number} props.graceHours - Hours remaining in grace period (36h default)
 * @param {string} props.type - 'login' | 'dojo' | 'fishing'
 * @param {boolean} props.compact - Compact display mode
 * @param {Function} props.onStreakClick - Optional click handler
 */
export function StreakDisplay({
  streakDays = 0,
  lastActivityTime,
  graceHours = 36,
  type = 'login',
  compact = false,
  onStreakClick,
}) {
  const { t } = useTranslation();

  // Calculate if streak is at risk
  const getTimeRemaining = () => {
    if (!lastActivityTime) return null;
    const last = new Date(lastActivityTime);
    const gracePeriodEnd = new Date(last.getTime() + graceHours * 60 * 60 * 1000);
    const now = new Date();
    const remaining = gracePeriodEnd - now;

    if (remaining <= 0) return { expired: true, hours: 0, minutes: 0 };

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    return { expired: false, hours, minutes, isUrgent: hours < 6 };
  };

  const timeRemaining = getTimeRemaining();
  const isAtRisk = timeRemaining?.isUrgent && !timeRemaining?.expired;

  // Determine streak milestone
  const getNextMilestone = (days) => {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    return milestones.find(m => m > days) || 365;
  };

  const nextMilestone = getNextMilestone(streakDays);
  const milestoneProgress = Math.min((streakDays / nextMilestone) * 7, 7);

  // Get label based on type
  const getTypeLabel = () => {
    switch (type) {
      case 'dojo': return t('streak.dojoStreak', 'Dojo Streak');
      case 'fishing': return t('streak.fishingStreak', 'Fishing Streak');
      default: return t('streak.loginStreak', 'Login Streak');
    }
  };

  // Get bonus text based on streak length
  const getBonusText = () => {
    if (streakDays >= 365) return t('streak.bonus365', '+100% XP');
    if (streakDays >= 180) return t('streak.bonus180', '+50% XP');
    if (streakDays >= 90) return t('streak.bonus90', '+25% XP');
    if (streakDays >= 30) return t('streak.bonus30', '+10% XP');
    if (streakDays >= 7) return t('streak.bonus7', '+5% XP');
    return null;
  };

  const bonusText = getBonusText();

  if (streakDays === 0) {
    return (
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onStreakClick}
        style={{ cursor: onStreakClick ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🔥</span>
        <StreakContent>
          <StreakTitle>
            <StreakCount style={{ color: theme.colors.textMuted, background: 'none', WebkitTextFillColor: theme.colors.textMuted }}>
              0
            </StreakCount>
            <StreakLabel>{getTypeLabel()}</StreakLabel>
          </StreakTitle>
          <StreakSubtext>
            {t('streak.startToday', 'Start your streak today!')}
          </StreakSubtext>
        </StreakContent>
      </Container>
    );
  }

  return (
    <Container
      $atRisk={isAtRisk}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={onStreakClick ? { scale: 1.02 } : {}}
      onClick={onStreakClick}
      style={{ cursor: onStreakClick ? 'pointer' : 'default' }}
    >
      {isAtRisk && (
        <AtRiskBadge
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {t('streak.atRisk', 'At Risk!')}
        </AtRiskBadge>
      )}

      <FireIcon>🔥</FireIcon>

      <StreakContent>
        <StreakTitle>
          <StreakCount>{streakDays}</StreakCount>
          <StreakLabel>
            {streakDays === 1
              ? t('streak.day', 'Day')
              : t('streak.days', 'Days')}
          </StreakLabel>
          {bonusText && (
            <BonusIndicator
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {bonusText}
            </BonusIndicator>
          )}
        </StreakTitle>

        <StreakSubtext $atRisk={isAtRisk}>
          {isAtRisk ? (
            t('streak.expiresIn', { hours: timeRemaining.hours, minutes: timeRemaining.minutes }) ||
            `Expires in ${timeRemaining.hours}h ${timeRemaining.minutes}m - don't lose it!`
          ) : (
            t('streak.keepGoing', { next: nextMilestone }) ||
            `${nextMilestone - streakDays} days until next milestone!`
          )}
        </StreakSubtext>

        {!compact && (
          <MilestoneMarkers>
            {[...Array(7)].map((_, i) => (
              <MilestoneMarker key={i} $achieved={i < milestoneProgress} />
            ))}
          </MilestoneMarkers>
        )}
      </StreakContent>
    </Container>
  );
}

/**
 * Compact inline streak badge for headers
 */
export function StreakBadge({ streakDays = 0, onClick }) {
  if (streakDays === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 193, 7, 0.15) 100%)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '20px',
        padding: '4px 10px',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#ff9800',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: '0.9em' }}>🔥</span>
      {streakDays}
    </motion.div>
  );
}

export default StreakDisplay;
