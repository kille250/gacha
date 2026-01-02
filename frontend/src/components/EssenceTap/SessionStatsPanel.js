/**
 * SessionStatsPanel - Shows current session statistics
 *
 * Features:
 * - Session duration
 * - Essence earned this session
 * - Max combo achieved
 * - Max crit streak
 * - Mini-milestone progress
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme, GlassCard, Modal, ModalBody } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconClock, IconFlame, IconLightning, IconStar, IconTrophy } from '../../constants/icons';
import api from '../../utils/api';

const StatsContainer = styled(GlassCard)`
  padding: ${theme.spacing.md};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.md};
  text-align: center;
`;

const StatIcon = styled.div`
  font-size: 24px;
  margin-bottom: ${theme.spacing.xs};
  color: ${props => props.$color || theme.colors.primary};
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const MilestoneSection = styled.div`
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MilestoneTitle = styled.h4`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const MilestoneList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const MilestoneItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$achieved
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(255, 255, 255, 0.03)'};
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => props.$achieved
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};
`;

const MilestoneName = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$achieved ? '#10B981' : theme.colors.text};
  font-weight: ${props => props.$achieved ? theme.fontWeights.semibold : 'normal'};
`;

const MilestoneProgress = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ProgressBar = styled.div`
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.$achieved
    ? 'linear-gradient(90deg, #10B981, #34D399)'
    : 'linear-gradient(90deg, #A855F7, #C084FC)'};
  border-radius: ${theme.radius.full};
`;

const ProgressText = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  min-width: 60px;
  text-align: right;
`;

const AchievementBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: linear-gradient(135deg, #10B981, #059669);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
`;

const SessionStatsPanel = memo(({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/essence-tap/session-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch session stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  const sessionMilestones = stats?.miniMilestones?.sessionMilestones || [];
  const comboMilestones = stats?.miniMilestones?.comboMilestones || [];
  const critMilestones = stats?.miniMilestones?.critStreakMilestones || [];

  const sessionEssence = stats?.essenceEarned || 0;
  const maxCombo = stats?.maxCombo || 0;
  const maxCritStreak = stats?.maxCritStreak || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Stats">
      <ModalBody>
        {loading && !stats ? (
          <StatsContainer style={{ textAlign: 'center', padding: '40px' }}>
            Loading session stats...
          </StatsContainer>
        ) : (
        <StatsContainer>
          <StatsGrid>
            <StatCard>
              <StatIcon $color="#A855F7">
                <IconClock size={24} />
              </StatIcon>
              <StatValue>{stats?.durationFormatted || '0s'}</StatValue>
              <StatLabel>Session Time</StatLabel>
            </StatCard>

            <StatCard>
              <StatIcon $color="#10B981">
                <IconStar size={24} />
              </StatIcon>
              <StatValue>{formatNumber(sessionEssence)}</StatValue>
              <StatLabel>Essence Earned</StatLabel>
            </StatCard>

            <StatCard>
              <StatIcon $color="#F59E0B">
                <IconFlame size={24} />
              </StatIcon>
              <StatValue>{maxCombo}</StatValue>
              <StatLabel>Max Combo</StatLabel>
            </StatCard>

            <StatCard>
              <StatIcon $color="#EF4444">
                <IconLightning size={24} />
              </StatIcon>
              <StatValue>{maxCritStreak}</StatValue>
              <StatLabel>Crit Streak</StatLabel>
            </StatCard>
          </StatsGrid>

          {/* Session Milestones */}
          <MilestoneSection>
            <MilestoneTitle>
              <IconTrophy size={16} />
              Session Milestones
            </MilestoneTitle>
            <MilestoneList>
              {sessionMilestones.map((milestone, index) => {
                const achieved = sessionEssence >= milestone.essence;
                const progress = Math.min(100, (sessionEssence / milestone.essence) * 100);

                return (
                  <MilestoneItem key={index} $achieved={achieved}>
                    <MilestoneName $achieved={achieved}>
                      {milestone.name}
                      {achieved && (
                        <AchievementBadge
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          style={{ marginLeft: '8px' }}
                        >
                          Achieved!
                        </AchievementBadge>
                      )}
                    </MilestoneName>
                    <MilestoneProgress>
                      <ProgressBar>
                        <ProgressFill
                          $achieved={achieved}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </ProgressBar>
                      <ProgressText>
                        {formatNumber(milestone.essence)}
                      </ProgressText>
                    </MilestoneProgress>
                  </MilestoneItem>
                );
              })}
            </MilestoneList>
          </MilestoneSection>

          {/* Combo Milestones */}
          <MilestoneSection>
            <MilestoneTitle>
              <IconFlame size={16} />
              Combo Milestones
            </MilestoneTitle>
            <MilestoneList>
              {comboMilestones.map((milestone, index) => {
                const achieved = maxCombo >= milestone.combo;
                const progress = Math.min(100, (maxCombo / milestone.combo) * 100);

                return (
                  <MilestoneItem key={index} $achieved={achieved}>
                    <MilestoneName $achieved={achieved}>
                      {milestone.name}
                      {achieved && (
                        <AchievementBadge
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{ marginLeft: '8px' }}
                        >
                          x{milestone.reward?.essenceMultiplier || 1}
                        </AchievementBadge>
                      )}
                    </MilestoneName>
                    <MilestoneProgress>
                      <ProgressBar>
                        <ProgressFill
                          $achieved={achieved}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </ProgressBar>
                      <ProgressText>
                        {milestone.combo} hits
                      </ProgressText>
                    </MilestoneProgress>
                  </MilestoneItem>
                );
              })}
            </MilestoneList>
          </MilestoneSection>

          {/* Crit Streak Milestones */}
          <MilestoneSection>
            <MilestoneTitle>
              <IconLightning size={16} />
              Crit Streak Milestones
            </MilestoneTitle>
            <MilestoneList>
              {critMilestones.map((milestone, index) => {
                const achieved = maxCritStreak >= milestone.streak;
                const progress = Math.min(100, (maxCritStreak / milestone.streak) * 100);

                return (
                  <MilestoneItem key={index} $achieved={achieved}>
                    <MilestoneName $achieved={achieved}>
                      {milestone.name}
                      {achieved && (
                        <AchievementBadge
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{ marginLeft: '8px' }}
                        >
                          x{milestone.reward?.essenceMultiplier || 1}
                        </AchievementBadge>
                      )}
                    </MilestoneName>
                    <MilestoneProgress>
                      <ProgressBar>
                        <ProgressFill
                          $achieved={achieved}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </ProgressBar>
                      <ProgressText>
                        {milestone.streak} crits
                      </ProgressText>
                    </MilestoneProgress>
                  </MilestoneItem>
                );
              })}
            </MilestoneList>
          </MilestoneSection>
        </StatsContainer>
        )}
      </ModalBody>
    </Modal>
  );
});

SessionStatsPanel.displayName = 'SessionStatsPanel';

export default SessionStatsPanel;
