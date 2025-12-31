import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { FaFish } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ModalOverlay, ModalHeader, ModalBody, motionVariants } from '../../../design-system';
import {
  IconFishing, IconClock, IconSparkleSymbol, IconStarFilled,
  IconRefresh, IconPremiumTicket, IconPity, IconCheckmark,
  IconLocked, IconTrophy, IconFire, IconParty
} from '../../../constants/icons';
import {
  CozyModal, ModalTitle, CloseButton, TradingLoadingState,
  PrestigeCurrentLevel, PrestigeLevelEmoji, PrestigeLevelInfo,
  PrestigeLevelTitle, PrestigeLevelSubtitle,
  PrestigeBonusSection, PrestigeSectionTitle, PrestigeBonusList, PrestigeBonusItem,
  PrestigeProgressSection, PrestigeDescription,
  PrestigeOverallProgress, PrestigeProgressBarWrapper, PrestigeProgressFill, PrestigeProgressPercent,
  PrestigeRequirementsList, PrestigeRequirementItem,
  PrestigeReqIcon, PrestigeReqContent, PrestigeReqLabel, PrestigeReqBar, PrestigeReqFill, PrestigeReqValue,
  PrestigeClaimButton, PrestigeMaxLevel, PrestigeMaxIcon, PrestigeMaxText, PrestigeMaxSubtext,
  PrestigeLevelsOverview, PrestigeLevelsList, PrestigeLevelCard,
  PrestigeLevelCardEmoji, PrestigeLevelCardInfo, PrestigeLevelCardName,
  PrestigeLevelCardBadge, PrestigeLevelCardCheck, PrestigeLevelCardLock,
} from '../Fishing.styles';

/**
 * Prestige Modal - Prestige system progression
 */
export const PrestigeModal = ({ 
  show, 
  onClose, 
  prestigeData,
  claimingPrestige,
  onClaimPrestige,
}) => {
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
                <span style={{ marginRight: '8px' }}>{prestigeData?.currentEmoji || <IconFishing />}</span>
                {t('fishing.prestige') || 'Prestige'}
              </ModalTitle>
              <CloseButton onClick={onClose}><MdClose /></CloseButton>
            </ModalHeader>
            <ModalBody>
              {prestigeData ? (
                <>
                  {/* Current Level Display */}
                  <PrestigeCurrentLevel $level={prestigeData.currentLevel}>
                    <PrestigeLevelEmoji>{prestigeData.currentEmoji || <IconFishing />}</PrestigeLevelEmoji>
                    <PrestigeLevelInfo>
                      <PrestigeLevelTitle>{prestigeData.currentName || t('fishing.noviceAngler')}</PrestigeLevelTitle>
                      <PrestigeLevelSubtitle>
                        {prestigeData.currentLevel > 0
                          ? t('fishing.prestigeLevel', { level: prestigeData.currentLevel, max: 5 }) || `Prestige Level ${prestigeData.currentLevel} of 5`
                          : t('fishing.notPrestigedYet') || 'Not prestiged yet'}
                      </PrestigeLevelSubtitle>
                    </PrestigeLevelInfo>
                  </PrestigeCurrentLevel>
                  
                  {/* Active Bonuses */}
                  {prestigeData.currentLevel > 0 && prestigeData.currentBonuses && (
                    <PrestigeBonusSection>
                      <PrestigeSectionTitle>{t('fishing.activeBonuses') || 'Active Bonuses'}</PrestigeSectionTitle>
                      <PrestigeBonusList>
                        {prestigeData.currentBonuses.timingBonus > 0 && (
                          <PrestigeBonusItem>
                            <IconClock />
                            <span>+{prestigeData.currentBonuses.timingBonus}ms {t('fishing.timingWindow') || 'timing window'}</span>
                          </PrestigeBonusItem>
                        )}
                        {prestigeData.currentBonuses.rarityBonus > 0 && (
                          <PrestigeBonusItem>
                            <IconSparkleSymbol />
                            <span>+{Math.round(prestigeData.currentBonuses.rarityBonus * 100)}% {t('fishing.rareChance') || 'rare fish chance'}</span>
                          </PrestigeBonusItem>
                        )}
                        {prestigeData.currentBonuses.autofishLimit > 0 && (
                          <PrestigeBonusItem>
                            <IconRefresh />
                            <span>+{prestigeData.currentBonuses.autofishLimit} {t('fishing.dailyAutofish') || 'daily autofish'}</span>
                          </PrestigeBonusItem>
                        )}
                        {prestigeData.currentBonuses.premiumTicketBonus > 0 && (
                          <PrestigeBonusItem>
                            <IconPremiumTicket />
                            <span>+{prestigeData.currentBonuses.premiumTicketBonus} {t('fishing.dailyPremiumTickets') || 'daily premium tickets'}</span>
                          </PrestigeBonusItem>
                        )}
                        {prestigeData.currentBonuses.autofishPerfectChance > 0 && (
                          <PrestigeBonusItem>
                            <IconStarFilled />
                            <span>{Math.round(prestigeData.currentBonuses.autofishPerfectChance * 100)}% {t('fishing.autofishPerfect') || 'autofish perfect chance'}</span>
                          </PrestigeBonusItem>
                        )}
                        {prestigeData.currentBonuses.pityReduction > 0 && (
                          <PrestigeBonusItem>
                            <IconPity />
                            <span>{Math.round(prestigeData.currentBonuses.pityReduction * 100)}% {t('fishing.fasterPity') || 'faster pity buildup'}</span>
                          </PrestigeBonusItem>
                        )}
                      </PrestigeBonusList>
                    </PrestigeBonusSection>
                  )}
                  
                  {/* Next Level Progress */}
                  {!prestigeData.progress?.maxPrestige && prestigeData.progress?.nextLevelInfo && (
                    <PrestigeProgressSection>
                      <PrestigeSectionTitle>
                        {t('fishing.nextLevel') || 'Next Level'}: {prestigeData.progress.nextLevelInfo.emoji} {prestigeData.progress.nextLevelInfo.name}
                      </PrestigeSectionTitle>
                      <PrestigeDescription>{prestigeData.progress.nextLevelInfo.description}</PrestigeDescription>
                      
                      {/* Overall Progress Bar */}
                      <PrestigeOverallProgress>
                        <PrestigeProgressBarWrapper>
                          <PrestigeProgressFill $percent={prestigeData.progress.overallProgress || 0} />
                        </PrestigeProgressBarWrapper>
                        <PrestigeProgressPercent>{prestigeData.progress.overallProgress || 0}%</PrestigeProgressPercent>
                      </PrestigeOverallProgress>
                      
                      {/* Detailed Requirements */}
                      <PrestigeRequirementsList>
                        {prestigeData.progress.progress?.catches && (
                          <PrestigeRequirementItem $complete={prestigeData.progress.progress.catches.percent >= 100}>
                            <PrestigeReqIcon>{prestigeData.progress.progress.catches.percent >= 100 ? <IconCheckmark /> : <FaFish />}</PrestigeReqIcon>
                            <PrestigeReqContent>
                              <PrestigeReqLabel>{t('fishing.totalCatches') || 'Total Catches'}</PrestigeReqLabel>
                              <PrestigeReqBar>
                                <PrestigeReqFill $percent={prestigeData.progress.progress.catches.percent} />
                              </PrestigeReqBar>
                              <PrestigeReqValue>
                                {prestigeData.progress.progress.catches.current.toLocaleString()} / {prestigeData.progress.progress.catches.required.toLocaleString()}
                              </PrestigeReqValue>
                            </PrestigeReqContent>
                          </PrestigeRequirementItem>
                        )}
                        {prestigeData.progress.progress?.legendaries && (
                          <PrestigeRequirementItem $complete={prestigeData.progress.progress.legendaries.percent >= 100}>
                            <PrestigeReqIcon>{prestigeData.progress.progress.legendaries.percent >= 100 ? <IconCheckmark /> : <IconPity />}</PrestigeReqIcon>
                            <PrestigeReqContent>
                              <PrestigeReqLabel>{t('fishing.legendaryCatches') || 'Legendary Catches'}</PrestigeReqLabel>
                              <PrestigeReqBar>
                                <PrestigeReqFill $percent={prestigeData.progress.progress.legendaries.percent} />
                              </PrestigeReqBar>
                              <PrestigeReqValue>
                                {prestigeData.progress.progress.legendaries.current} / {prestigeData.progress.progress.legendaries.required}
                              </PrestigeReqValue>
                            </PrestigeReqContent>
                          </PrestigeRequirementItem>
                        )}
                        {prestigeData.progress.progress?.perfects && (
                          <PrestigeRequirementItem $complete={prestigeData.progress.progress.perfects.percent >= 100}>
                            <PrestigeReqIcon>{prestigeData.progress.progress.perfects.percent >= 100 ? <IconCheckmark /> : <IconStarFilled />}</PrestigeReqIcon>
                            <PrestigeReqContent>
                              <PrestigeReqLabel>{t('fishing.perfectCatches') || 'Perfect Catches'}</PrestigeReqLabel>
                              <PrestigeReqBar>
                                <PrestigeReqFill $percent={prestigeData.progress.progress.perfects.percent} />
                              </PrestigeReqBar>
                              <PrestigeReqValue>
                                {prestigeData.progress.progress.perfects.current} / {prestigeData.progress.progress.perfects.required}
                              </PrestigeReqValue>
                            </PrestigeReqContent>
                          </PrestigeRequirementItem>
                        )}
                        {prestigeData.progress.progress?.streak && (
                          <PrestigeRequirementItem $complete={prestigeData.progress.progress.streak.percent >= 100}>
                            <PrestigeReqIcon>{prestigeData.progress.progress.streak.percent >= 100 ? <IconCheckmark /> : <IconFire />}</PrestigeReqIcon>
                            <PrestigeReqContent>
                              <PrestigeReqLabel>{t('fishing.longestStreak') || 'Longest Streak'}</PrestigeReqLabel>
                              <PrestigeReqBar>
                                <PrestigeReqFill $percent={prestigeData.progress.progress.streak.percent} />
                              </PrestigeReqBar>
                              <PrestigeReqValue>
                                {prestigeData.progress.progress.streak.current} / {prestigeData.progress.progress.streak.required}
                              </PrestigeReqValue>
                            </PrestigeReqContent>
                          </PrestigeRequirementItem>
                        )}
                        {prestigeData.progress.progress?.challenges && (
                          <PrestigeRequirementItem $complete={prestigeData.progress.progress.challenges.percent >= 100}>
                            <PrestigeReqIcon>{prestigeData.progress.progress.challenges.percent >= 100 ? <IconCheckmark /> : <IconTrophy />}</PrestigeReqIcon>
                            <PrestigeReqContent>
                              <PrestigeReqLabel>{t('fishing.challengesCompleted') || 'Challenges Completed'}</PrestigeReqLabel>
                              <PrestigeReqBar>
                                <PrestigeReqFill $percent={prestigeData.progress.progress.challenges.percent} />
                              </PrestigeReqBar>
                              <PrestigeReqValue>
                                {prestigeData.progress.progress.challenges.current} / {prestigeData.progress.progress.challenges.required}
                              </PrestigeReqValue>
                            </PrestigeReqContent>
                          </PrestigeRequirementItem>
                        )}
                      </PrestigeRequirementsList>
                      
                      {/* Claim Button */}
                      {prestigeData.canPrestige && (
                        <PrestigeClaimButton
                          onClick={onClaimPrestige}
                          disabled={claimingPrestige}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {claimingPrestige ? '...' : <><IconParty /> {t('fishing.claimPrestige') || 'Claim Prestige!'}</>}
                        </PrestigeClaimButton>
                      )}
                    </PrestigeProgressSection>
                  )}
                  
                  {/* Max Prestige Message */}
                  {prestigeData.progress?.maxPrestige && (
                    <PrestigeMaxLevel>
                      <PrestigeMaxIcon><IconPremiumTicket /></PrestigeMaxIcon>
                      <PrestigeMaxText>{t('fishing.maxPrestige') || 'Maximum Prestige Achieved!'}</PrestigeMaxText>
                      <PrestigeMaxSubtext>{t('fishing.maxPrestigeDesc') || 'You have mastered the art of fishing.'}</PrestigeMaxSubtext>
                    </PrestigeMaxLevel>
                  )}
                  
                  {/* All Levels Overview */}
                  {prestigeData.allLevels && (
                    <PrestigeLevelsOverview>
                      <PrestigeSectionTitle>{t('fishing.allLevels') || 'All Prestige Levels'}</PrestigeSectionTitle>
                      <PrestigeLevelsList>
                        {prestigeData.allLevels.map(level => (
                          <PrestigeLevelCard
                            key={level.level}
                            $unlocked={level.unlocked}
                            $current={level.current}
                          >
                            <PrestigeLevelCardEmoji>{level.emoji}</PrestigeLevelCardEmoji>
                            <PrestigeLevelCardInfo>
                              <PrestigeLevelCardName $unlocked={level.unlocked}>{level.name}</PrestigeLevelCardName>
                              {level.current && <PrestigeLevelCardBadge>{t('fishing.current') || 'Current'}</PrestigeLevelCardBadge>}
                            </PrestigeLevelCardInfo>
                            {level.unlocked && !level.current && <PrestigeLevelCardCheck><IconCheckmark /></PrestigeLevelCardCheck>}
                            {!level.unlocked && <PrestigeLevelCardLock><IconLocked /></PrestigeLevelCardLock>}
                          </PrestigeLevelCard>
                        ))}
                      </PrestigeLevelsList>
                    </PrestigeLevelsOverview>
                  )}
                </>
              ) : (
                <TradingLoadingState>
                  <FaFish className="loading-fish" />
                  <span>{t('common.loading')}</span>
                </TradingLoadingState>
              )}
            </ModalBody>
          </CozyModal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default PrestigeModal;

