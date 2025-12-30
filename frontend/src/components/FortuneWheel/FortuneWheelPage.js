/**
 * FortuneWheelPage Component
 *
 * Main page for the Fortune Wheel mini-game.
 * Allows players to spin daily for random rewards.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useFortuneWheel } from '../../hooks/useFortuneWheel';
import { LoadingState, ErrorState, PageTransition } from '../../design-system';
import FortuneWheel from './FortuneWheel';
import WheelLegend from './WheelLegend';
import PrizePopup from './PrizePopup';
import {
  IconGacha,
  IconDice,
  IconStar,
  IconPoints,
  IconTicket,
  IconPremiumTicket,
  IconBoost,
  IconFire,
  IconGift,
} from '../../constants/icons';

import {
  PageContainer,
  MainContent,
  Header,
  Title,
  Subtitle,
  SpinButtonContainer,
  SpinButton,
  SpinCount,
  NextSpinTimer,
  TimerLabel,
  TimerValue,
  StatsContainer,
  StatCard,
  StatIcon,
  StatValue,
  StatLabel,
  StreakContainer,
  StreakIcon,
  StreakInfo,
  StreakValue,
  StreakLabel,
  HistoryContainer,
  HistoryTitle,
  HistoryList,
  HistoryItem,
  HistoryItemLeft,
  HistoryItemIcon,
  HistoryItemLabel,
  HistoryItemReward,
  MultiplierBadge,
  MultiplierIcon,
  MultiplierText,
  LoadingContainer
} from './FortuneWheel.styles';

const FortuneWheelPage = () => {
  const { t } = useTranslation();
  const {
    // Status
    loading,
    error,

    // Wheel config
    segments,

    // Spin state
    canSpin,
    spinning,
    spinResult,

    // Animation
    currentRotation,
    targetRotation,
    spinDuration,

    // Prize popup
    showPrizePopup,
    closePrizePopup,

    // Spin info
    remaining,
    currentStreak,
    totalSpins,
    jackpotsWon,

    // Time helpers
    nextSpinAt,
    getTimeUntilNextSpin,
    formatCountdown,

    // Active multiplier
    activeMultiplier,

    // History
    recentHistory,

    // Actions
    handleSpin,
    refresh
  } = useFortuneWheel();

  // Countdown timer
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!canSpin && nextSpinAt) {
      const timer = setInterval(() => {
        const time = getTimeUntilNextSpin();
        setCountdown(time);

        // Refresh status when timer expires
        if (time && time.total <= 0) {
          clearInterval(timer);
          refresh();
        }
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [canSpin, nextSpinAt, getTimeUntilNextSpin, refresh]);

  // Loading state
  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingState message={t('fortuneWheel.loading', 'Loading Fortune Wheel...')} />
        </LoadingContainer>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer>
        <MainContent>
          <ErrorState
            title={t('fortuneWheel.errorTitle', 'Failed to load Fortune Wheel')}
            message={error}
            onRetry={refresh}
          />
        </MainContent>
      </PageContainer>
    );
  }

  // Calculate actual rotation (add base rotation for spinning)
  const displayRotation = spinning ? targetRotation : currentRotation;

  return (
    <PageTransition>
      <PageContainer>
        <MainContent>
        {/* Header */}
        <Header>
          <Title>
            <IconGacha size={24} />
            {t('fortuneWheel.title', 'Fortune Wheel')}
          </Title>
          <Subtitle>{t('fortuneWheel.subtitle', 'Spin daily for exciting rewards!')}</Subtitle>
        </Header>

        {/* Active Multiplier Badge */}
        {activeMultiplier && (
          <MultiplierBadge>
            <MultiplierIcon><IconBoost /></MultiplierIcon>
            <MultiplierText>
              {t('fortuneWheel.multiplierActive', '{{value}}x XP Active ({{minutes}}m left)', {
                value: activeMultiplier.value,
                minutes: activeMultiplier.remainingMinutes
              })}
            </MultiplierText>
          </MultiplierBadge>
        )}

        {/* The Wheel */}
        <FortuneWheel
          segments={segments}
          rotation={displayRotation}
          spinning={spinning}
          spinDuration={spinDuration}
        />

        {/* Legend */}
        <WheelLegend
          segments={segments}
          highlightedId={spinResult?.segment?.id}
        />

        {/* Spin Button / Timer */}
        <SpinButtonContainer>
          {canSpin ? (
            <>
              <SpinButton
                onClick={handleSpin}
                disabled={spinning}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {spinning ? (
                  <>
                    <IconDice />
                    {t('fortuneWheel.spinning', 'Spinning...')}
                  </>
                ) : (
                  <>
                    <IconStar />
                    {t('fortuneWheel.spin', 'SPIN!')}
                  </>
                )}
              </SpinButton>
              <SpinCount>
                {t('fortuneWheel.remaining', '{{count}} spin remaining today', {
                  count: remaining,
                  defaultValue_plural: '{{count}} spins remaining today'
                })}
              </SpinCount>
            </>
          ) : (
            <NextSpinTimer>
              <TimerLabel>{t('fortuneWheel.nextSpinIn', 'Next free spin in:')}</TimerLabel>
              <TimerValue>
                {countdown ? formatCountdown(countdown) : '--:--:--'}
              </TimerValue>
            </NextSpinTimer>
          )}
        </SpinButtonContainer>

        {/* Streak Display */}
        {currentStreak > 0 && (
          <StreakContainer>
            <StreakIcon><IconFire /></StreakIcon>
            <StreakInfo>
              <StreakValue>
                {t('fortuneWheel.streakValue', '{{count}} Day Streak!', { count: currentStreak })}
              </StreakValue>
              <StreakLabel>
                {currentStreak >= 7
                  ? t('fortuneWheel.streakOnFire', "You're on fire!")
                  : t('fortuneWheel.keepSpinning', 'Keep spinning daily!')}
              </StreakLabel>
            </StreakInfo>
          </StreakContainer>
        )}

        {/* Stats */}
        <StatsContainer>
          <StatCard>
            <StatIcon><IconGacha /></StatIcon>
            <StatValue>{totalSpins}</StatValue>
            <StatLabel>{t('fortuneWheel.totalSpins', 'Total Spins')}</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon><IconStar color="#ffd700" /></StatIcon>
            <StatValue>{jackpotsWon}</StatValue>
            <StatLabel>{t('fortuneWheel.jackpots', 'Jackpots')}</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon><IconFire /></StatIcon>
            <StatValue>{currentStreak}</StatValue>
            <StatLabel>{t('fortuneWheel.dayStreak', 'Day Streak')}</StatLabel>
          </StatCard>
        </StatsContainer>

        {/* Recent History */}
        {recentHistory.length > 0 && (
          <HistoryContainer>
            <HistoryTitle>{t('fortuneWheel.recentSpins', 'Recent Spins')}</HistoryTitle>
            <HistoryList>
              {recentHistory.map((item, index) => {
                const isJackpot = item.rewards?.isJackpot;
                const rewardText = item.rewards?.points > 0
                  ? `+${item.rewards.points} pts`
                  : item.rewards?.tickets > 0
                    ? `+${item.rewards.tickets} ticket${item.rewards.tickets > 1 ? 's' : ''}`
                    : item.rewards?.premium > 0
                      ? `+${item.rewards.premium} premium`
                      : '';

                return (
                  <HistoryItem key={index} $isJackpot={isJackpot}>
                    <HistoryItemLeft>
                      <HistoryItemIcon>
                        {isJackpot ? <IconStar color="#ffd700" /> : <HistoryTypeIcon type={item.type} />}
                      </HistoryItemIcon>
                      <HistoryItemLabel>{item.segmentLabel}</HistoryItemLabel>
                    </HistoryItemLeft>
                    <HistoryItemReward $isJackpot={isJackpot}>
                      {rewardText}
                    </HistoryItemReward>
                  </HistoryItem>
                );
              })}
            </HistoryList>
          </HistoryContainer>
        )}
      </MainContent>

      {/* Prize Popup */}
      <PrizePopup
        isOpen={showPrizePopup}
        onClose={closePrizePopup}
        segment={spinResult?.segment}
        rewards={spinResult?.rewards}
      />
    </PageContainer>
    </PageTransition>
  );
};

/**
 * Get icon component for history item based on reward type
 */
const HistoryTypeIcon = ({ type }) => {
  switch (type) {
    case 'points':
      return <IconPoints />;
    case 'tickets':
      return <IconTicket />;
    case 'premium':
      return <IconPremiumTicket />;
    case 'multiplier':
      return <IconBoost />;
    case 'nothing':
      return <IconDice />;
    default:
      return <IconGift />;
  }
};

export default FortuneWheelPage;
