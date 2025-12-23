import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useRarity } from '../../../context/RarityContext';
import { ModalOverlay, ModalHeader, ModalBody, motionVariants } from '../../../styles/DesignSystem';
import {
  CozyModal, ModalTitle, CloseButton,
  HelpSection, HelpNumber, HelpContent, HelpTitle, HelpText,
  FishList, FishItem, FishEmoji, FishRarity, FishDifficulty,
} from '../FishingStyles';

/**
 * Help Modal - Shows fishing instructions and fish rarities
 */
export const HelpModal = ({ show, onClose, fishInfo }) => {
  const { t } = useTranslation();
  const { getRarityColor } = useRarity();

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
              <ModalTitle>{t('fishing.howToFish')}</ModalTitle>
              <CloseButton onClick={onClose}><MdClose /></CloseButton>
            </ModalHeader>
            <ModalBody>
              <HelpSection>
                <HelpNumber>1</HelpNumber>
                <HelpContent>
                  <HelpTitle>{t('fishing.movement')}</HelpTitle>
                  <HelpText>{t('fishing.movementHelp')}</HelpText>
                </HelpContent>
              </HelpSection>
              <HelpSection>
                <HelpNumber>2</HelpNumber>
                <HelpContent>
                  <HelpTitle>{t('fishing.fishingTitle')}</HelpTitle>
                  <HelpText>{t('fishing.fishingHelp')}</HelpText>
                </HelpContent>
              </HelpSection>
              <HelpSection>
                <HelpNumber>3</HelpNumber>
                <HelpContent>
                  <HelpTitle>{t('fishing.catching')}</HelpTitle>
                  <HelpText>{t('fishing.catchingHelp')}</HelpText>
                </HelpContent>
              </HelpSection>
              <HelpSection>
                <HelpContent>
                  <HelpTitle>{t('fishing.fishRarities')}</HelpTitle>
                  <FishList>
                    {fishInfo?.fish?.reduce((acc, fish) => {
                      if (!acc.find(f => f.rarity === fish.rarity)) acc.push(fish);
                      return acc;
                    }, []).map(fish => (
                      <FishItem key={fish.rarity} $color={getRarityColor(fish.rarity)}>
                        <FishEmoji>{fish.emoji}</FishEmoji>
                        <FishRarity $color={getRarityColor(fish.rarity)}>
                          {t(`fishing.${fish.rarity}`)}
                        </FishRarity>
                        <FishDifficulty>{fish.difficulty}</FishDifficulty>
                      </FishItem>
                    ))}
                  </FishList>
                </HelpContent>
              </HelpSection>
            </ModalBody>
          </CozyModal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;

