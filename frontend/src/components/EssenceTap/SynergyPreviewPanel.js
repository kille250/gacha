/**
 * SynergyPreviewPanel - Shows synergy preview and team composition suggestions
 *
 * Features:
 * - Current team bonuses breakdown
 * - Series synergy suggestions
 * - Element synergy suggestions
 * - Best team recommendations
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme, GlassCard, Modal, ModalBody, Button } from '../../design-system';
import { IconUsers, IconSparkles, IconFlame, IconDroplet, IconWind, IconSun, IconMoon, IconLeaf } from '../../constants/icons';
import api from '../../utils/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const Section = styled(GlassCard)`
  padding: ${theme.spacing.md};
`;

const SectionTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const BonusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const BonusCard = styled.div`
  padding: ${theme.spacing.sm};
  background: ${props => props.$active
    ? 'rgba(16, 185, 129, 0.1)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
  text-align: center;
`;

const BonusLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const BonusValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#10B981'};
`;

const SuggestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SuggestionCard = styled(motion.div)`
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(168, 85, 247, 0.3);
  }
`;

const SuggestionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const SuggestionName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const SuggestionType = styled.span`
  font-size: ${theme.fontSizes.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$type === 'series'
    ? 'rgba(168, 85, 247, 0.2)'
    : 'rgba(16, 185, 129, 0.2)'};
  color: ${props => props.$type === 'series' ? '#A855F7' : '#10B981'};
  border-radius: ${theme.radius.full};
`;

const SuggestionBonus = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: #10B981;
`;

const CharacterRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const CharacterAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.md};
  border: 2px solid ${props => {
    switch (props.$rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#A855F7';
      case 'rare': return '#3B82F6';
      case 'uncommon': return '#10B981';
      default: return '#6B7280';
    }
  }};
  object-fit: cover;
`;

const CharacterPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.md};
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ElementIcon = ({ element, size = 16 }) => {
  const iconProps = { size };
  switch (element) {
    case 'fire': return <IconFlame {...iconProps} style={{ color: '#EF4444' }} />;
    case 'water': return <IconDroplet {...iconProps} style={{ color: '#3B82F6' }} />;
    case 'air': return <IconWind {...iconProps} style={{ color: '#94A3B8' }} />;
    case 'light': return <IconSun {...iconProps} style={{ color: '#FBBF24' }} />;
    case 'dark': return <IconMoon {...iconProps} style={{ color: '#7C3AED' }} />;
    case 'earth': return <IconLeaf {...iconProps} style={{ color: '#10B981' }} />;
    default: return <IconSparkles {...iconProps} style={{ color: '#6B7280' }} />;
  }
};

const SynergyPreviewPanel = memo(({ isOpen, onClose, onApplySuggestion }) => {
  const [data, setData] = useState(null);
  const [_loading, setLoading] = useState(true);

  const fetchSynergyData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/essence-tap/synergy-preview');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch synergy preview:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSynergyData();
    }
  }, [isOpen, fetchSynergyData]);

  if (!isOpen) return null;

  const { currentBonuses, synergySuggestions } = data || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Team Synergy Preview" size="large">
      <ModalBody>
        <Container>
          {/* Current Bonuses */}
          <Section>
            <SectionTitle>
              <IconSparkles size={20} />
              Current Team Bonuses
            </SectionTitle>
            <BonusGrid>
              <BonusCard $active={currentBonuses?.characterBonus > 1}>
                <BonusLabel>Character Bonus</BonusLabel>
                <BonusValue>
                  x{(currentBonuses?.characterBonus || 1).toFixed(2)}
                </BonusValue>
              </BonusCard>

              <BonusCard $active={currentBonuses?.seriesSynergy?.bonus > 0}>
                <BonusLabel>Series Synergy</BonusLabel>
                <BonusValue $color="#A855F7">
                  +{((currentBonuses?.seriesSynergy?.bonus || 0) * 100).toFixed(0)}%
                </BonusValue>
              </BonusCard>

              <BonusCard $active={currentBonuses?.elementSynergy?.bonus > 0}>
                <BonusLabel>Element Synergy</BonusLabel>
                <BonusValue $color="#3B82F6">
                  +{((currentBonuses?.elementSynergy?.bonus || 0) * 100).toFixed(0)}%
                </BonusValue>
              </BonusCard>

              <BonusCard $active={currentBonuses?.underdogBonus > 0}>
                <BonusLabel>Underdog Bonus</BonusLabel>
                <BonusValue $color="#F59E0B">
                  +{((currentBonuses?.underdogBonus || 0) * 100).toFixed(0)}%
                </BonusValue>
              </BonusCard>

              <BonusCard $active={currentBonuses?.masteryBonus > 0}>
                <BonusLabel>Mastery Bonus</BonusLabel>
                <BonusValue $color="#EC4899">
                  +{((currentBonuses?.masteryBonus || 0) * 100).toFixed(0)}%
                </BonusValue>
              </BonusCard>

              <BonusCard $active>
                <BonusLabel>Total Multiplier</BonusLabel>
                <BonusValue $color="#10B981">
                  x{(
                    (currentBonuses?.characterBonus || 1) *
                    (1 + (currentBonuses?.seriesSynergy?.bonus || 0)) *
                    (1 + (currentBonuses?.elementSynergy?.bonus || 0)) *
                    (1 + (currentBonuses?.underdogBonus || 0)) *
                    (1 + (currentBonuses?.masteryBonus || 0))
                  ).toFixed(2)}
                </BonusValue>
              </BonusCard>
            </BonusGrid>
          </Section>

          {/* Synergy Suggestions */}
          <Section>
            <SectionTitle>
              <IconUsers size={20} />
              Synergy Suggestions
            </SectionTitle>
            <SuggestionList>
              <AnimatePresence>
                {synergySuggestions?.map((suggestion, index) => (
                  <SuggestionCard
                    key={`${suggestion.type}-${suggestion.name}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onApplySuggestion?.(suggestion)}
                  >
                    <SuggestionHeader>
                      <SuggestionName>
                        {suggestion.type === 'element' && (
                          <ElementIcon element={suggestion.name} size={20} />
                        )}
                        {suggestion.name}
                        <SuggestionType $type={suggestion.type}>
                          {suggestion.type === 'series' ? 'Series' : 'Element'}
                        </SuggestionType>
                      </SuggestionName>
                      <SuggestionBonus>
                        +{((suggestion.potentialBonus || 0) * 100).toFixed(0)}%
                      </SuggestionBonus>
                    </SuggestionHeader>

                    <CharacterRow>
                      {suggestion.characters?.slice(0, 5).map((char, idx) => (
                        char.image ? (
                          <CharacterAvatar
                            key={idx}
                            src={char.image}
                            alt={char.name}
                            $rarity={char.rarity}
                          />
                        ) : (
                          <CharacterPlaceholder key={idx}>
                            {char.name?.[0] || '?'}
                          </CharacterPlaceholder>
                        )
                      ))}
                      {suggestion.count > 5 && (
                        <CharacterPlaceholder>
                          +{suggestion.count - 5}
                        </CharacterPlaceholder>
                      )}
                    </CharacterRow>
                  </SuggestionCard>
                ))}
              </AnimatePresence>

              {(!synergySuggestions || synergySuggestions.length === 0) && (
                <div style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: theme.spacing.lg }}>
                  Collect more characters to unlock synergy suggestions!
                </div>
              )}
            </SuggestionList>
          </Section>
        </Container>
      </ModalBody>
    </Modal>
  );
});

SynergyPreviewPanel.displayName = 'SynergyPreviewPanel';

export default SynergyPreviewPanel;
