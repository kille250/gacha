/**
 * DojoTrainingSlots - Character training slots grid
 *
 * Displays filled slots with characters and empty/locked slots.
 * Includes keyboard navigation and confirmation for removing leveled characters.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdLock, MdAutorenew } from 'react-icons/md';
import { FaDumbbell, FaTimes, FaStar, FaMagic } from 'react-icons/fa';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';
import styled from 'styled-components';
import { theme } from '../../../design-system';

import { getAssetUrl } from '../../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo, getVideoMimeType } from '../../../utils/mediaUtils';
import { ConfirmDialog } from '../../../design-system';

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
  SlotSpecBadge,
  SlotSpecIndicator,
  RemoveButton,
  SpecializeButton,
  EmptySlot,
  LockedSlot,
} from './DojoPage.styles';

// Specialization icon mapping
const SPEC_ICONS = {
  strength: GiCrossedSwords,
  wisdom: GiBookCover,
  spirit: GiSparkles
};

const SPEC_COLORS = {
  strength: '#e74c3c',
  wisdom: '#3498db',
  spirit: '#9b59b6'
};

// Quick Fill button style
const QuickFillButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: linear-gradient(135deg, rgba(88, 86, 214, 0.2), rgba(175, 82, 222, 0.2));
  border: 1px solid rgba(88, 86, 214, 0.4);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(88, 86, 214, 0.3), rgba(175, 82, 222, 0.3));
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 14px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const DojoTrainingSlots = ({
  status,
  getRarityColor,
  getRarityGlow,
  onOpenPicker,
  onUnassign,
  onOpenSpecialization,
  onQuickFill,
  quickFilling = false,
  hasEmptySlots = false,
}) => {
  const { t } = useTranslation();
  const [confirmRemove, setConfirmRemove] = useState(null);

  const maxSlots = status?.maxSlots || 3;
  const usedSlots = status?.usedSlots || 0;
  const lockedSlotsToShow = Math.min(2, 10 - maxSlots);

  // Handle remove with confirmation for leveled characters
  const handleRemoveClick = useCallback((idx, char) => {
    if (char.level >= 3) {
      // Show confirmation for level 3+ characters
      setConfirmRemove({ idx, char });
    } else {
      onUnassign(idx);
    }
  }, [onUnassign]);

  const confirmRemoveCharacter = useCallback(() => {
    if (confirmRemove) {
      onUnassign(confirmRemove.idx);
      setConfirmRemove(null);
    }
  }, [confirmRemove, onUnassign]);

  // Keyboard handler for slots
  const handleSlotKeyDown = useCallback((e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }, []);

  return (
    <SlotsSection role="region" aria-label={t('dojo.trainingSlots')}>
      <SlotsHeader>
        <HeaderRow>
          <SlotsTitle>
            <FaDumbbell aria-hidden="true" />
            <span>{t('dojo.trainingSlots')}</span>
          </SlotsTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onQuickFill && hasEmptySlots && (
              <QuickFillButton
                onClick={onQuickFill}
                disabled={quickFilling}
                title={t('dojo.quickFillHint', { defaultValue: 'Auto-fill empty slots with best characters' })}
                aria-label={t('dojo.quickFill', { defaultValue: 'Quick Fill' })}
              >
                {quickFilling ? (
                  <MdAutorenew className="spin" aria-hidden="true" />
                ) : (
                  <FaMagic aria-hidden="true" />
                )}
                <span>{t('dojo.quickFill', { defaultValue: 'Quick Fill' })}</span>
              </QuickFillButton>
            )}
            <SlotsCount aria-label={`${usedSlots} of ${maxSlots} slots used`}>
              {usedSlots} / {maxSlots}
            </SlotsCount>
          </div>
        </HeaderRow>
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
                tabIndex={0}
                aria-label={`${char.name} - ${char.rarity}${char.level > 1 ? ` Level ${char.level}` : ''}${char.specialization ? ` (${char.specialization})` : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    handleRemoveClick(idx, char);
                  }
                }}
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
                  onClick={() => handleRemoveClick(idx, char)}
                  aria-label={`Remove ${char.name} from slot`}
                >
                  <FaTimes aria-hidden="true" />
                </RemoveButton>
                {char.specialization ? (
                  <SlotSpecBadge
                    $color={SPEC_COLORS[char.specialization]}
                    title={t(`specialization.${char.specialization}.name`)}
                    aria-label={t(`specialization.${char.specialization}.name`)}
                  >
                    {React.createElement(SPEC_ICONS[char.specialization], { size: 14 })}
                  </SlotSpecBadge>
                ) : onOpenSpecialization ? (
                  <>
                    {/* Always visible indicator that character can be specialized */}
                    <SlotSpecIndicator
                      title={t('dojo.canSpecialize')}
                      aria-label={t('dojo.canSpecialize')}
                    >
                      <FaStar size={10} />
                    </SlotSpecIndicator>
                    <SpecializeButton
                      onClick={() => onOpenSpecialization(char)}
                      onKeyDown={(e) => handleSlotKeyDown(e, () => onOpenSpecialization(char))}
                      aria-label={`${t('dojo.specialize')} ${char.name}`}
                    >
                      <FaStar aria-hidden="true" />
                      <span>{t('dojo.specialize')}</span>
                    </SpecializeButton>
                  </>
                ) : null}
              </FilledSlot>
            );
          }

          return (
            <EmptySlot
              key={idx}
              onClick={() => onOpenPicker(idx)}
              onKeyDown={(e) => handleSlotKeyDown(e, () => onOpenPicker(idx))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              role="button"
              tabIndex={0}
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

      {/* Confirmation Dialog for removing leveled characters */}
      {confirmRemove && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmRemove(null)}
          onConfirm={confirmRemoveCharacter}
          title={t('dojo.confirmRemoveTitle', { defaultValue: 'Remove Character?' })}
          message={t('dojo.confirmRemoveMessage', {
            name: confirmRemove.char.name,
            level: confirmRemove.char.level,
            bonus: Math.round((confirmRemove.char.levelMultiplier - 1) * 100),
            defaultValue: `${confirmRemove.char.name} is Level ${confirmRemove.char.level} with +${Math.round((confirmRemove.char.levelMultiplier - 1) * 100)}% power bonus. Are you sure you want to remove them from training?`
          })}
          confirmLabel={t('dojo.removeCharacter', { defaultValue: 'Remove' })}
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          variant="warning"
        />
      )}
    </SlotsSection>
  );
};

export default DojoTrainingSlots;
