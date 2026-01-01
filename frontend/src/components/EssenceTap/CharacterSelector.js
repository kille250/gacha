/**
 * CharacterSelector - UI for selecting characters to assign for Essence Tap bonuses
 *
 * Features:
 * - Shows owned characters with rarity and element indicators
 * - Allows assigning/unassigning from 5 slots
 * - Displays current bonus calculation
 * - Shows character abilities and synergies
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import api from '../../utils/api';
import {
  IconFlame,
  IconWater,
  IconEarth,
  IconAir,
  IconLight,
  IconDark,
  IconNeutral,
  IconCheckmark
} from '../../constants/icons';

// Rarity colors
const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

// Element colors and icons using React Icons
const ELEMENT_CONFIG = {
  fire: { color: '#EF4444', Icon: IconFlame, name: 'Fire' },
  water: { color: '#3B82F6', Icon: IconWater, name: 'Water' },
  earth: { color: '#84CC16', Icon: IconEarth, name: 'Earth' },
  air: { color: '#06B6D4', Icon: IconAir, name: 'Air' },
  light: { color: '#FCD34D', Icon: IconLight, name: 'Light' },
  dark: { color: '#6366F1', Icon: IconDark, name: 'Dark' },
  neutral: { color: '#9CA3AF', Icon: IconNeutral, name: 'Neutral' }
};

// Rarity bonus percentages
const RARITY_BONUSES = {
  common: 5,
  uncommon: 10,
  rare: 20,
  epic: 35,
  legendary: 50
};

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const AssignedSlots = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  flex-wrap: wrap;
  justify-content: center;
`;

const SlotCard = styled(motion.div)`
  width: 100px;
  height: 120px;
  border-radius: ${theme.radius.lg};
  background: ${props => props.$filled
    ? `linear-gradient(135deg, ${props.$rarityColor}20, ${props.$rarityColor}10)`
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px dashed ${props => props.$filled
    ? props.$rarityColor
    : 'rgba(255, 255, 255, 0.2)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$filled ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  ${props => props.$filled && `
    &:hover {
      transform: scale(1.05);
      border-style: solid;
    }
  `}
`;

const SlotImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: ${theme.radius.md};
  object-fit: cover;
`;

const SlotName = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text};
  text-align: center;
  margin-top: ${theme.spacing.xs};
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SlotBonus = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$color || '#10B981'};
  font-weight: ${theme.fontWeights.semibold};
`;

const EmptySlotIcon = styled.div`
  font-size: 24px;
  color: rgba(255, 255, 255, 0.3);
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.8);
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;

  ${SlotCard}:hover & {
    opacity: 1;
  }
`;

const BonusSummary = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  justify-content: center;
  padding: ${theme.spacing.md};
  background: rgba(138, 43, 226, 0.1);
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.xl};
`;

const BonusItem = styled.div`
  text-align: center;
`;

const BonusValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#A855F7'};
`;

const BonusLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: ${theme.spacing.md};
  max-height: 400px;
  overflow-y: auto;
  padding: ${theme.spacing.xs};

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
`;

const CharacterCard = styled(motion.div)`
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.lg};
  background: ${props => props.$assigned
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px solid ${props => props.$assigned
    ? '#10B981'
    : props.$rarityColor || 'rgba(255, 255, 255, 0.1)'};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;

  ${props => !props.$disabled && !props.$assigned && `
    &:hover {
      transform: scale(1.05);
      border-color: ${props.$rarityColor || '#A855F7'};
    }
  `}
`;

const CharacterImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CharacterOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.xs};
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
`;

const CharacterName = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: white;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CharacterBadges = styled.div`
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  gap: 2px;
`;

const RarityBadge = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$color};
`;

const ElementBadge = styled.div`
  font-size: 10px;
`;

const AssignedCheck = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #10B981;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? 'rgba(138, 43, 226, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'rgba(138, 43, 226, 0.6)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'rgba(138, 43, 226, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const SynergyInfo = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.lg};
`;

const SynergyTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
`;

const SynergyList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const SynergyBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$active ? '#10B981' : theme.colors.textSecondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const CharacterSelector = memo(({
  isOpen,
  onClose,
  assignedCharacters = [],
  maxCharacters = 5,
  _characterBonus = 1,
  onAssign,
  onUnassign
}) => {
  const { t } = useTranslation();
  const [ownedCharacters, setOwnedCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Fetch owned characters
  useEffect(() => {
    if (isOpen) {
      fetchOwnedCharacters();
    }
  }, [isOpen]);

  const fetchOwnedCharacters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/characters/collection');
      // Map collection to include necessary fields
      const characters = (response.data.collection || []).map(char => ({
        id: char.id,
        name: char.name,
        image: char.image,
        rarity: char.rarity?.toLowerCase() || 'common',
        element: char.element || 'neutral',
        series: char.series
      }));
      setOwnedCharacters(characters);
    } catch (err) {
      console.error('Failed to fetch characters:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total bonus
  const calculateTotalBonus = useCallback(() => {
    let bonus = 0;
    assignedCharacters.forEach(charId => {
      const char = ownedCharacters.find(c => c.id === charId);
      if (char) {
        bonus += RARITY_BONUSES[char.rarity] || 5;
      }
    });
    return bonus;
  }, [assignedCharacters, ownedCharacters]);

  // Calculate element synergies
  const calculateSynergies = useCallback(() => {
    const elementCounts = {};
    assignedCharacters.forEach(charId => {
      const char = ownedCharacters.find(c => c.id === charId);
      if (char) {
        const element = char.element || 'neutral';
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      }
    });

    const synergies = [];
    Object.entries(elementCounts).forEach(([element, count]) => {
      if (count >= 2) {
        synergies.push({
          element,
          count,
          bonus: (count - 1) * 5 // +5% per matching pair
        });
      }
    });

    return synergies;
  }, [assignedCharacters, ownedCharacters]);

  // Filter characters
  const filteredCharacters = ownedCharacters.filter(char => {
    if (filter === 'all') return true;
    return char.rarity === filter;
  });

  // Check if character is assigned
  const isAssigned = useCallback((charId) => {
    return assignedCharacters.includes(charId);
  }, [assignedCharacters]);

  // Handle character click
  const handleCharacterClick = useCallback((character) => {
    if (isAssigned(character.id)) {
      onUnassign?.(character.id);
    } else if (assignedCharacters.length < maxCharacters) {
      onAssign?.(character.id);
    }
  }, [isAssigned, assignedCharacters.length, maxCharacters, onAssign, onUnassign]);

  // Get assigned character details
  const getAssignedCharacter = useCallback((charId) => {
    return ownedCharacters.find(c => c.id === charId);
  }, [ownedCharacters]);

  const totalBonus = calculateTotalBonus();
  const synergies = calculateSynergies();
  const synergyBonus = synergies.reduce((sum, s) => sum + s.bonus, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        {t('essenceTap.characterSelector', { defaultValue: 'Select Characters' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {/* Assigned Slots */}
          <SectionTitle>
            {t('essenceTap.assignedCharacters', { defaultValue: 'Assigned Characters' })} ({assignedCharacters.length}/{maxCharacters})
          </SectionTitle>

          <AssignedSlots>
            {Array.from({ length: maxCharacters }).map((_, index) => {
              const charId = assignedCharacters[index];
              const character = charId ? getAssignedCharacter(charId) : null;
              const rarityColor = character ? RARITY_COLORS[character.rarity] : null;

              return (
                <SlotCard
                  key={index}
                  $filled={!!character}
                  $rarityColor={rarityColor}
                  onClick={() => character && onUnassign?.(character.id)}
                  whileHover={character ? { scale: 1.05 } : {}}
                  whileTap={character ? { scale: 0.95 } : {}}
                >
                  {character ? (
                    <>
                      <SlotImage src={character.image} alt={character.name} />
                      <SlotName>{character.name}</SlotName>
                      <SlotBonus $color={rarityColor}>
                        +{RARITY_BONUSES[character.rarity]}%
                      </SlotBonus>
                      <RemoveButton onClick={(e) => {
                        e.stopPropagation();
                        onUnassign?.(character.id);
                      }}>
                        ×
                      </RemoveButton>
                    </>
                  ) : (
                    <EmptySlotIcon>+</EmptySlotIcon>
                  )}
                </SlotCard>
              );
            })}
          </AssignedSlots>

          {/* Bonus Summary */}
          <BonusSummary>
            <BonusItem>
              <BonusValue $color="#A855F7">+{totalBonus}%</BonusValue>
              <BonusLabel>{t('essenceTap.rarityBonus', { defaultValue: 'Rarity Bonus' })}</BonusLabel>
            </BonusItem>
            <BonusItem>
              <BonusValue $color="#10B981">+{synergyBonus}%</BonusValue>
              <BonusLabel>{t('essenceTap.synergyBonus', { defaultValue: 'Synergy Bonus' })}</BonusLabel>
            </BonusItem>
            <BonusItem>
              <BonusValue $color="#FCD34D">x{((100 + totalBonus + synergyBonus) / 100).toFixed(2)}</BonusValue>
              <BonusLabel>{t('essenceTap.totalMultiplier', { defaultValue: 'Total Multiplier' })}</BonusLabel>
            </BonusItem>
          </BonusSummary>

          {/* Synergy Info */}
          {synergies.length > 0 && (
            <SynergyInfo>
              <SynergyTitle>{t('essenceTap.activeSynergies', { defaultValue: 'Active Synergies' })}</SynergyTitle>
              <SynergyList>
                {synergies.map(synergy => {
                  const config = ELEMENT_CONFIG[synergy.element] || ELEMENT_CONFIG.neutral;
                  return (
                    <SynergyBadge key={synergy.element} $active>
                      <span><config.Icon size={14} /></span>
                      <span>{config.name} x{synergy.count}</span>
                      <span style={{ color: '#10B981' }}>+{synergy.bonus}%</span>
                    </SynergyBadge>
                  );
                })}
              </SynergyList>
            </SynergyInfo>
          )}

          {/* Filter Bar */}
          <FilterBar>
            <FilterButton $active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterButton>
            {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
              <FilterButton
                key={rarity}
                $active={filter === rarity}
                onClick={() => setFilter(rarity)}
                style={{ borderColor: filter === rarity ? color : undefined }}
              >
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </FilterButton>
            ))}
          </FilterBar>

          {/* Character Grid */}
          <SectionTitle>
            {t('essenceTap.availableCharacters', { defaultValue: 'Available Characters' })} ({filteredCharacters.length})
          </SectionTitle>

          {loading ? (
            <EmptyState>{t('common.loading', { defaultValue: 'Loading...' })}</EmptyState>
          ) : filteredCharacters.length === 0 ? (
            <EmptyState>
              {t('essenceTap.noCharacters', { defaultValue: 'No characters available. Collect characters from the gacha!' })}
            </EmptyState>
          ) : (
            <CharacterGrid>
              <AnimatePresence>
                {filteredCharacters.map(character => {
                  const assigned = isAssigned(character.id);
                  const canAssign = !assigned && assignedCharacters.length < maxCharacters;
                  const rarityColor = RARITY_COLORS[character.rarity];
                  const ElementIcon = (ELEMENT_CONFIG[character.element] || ELEMENT_CONFIG.neutral).Icon;

                  return (
                    <CharacterCard
                      key={character.id}
                      $assigned={assigned}
                      $disabled={!assigned && !canAssign}
                      $rarityColor={rarityColor}
                      onClick={() => (assigned || canAssign) && handleCharacterClick(character)}
                      whileHover={(assigned || canAssign) ? { scale: 1.05 } : {}}
                      whileTap={(assigned || canAssign) ? { scale: 0.95 } : {}}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <CharacterImage src={character.image} alt={character.name} />
                      <CharacterBadges>
                        <RarityBadge $color={rarityColor} />
                        <ElementBadge><ElementIcon size={10} /></ElementBadge>
                      </CharacterBadges>
                      {assigned && (
                        <AssignedCheck><IconCheckmark size={12} /></AssignedCheck>
                      )}
                      <CharacterOverlay>
                        <CharacterName>{character.name}</CharacterName>
                      </CharacterOverlay>
                    </CharacterCard>
                  );
                })}
              </AnimatePresence>
            </CharacterGrid>
          )}
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

CharacterSelector.displayName = 'CharacterSelector';

export default CharacterSelector;
