/**
 * DojoTrainingSlots - Character training slots grid
 *
 * Displays filled slots with characters and empty/locked slots.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdLock } from 'react-icons/md';
import { FaDumbbell, FaTimes, FaStar } from 'react-icons/fa';

import { getAssetUrl } from '../../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo, getVideoMimeType } from '../../../utils/mediaUtils';

import {
  SlotsSection,
  SlotsHeader,
  SlotsTitle,
  SlotsCount,
  SlotsGrid,
  FilledSlot,
  SlotImage,
  SlotVideo,
  SlotOverlay,
  SlotCharName,
  SlotCharSeries,
  SlotBadgeRow,
  SlotRarityBadge,
  SlotLevelBadge,
  RemoveButton,
  SpecializeButton,
  EmptySlot,
  LockedSlot,
} from './DojoPage.styles';

const DojoTrainingSlots = ({
  status,
  getRarityColor,
  getRarityGlow,
  onOpenPicker,
  onUnassign,
  onOpenSpecialization,
}) => {
  const { t } = useTranslation();

  const maxSlots = status?.maxSlots || 3;
  const usedSlots = status?.usedSlots || 0;
  const lockedSlotsToShow = Math.min(2, 10 - maxSlots);

  return (
    <SlotsSection role="region" aria-label={t('dojo.trainingSlots')}>
      <SlotsHeader>
        <SlotsTitle>
          <FaDumbbell aria-hidden="true" />
          <span>{t('dojo.trainingSlots')}</span>
        </SlotsTitle>
        <SlotsCount aria-label={`${usedSlots} of ${maxSlots} slots used`}>
          {usedSlots} / {maxSlots}
        </SlotsCount>
      </SlotsHeader>

      <SlotsGrid role="list">
        {/* Active Slots */}
        {Array.from({ length: maxSlots }).map((_, idx) => {
          const slot = status?.slots?.[idx];
          const char = slot?.character;

          if (char) {
            return (
              <FilledSlot
                key={idx}
                $rarity={char.rarity}
                $color={getRarityColor(char.rarity)}
                $glow={getRarityGlow(char.rarity)}
                whileHover={{ scale: 1.02 }}
                role="listitem"
                aria-label={`${char.name} - ${char.rarity}`}
              >
                {isVideo(char.image) ? (
                  <SlotVideo autoPlay loop muted playsInline>
                    <source src={getAssetUrl(char.image)} type={getVideoMimeType(char.image)} />
                  </SlotVideo>
                ) : (
                  <SlotImage
                    src={getAssetUrl(char.image) || PLACEHOLDER_IMAGE}
                    alt={char.name}
                    onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                  />
                )}
                <SlotOverlay>
                  <SlotCharName>{char.name}</SlotCharName>
                  <SlotCharSeries>{char.series}</SlotCharSeries>
                  <SlotBadgeRow>
                    <SlotRarityBadge $color={getRarityColor(char.rarity)}>
                      {char.rarity}
                    </SlotRarityBadge>
                    {char.level && (
                      <SlotLevelBadge $isMaxLevel={char.level >= 5}>
                        {char.levelMultiplier > 1
                          ? t('dojo.characterLevelBonus', { level: char.level, bonus: Math.round((char.levelMultiplier - 1) * 100) })
                          : t('dojo.characterLevel', { level: char.level })}
                      </SlotLevelBadge>
                    )}
                  </SlotBadgeRow>
                </SlotOverlay>
                <RemoveButton
                  onClick={() => onUnassign(idx)}
                  aria-label={`Remove ${char.name} from slot`}
                >
                  <FaTimes aria-hidden="true" />
                </RemoveButton>
                {onOpenSpecialization && (
                  <SpecializeButton
                    onClick={() => onOpenSpecialization(char)}
                    aria-label={`${t('dojo.specialize')} ${char.name}`}
                  >
                    <FaStar aria-hidden="true" />
                    <span>{t('dojo.specialize')}</span>
                  </SpecializeButton>
                )}
              </FilledSlot>
            );
          }

          return (
            <EmptySlot
              key={idx}
              onClick={() => onOpenPicker(idx)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              role="listitem"
              aria-label={t('dojo.addCharacter')}
            >
              <MdAdd aria-hidden="true" />
              <span>{t('dojo.addCharacter')}</span>
            </EmptySlot>
          );
        })}

        {/* Locked Slots Preview */}
        {Array.from({ length: lockedSlotsToShow }).map((_, idx) => (
          <LockedSlot
            key={`locked-${idx}`}
            role="listitem"
            aria-label={t('dojo.locked')}
          >
            <MdLock aria-hidden="true" />
            <span>{t('dojo.locked')}</span>
          </LockedSlot>
        ))}
      </SlotsGrid>
    </SlotsSection>
  );
};

export default DojoTrainingSlots;
