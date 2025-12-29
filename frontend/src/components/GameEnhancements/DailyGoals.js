/**
 * DailyGoals - Daily objectives widget
 *
 * Shows 3-5 daily tasks that reset at midnight.
 * Completing goals provides bonus rewards and encourages varied gameplay.
 */

import React, { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaGift, FaFish, FaDice, FaDumbbell, FaStar } from 'react-icons/fa';
import { theme } from '../../design-system';

// Animations
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
`;

const checkmarkDraw = keyframes`
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
`;

// Container
const Container = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const Title = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ResetTimer = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  background: ${theme.colors.glass};
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
`;

// Progress overview
const ProgressOverview = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
  border-radius: ${theme.radius.lg};
  border: 1px solid rgba(76, 175, 80, 0.2);
`;

const ProgressCircle = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
`;

const ProgressRing = styled.svg`
  transform: rotate(-90deg);
  width: 60px;
  height: 60px;
`;

const ProgressBg = styled.circle`
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 6;
`;

const ProgressFill = styled.circle`
  fill: none;
  stroke: #4caf50;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: ${props => props.$circumference};
  stroke-dashoffset: ${props => props.$offset};
  transition: stroke-dashoffset 0.5s ease-out;
`;

const ProgressText = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ProgressCount = styled.span`
  font-size: 1.2rem;
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const ProgressLabel = styled.span`
  font-size: 0.6rem;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
`;

const ProgressInfo = styled.div`
  flex: 1;
`;

const ProgressTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const ProgressSubtext = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const BonusReward = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${props => props.$unlocked
    ? 'linear-gradient(135deg, #ffd700 0%, #ffab00 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$unlocked ? '#1a1a2e' : theme.colors.textMuted};
  padding: 6px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: ${props => props.$unlocked ? 'pointer' : 'default'};

  ${props => props.$unlocked && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

// Goal list
const GoalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const GoalItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$completed
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)'
    : theme.colors.glass};
  border: 1px solid ${props => props.$completed
    ? 'rgba(76, 175, 80, 0.3)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  transition: all 0.2s ease;

  ${props => !props.$completed && css`
    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
    }
  `}
`;

const GoalIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$color || theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: white;
  flex-shrink: 0;
  opacity: ${props => props.$completed ? 0.7 : 1};
`;

const GoalContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const GoalTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$completed ? theme.colors.textSecondary : theme.colors.text};
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
`;

const GoalProgress = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: 4px;
`;

const GoalProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

const GoalProgressFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.$completed
    ? '#4caf50'
    : 'linear-gradient(90deg, #2196f3, #64b5f6)'};
  border-radius: 2px;
`;

const GoalProgressText = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  white-space: nowrap;
`;

const GoalReward = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$completed ? '#4caf50' : '#ffc107'};
  font-weight: ${theme.fontWeights.semibold};
  white-space: nowrap;
`;

const CheckCircle = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.$completed ? '#4caf50' : 'transparent'};
  border: 2px solid ${props => props.$completed ? '#4caf50' : 'rgba(255, 255, 255, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: white;
    font-size: 12px;
  }
`;

// Goal type icons
const GOAL_ICONS = {
  gacha: { icon: FaDice, color: '#9c27b0' },
  fishing: { icon: FaFish, color: '#2196f3' },
  dojo: { icon: FaDumbbell, color: '#ff9800' },
  collection: { icon: FaStar, color: '#ffc107' },
  default: { icon: FaGift, color: theme.colors.primary },
};

/**
 * DailyGoals Component
 *
 * @param {Object} props
 * @param {Array} props.goals - Array of goal objects
 * @param {Function} props.onClaimBonus - Callback when bonus is claimed
 * @param {string} props.resetTime - ISO timestamp of next reset
 */
export function DailyGoals({
  goals = [],
  onClaimBonus,
  resetTime,
}) {
  const { t } = useTranslation();

  // Default goals if none provided
  const defaultGoals = useMemo(() => [
    {
      id: 'daily_pull',
      type: 'gacha',
      title: t('dailyGoals.pullOnce', 'Make a gacha pull'),
      current: 0,
      target: 1,
      reward: 50,
      rewardType: 'points',
    },
    {
      id: 'daily_fish',
      type: 'fishing',
      title: t('dailyGoals.catchFish', 'Catch 5 fish'),
      current: 0,
      target: 5,
      reward: 100,
      rewardType: 'points',
    },
    {
      id: 'daily_dojo',
      type: 'dojo',
      title: t('dailyGoals.claimDojo', 'Claim dojo rewards'),
      current: 0,
      target: 1,
      reward: 50,
      rewardType: 'points',
    },
    {
      id: 'daily_login',
      type: 'default',
      title: t('dailyGoals.collectHourly', 'Collect hourly reward'),
      current: 0,
      target: 1,
      reward: 25,
      rewardType: 'points',
    },
  ], [t]);

  const displayGoals = goals.length > 0 ? goals : defaultGoals;

  // Calculate completion stats
  const completedCount = displayGoals.filter(g => g.current >= g.target).length;
  const totalCount = displayGoals.length;
  const allCompleted = completedCount === totalCount;

  // Calculate time until reset
  const getTimeUntilReset = () => {
    if (!resetTime) {
      // Default to midnight
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      return `${hours}h ${minutes}m`;
    }
    const reset = new Date(resetTime);
    const now = new Date();
    const diff = reset - now;
    if (diff <= 0) return t('dailyGoals.resettingSoon', 'Resetting soon...');
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  // Progress circle calculations
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = completedCount / totalCount;
  const offset = circumference - (progress * circumference);

  // Bonus reward calculation
  const bonusReward = completedCount >= 3 ? 200 : 0;

  return (
    <Container
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Header>
        <Title>
          📋 {t('dailyGoals.title', 'Daily Goals')}
        </Title>
        <ResetTimer>
          {t('dailyGoals.resetsIn', 'Resets in')} {getTimeUntilReset()}
        </ResetTimer>
      </Header>

      <ProgressOverview>
        <ProgressCircle>
          <ProgressRing>
            <ProgressBg cx="30" cy="30" r={radius} />
            <ProgressFill
              cx="30"
              cy="30"
              r={radius}
              $circumference={circumference}
              $offset={offset}
            />
          </ProgressRing>
          <ProgressText>
            <ProgressCount>{completedCount}/{totalCount}</ProgressCount>
            <ProgressLabel>{t('dailyGoals.done', 'Done')}</ProgressLabel>
          </ProgressText>
        </ProgressCircle>

        <ProgressInfo>
          <ProgressTitle>
            {allCompleted
              ? t('dailyGoals.allComplete', 'All goals complete!')
              : t('dailyGoals.keepGoing', 'Keep going!')}
          </ProgressTitle>
          <ProgressSubtext>
            {allCompleted
              ? t('dailyGoals.bonusUnlocked', 'Daily bonus unlocked!')
              : t('dailyGoals.completeFor', { count: totalCount - completedCount }) ||
                `Complete ${totalCount - completedCount} more for bonus`}
          </ProgressSubtext>
        </ProgressInfo>

        <BonusReward
          $unlocked={allCompleted}
          whileHover={allCompleted ? { scale: 1.05 } : {}}
          whileTap={allCompleted ? { scale: 0.95 } : {}}
          onClick={allCompleted ? onClaimBonus : undefined}
        >
          <FaGift />
          +{bonusReward || 200}
        </BonusReward>
      </ProgressOverview>

      <GoalList>
        <AnimatePresence>
          {displayGoals.map((goal, index) => {
            const completed = goal.current >= goal.target;
            const progressPercent = Math.min((goal.current / goal.target) * 100, 100);
            const goalConfig = GOAL_ICONS[goal.type] || GOAL_ICONS.default;
            const IconComponent = goalConfig.icon;

            return (
              <GoalItem
                key={goal.id}
                $completed={completed}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GoalIcon $color={goalConfig.color} $completed={completed}>
                  <IconComponent />
                </GoalIcon>

                <GoalContent>
                  <GoalTitle $completed={completed}>
                    {goal.title}
                  </GoalTitle>
                  <GoalProgress>
                    <GoalProgressBar>
                      <GoalProgressFill
                        $completed={completed}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                      />
                    </GoalProgressBar>
                    <GoalProgressText>
                      {goal.current}/{goal.target}
                    </GoalProgressText>
                  </GoalProgress>
                </GoalContent>

                <GoalReward $completed={completed}>
                  {completed ? <FaCheck /> : null}
                  +{goal.reward}
                </GoalReward>

                <CheckCircle $completed={completed}>
                  {completed && <FaCheck />}
                </CheckCircle>
              </GoalItem>
            );
          })}
        </AnimatePresence>
      </GoalList>
    </Container>
  );
}

/**
 * Compact version for sidebars/headers
 */
export function DailyGoalsCompact({ goals = [], onClick }) {
  const completedCount = goals.filter(g => g.current >= g.target).length;
  const totalCount = goals.length || 4;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: theme.colors.glass,
        border: `1px solid ${theme.colors.surfaceBorder}`,
        borderRadius: theme.radius.lg,
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>📋</span>
      <div>
        <div style={{ fontSize: theme.fontSizes.sm, fontWeight: 600, color: theme.colors.text }}>
          Daily Goals
        </div>
        <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary }}>
          {completedCount}/{totalCount} complete
        </div>
      </div>
      {completedCount === totalCount && (
        <div style={{
          background: '#4caf50',
          color: 'white',
          fontSize: '0.65rem',
          padding: '2px 6px',
          borderRadius: '10px',
          fontWeight: 600,
        }}>
          BONUS!
        </div>
      )}
    </motion.div>
  );
}

export default DailyGoals;
