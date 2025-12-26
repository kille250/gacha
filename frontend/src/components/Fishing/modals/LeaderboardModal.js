import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose, MdAutorenew } from 'react-icons/md';
import { FaTrophy, FaCrown } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ModalOverlay, ModalHeader, ModalBody, motionVariants } from '../../../design-system';
import {
  CozyModal, ModalTitle, CloseButton, CoinDot,
  YourRankSection, RankBanner, YourRankValue, RankSubtext,
  AutofishUnlockStatus, LeaderboardList, LeaderboardItem,
  LeaderboardRank, LeaderboardName, LeaderboardPoints, AutofishBadge,
} from '../Fishing.styles';

/**
 * Leaderboard Modal - Shows player rankings
 */
export const LeaderboardModal = ({ show, onClose, rankData, leaderboard }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <ModalOverlay
          variants={motionVariants.overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <CozyModal variants={motionVariants.modal}>
            <ModalHeader>
              <ModalTitle>
                <FaTrophy style={{ color: '#c9a227', marginRight: '8px' }} />
                {t('fishing.leaderboard')}
              </ModalTitle>
              <CloseButton onClick={onClose}><MdClose /></CloseButton>
            </ModalHeader>
            <ModalBody>
              {rankData && (
                <YourRankSection>
                  <RankBanner $canAutofish={rankData.canAutofish}>
                    <YourRankValue>#{rankData.rank}</YourRankValue>
                    <RankSubtext>/ {rankData.totalUsers} {t('fishing.topPlayers').toLowerCase()}</RankSubtext>
                  </RankBanner>
                  <AutofishUnlockStatus $unlocked={rankData.canAutofish}>
                    {rankData.canAutofish ? (
                      <><MdAutorenew style={{ color: '#558b2f' }} /><span>{t('fishing.autofishUnlocked')}</span></>
                    ) : (
                      <><span style={{ opacity: 0.6 }}>●</span><span>{t('fishing.autofishLocked', { rank: rankData.requiredRank })}</span></>
                    )}
                  </AutofishUnlockStatus>
                </YourRankSection>
              )}
              
              <LeaderboardList>
                {leaderboard.map((player) => (
                  <LeaderboardItem key={player.username} $isYou={rankData?.rank === player.rank} $rank={player.rank}>
                    <LeaderboardRank $rank={player.rank}>
                      {player.rank <= 3 ? <FaCrown style={{ color: player.rank === 1 ? '#c9a227' : player.rank === 2 ? '#a8a8a8' : '#b87333' }} /> : `#${player.rank}`}
                    </LeaderboardRank>
                    <LeaderboardName>{player.username}</LeaderboardName>
                    <LeaderboardPoints>
                      <CoinDot $small />
                      <span>{player.points.toLocaleString()}</span>
                    </LeaderboardPoints>
                    {player.hasAutofish && (
                      <AutofishBadge><MdAutorenew /></AutofishBadge>
                    )}
                  </LeaderboardItem>
                ))}
              </LeaderboardList>
            </ModalBody>
          </CozyModal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default LeaderboardModal;

