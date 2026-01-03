/**
 * WeeklyTournament - Enhanced Weekly Tournament Modal (v4.0)
 *
 * Features:
 * - Current tier progress with animated display
 * - Time remaining countdown
 * - Bracket-based leaderboard with visual hierarchy
 * - Daily checkpoints with claim functionality
 * - Burning hour indicator and countdown
 * - Streak tracking and bonus display
 * - Rank-based rewards preview
 * - Tournament cosmetics showcase
 * - Claim all rewards (tier + rank + streak)
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import api from '../../utils/api';
import { formatNumber } from '../../hooks/useEssenceTap';
import {
  IconTrophy, IconClock, IconGift, IconBronzeMedal, IconSilverMedal, IconGoldMedal,
  IconDiamond, IconCrownSymbol, IconStar, IconCategoryPerson, IconRefresh,
  IconFlame, IconCheck, IconLock, IconTrendingUp, IconAward
} from '../../constants/icons';
import {
  TOURNAMENT_TIER_CONFIG, TOURNAMENT_TIER_REWARDS, RANK_REWARDS,
  BRACKET_SYSTEM, DAILY_CHECKPOINTS, BURNING_HOURS, TOURNAMENT_STREAKS
} from '../../config/essenceTapConfig';

// Animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
`;

const fireGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
  50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); }
`;

// Styled Components
const Container = styled.div`
  padding: ${theme.spacing.md};
  max-height: 70vh;
  overflow-y: auto;
`;

const TabContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: ${theme.spacing.xs};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.2)' : 'transparent'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? '#A855F7' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.text};
  }
`;

const NotificationDot = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: #EF4444;
  border-radius: 50%;
`;

// Burning Hour Banner
const BurningHourBanner = styled(motion.div)`
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2));
  border: 2px solid ${props => props.$active ? '#EF4444' : '#F59E0B'};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  ${props => props.$active && css`animation: ${fireGlow} 2s ease-in-out infinite;`}
`;

const BurningHourIcon = styled.div`
  font-size: 32px;
  color: ${props => props.$active ? '#EF4444' : '#F59E0B'};
`;

const BurningHourInfo = styled.div`
  flex: 1;
`;

const BurningHourTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$active ? '#EF4444' : '#F59E0B'};
`;

const BurningHourTime = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const BurningHourMultiplier = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$active ? '#EF4444' : '#F59E0B'};
`;

// Current Tier Display
const CurrentTierDisplay = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.md};
  background: ${props => `linear-gradient(135deg, ${props.$color}20, ${props.$color}10)`};
  border: 2px solid ${props => props.$color};
  border-radius: ${theme.radius.lg};
`;

const TierIcon = styled.div`
  font-size: 40px;
  margin-bottom: ${theme.spacing.xs};
`;

const TierName = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, ${props => props.$color}, ${props => props.$colorEnd || props.$color});
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const EssenceDisplay = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: #A855F7;
  margin-top: ${theme.spacing.xs};
`;

// Bracket Info
const BracketBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$color}20;
  border: 1px solid ${props => props.$color};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color};
  margin-top: ${theme.spacing.sm};
`;

// Streak Display
const StreakContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background: rgba(249, 115, 22, 0.1);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.md};
`;

const StreakIcon = styled.div`
  font-size: 24px;
  color: #F59E0B;
`;

const StreakInfo = styled.div`
  text-align: left;
`;

const StreakLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const StreakValue = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: #F59E0B;
`;

const StreakBonus = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: #10B981;
  margin-left: ${theme.spacing.xs};
`;

// Time Display
const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.md};
`;

const TimeLabel = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
`;

const TimeValue = styled.span`
  color: #FCD34D;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.base};
`;

// Progress Section
const ProgressSection = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs};
`;

const ProgressLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const ProgressValue = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: #A855F7;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${props => props.$color || '#A855F7'}, ${props => props.$colorEnd || '#EC4899'});
  border-radius: ${theme.radius.full};
  width: ${props => Math.min(100, props.$percent)}%;
  transition: width 0.5s ease;
`;

// Checkpoints
const CheckpointsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.02);
  border-radius: ${theme.radius.lg};
  overflow-x: auto;
`;

const CheckpointItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
  min-width: 50px;
`;

const CheckpointCircle = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid ${props => {
    if (props.$claimed) return '#10B981';
    if (props.$claimable) return '#FCD34D';
    if (props.$achieved) return '#A855F7';
    return 'rgba(255, 255, 255, 0.2)';
  }};
  background: ${props => {
    if (props.$claimed) return 'rgba(16, 185, 129, 0.2)';
    if (props.$claimable) return 'rgba(252, 211, 77, 0.2)';
    if (props.$achieved) return 'rgba(168, 85, 247, 0.2)';
    return 'transparent';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$claimable ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  ${props => props.$claimable && css`animation: ${pulse} 2s ease-in-out infinite;`}

  &:hover {
    ${props => props.$claimable && 'transform: scale(1.1);'}
  }
`;

const CheckpointDay = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const CheckpointReward = styled.div`
  font-size: 10px;
  color: ${theme.colors.textTertiary};
`;

// Tier List
const TierList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const TierItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${props => props.$current
    ? `linear-gradient(135deg, ${props.$color}20, ${props.$color}10)`
    : props.$achieved
      ? 'rgba(16, 185, 129, 0.1)'
      : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$current
    ? props.$color
    : props.$achieved
      ? 'rgba(16, 185, 129, 0.3)'
      : 'rgba(255, 255, 255, 0.05)'};
  border-radius: ${theme.radius.md};
  opacity: ${props => props.$locked ? 0.5 : 1};
`;

const TierBadge = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => `linear-gradient(135deg, ${props.$color}, ${props.$colorEnd || props.$color})`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`;

const TierInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TierItemName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const TierThreshold = styled.div`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
`;

const TierRewards = styled.div`
  text-align: right;
`;

const RewardItem = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$color || theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
`;

// Leaderboard Styles
const LeaderboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const LeaderboardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const LeaderboardTitle = styled.h3`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
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
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TopThreeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.md} 0;
`;

const TopPlayer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const TopPlayerAvatar = styled.div`
  width: ${props => props.$rank === 1 ? '64px' : '48px'};
  height: ${props => props.$rank === 1 ? '64px' : '48px'};
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
  font-size: ${props => props.$rank === 1 ? '24px' : '18px'};
  font-weight: ${theme.fontWeights.bold};
  color: #1a1a2e;
  margin-bottom: ${theme.spacing.xs};
  box-shadow: ${props => props.$rank === 1
    ? '0 0 20px rgba(255, 215, 0, 0.4)'
    : props.$rank === 2
      ? '0 0 15px rgba(192, 192, 192, 0.3)'
      : '0 0 10px rgba(205, 127, 50, 0.3)'};
`;

const TopPlayerName = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TopPlayerEssence = styled.div`
  font-size: 10px;
  color: #A855F7;
  font-weight: ${theme.fontWeights.medium};
`;

const LeaderboardEntry = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${props => props.$isCurrentUser
    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))'
    : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$isCurrentUser
    ? 'rgba(168, 85, 247, 0.5)'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: ${theme.radius.md};
`;

const RankBadge = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.textSecondary};
`;

const PlayerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlayerName = styled.div`
  font-size: ${theme.fontSizes.sm};
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
  font-size: 10px;
  color: ${props => props.$color || theme.colors.textSecondary};
`;

const PlayerEssence = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
  text-align: right;
`;

const YourRankSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: ${theme.radius.md};
  text-align: center;
`;

const YourRankLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const YourRankValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
`;

// Rank Rewards Section
const RankRewardsSection = styled.div`
  margin-top: ${theme.spacing.md};
`;

const RankRewardsTitle = styled.h4`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const RankRewardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const RankRewardItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$highlighted ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$highlighted ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: ${theme.radius.sm};
`;

const RankRange = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$highlighted ? '#A855F7' : theme.colors.text};
`;

const RankRewardDetails = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  font-size: 10px;
  color: ${theme.colors.textSecondary};
`;

// Claim Section
const ClaimSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const ClaimTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: #10B981;
  margin-bottom: ${theme.spacing.xs};
`;

const ClaimRewards = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

// Loading
const LoadingSpinner = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

// Icon mapping
const TIER_ICONS = {
  Bronze: IconBronzeMedal,
  Silver: IconSilverMedal,
  Gold: IconGoldMedal,
  Platinum: IconStar,
  Diamond: IconDiamond,
  Champion: IconCrownSymbol
};

// Helpers - Rank color utility (prefixed with underscore for future use)
const _getRankColor = (rank) => {
  switch (rank) {
    case 1: return '#FFD700';
    case 2: return '#C0C0C0';
    case 3: return '#CD7F32';
    default: return '#9CA3AF';
  }
};

const getPlayerTier = (essence) => {
  return Object.entries(TOURNAMENT_TIER_CONFIG)
    .reverse()
    .find(([, config]) => essence >= config.minEssence)?.[0] || null;
};

const formatTimeRemaining = (ms) => {
  if (ms <= 0) return 'Ended';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
};

const WeeklyTournament = memo(({
  isOpen,
  onClose,
  getTournamentInfo,
  onClaimRewards,
  onClaimCheckpoint
}) => {
  useTranslation(); // Reserved for future translations
  const [activeTab, setActiveTab] = useState('progress');
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bracketLeaderboard, setBracketLeaderboard] = useState([]);
  const [burningHour, setBurningHour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimingCheckpoint, setClaimingCheckpoint] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Fetch tournament info
  useEffect(() => {
    if (isOpen && getTournamentInfo) {
      setLoading(true);
      Promise.all([
        getTournamentInfo(),
        api.get('/essence-tap/tournament/burning-hour').catch(() => ({ data: null }))
      ]).then(([result, burningResult]) => {
        if (result.success) {
          setTournamentInfo(result);
        }
        if (burningResult?.data?.success) {
          setBurningHour(burningResult.data);
        }
        setLoading(false);
      });
    }
  }, [isOpen, getTournamentInfo]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (bracket = false) => {
    setLeaderboardLoading(true);
    try {
      const endpoint = bracket
        ? '/essence-tap/tournament/bracket-leaderboard'
        : '/essence-tap/tournament/leaderboard';
      const response = await api.get(endpoint);
      if (response.data.success) {
        if (bracket) {
          setBracketLeaderboard(response.data.leaderboard || []);
        } else {
          setLeaderboard(response.data.leaderboard || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && (activeTab === 'leaderboard' || activeTab === 'bracket')) {
      fetchLeaderboard(activeTab === 'bracket');
    }
  }, [isOpen, activeTab, fetchLeaderboard]);

  // Update time remaining
  useEffect(() => {
    if (!tournamentInfo?.endsAt) return;

    const updateTime = () => {
      const now = Date.now();
      const end = new Date(tournamentInfo.endsAt).getTime();
      setTimeRemaining(formatTimeRemaining(end - now));
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [tournamentInfo?.endsAt]);

  // Handle claim rewards
  const handleClaim = useCallback(async () => {
    if (!tournamentInfo?.canClaimRewards) return;
    setClaiming(true);
    try {
      await onClaimRewards();
      if (getTournamentInfo) {
        const result = await getTournamentInfo();
        if (result.success) setTournamentInfo(result);
      }
    } finally {
      setClaiming(false);
    }
  }, [tournamentInfo?.canClaimRewards, onClaimRewards, getTournamentInfo]);

  // Handle claim checkpoint - uses hook's function for proper toast/cache handling
  const handleClaimCheckpoint = useCallback(async (day) => {
    if (!onClaimCheckpoint) return;
    setClaimingCheckpoint(day);
    try {
      await onClaimCheckpoint(day);
      if (getTournamentInfo) {
        const result = await getTournamentInfo();
        if (result.success) setTournamentInfo(result);
      }
    } finally {
      setClaimingCheckpoint(null);
    }
  }, [onClaimCheckpoint, getTournamentInfo]);

  // Calculate current tier
  const weeklyEssence = tournamentInfo?.essenceEarned ?? 0;
  const currentTier = getPlayerTier(weeklyEssence);
  const tierConfig = currentTier
    ? { ...TOURNAMENT_TIER_CONFIG[currentTier], IconComponent: TIER_ICONS[currentTier] }
    : { color: '#9CA3AF', IconComponent: IconTrophy };

  // Calculate progress to next tier
  const tiers = Object.keys(TOURNAMENT_TIER_CONFIG);
  const currentTierIndex = currentTier ? tiers.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const nextTierConfig = nextTier ? TOURNAMENT_TIER_CONFIG[nextTier] : null;
  const currentThreshold = currentTier ? TOURNAMENT_TIER_CONFIG[currentTier].minEssence : 0;
  const nextThreshold = nextTierConfig?.minEssence || currentThreshold;
  const progressPercent = nextTier
    ? ((weeklyEssence - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  // Get checkpoints
  // Get current ISO weekday (1=Monday, 7=Sunday)
  const getCurrentISOWeekday = () => {
    const day = new Date().getUTCDay();
    return day === 0 ? 7 : day;
  };
  const currentWeekday = getCurrentISOWeekday();

  const checkpoints = tournamentInfo?.checkpoints || DAILY_CHECKPOINTS.map(cp => {
    const targetReached = weeklyEssence >= cp.cumulativeTarget;
    const dayUnlocked = currentWeekday >= cp.day;
    return {
      ...cp,
      achieved: targetReached,
      claimed: false,
      claimable: targetReached && dayUnlocked,
      locked: !dayUnlocked
    };
  });
  const claimableCheckpoints = checkpoints.filter(c => c.claimable && !c.claimed);

  // Streak info
  const streak = tournamentInfo?.streak || 0;
  const streakBonus = tournamentInfo?.streakBonus || 0;

  // Bracket info
  const bracket = tournamentInfo?.bracket || 'C';
  const bracketInfo = BRACKET_SYSTEM[bracket];

  // Render progress tab
  const renderProgress = () => (
    <>
      {/* Burning Hour Banner */}
      {burningHour && (burningHour.active || burningHour.upcoming) && (
        <BurningHourBanner
          $active={burningHour.active}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BurningHourIcon $active={burningHour.active}>
            <IconFlame size={32} />
          </BurningHourIcon>
          <BurningHourInfo>
            <BurningHourTitle $active={burningHour.active}>
              {burningHour.active ? 'BURNING HOUR ACTIVE!' : 'Burning Hour Coming Soon'}
            </BurningHourTitle>
            <BurningHourTime>
              {burningHour.active
                ? `Ends in ${formatTimeRemaining(burningHour.remainingMs)}`
                : `Starts in ${formatTimeRemaining(burningHour.startsInMs)}`}
            </BurningHourTime>
          </BurningHourInfo>
          <BurningHourMultiplier $active={burningHour.active}>
            {BURNING_HOURS.multiplier}x
          </BurningHourMultiplier>
        </BurningHourBanner>
      )}

      {/* Current Tier */}
      <CurrentTierDisplay $color={tierConfig.color}>
        <TierIcon>
          {tierConfig.IconComponent && <tierConfig.IconComponent size={40} />}
        </TierIcon>
        <TierName $color={tierConfig.color} $colorEnd={tierConfig.colorEnd}>
          {currentTier || 'Unranked'}
        </TierName>
        <EssenceDisplay>
          {formatNumber(weeklyEssence)} essence
        </EssenceDisplay>
        <BracketBadge $color={bracketInfo?.color || '#9CA3AF'}>
          Bracket {bracket}: {bracketInfo?.name}
        </BracketBadge>
      </CurrentTierDisplay>

      {/* Streak */}
      {streak > 0 && (
        <StreakContainer>
          <StreakIcon><IconTrendingUp size={24} /></StreakIcon>
          <StreakInfo>
            <StreakLabel>Tournament Streak</StreakLabel>
            <StreakValue>
              {streak} weeks
              {streakBonus > 0 && (
                <StreakBonus>+{Math.round(streakBonus * 100)}% bonus</StreakBonus>
              )}
            </StreakValue>
          </StreakInfo>
        </StreakContainer>
      )}

      {/* Time Remaining */}
      <TimeDisplay>
        <IconClock size={16} />
        <TimeLabel>Ends in:</TimeLabel>
        <TimeValue>{timeRemaining}</TimeValue>
      </TimeDisplay>

      {/* Progress to Next Tier */}
      {nextTier && (
        <ProgressSection>
          <ProgressHeader>
            <ProgressLabel>Progress to {nextTier}</ProgressLabel>
            <ProgressValue>
              {formatNumber(weeklyEssence)} / {formatNumber(nextThreshold)}
            </ProgressValue>
          </ProgressHeader>
          <ProgressBar>
            <ProgressFill
              $percent={progressPercent}
              $color={TOURNAMENT_TIER_CONFIG[nextTier].color}
              $colorEnd={TOURNAMENT_TIER_CONFIG[nextTier].colorEnd}
            />
          </ProgressBar>
        </ProgressSection>
      )}

      {/* Daily Checkpoints */}
      <CheckpointsContainer>
        {checkpoints.map((cp) => (
          <CheckpointItem key={cp.day}>
            <CheckpointCircle
              $achieved={cp.achieved}
              $claimed={cp.claimed}
              $claimable={cp.claimable && !cp.claimed}
              $locked={cp.locked}
              onClick={() => cp.claimable && !cp.claimed && handleClaimCheckpoint(cp.day)}
              disabled={claimingCheckpoint === cp.day || cp.locked}
            >
              {cp.claimed ? (
                <IconCheck size={16} color="#10B981" />
              ) : cp.claimable ? (
                <IconGift size={16} color="#FCD34D" />
              ) : cp.achieved && cp.locked ? (
                <IconClock size={14} color="#A855F7" />
              ) : cp.achieved ? (
                <IconCheck size={14} color="#A855F7" />
              ) : (
                <IconLock size={14} color="rgba(255,255,255,0.3)" />
              )}
            </CheckpointCircle>
            <CheckpointDay>Day {cp.day}</CheckpointDay>
            <CheckpointReward>
              {cp.rewards?.rollTickets && `${cp.rewards.rollTickets}T`}
              {cp.rewards?.fatePoints && ` ${cp.rewards.fatePoints}FP`}
            </CheckpointReward>
          </CheckpointItem>
        ))}
      </CheckpointsContainer>

      {/* Tier List */}
      <TierList>
        {Object.entries(TOURNAMENT_TIER_CONFIG).map(([tierName, config]) => {
          const rewards = TOURNAMENT_TIER_REWARDS[tierName];
          const TierIconComponent = TIER_ICONS[tierName];
          const achieved = weeklyEssence >= config.minEssence;
          const isCurrent = tierName === currentTier;
          const locked = weeklyEssence < config.minEssence;

          return (
            <TierItem
              key={tierName}
              $current={isCurrent}
              $achieved={achieved}
              $locked={locked}
              $color={config.color}
            >
              <TierBadge $color={config.color} $colorEnd={config.colorEnd}>
                <TierIconComponent size={16} />
              </TierBadge>
              <TierInfo>
                <TierItemName>{tierName}</TierItemName>
                <TierThreshold>{formatNumber(config.minEssence)}</TierThreshold>
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
      {tournamentInfo?.canClaimRewards && currentTier && (
        <ClaimSection>
          <IconGift size={28} style={{ color: '#10B981', marginBottom: 4 }} />
          <ClaimTitle>Rewards Ready!</ClaimTitle>
          <ClaimRewards>
            {TOURNAMENT_TIER_REWARDS[currentTier].fatePoints} FP + {TOURNAMENT_TIER_REWARDS[currentTier].rollTickets} tickets
          </ClaimRewards>
          <Button variant="primary" onClick={handleClaim} disabled={claiming}>
            {claiming ? 'Claiming...' : 'Claim Rewards'}
          </Button>
        </ClaimSection>
      )}
    </>
  );

  // Render leaderboard tab
  const renderLeaderboard = (isBracket = false) => {
    const data = isBracket ? bracketLeaderboard : leaderboard;
    const topThree = data.slice(0, 3);
    const rest = data.slice(3, 20);
    const currentUserRank = isBracket
      ? data.findIndex(p => p.id === tournamentInfo?.userId) + 1
      : tournamentInfo?.rank;

    const podiumOrder = topThree.length >= 3
      ? [topThree[1], topThree[0], topThree[2]]
      : topThree;

    return (
      <LeaderboardContainer>
        <LeaderboardHeader>
          <LeaderboardTitle>
            <IconCategoryPerson size={18} />
            {isBracket ? `Bracket ${bracket} Leaderboard` : 'Global Leaderboard'}
          </LeaderboardTitle>
          <RefreshButton onClick={() => fetchLeaderboard(isBracket)} disabled={leaderboardLoading}>
            <IconRefresh size={14} />
            {leaderboardLoading ? '...' : 'Refresh'}
          </RefreshButton>
        </LeaderboardHeader>

        {leaderboardLoading && data.length === 0 ? (
          <LoadingSpinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <IconRefresh size={24} />
          </LoadingSpinner>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.lg, color: theme.colors.textSecondary }}>
            No players yet this week
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <TopThreeContainer>
                {(topThree.length >= 3 ? podiumOrder : topThree).map((player, idx) => {
                  const actualRank = topThree.length >= 3
                    ? (idx === 0 ? 2 : idx === 1 ? 1 : 3)
                    : idx + 1;
                  const tier = getPlayerTier(player.weeklyEssence);
                  const tierConf = tier ? TOURNAMENT_TIER_CONFIG[tier] : null;

                  return (
                    <TopPlayer key={player.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                      <TopPlayerAvatar $rank={actualRank}>{actualRank}</TopPlayerAvatar>
                      <TopPlayerName>{player.username || `Player ${player.id}`}</TopPlayerName>
                      {tierConf && (
                        <PlayerTier $color={tierConf.color}>
                          {tier}
                        </PlayerTier>
                      )}
                      <TopPlayerEssence>{formatNumber(player.weeklyEssence)}</TopPlayerEssence>
                    </TopPlayer>
                  );
                })}
              </TopThreeContainer>
            )}

            {/* Rest of leaderboard */}
            <AnimatePresence>
              {rest.map((player, idx) => {
                const rank = idx + 4;
                const isCurrentUser = player.id === tournamentInfo?.userId;
                const tier = getPlayerTier(player.weeklyEssence);
                const tierConf = tier ? TOURNAMENT_TIER_CONFIG[tier] : null;

                return (
                  <LeaderboardEntry
                    key={player.id}
                    $isCurrentUser={isCurrentUser}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <RankBadge>{rank}</RankBadge>
                    <PlayerInfo>
                      <PlayerName>
                        {player.username || `Player ${player.id}`}
                        {isCurrentUser && ' (You)'}
                      </PlayerName>
                      {tierConf && (
                        <PlayerTier $color={tierConf.color}>{tier}</PlayerTier>
                      )}
                    </PlayerInfo>
                    <PlayerEssence>{formatNumber(player.weeklyEssence)}</PlayerEssence>
                  </LeaderboardEntry>
                );
              })}
            </AnimatePresence>

            {/* Your rank if not in visible list */}
            {currentUserRank && currentUserRank > 20 && (
              <YourRankSection>
                <YourRankLabel>Your {isBracket ? 'Bracket ' : ''}Rank</YourRankLabel>
                <YourRankValue>#{currentUserRank}</YourRankValue>
              </YourRankSection>
            )}
          </>
        )}

        {/* Rank Rewards Info */}
        <RankRewardsSection>
          <RankRewardsTitle>
            <IconAward size={16} />
            Rank Rewards (Bracket)
          </RankRewardsTitle>
          <RankRewardsList>
            {RANK_REWARDS.slice(0, 5).map((rr, idx) => {
              const isHighlighted = currentUserRank &&
                currentUserRank >= rr.minRank &&
                currentUserRank <= rr.maxRank;

              return (
                <RankRewardItem key={idx} $highlighted={isHighlighted}>
                  <RankRange $highlighted={isHighlighted}>
                    {rr.minRank === rr.maxRank ? `#${rr.minRank}` : `#${rr.minRank}-${rr.maxRank}`}
                    {rr.title && ` "${rr.title}"`}
                  </RankRange>
                  <RankRewardDetails>
                    {rr.rewards.fatePoints > 0 && <span>{rr.rewards.fatePoints} FP</span>}
                    {rr.rewards.rollTickets > 0 && <span>{rr.rewards.rollTickets}T</span>}
                    {rr.rewards.premiumTickets > 0 && <span>{rr.rewards.premiumTickets}PT</span>}
                  </RankRewardDetails>
                </RankRewardItem>
              );
            })}
          </RankRewardsList>
        </RankRewardsSection>
      </LeaderboardContainer>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <IconTrophy size={20} style={{ marginRight: 8 }} />
        Weekly Tournament
      </ModalHeader>

      <ModalBody>
        <Container>
          {loading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              Loading...
            </div>
          ) : (
            <>
              <TabContainer>
                <Tab $active={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>
                  <IconTrophy size={14} />
                  Progress
                  {claimableCheckpoints.length > 0 && <NotificationDot />}
                </Tab>
                <Tab $active={activeTab === 'bracket'} onClick={() => setActiveTab('bracket')}>
                  <IconCategoryPerson size={14} />
                  Bracket
                </Tab>
                <Tab $active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')}>
                  <IconCategoryPerson size={14} />
                  Global
                </Tab>
                <Tab $active={activeTab === 'rewards'} onClick={() => setActiveTab('rewards')}>
                  <IconGift size={14} />
                  Rewards
                </Tab>
              </TabContainer>

              {activeTab === 'progress' && renderProgress()}
              {activeTab === 'bracket' && renderLeaderboard(true)}
              {activeTab === 'leaderboard' && renderLeaderboard(false)}
              {activeTab === 'rewards' && (
                <>
                  <RankRewardsSection>
                    <RankRewardsTitle>
                      <IconAward size={18} />
                      Rank-Based Rewards
                    </RankRewardsTitle>
                    <RankRewardsList>
                      {RANK_REWARDS.map((rr, idx) => (
                        <RankRewardItem key={idx}>
                          <RankRange>
                            {rr.minRank === rr.maxRank ? `#${rr.minRank}` : `#${rr.minRank}-${rr.maxRank}`}
                            {rr.title && <span style={{ color: '#FCD34D' }}> "{rr.title}"</span>}
                          </RankRange>
                          <RankRewardDetails>
                            {rr.rewards.fatePoints > 0 && <span style={{ color: '#FCD34D' }}>{rr.rewards.fatePoints} FP</span>}
                            {rr.rewards.rollTickets > 0 && <span style={{ color: '#A855F7' }}>{rr.rewards.rollTickets} Tickets</span>}
                            {rr.rewards.premiumTickets > 0 && <span style={{ color: '#EC4899' }}>{rr.rewards.premiumTickets} Premium</span>}
                            {rr.cosmetics.length > 0 && <span style={{ color: '#10B981' }}>+ Cosmetics</span>}
                          </RankRewardDetails>
                        </RankRewardItem>
                      ))}
                    </RankRewardsList>
                  </RankRewardsSection>

                  <RankRewardsSection style={{ marginTop: theme.spacing.lg }}>
                    <RankRewardsTitle>
                      <IconTrendingUp size={18} />
                      Streak Bonuses
                    </RankRewardsTitle>
                    <RankRewardsList>
                      {TOURNAMENT_STREAKS.map((st, idx) => (
                        <RankRewardItem key={idx} $highlighted={streak >= st.weeks}>
                          <RankRange $highlighted={streak >= st.weeks}>
                            {st.weeks} Weeks
                          </RankRange>
                          <RankRewardDetails>
                            <span style={{ color: '#10B981' }}>+{Math.round(st.essenceBonus * 100)}% Essence</span>
                            {st.rewards?.rollTickets && <span>{st.rewards.rollTickets} Tickets</span>}
                            {st.cosmetics && <span>+ Cosmetics</span>}
                          </RankRewardDetails>
                        </RankRewardItem>
                      ))}
                    </RankRewardsList>
                  </RankRewardsSection>
                </>
              )}
            </>
          )}
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
});

WeeklyTournament.displayName = 'WeeklyTournament';

export default WeeklyTournament;
