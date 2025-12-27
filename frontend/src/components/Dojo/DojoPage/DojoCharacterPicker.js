/**
 * DojoCharacterPicker - Character selection modal
 *
 * Redesigned bottom sheet modal for picking characters to assign to training slots.
 * Features improved UX with:
 * - Visual selection feedback
 * - Keyboard navigation
 * - Better visual hierarchy
 * - Smooth animations
 * - Touch-friendly interactions
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdSearch, MdCheck, MdClear, MdSort } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';
import { AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

import { Spinner, theme, useReducedMotion } from '../../../design-system';
import { getAssetUrl } from '../../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo, getVideoMimeType } from '../../../utils/mediaUtils';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseBtn,
  ModalBody,
  ModalLoading,
  NoCharacters,
  CharacterList,
  SeriesTitle,
  CharacterGrid,
} from './DojoPage.styles';
import {
  PickerSearchContainer,
  PickerSearchInput,
  PickerSearchClear,
  PickerCharacterCard,
  PickerCharImage,
  PickerCharVideo,
  PickerCharOverlay,
  PickerCharName,
  PickerCharBadges,
  PickerCharRarity,
  PickerCharLevel,
  PickerCharPowerBonus,
  PickerCharSpecBadge,
  PickerSelectedIndicator,
  PickerConfirmButton,
  PickerFooter,
  PickerCharSeries,
} from './DojoCharacterPicker.styles';

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

// Rarity order for sorting (higher = better)
const RARITY_ORDER = {
  'Common': 1,
  'Uncommon': 2,
  'Rare': 3,
  'Epic': 4,
  'Legendary': 5
};

// Sort options
const SORT_OPTIONS = {
  RARITY_DESC: 'rarity_desc',
  LEVEL_DESC: 'level_desc',
  NAME_ASC: 'name_asc',
};

// Sort controls container
const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 0 ${theme.spacing.md} ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const SortButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.15)' : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: rgba(0, 113, 227, 0.1);
    border-color: ${theme.colors.primary};
  }

  svg {
    font-size: 14px;
  }
`;

// Synergy badge for characters that would create/boost synergy
const SynergyBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: rgba(48, 209, 88, 0.9);
  border-radius: ${theme.radius.sm};
  color: white;
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  z-index: 5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  svg {
    font-size: 10px;
  }
`;

const DojoCharacterPicker = ({
  onClose,
  charactersLoading,
  filteredCharacters,
  charactersBySeries,
  searchQuery,
  onSearchChange,
  onSelect,
  getRarityColor,
  currentlyTrainingSeries = [], // Series of characters currently in dojo
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.RARITY_DESC);
  const searchInputRef = useRef(null);
  const gridRef = useRef(null);

  // Motion variants that respect reduced motion preference
  const motionProps = prefersReducedMotion ? {} : {
    overlay: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    content: { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 } },
    card: { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } },
    button: { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } },
    indicator: { initial: { opacity: 0, scale: 0 }, animate: { opacity: 1, scale: 1 } },
    clearButton: { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } },
    footer: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
  };

  // Get selected character details
  const selectedChar = selectedCharId
    ? filteredCharacters.find(c => c.id === selectedCharId)
    : null;

  // Sort characters within each series based on current sort option
  const sortedCharactersBySeries = useMemo(() => {
    const sorted = {};

    Object.entries(charactersBySeries).forEach(([series, chars]) => {
      const sortedChars = [...chars].sort((a, b) => {
        switch (sortBy) {
          case SORT_OPTIONS.RARITY_DESC:
            // Sort by rarity descending, then by level descending
            const rarityDiff = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
            if (rarityDiff !== 0) return rarityDiff;
            return (b.level || 1) - (a.level || 1);
          case SORT_OPTIONS.LEVEL_DESC:
            // Sort by level descending, then by rarity descending
            const levelDiff = (b.level || 1) - (a.level || 1);
            if (levelDiff !== 0) return levelDiff;
            return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          case SORT_OPTIONS.NAME_ASC:
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
      sorted[series] = sortedChars;
    });

    return sorted;
  }, [charactersBySeries, sortBy]);

  // Check if a character would create or boost a synergy
  const getSynergyInfo = useCallback((char) => {
    const seriesCount = currentlyTrainingSeries.filter(s => s === char.series).length;
    if (seriesCount >= 1) {
      // This would boost an existing synergy
      return { type: 'boost', count: seriesCount + 1 };
    }
    return null;
  }, [currentlyTrainingSeries]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!selectedCharId || isConfirming) return;

    setIsConfirming(true);
    try {
      await onSelect(selectedCharId);
    } finally {
      setIsConfirming(false);
    }
  }, [selectedCharId, isConfirming, onSelect]);

  // Handle character selection
  const handleCharacterClick = useCallback((charId) => {
    if (selectedCharId === charId) {
      // Double-click to confirm
      handleConfirm();
    } else {
      setSelectedCharId(charId);
    }
  }, [selectedCharId, handleConfirm]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (selectedCharId) {
        setSelectedCharId(null);
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && selectedCharId) {
      handleConfirm();
    }
  }, [selectedCharId, onClose, handleConfirm]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    searchInputRef.current?.focus();
  }, [onSearchChange]);

  // Focus search input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when characters change (e.g., search)
  useEffect(() => {
    if (selectedCharId && !filteredCharacters.find(c => c.id === selectedCharId)) {
      setSelectedCharId(null);
    }
  }, [filteredCharacters, selectedCharId]);

  return (
    <ModalOverlay
      {...motionProps.overlay}
      onClick={onClose}
    >
      <ModalContent
        {...motionProps.content}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('dojo.selectCharacter')}
      >
        <ModalHeader>
          <ModalTitle>{t('dojo.selectCharacter')}</ModalTitle>
          <ModalCloseBtn
            onClick={onClose}
            aria-label={t('common.close') || 'Close'}
          >
            <MdClose aria-hidden="true" />
          </ModalCloseBtn>
        </ModalHeader>

        <PickerSearchContainer>
          <MdSearch aria-hidden="true" />
          <PickerSearchInput
            ref={searchInputRef}
            type="text"
            placeholder={t('dojo.searchCharacters')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('dojo.searchCharacters')}
          />
          <AnimatePresence>
            {searchQuery && (
              <PickerSearchClear
                onClick={handleClearSearch}
                {...motionProps.clearButton}
                exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                aria-label={t('common.clear') || 'Clear search'}
              >
                <MdClear />
              </PickerSearchClear>
            )}
          </AnimatePresence>
        </PickerSearchContainer>

        {/* Sort options */}
        <SortContainer>
          <MdSort aria-hidden="true" style={{ color: theme.colors.textSecondary }} />
          <SortButton
            $active={sortBy === SORT_OPTIONS.RARITY_DESC}
            onClick={() => setSortBy(SORT_OPTIONS.RARITY_DESC)}
            aria-pressed={sortBy === SORT_OPTIONS.RARITY_DESC}
          >
            {t('dojo.sortByRarity', { defaultValue: 'Rarity' })}
          </SortButton>
          <SortButton
            $active={sortBy === SORT_OPTIONS.LEVEL_DESC}
            onClick={() => setSortBy(SORT_OPTIONS.LEVEL_DESC)}
            aria-pressed={sortBy === SORT_OPTIONS.LEVEL_DESC}
          >
            {t('dojo.sortByLevel', { defaultValue: 'Level' })}
          </SortButton>
          <SortButton
            $active={sortBy === SORT_OPTIONS.NAME_ASC}
            onClick={() => setSortBy(SORT_OPTIONS.NAME_ASC)}
            aria-pressed={sortBy === SORT_OPTIONS.NAME_ASC}
          >
            {t('dojo.sortByName', { defaultValue: 'Name' })}
          </SortButton>
        </SortContainer>

        <ModalBody ref={gridRef}>
          {charactersLoading ? (
            <ModalLoading>
              <Spinner />
              <span>{t('dojo.loadingCharacters')}</span>
            </ModalLoading>
          ) : filteredCharacters.length === 0 ? (
            <NoCharacters>
              {searchQuery
                ? t('dojo.noMatchingCharacters')
                : t('dojo.noAvailableCharacters')}
            </NoCharacters>
          ) : (
            <CharacterList role="listbox" aria-label={t('dojo.characterList')}>
              {Object.entries(sortedCharactersBySeries).map(([series, chars]) => {
                // Check if this series has characters currently training
                const seriesTrainingCount = currentlyTrainingSeries.filter(s => s === series).length;
                const hasSynergy = seriesTrainingCount > 0;

                return (
                  <React.Fragment key={series}>
                    <SeriesTitle>
                      {series} ({chars.length})
                      {hasSynergy && (
                        <span style={{ marginLeft: '8px', color: theme.colors.success, fontSize: '12px' }}>
                          +{seriesTrainingCount} training
                        </span>
                      )}
                    </SeriesTitle>
                    <CharacterGrid>
                      {chars.map((char) => {
                        const isSelected = selectedCharId === char.id;
                        const rarityColor = getRarityColor(char.rarity);
                        const synergyInfo = getSynergyInfo(char);

                        return (
                          <PickerCharacterCard
                            key={char.id}
                            $color={rarityColor}
                            $isSelected={isSelected}
                            $hasSynergy={!!synergyInfo}
                            onClick={() => handleCharacterClick(char.id)}
                            {...motionProps.card}
                            role="option"
                            aria-selected={isSelected}
                            aria-label={`${char.name} - ${char.rarity}${char.level ? ` Level ${char.level}` : ''}${synergyInfo ? ` - Synergy ${synergyInfo.count}` : ''}`}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCharacterClick(char.id);
                              }
                            }}
                          >
                            {/* Synergy badge */}
                            {synergyInfo && (
                              <SynergyBadge title={t('dojo.synergyBoostHint', { count: synergyInfo.count, defaultValue: `Synergy x${synergyInfo.count}` })}>
                                <FaUsers />
                                <span>x{synergyInfo.count}</span>
                              </SynergyBadge>
                            )}

                            {/* Selection indicator */}
                            <AnimatePresence>
                              {isSelected && (
                                <PickerSelectedIndicator
                                  {...motionProps.indicator}
                                  exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0 }}
                                >
                                  <MdCheck />
                                </PickerSelectedIndicator>
                              )}
                            </AnimatePresence>

                            {/* Character image */}
                            {isVideo(char.image) ? (
                              <PickerCharVideo autoPlay loop muted playsInline>
                                <source src={getAssetUrl(char.image)} type={getVideoMimeType(char.image)} />
                              </PickerCharVideo>
                            ) : (
                              <PickerCharImage
                                src={getAssetUrl(char.image) || PLACEHOLDER_IMAGE}
                                alt={char.name}
                                loading="lazy"
                                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                              />
                            )}

                            {/* Character info overlay */}
                            <PickerCharOverlay $isSelected={isSelected}>
                              <PickerCharName>{char.name}</PickerCharName>
                              <PickerCharSeries>{char.series}</PickerCharSeries>
                              <PickerCharBadges>
                                <PickerCharRarity $color={rarityColor}>
                                  {char.rarity}
                                </PickerCharRarity>
                                {char.level && (
                                  <PickerCharLevel
                                    $isMaxLevel={char.level >= 5}
                                  >
                                    Lv.{char.level}
                                  </PickerCharLevel>
                                )}
                              </PickerCharBadges>
                              {char.levelMultiplier > 1 && (
                                <PickerCharPowerBonus>
                                  +{Math.round((char.levelMultiplier - 1) * 100)}% power
                                </PickerCharPowerBonus>
                              )}
                            </PickerCharOverlay>

                            {/* Specialization badge */}
                            {char.specialization && (
                              <PickerCharSpecBadge
                                $color={SPEC_COLORS[char.specialization]}
                                title={t(`specialization.${char.specialization}.name`)}
                              >
                                {React.createElement(SPEC_ICONS[char.specialization], { size: 12 })}
                              </PickerCharSpecBadge>
                            )}
                          </PickerCharacterCard>
                        );
                      })}
                    </CharacterGrid>
                  </React.Fragment>
                );
              })}
            </CharacterList>
          )}
        </ModalBody>

        {/* Sticky footer with confirm button */}
        <AnimatePresence>
          {selectedChar && (
            <PickerFooter
              {...motionProps.footer}
              exit={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            >
              <PickerConfirmButton
                onClick={handleConfirm}
                disabled={isConfirming}
                $color={getRarityColor(selectedChar.rarity)}
                {...motionProps.button}
              >
                {isConfirming ? (
                  <Spinner size="small" />
                ) : (
                  <>
                    <MdCheck />
                    {t('dojo.confirmSelect', { name: selectedChar.name })}
                  </>
                )}
              </PickerConfirmButton>
            </PickerFooter>
          )}
        </AnimatePresence>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DojoCharacterPicker;
