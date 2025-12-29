/**
 * DojoTrainingSlots - Character training slots grid
 *
 * Displays filled slots with characters and empty/locked slots.
 * Includes keyboard navigation and confirmation for removing leveled characters.
 *
 * Keyboard shortcuts:
 * - 'A' key: Open character picker for first empty slot (quick-assign)
 * - 'Delete/Backspace': Remove focused character from slot
 * - 'Enter/Space': Interact with focused slot
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdLock, MdAutorenew, MdUndo } from 'react-icons/md';
import { FaDumbbell, FaTimes, FaStar, FaMagic } from 'react-icons/fa';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';
import styled from 'styled-components';
import { theme, useReducedMotion } from '../../../design-system';

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

// Quick Fill button style - magical effect with icon-only on narrow screens
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
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
  position: relative;
  overflow: hidden;

  /* Shimmer effect on idle */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(88, 86, 214, 0.35), rgba(175, 82, 222, 0.35));
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(88, 86, 214, 0.3);
    border-color: rgba(175, 82, 222, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
    flex-shrink: 0;
  }

  /* Magic wand sparkle effect when idle */
  .magic-icon {
    transition: transform 0.3s ease;
  }

  &:hover:not(:disabled) .magic-icon {
    transform: rotate(-15deg) scale(1.1);
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Icon-only on narrow screens to prevent text truncation */
  @media (max-width: 400px) {
    padding: ${theme.spacing.sm};

    span {
      display: none;
    }
  }

  /* Reduced motion: disable shimmer and transforms */
  @media (prefers-reduced-motion: reduce) {
    &::before {
      display: none;
    }

    &:hover:not(:disabled) {
      transform: none;
    }

    &:active:not(:disabled) {
      transform: none;
      opacity: 0.8;
    }

    &:hover:not(:disabled) .magic-icon {
      transform: none;
    }
  }
`;

// Undo Quick Fill button
const UndoButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: linear-gradient(135deg, rgba(255, 149, 0, 0.15), rgba(255, 204, 0, 0.1));
  border: 1px solid rgba(255, 149, 0, 0.4);
  border-radius: ${theme.radius.md};
  color: #ff9f0a;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  &:hover {
    background: linear-gradient(135deg, rgba(255, 149, 0, 0.25), rgba(255, 204, 0, 0.2));
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    font-size: 14px;
  }

  @media (max-width: 400px) {
    span {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover, &:active {
      transform: none;
    }
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

// Empty state guidance when no characters are training
const EmptyStateGuidance = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xl};
  background: linear-gradient(135deg, rgba(88, 86, 214, 0.05), rgba(175, 82, 222, 0.05));
  border: 1px dashed rgba(88, 86, 214, 0.3);
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.textSecondary};
  gap: ${theme.spacing.md};

  svg {
    font-size: 32px;
    color: ${theme.colors.primary};
    opacity: 0.7;
  }
`;

const GuidanceTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const GuidanceText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  max-width: 280px;
  line-height: 1.5;
`;

// Keyboard shortcut hint
const KeyboardShortcutHint = styled.div`
  display: none;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.surfaceBorder};

  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    background: ${theme.colors.backgroundTertiary};
    border: 1px solid ${theme.colors.surfaceBorder};
    border-radius: ${theme.radius.sm};
    font-family: inherit;
    font-size: 11px;
    font-weight: ${theme.fontWeights.medium};
    color: ${theme.colors.textSecondary};
  }
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
  canUndo = false,
  onUndo,
  canUndoQuickFill = false,
  onUndoQuickFill,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [confirmRemove, setConfirmRemove] = useState(null);
  const sectionRef = useRef(null);

  // Motion props that respect reduced motion preference
  const hoverScale = prefersReducedMotion ? {} : { scale: 1.02 };
  const tapScale = prefersReducedMotion ? {} : { scale: 0.98 };

  const maxSlots = status?.maxSlots || 3;
  const usedSlots = status?.usedSlots || 0;
  const lockedSlotsToShow = Math.min(2, 10 - maxSlots);

  // Find first empty slot index
  const firstEmptySlotIndex = Array.from({ length: maxSlots }).findIndex((_, idx) => {
    return !status?.slots?.[idx]?.character;
  });

  // Keyboard shortcut: 'A' to quick-assign (open picker for first empty slot)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // 'A' key to open character picker for first empty slot
      if (e.key === 'a' || e.key === 'A') {
        if (firstEmptySlotIndex !== -1 && !quickFilling) {
          e.preventDefault();
          onOpenPicker(firstEmptySlotIndex);
        }
      }

      // 'Q' key for quick fill (if available)
      if ((e.key === 'q' || e.key === 'Q') && hasEmptySlots && onQuickFill && !quickFilling) {
        e.preventDefault();
        onQuickFill();
      }

      // Ctrl+Z / Cmd+Z for undo (Quick Fill undo takes priority, then single assignment undo)
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (canUndoQuickFill && onUndoQuickFill) {
          onUndoQuickFill();
        } else if (canUndo && onUndo) {
          onUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [firstEmptySlotIndex, quickFilling, onOpenPicker, hasEmptySlots, onQuickFill, canUndo, onUndo, canUndoQuickFill, onUndoQuickFill]);

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
    <SlotsSection ref={sectionRef} role="region" aria-label={t('dojo.trainingSlots')}>
      <SlotsHeader>
        <HeaderRow>
          <SlotsTitle>
            <FaDumbbell aria-hidden="true" />
            <span>{t('dojo.trainingSlots')}</span>
          </SlotsTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Keyboard shortcut hints - only shown on desktop */}
            {(hasEmptySlots || canUndo) && (
              <KeyboardShortcutHint>
                {hasEmptySlots && (
                  <>
                    <kbd>A</kbd>
                    <span>{t('dojo.assignKey', { defaultValue: 'Assign' })}</span>
                  </>
                )}
                {hasEmptySlots && onQuickFill && (
                  <>
                    <span style={{ color: theme.colors.surfaceBorder }}>|</span>
                    <kbd>Q</kbd>
                    <span>{t('dojo.quickFillKey', { defaultValue: 'Quick Fill' })}</span>
                  </>
                )}
                {canUndo && (
                  <>
                    <span style={{ color: theme.colors.surfaceBorder }}>|</span>
                    <kbd>Ctrl</kbd><kbd>Z</kbd>
                    <span>{t('common.undo', { defaultValue: 'Undo' })}</span>
                  </>
                )}
              </KeyboardShortcutHint>
            )}
            {/* Undo Quick Fill button - appears for 5 seconds after Quick Fill */}
            {canUndoQuickFill && onUndoQuickFill && (
              <UndoButton
                onClick={onUndoQuickFill}
                title={t('dojo.undoQuickFill', { defaultValue: 'Undo Quick Fill' })}
                aria-label={t('dojo.undoQuickFill', { defaultValue: 'Undo Quick Fill' })}
              >
                <MdUndo aria-hidden="true" />
                <span>{t('common.undo', { defaultValue: 'Undo' })}</span>
              </UndoButton>
            )}
            {onQuickFill && hasEmptySlots && (
              <QuickFillButton
                onClick={onQuickFill}
                disabled={quickFilling}
                title={t('dojo.quickFillHint', { defaultValue: 'Auto-fill empty slots with best characters (Press Q)' })}
                aria-label={t('dojo.quickFillAriaLabel', { defaultValue: 'Quick fill team with best available characters' })}
              >
                {quickFilling ? (
                  <MdAutorenew className="spin" aria-hidden="true" />
                ) : (
                  <FaMagic className="magic-icon" aria-hidden="true" />
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
        {/* Empty state guidance when no characters are training */}
        {usedSlots === 0 && (
          <EmptyStateGuidance>
            <FaDumbbell aria-hidden="true" />
            <GuidanceTitle>
              {t('dojo.emptyStateTitle', { defaultValue: 'Start Training!' })}
            </GuidanceTitle>
            <GuidanceText>
              {t('dojo.emptyStateText', {
                defaultValue: 'Assign characters to training slots to earn points and tickets passively. Higher rarity and leveled characters earn more rewards!'
              })}
            </GuidanceText>
          </EmptyStateGuidance>
        )}

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
                whileHover={hoverScale}
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
              whileHover={hoverScale}
              whileTap={tapScale}
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
