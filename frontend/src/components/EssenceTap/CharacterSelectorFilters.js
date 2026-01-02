/**
 * CharacterSelectorFilters - Filter controls for character selection
 * Extracted from CharacterSelector for better maintainability
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { theme } from '../../design-system';
import {
  IconFlame,
  IconWater,
  IconEarth,
  IconAir,
  IconLight,
  IconDark,
  IconNeutral
} from '../../constants/icons';
import { CHARACTER_ABILITIES } from '../../config/essenceTapConfig';
import { RARITY_COLORS } from './CharacterSelectorSlots';

// Element icons mapping
export const ELEMENT_ICONS = {
  fire: IconFlame,
  water: IconWater,
  earth: IconEarth,
  air: IconAir,
  light: IconLight,
  dark: IconDark,
  neutral: IconNeutral
};

// Element colors from shared config
export const ELEMENT_COLORS = Object.fromEntries(
  Object.entries(CHARACTER_ABILITIES).map(([key, ability]) => [key, ability.color])
);

const SectionTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
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

const CharacterSelectorFilters = memo(({
  t,
  rarityFilter,
  setRarityFilter,
  elementFilter,
  setElementFilter
}) => {
  return (
    <>
      {/* Filter by Rarity */}
      <SectionTitle style={{ marginTop: theme.spacing.lg }}>
        {t('essenceTap.filterByRarity', { defaultValue: 'Filter by Rarity' })}
      </SectionTitle>
      <FilterBar>
        <FilterButton $active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')}>
          All
        </FilterButton>
        {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
          <FilterButton
            key={rarity}
            $active={rarityFilter === rarity}
            onClick={() => setRarityFilter(rarity)}
            style={{ borderColor: rarityFilter === rarity ? color : undefined }}
          >
            {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
          </FilterButton>
        ))}
      </FilterBar>

      {/* Filter by Element */}
      <SectionTitle>
        {t('essenceTap.filterByElement', { defaultValue: 'Filter by Element' })}
      </SectionTitle>
      <FilterBar>
        <FilterButton $active={elementFilter === 'all'} onClick={() => setElementFilter('all')}>
          All
        </FilterButton>
        {Object.entries(ELEMENT_ICONS).map(([element]) => {
          const color = ELEMENT_COLORS[element];
          const ElementIcon = ELEMENT_ICONS[element];
          return (
            <FilterButton
              key={element}
              $active={elementFilter === element}
              onClick={() => setElementFilter(element)}
              style={{
                borderColor: elementFilter === element ? color : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ElementIcon size={14} color={elementFilter === element ? color : undefined} />
              {element.charAt(0).toUpperCase() + element.slice(1)}
            </FilterButton>
          );
        })}
      </FilterBar>
    </>
  );
});

CharacterSelectorFilters.displayName = 'CharacterSelectorFilters';

export default CharacterSelectorFilters;
