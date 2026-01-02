/**
 * CharacterSelectorSlots - Assigned character slots display
 * Extracted from CharacterSelector for better maintainability
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';
import { getAssetUrl } from '../../utils/api';

// Rarity colors
export const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

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

const CharacterSelectorSlots = memo(({
  assignedCharacters,
  maxCharacters,
  getAssignedCharacter,
  characterBonuses,
  onUnassign
}) => {
  return (
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
                <SlotImage src={getAssetUrl(character.image)} alt={character.name} />
                <SlotName>{character.name}</SlotName>
                <SlotBonus $color={rarityColor}>
                  +{characterBonuses[character.rarity]}%
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
  );
});

CharacterSelectorSlots.displayName = 'CharacterSelectorSlots';

export default CharacterSelectorSlots;
