/**
 * FishingHeader Component
 * 
 * Extracted from FishingPage.js - Header with navigation, autofish, prestige, and menus.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  MdArrowBack, 
  MdHelpOutline, 
  MdLeaderboard, 
  MdAutorenew, 
  MdPeople, 
  MdEmojiEvents, 
  MdSettings, 
  MdMoreVert, 
  MdStorefront 
} from 'react-icons/md';
import { FaCrown } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

import {
  Header,
  HeaderWoodGrain,
  BackButton,
  HeaderRight,
  AutofishButton,
  LowQuotaDot,
  MultiplayerBadge,
  ChallengesButtonDesktop,
  PrestigeBadge,
  PrestigeEmoji,
  PrestigeName,
  WoodButton,
  MoreMenuWrapper,
  MoreButton,
  MoreMenuDropdown,
  MoreMenuItem,
  MoreMenuItemMobile,
  MoreMenuInfo,
  MoreMenuDivider,
  MoreMenuBadge,
} from '../Fishing.styles';

/**
 * FishingHeader component
 * @param {Object} props
 * @param {Function} props.onBack - Navigate back handler
 * @param {Object} props.autofish - Autofish hook state
 * @param {Object} props.multiplayer - Multiplayer hook state
 * @param {Object} props.modals - Modals hook state
 * @param {Object} props.dailyStats - Daily stats data
 */
export const FishingHeader = ({
  onBack,
  autofish,
  multiplayer,
  modals,
  dailyStats,
}) => {
  const { t } = useTranslation();

  const { isAutofishing, toggleAutofish, inFlight: autofishInFlight } = autofish;
  const { playerCount, isConnected: isMultiplayerConnected } = multiplayer;

  return (
    <Header>
      <HeaderWoodGrain />
      <BackButton onClick={onBack}>
        <MdArrowBack />
      </BackButton>
      <HeaderRight>
        {playerCount > 1 && (
          <MultiplayerBadge $connected={isMultiplayerConnected}>
            <MdPeople />
            <span>{playerCount}</span>
          </MultiplayerBadge>
        )}
        <PrestigeBadge 
          onClick={modals.prestige.open}
          $level={modals.prestige.data?.currentLevel || 0}
          title={modals.prestige.data?.currentName || t('fishing.noviceAngler')}
        >
          <PrestigeEmoji>{modals.prestige.data?.currentEmoji || '🎣'}</PrestigeEmoji>
          <PrestigeName>
            {modals.prestige.data?.currentLevel > 0 
              ? modals.prestige.data.currentName?.split(' ')[0] 
              : t('fishing.novice') || 'Novice'}
          </PrestigeName>
        </PrestigeBadge>
        <AutofishButton 
          onClick={toggleAutofish} 
          $active={isAutofishing} 
          $inFlight={autofishInFlight}
          $lowQuota={dailyStats && dailyStats.remaining < 20}
          title={dailyStats ? `${dailyStats.remaining}/${dailyStats.limit} ${t('fishing.remainingToday')}` : ''}
        >
          <MdAutorenew className={isAutofishing ? 'spinning' : ''} />
          {dailyStats && dailyStats.remaining < 20 && <LowQuotaDot />}
        </AutofishButton>
        <ChallengesButtonDesktop 
          onClick={modals.challenges.open} 
          $hasCompleted={modals.challenges.data?.challenges?.some(c => c.progress >= c.target && !c.completed)}
        >
          <MdEmojiEvents />
        </ChallengesButtonDesktop>
        <MoreMenuWrapper ref={modals.moreMenu.ref}>
          <MoreButton onClick={modals.moreMenu.toggle} $isOpen={modals.moreMenu.isOpen}>
            <MdMoreVert />
          </MoreButton>
          <AnimatePresence>
            {modals.moreMenu.isOpen && (
              <MoreMenuDropdown
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                {modals.prestige.data && (
                  <MoreMenuItem onClick={() => { modals.prestige.open(); modals.moreMenu.close(); }}>
                    <span>{modals.prestige.data.currentEmoji || '🎣'}</span>
                    <span>{modals.prestige.data.currentName || t('fishing.noviceAngler')}</span>
                    {modals.prestige.data.canPrestige && <MoreMenuBadge $glow>!</MoreMenuBadge>}
                  </MoreMenuItem>
                )}
                {modals.rankData && (
                  <MoreMenuItem onClick={() => { modals.leaderboard.open(); modals.moreMenu.close(); }}>
                    <FaCrown style={{ color: modals.rankData.canAutofish ? '#ffd54f' : '#a1887f' }} />
                    <span>#{modals.rankData.rank}</span>
                    {modals.rankData.canAutofish && <MoreMenuBadge>⭐</MoreMenuBadge>}
                  </MoreMenuItem>
                )}
                {dailyStats && (
                  <MoreMenuInfo>
                    <MdAutorenew />
                    <span>{dailyStats.remaining}/{dailyStats.limit} {t('fishing.remainingToday') || 'left today'}</span>
                  </MoreMenuInfo>
                )}
                <MoreMenuDivider />
                <MoreMenuItemMobile 
                  onClick={() => { modals.challenges.open(); modals.moreMenu.close(); }} 
                  $hasNotification={modals.challenges.data?.challenges?.some(c => c.progress >= c.target && !c.completed)}
                >
                  <MdEmojiEvents />
                  <span>{t('fishing.challenges') || 'Challenges'}</span>
                  {modals.challenges.data?.challenges?.some(c => c.progress >= c.target && !c.completed) && <MoreMenuBadge>!</MoreMenuBadge>}
                </MoreMenuItemMobile>
                <MoreMenuItem onClick={() => { modals.equipment.open(); modals.moreMenu.close(); }}>
                  <MdSettings />
                  <span>{t('fishing.equipment') || 'Equipment'}</span>
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { modals.leaderboard.open(); modals.moreMenu.close(); }}>
                  <MdLeaderboard />
                  <span>{t('fishing.leaderboard') || 'Leaderboard'}</span>
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { modals.trading.open(); modals.moreMenu.close(); }}>
                  <MdStorefront />
                  <span>{t('fishing.tradingPost') || 'Trading Post'}</span>
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { modals.baitShop.open(); modals.moreMenu.close(); }}>
                  <span role="img" aria-hidden="true">🪱</span>
                  <span>{t('fishing.baitShop') || 'Bait Shop'}</span>
                </MoreMenuItem>
              </MoreMenuDropdown>
            )}
          </AnimatePresence>
        </MoreMenuWrapper>
        <WoodButton onClick={modals.help.open}>
          <MdHelpOutline />
        </WoodButton>
      </HeaderRight>
    </Header>
  );
};

export default FishingHeader;

