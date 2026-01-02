/**
 * WeeklyTournament - Weekly tournament display for Essence Tap
 *
 * Features:
 * - Current tier progress
 * - Time remaining
 * - Tier rewards preview
 * - Claim rewards button
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import api from '../../utils/api';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconTrophy, IconClock, IconGift, IconBronzeMedal, IconSilverMedal, IconGoldMedal, IconDiamond, IconCrownSymbol, IconStar, IconUsers, IconRefresh } from '../../constants/icons';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const CurrentTierDisplay = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
  background: ${props => `linear-gradient(135deg, ${props.$color}20, ${props.$color}10)`};
  border: 2px solid ${props => props.$color};
  border-radius: ${theme.radius.lg};
`;

const TierIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.sm};
`;

const TierName = styled.div`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, ${props => props.$color}, ${props => props.$colorEnd || props.$color});
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const TierProgress = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.lg};
`;

const TimeLabel = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

const TimeValue = styled.span`
  color: #FCD34D;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.lg};
`;

const ProgressSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const ProgressLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ProgressValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #A855F7;
`;

const ProgressBar = styled.div`
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.full};
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${props => props.$color || '#A855F7'}, ${props => props.$colorEnd || '#EC4899'});
  border-radius: ${theme.radius.full};
  width: ${props => Math.min(100, props.$percent)}%;
  transition: width 0.5s ease;
`;

const TierList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const TierItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$current
    ? `linear-gradient(135deg, ${props.$color}20, ${props.$color}10)`
    : props.$achieved
      ? 'rgba(16, 185, 129, 0.1)'
      : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$current
    ? props.$color
    : props.$achieved
      ? 'rgba(16, 185, 129, 0.3)'
      : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
  opacity: ${props => props.$locked ? 0.5 : 1};
`;

const TierBadge = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => `linear-gradient(135deg, ${props.$color}, ${props.$colorEnd || props.$color})`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`;

const TierInfo = styled.div`
  flex: 1;
`;

const TierItemName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const TierThreshold = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const TierRewards = styled.div`
  text-align: right;
`;

const RewardItem = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
`;

const ClaimSection = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const ClaimTitle = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: #10B981;
  margin-bottom: ${theme.spacing.sm};
`;

const ClaimRewards = styled.div`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
`;

const EssenceDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(138, 43, 226, 0.1);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.lg};
`;

const EssenceLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const EssenceValue = styled.span`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
`;

// Tabs for switching between views
const TabContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: ${theme.spacing.sm};
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.2)' : 'transparent'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? '#A855F7' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.text};
  }
`;

// Leaderboard styles
const LeaderboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const LeaderboardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.md};
`;

const LeaderboardTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${theme.colors.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LeaderboardEntry = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$isCurrentUser
    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))'
    : props.$rank <= 3
      ? `linear-gradient(135deg, ${props.$rankColor}15, transparent)`
      : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$isCurrentUser
    ? 'rgba(168, 85, 247, 0.5)'
    : props.$rank <= 3
      ? `${props.$rankColor}40`
      : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
`;

const RankBadge = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$rank) {
      case 1: return 'linear-gradient(135deg, #FFD700, #FFA500)';
      case 2: return 'linear-gradient(135deg, #C0C0C0, #808080)';
      case 3: return 'linear-gradient(135deg, #CD7F32, #8B4513)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank <= 3 ? theme.fontSizes.lg : theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$rank <= 3 ? '#1a1a2e' : theme.colors.textSecondary};
`;

const PlayerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlayerName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlayerTier = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$color || theme.colors.textSecondary};
`;

const PlayerEssence = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
  text-align: right;
`;

const TopThreeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.lg} 0;
`;

const TopPlayer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const TopPlayerAvatar = styled.div`
  width: ${props => props.$rank === 1 ? '80px' : '60px'};
  height: ${props => props.$rank === 1 ? '80px' : '60px'};
  border-radius: 50%;
  background: ${props => {
    switch (props.$rank) {
      case 1: return 'linear-gradient(135deg, #FFD700, #FFA500)';
      case 2: return 'linear-gradient(135deg, #C0C0C0, #808080)';
      case 3: return 'linear-gradient(135deg, #CD7F32, #8B4513)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank === 1 ? '32px' : '24px'};
  font-weight: ${theme.fontWeights.bold};
  color: #1a1a2e;
  margin-bottom: ${theme.spacing.sm};
  box-shadow: ${props => props.$rank === 1
    ? '0 0 30px rgba(255, 215, 0, 0.4)'
    : props.$rank === 2
      ? '0 0 20px rgba(192, 192, 192, 0.3)'
      : '0 0 15px rgba(205, 127, 50, 0.3)'};
`;

const TopPlayerName = styled.div`
  font-size: ${props => props.$rank === 1 ? theme.fontSizes.base : theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TopPlayerEssence = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: #A855F7;
  font-weight: ${theme.fontWeights.medium};
`;

const YourRankSection = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: ${theme.radius.lg};
`;

const YourRankLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const YourRankValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
`;

const LoadingSpinner = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const TIER_CONFIG = {
  Bronze: { color: '#CD7F32', colorEnd: '#8B4513', IconComponent: IconBronzeMedal, minEssence: 1000000 },
  Silver: { color: '#C0C0C0', colorEnd: '#808080', IconComponent: IconSilverMedal, minEssence: 10000000 },
  Gold: { color: '#FFD700', colorEnd: '#FFA500', IconComponent: IconGoldMedal, minEssence: 50000000 },
  Platinum: { color: '#E5E4E2', colorEnd: '#B4B4B4', IconComponent: IconStar, minEssence: 200000000 },
  Diamond: { color: '#B9F2FF', colorEnd: '#40E0D0', IconComponent: IconDiamond, minEssence: 1000000000 },
  Champion: { color: '#FF6B6B', colorEnd: '#FFD93D', IconComponent: IconCrownSymbol, minEssence: 10000000000 }
};

const TIER_REWARDS = {
  Bronze: { fatePoints: 5, rollTickets: 1 },
  Silver: { fatePoints: 15, rollTickets: 3 },
  Gold: { fatePoints: 30, rollTickets: 5 },
  Platinum: { fatePoints: 50, rollTickets: 10 },
  Diamond: { fatePoints: 100, rollTickets: 20 },
  Champion: { fatePoints: 200, rollTickets: 50 }
};

// Helper to get rank color
const getRankColor = (rank) => {
  switch (rank) {
    case 1: return '#FFD700';
    case 2: return '#C0C0C0';
    case 3: return '#CD7F32';
    default: return '#9CA3AF';
  }
};

// Helper to get player tier from essence
const getPlayerTier = (essence) => {
  return Object.entries(TIER_CONFIG)
    .reverse()
    .find(([, config]) => essence >= config.minEssence)?.[0] || null;
};

const WeeklyTournament = memo(({
  isOpen,
  onClose,
  getTournamentInfo,
  onClaimRewards
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('progress');
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch tournament info
  useEffect(() => {
    if (isOpen && getTournamentInfo) {
      setLoading(true);
      getTournamentInfo().then(result => {
        if (result.success) {
          setTournamentInfo(result);
        }
        setLoading(false);
      });
    }
  }, [isOpen, getTournamentInfo]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const response = await api.get('/essence-tap/tournament/leaderboard');
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard || []);
        setLastRefresh(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Fetch leaderboard when tab changes to leaderboard
  useEffect(() => {
    if (isOpen && activeTab === 'leaderboard' && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [isOpen, activeTab, leaderboard.length, fetchLeaderboard]);

  // Update time remaining
  useEffect(() => {
    if (!tournamentInfo?.endsAt) return;

    const updateTime = () => {
      const now = Date.now();
      const end = new Date(tournamentInfo.endsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [tournamentInfo?.endsAt]);

  const handleClaim = useCallback(async () => {
    if (!tournamentInfo?.canClaim) return;

    setClaiming(true);
    try {
      await onClaimRewards();
      // Refresh tournament info
      if (getTournamentInfo) {
        const result = await getTournamentInfo();
        if (result.success) {
          setTournamentInfo(result);
        }
      }
    } finally {
      setClaiming(false);
    }
  }, [tournamentInfo?.canClaim, onClaimRewards, getTournamentInfo]);

  // Determine current tier
  const weeklyEssence = tournamentInfo?.weeklyEssence || 0;
  const currentTier = Object.entries(TIER_CONFIG)
    .reverse()
    .find(([, config]) => weeklyEssence >= config.minEssence)?.[0] || null;

  // Find next tier
  const tiers = Object.keys(TIER_CONFIG);
  const currentTierIndex = currentTier ? tiers.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;

  // Calculate progress to next tier
  const currentThreshold = currentTier ? TIER_CONFIG[currentTier].minEssence : 0;
  const nextThreshold = nextTierConfig?.minEssence || currentThreshold;
  const progressPercent = nextTier
    ? ((weeklyEssence - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  const tierConfig = currentTier ? TIER_CONFIG[currentTier] : { color: '#9CA3AF', IconComponent: IconTrophy };

  // Render leaderboard view
  const renderLeaderboard = () => {
    const topThree = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3, 20);
    const currentUserRank = tournamentInfo?.rank || null;
    const currentUserId = tournamentInfo?.userId || null;

    // Reorder top three for podium display (2nd, 1st, 3rd)
    const podiumOrder = topThree.length >= 3
      ? [topThree[1], topThree[0], topThree[2]]
      : topThree;

    return (
      <LeaderboardContainer>
        <LeaderboardHeader>
          <LeaderboardTitle>
            <IconUsers size={20} />
            {t('essenceTap.tournament.leaderboard', { defaultValue: 'Leaderboard' })}
          </LeaderboardTitle>
          <RefreshButton
            onClick={fetchLeaderboard}
            disabled={leaderboardLoading}
          >
            <IconRefresh size={14} />
            {leaderboardLoading ? 'Loading...' : 'Refresh'}
          </RefreshButton>
        </LeaderboardHeader>

        {leaderboardLoading && leaderboard.length === 0 ? (
          <LoadingSpinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <IconRefresh size={24} />
          </LoadingSpinner>
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
            {t('essenceTap.tournament.noPlayers', { defaultValue: 'No players yet this week' })}
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <TopThreeContainer>
                {podiumOrder.map((player, idx) => {
                  const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  const tier = getPlayerTier(player.weeklyEssence);
                  const tierConf = tier ? TIER_CONFIG[tier] : null;

                  return (
                    <TopPlayer
                      key={player.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <TopPlayerAvatar $rank={actualRank}>
                        {actualRank}
                      </TopPlayerAvatar>
                      <TopPlayerName $rank={actualRank}>
                        {player.username || `Player ${player.id}`}
                      </TopPlayerName>
                      {tierConf && (
                        <PlayerTier $color={tierConf.color}>
                          <tierConf.IconComponent size={12} />
                          {tier}
                        </PlayerTier>
                      )}
                      <TopPlayerEssence>
                        {formatNumber(player.weeklyEssence)}
                      </TopPlayerEssence>
                    </TopPlayer>
                  );
                })}
              </TopThreeContainer>
            )}

            {/* Rest of leaderboard */}
            <AnimatePresence>
              {rest.map((player, idx) => {
                const rank = idx + 4;
                const isCurrentUser = player.id === currentUserId;
                const tier = getPlayerTier(player.weeklyEssence);
                const tierConf = tier ? TIER_CONFIG[tier] : null;

                return (
                  <LeaderboardEntry
                    key={player.id}
                    $rank={rank}
                    $rankColor={getRankColor(rank)}
                    $isCurrentUser={isCurrentUser}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <RankBadge $rank={rank}>
                      {rank}
                    </RankBadge>
                    <PlayerInfo>
                      <PlayerName>
                        {player.username || `Player ${player.id}`}
                        {isCurrentUser && ' (You)'}
                      </PlayerName>
                      {tierConf && (
                        <PlayerTier $color={tierConf.color}>
                          <tierConf.IconComponent size={10} />
                          {tier}
                        </PlayerTier>
                      )}
                    </PlayerInfo>
                    <PlayerEssence>
                      {formatNumber(player.weeklyEssence)}
                    </PlayerEssence>
                  </LeaderboardEntry>
                );
              })}
            </AnimatePresence>

            {/* Your rank if not in top 20 */}
            {currentUserRank && currentUserRank > 20 && (
              <YourRankSection>
                <YourRankLabel>
                  {t('essenceTap.tournament.yourRank', { defaultValue: 'Your Rank' })}
                </YourRankLabel>
                <YourRankValue>
                  #{currentUserRank} ({formatNumber(weeklyEssence)} essence)
                </YourRankValue>
              </YourRankSection>
            )}

            {lastRefresh && (
              <div style={{
                textAlign: 'center',
                fontSize: theme.fontSizes.xs,
                color: theme.colors.textTertiary,
                marginTop: theme.spacing.md
              }}>
                Last updated: {new Date(lastRefresh).toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </LeaderboardContainer>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <IconTrophy size={24} style={{ marginRight: 8 }} />
        {t('essenceTap.tournament.title', { defaultValue: 'Weekly Tournament' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {loading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              {t('common.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <TabContainer>
                <Tab
                  $active={activeTab === 'progress'}
                  onClick={() => setActiveTab('progress')}
                >
                  <IconTrophy size={16} />
                  Progress
                </Tab>
                <Tab
                  $active={activeTab === 'leaderboard'}
                  onClick={() => setActiveTab('leaderboard')}
                >
                  <IconUsers size={16} />
                  Leaderboard
                </Tab>
              </TabContainer>

              {/* Tab Content */}
              {activeTab === 'leaderboard' ? renderLeaderboard() : (
                <>
              {/* Current Tier */}
              <CurrentTierDisplay $color={tierConfig.color}>
                <TierIcon>
                  {tierConfig.IconComponent && <tierConfig.IconComponent size={48} />}
                </TierIcon>
                <TierName $color={tierConfig.color} $colorEnd={tierConfig.colorEnd}>
                  {currentTier || t('essenceTap.tournament.unranked', { defaultValue: 'Unranked' })}
                </TierName>
                <TierProgress>
                  {t('essenceTap.tournament.weeklyEssence', {
                    amount: formatNumber(weeklyEssence),
                    defaultValue: `${formatNumber(weeklyEssence)} essence this week`
                  })}
                </TierProgress>
              </CurrentTierDisplay>

              {/* Time Remaining */}
              <TimeDisplay>
                <IconClock size={18} />
                <TimeLabel>{t('essenceTap.tournament.endsIn', { defaultValue: 'Ends in:' })}</TimeLabel>
                <TimeValue>{timeRemaining}</TimeValue>
              </TimeDisplay>

              {/* Progress to Next Tier */}
              {nextTier && (
                <ProgressSection>
                  <ProgressHeader>
                    <ProgressLabel>
                      {t('essenceTap.tournament.progressTo', {
                        tier: nextTier,
                        defaultValue: `Progress to ${nextTier}`
                      })}
                    </ProgressLabel>
                    <ProgressValue>
                      {formatNumber(weeklyEssence)} / {formatNumber(nextThreshold)}
                    </ProgressValue>
                  </ProgressHeader>
                  <ProgressBar>
                    <ProgressFill
                      $percent={progressPercent}
                      $color={TIER_CONFIG[nextTier].color}
                      $colorEnd={TIER_CONFIG[nextTier].colorEnd}
                    />
                  </ProgressBar>
                </ProgressSection>
              )}

              {/* Tier List */}
              <TierList>
                {Object.entries(TIER_CONFIG).map(([tierName, config]) => {
                  const rewards = TIER_REWARDS[tierName];
                  const achieved = weeklyEssence >= config.minEssence;
                  const isCurrent = tierName === currentTier;
                  const locked = weeklyEssence < config.minEssence;
                  const TierIconComponent = config.IconComponent;

                  return (
                    <TierItem
                      key={tierName}
                      $current={isCurrent}
                      $achieved={achieved}
                      $locked={locked}
                      $color={config.color}
                    >
                      <TierBadge $color={config.color} $colorEnd={config.colorEnd}>
                        <TierIconComponent size={20} />
                      </TierBadge>
                      <TierInfo>
                        <TierItemName>{tierName}</TierItemName>
                        <TierThreshold>{formatNumber(config.minEssence)} essence</TierThreshold>
                      </TierInfo>
                      <TierRewards>
                        <RewardItem $color="#FCD34D">{rewards.fatePoints} FP</RewardItem>
                        <RewardItem $color="#A855F7">{rewards.rollTickets} tickets</RewardItem>
                      </TierRewards>
                    </TierItem>
                  );
                })}
              </TierList>

              {/* Claim Section */}
              {tournamentInfo?.canClaim && currentTier && (
                <ClaimSection>
                  <IconGift size={32} style={{ color: '#10B981', marginBottom: 8 }} />
                  <ClaimTitle>
                    {t('essenceTap.tournament.rewardsReady', { defaultValue: 'Rewards Ready!' })}
                  </ClaimTitle>
                  <ClaimRewards>
                    {TIER_REWARDS[currentTier].fatePoints} Fate Points + {TIER_REWARDS[currentTier].rollTickets} Roll Tickets
                  </ClaimRewards>
                  <Button
                    variant="primary"
                    onClick={handleClaim}
                    disabled={claiming}
                  >
                    {claiming
                      ? t('common.loading', { defaultValue: 'Loading...' })
                      : t('essenceTap.tournament.claimRewards', { defaultValue: 'Claim Rewards' })}
                  </Button>
                </ClaimSection>
              )}
              </>
              )}
            </>
          )}
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

WeeklyTournament.displayName = 'WeeklyTournament';

export default WeeklyTournament;
