/**
 * DojoCharacterPicker - Character selection modal
 *
 * Bottom sheet modal for picking characters to assign to training slots.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdSearch } from 'react-icons/md';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';

import { Spinner } from '../../../design-system';
import { getAssetUrl } from '../../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo, getVideoMimeType } from '../../../utils/mediaUtils';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseBtn,
  SearchContainer,
  SearchInput,
  ModalBody,
  ModalLoading,
  NoCharacters,
  CharacterList,
  SeriesTitle,
  CharacterGrid,
  CharacterCard,
  CharImage,
  CharVideo,
  CharOverlay,
  CharName,
  CharBadges,
  CharRarity,
  CharLevel,
  CharPowerBonus,
  CharSpecBadge,
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

            <SearchContainer>
              <MdSearch aria-hidden="true" />
              <SearchInput
                type="text"
                placeholder={t('dojo.searchCharacters')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                aria-label={t('dojo.searchCharacters')}
              />
            </SearchContainer>

            <ModalBody>
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
                <CharacterList role="list">
                  {Object.entries(charactersBySeries).map(([series, chars]) => (
                    <React.Fragment key={series}>
                      <SeriesTitle>{series} ({chars.length})</SeriesTitle>
                      <CharacterGrid>
                        {chars.map((char) => (
                          <CharacterCard
                            key={char.id}
                            $color={getRarityColor(char.rarity)}
                            onClick={() => onSelect(char.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            role="listitem"
                            aria-label={`${char.name} - ${char.rarity}${char.level ? ` Level ${char.level}` : ''}`}
                          >
                            {isVideo(char.image) ? (
                              <CharVideo autoPlay loop muted playsInline>
                                <source src={getAssetUrl(char.image)} type={getVideoMimeType(char.image)} />
                              </CharVideo>
                            ) : (
                              <CharImage
                                src={getAssetUrl(char.image) || PLACEHOLDER_IMAGE}
                                alt={char.name}
                                loading="lazy"
                                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                              />
                            )}
                            <CharOverlay>
                              <CharName>{char.name}</CharName>
                              <CharBadges>
                                <CharRarity $color={getRarityColor(char.rarity)}>
                                  {char.rarity}
                                </CharRarity>
                                {char.level && (
                                  <CharLevel
                                    $isMaxLevel={char.level >= 5}
                                    $multiplier={char.levelMultiplier}
                                  >
                                    {t('dojo.characterLevel', { level: char.level })}
                                  </CharLevel>
                                )}
                              </CharBadges>
                              {char.levelMultiplier > 1 && (
                                <CharPowerBonus>
                                  ⚡ {t('dojo.powerBonus', { percent: Math.round(char.levelMultiplier * 100) })}
                                </CharPowerBonus>
                              )}
                            </CharOverlay>
                            {char.specialization && (
                              <CharSpecBadge
                                $color={SPEC_COLORS[char.specialization]}
                                title={t(`specialization.${char.specialization}.name`)}
                              >
                                {React.createElement(SPEC_ICONS[char.specialization], { size: 12 })}
                              </CharSpecBadge>
                            )}
                          </CharacterCard>
                        ))}
                      </CharacterGrid>
                    </React.Fragment>
                  ))}
                </CharacterList>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
  );
};

export default DojoCharacterPicker;
