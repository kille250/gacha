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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdSearch, MdCheck, MdClear } from 'react-icons/md';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';
import { AnimatePresence } from 'framer-motion';

import { Spinner } from '../../../design-system';
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

const DojoCharacterPicker = ({
  onClose,
  charactersLoading,
  filteredCharacters,
  charactersBySeries,
  searchQuery,
  onSearchChange,
  onSelect,
  getRarityColor,
}) => {
  const { t } = useTranslation();
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const searchInputRef = useRef(null);
  const gridRef = useRef(null);

  // Get selected character details
  const selectedChar = selectedCharId
    ? filteredCharacters.find(c => c.id === selectedCharId)
    : null;

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <ModalContent
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={t('common.clear') || 'Clear search'}
              >
                <MdClear />
              </PickerSearchClear>
            )}
          </AnimatePresence>
        </PickerSearchContainer>

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
              {Object.entries(charactersBySeries).map(([series, chars]) => (
                <React.Fragment key={series}>
                  <SeriesTitle>{series} ({chars.length})</SeriesTitle>
                  <CharacterGrid>
                    {chars.map((char) => {
                      const isSelected = selectedCharId === char.id;
                      const rarityColor = getRarityColor(char.rarity);

                      return (
                        <PickerCharacterCard
                          key={char.id}
                          $color={rarityColor}
                          $isSelected={isSelected}
                          onClick={() => handleCharacterClick(char.id)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          role="option"
                          aria-selected={isSelected}
                          aria-label={`${char.name} - ${char.rarity}${char.level ? ` Level ${char.level}` : ''}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCharacterClick(char.id);
                            }
                          }}
                        >
                          {/* Selection indicator */}
                          <AnimatePresence>
                            {isSelected && (
                              <PickerSelectedIndicator
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
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
              ))}
            </CharacterList>
          )}
        </ModalBody>

        {/* Sticky footer with confirm button */}
        <AnimatePresence>
          {selectedChar && (
            <PickerFooter
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <PickerConfirmButton
                onClick={handleConfirm}
                disabled={isConfirming}
                $color={getRarityColor(selectedChar.rarity)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
