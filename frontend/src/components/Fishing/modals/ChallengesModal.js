import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose, MdEmojiEvents, MdAutorenew, MdCheckCircle } from 'react-icons/md';
import { FaFish } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ModalOverlay, ModalHeader, ModalBody, motionVariants } from '../../../design-system';
import {
  CozyModal, ModalTitle, CloseButton, TradingLoadingState,
  ChallengesList, ChallengeCard, ChallengeHeader, ChallengeName, DifficultyBadge,
  ChallengeDescription, ChallengeProgress, ProgressText, ChallengeReward,
  ClaimButton, CompletedBadge, ProgressBarContainer, ProgressBarFill,
} from '../FishingStyles';

/**
 * Challenges Modal - Daily fishing challenges
 */
export const ChallengesModal = ({ 
  show, 
  onClose, 
  challenges, 
  challengesLoading,
  claimingChallenges,
  onClaimChallenge 
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
                <MdEmojiEvents style={{ color: '#ffc107', marginRight: '8px' }} />
                {t('fishing.dailyChallenges') || 'Daily Challenges'}
              </ModalTitle>
              <CloseButton onClick={onClose}><MdClose /></CloseButton>
            </ModalHeader>
            <ModalBody>
              {challengesLoading ? (
                <TradingLoadingState>
                  <FaFish className="loading-fish" />
                  <span>{t('common.loading')}</span>
                </TradingLoadingState>
              ) : challenges ? (
                <ChallengesList>
                  {challenges.challenges.map(challenge => (
                    <ChallengeCard 
                      key={challenge.id} 
                      $completed={challenge.completed}
                      $difficulty={challenge.difficulty}
                    >
                      <ChallengeHeader>
                        <ChallengeName>{t(`fishing.challengeNames.${challenge.id}`) || challenge.name}</ChallengeName>
                        <DifficultyBadge $difficulty={challenge.difficulty}>
                          {t(`fishing.difficulty.${challenge.difficulty}`) || challenge.difficulty}
                        </DifficultyBadge>
                      </ChallengeHeader>
                      <ChallengeDescription>{t(`fishing.challengeDescriptions.${challenge.id}`) || challenge.description}</ChallengeDescription>
                      <ChallengeProgress>
                        <ProgressBarContainer>
                          <ProgressBarFill 
                            $progress={Math.min(100, (challenge.progress / challenge.target) * 100)} 
                            $color={challenge.completed ? '#4caf50' : '#ffc107'}
                          />
                        </ProgressBarContainer>
                        <ProgressText>{challenge.progress}/{challenge.target}</ProgressText>
                      </ChallengeProgress>
                      <ChallengeReward>
                        {challenge.reward.points && <span>🪙 {challenge.reward.points}</span>}
                        {challenge.reward.rollTickets && <span>🎟️ {challenge.reward.rollTickets}</span>}
                        {challenge.reward.premiumTickets && <span>🌟 {challenge.reward.premiumTickets}</span>}
                      </ChallengeReward>
                      {challenge.progress >= challenge.target && !challenge.completed && (
                        <ClaimButton 
                          onClick={() => onClaimChallenge(challenge.id)}
                          disabled={claimingChallenges[challenge.id]}
                        >
                          {claimingChallenges[challenge.id] ? (
                            <><MdAutorenew className="spinning" /> {t('common.claiming') || 'Claiming...'}</>
                          ) : (
                            <><MdCheckCircle /> {t('fishing.claim') || 'Claim'}</>
                          )}
                        </ClaimButton>
                      )}
                      {challenge.completed && (
                        <CompletedBadge>
                          <MdCheckCircle /> {t('fishing.completed') || 'Completed'}
                        </CompletedBadge>
                      )}
                    </ChallengeCard>
                  ))}
                </ChallengesList>
              ) : (
                <TradingLoadingState>
                  <span>{t('fishing.noChallenges') || 'No challenges available'}</span>
                </TradingLoadingState>
              )}
            </ModalBody>
          </CozyModal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default ChallengesModal;

