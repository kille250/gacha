/**
 * CharacterSelectorGrid - Character grid display for selection
 * Extracted from CharacterSelector for better maintainability
 */

import React, { memo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../design-system';
import { getAssetUrl } from '../../utils/api';
import { IconCheckmark } from '../../constants/icons';
import { RARITY_COLORS } from './CharacterSelectorSlots';
import { ELEMENT_ICONS, ELEMENT_COLORS } from './CharacterSelectorFilters';
import { CHARACTER_ABILITIES } from '../../config/essenceTapConfig';

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

const UnderdogBadge = styled.div`
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(245, 158, 11, 0.9);
  color: white;
  font-size: 8px;
  font-weight: ${theme.fontWeights.bold};
  padding: 2px 4px;
  border-radius: ${theme.radius.sm};
`;

const AbilityPreviewCard = styled.div`
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid ${props => props.$color || 'rgba(255, 255, 255, 0.2)'};
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.sm};
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
`;

const AbilityPreviewName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color || theme.colors.text};
  margin-bottom: 2px;
`;

const AbilityPreviewDesc = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const CharacterSelectorGrid = memo(({
  t,
  loading,
  filteredCharacters,
  assignedCharacters,
  maxCharacters,
  underdogBonuses,
  isAssigned,
  onCharacterClick
}) => {
  const [hoveredCharacter, setHoveredCharacter] = useState(null);
  const [touchedCharacter, setTouchedCharacter] = useState(null);

  // Get ability info for a character's element
  const getCharacterAbility = useCallback((element) => {
    return CHARACTER_ABILITIES[element?.toLowerCase()] || CHARACTER_ABILITIES.neutral;
  }, []);

  // Handle touch for mobile tooltip
  const handleTouchStart = useCallback((charId) => {
    setTouchedCharacter(charId);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Delay hiding to allow user to see tooltip
    setTimeout(() => setTouchedCharacter(null), 1500);
  }, []);

  const shouldShowTooltip = useCallback((charId) => {
    return hoveredCharacter === charId || touchedCharacter === charId;
  }, [hoveredCharacter, touchedCharacter]);

  if (loading) {
    return <EmptyState>{t('common.loading', { defaultValue: 'Loading...' })}</EmptyState>;
  }

  if (filteredCharacters.length === 0) {
    return (
      <EmptyState>
        {t('essenceTap.noCharacters', { defaultValue: 'No characters available. Collect characters from the gacha!' })}
      </EmptyState>
    );
  }

  return (
    <CharacterGrid>
      <AnimatePresence>
        {filteredCharacters.map(character => {
          const assigned = isAssigned(character.id);
          const canAssign = !assigned && assignedCharacters.length < maxCharacters;
          const rarityColor = RARITY_COLORS[character.rarity];
          const ElementIcon = ELEMENT_ICONS[character.element] || ELEMENT_ICONS.neutral;
          const ability = getCharacterAbility(character.element);
          const hasUnderdogBonus = underdogBonuses[character.rarity];
          const showTooltip = shouldShowTooltip(character.id);

          return (
            <CharacterCard
              key={character.id}
              $assigned={assigned}
              $disabled={!assigned && !canAssign}
              $rarityColor={rarityColor}
              onClick={() => (assigned || canAssign) && onCharacterClick(character)}
              onMouseEnter={() => setHoveredCharacter(character.id)}
              onMouseLeave={() => setHoveredCharacter(null)}
              onTouchStart={() => handleTouchStart(character.id)}
              onTouchEnd={handleTouchEnd}
              whileHover={(assigned || canAssign) ? { scale: 1.05 } : {}}
              whileTap={(assigned || canAssign) ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CharacterImage src={getAssetUrl(character.image)} alt={character.name} />
              <CharacterBadges>
                <RarityBadge $color={rarityColor} />
                <ElementBadge><ElementIcon size={10} /></ElementBadge>
              </CharacterBadges>
              {assigned && (
                <AssignedCheck><IconCheckmark size={12} /></AssignedCheck>
              )}
              {hasUnderdogBonus && (
                <UnderdogBadge>+{hasUnderdogBonus}%</UnderdogBadge>
              )}
              {showTooltip && (
                <AbilityPreviewCard $color={ability.color}>
                  <AbilityPreviewName $color={ability.color}>
                    {ability.name}
                  </AbilityPreviewName>
                  <AbilityPreviewDesc>
                    {ability.description}
                  </AbilityPreviewDesc>
                </AbilityPreviewCard>
              )}
              <CharacterOverlay>
                <CharacterName>{character.name}</CharacterName>
              </CharacterOverlay>
            </CharacterCard>
          );
        })}
      </AnimatePresence>
    </CharacterGrid>
  );
});

CharacterSelectorGrid.displayName = 'CharacterSelectorGrid';

export default CharacterSelectorGrid;
