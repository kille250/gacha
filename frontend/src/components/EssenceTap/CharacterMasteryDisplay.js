/**
 * CharacterMasteryDisplay - Shows mastery progress for assigned characters
 *
 * Features:
 * - Mastery level progress bar
 * - Unlocked abilities display
 * - Production bonus display
 * - Time to next level
 */

import React, { useState, useEffect, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Modal, ModalHeader, ModalBody, ModalFooter, Button } from '../../design-system';
import api, { getAssetUrl } from '../../utils/api';
import { IconStar, IconSparkles, IconClock } from '../../constants/icons';
// Import centralized constants to avoid duplication
import { RARITY_COLORS } from './CharacterSelectorSlots';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const SummaryCard = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.15), rgba(138, 43, 226, 0.05));
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.lg};
`;

const SummaryLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const SummaryValue = styled.div`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #A855F7, #EC4899);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const CharacterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const CharacterCard = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.lg};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(138, 43, 226, 0.3);
  }
`;

const CharacterImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: ${theme.radius.md};
  object-fit: cover;
  border: 2px solid ${props => props.$rarityColor || 'rgba(255, 255, 255, 0.2)'};
`;

const CharacterInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CharacterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs};
`;

const CharacterName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MasteryLevel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.1));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #FCD34D;
`;

const ProgressContainer = styled.div`
  margin-bottom: ${theme.spacing.xs};
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const ProgressLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const ProgressValue = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text};
`;

const ProgressBar = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #FCD34D, #F59E0B);
  border-radius: ${theme.radius.full};
  width: ${props => Math.min(100, props.$percent)}%;
  transition: width 0.3s ease;
`;

const BonusRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const BonusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: ${props => props.$active
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$active ? '#10B981' : theme.colors.textSecondary};
`;

const TimeToNext = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const AbilityBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(236, 72, 153, 0.1));
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: #A855F7;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

// Mastery levels config (from backend)
const MASTERY_LEVELS = [
  { level: 1, hoursRequired: 0, productionBonus: 0.00, ability: null },
  { level: 2, hoursRequired: 1, productionBonus: 0.02, ability: null },
  { level: 3, hoursRequired: 3, productionBonus: 0.04, ability: null },
  { level: 4, hoursRequired: 7, productionBonus: 0.06, ability: null },
  { level: 5, hoursRequired: 15, productionBonus: 0.08, ability: 'Enhanced Element' },
  { level: 6, hoursRequired: 30, productionBonus: 0.10, ability: null },
  { level: 7, hoursRequired: 60, productionBonus: 0.12, ability: null },
  { level: 8, hoursRequired: 120, productionBonus: 0.14, ability: null },
  { level: 9, hoursRequired: 250, productionBonus: 0.16, ability: null },
  { level: 10, hoursRequired: 500, productionBonus: 0.20, ability: 'Mastery Aura' }
];

const CharacterMasteryDisplay = memo(({
  isOpen,
  onClose,
  getMasteryInfo,
  assignedCharacters = []
}) => {
  const { t } = useTranslation();
  const [masteryData, setMasteryData] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch mastery and character data
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        getMasteryInfo?.() || Promise.resolve({ success: false }),
        api.get('/characters/collection')
      ]).then(([masteryResult, charsResponse]) => {
        if (masteryResult.success) {
          setMasteryData(masteryResult);
        }
        if (charsResponse.data.collection) {
          setCharacters(charsResponse.data.collection);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isOpen, getMasteryInfo]);

  // Get character details by ID
  const getCharacter = (charId) => {
    return characters.find(c => c.id === charId);
  };

  // Calculate mastery level from hours
  const getMasteryLevel = (hours) => {
    for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
      if (hours >= MASTERY_LEVELS[i].hoursRequired) {
        return MASTERY_LEVELS[i];
      }
    }
    return MASTERY_LEVELS[0];
  };

  // Calculate progress to next level
  const getProgressToNext = (hours, currentLevel) => {
    const currentLevelConfig = MASTERY_LEVELS.find(l => l.level === currentLevel);
    const nextLevelConfig = MASTERY_LEVELS.find(l => l.level === currentLevel + 1);

    if (!nextLevelConfig) return { percent: 100, hoursToNext: 0 };

    const currentRequired = currentLevelConfig?.hoursRequired || 0;
    const nextRequired = nextLevelConfig.hoursRequired;
    const progress = hours - currentRequired;
    const needed = nextRequired - currentRequired;
    const percent = (progress / needed) * 100;
    const hoursToNext = nextRequired - hours;

    return { percent, hoursToNext };
  };

  // Calculate total bonus from all mastery
  // totalBonus is an object { productionBonus, unlockedAbilities } from backend
  const totalBonus = masteryData?.totalBonus?.productionBonus || 0;

  // Get assigned character mastery data
  const assignedMastery = assignedCharacters.map(charId => {
    const charMastery = masteryData?.characterMastery?.[charId] || { hoursUsed: 0 };
    const character = getCharacter(charId);
    const currentLevelConfig = getMasteryLevel(charMastery.hoursUsed || 0);
    const progress = getProgressToNext(charMastery.hoursUsed || 0, currentLevelConfig.level);

    return {
      charId,
      character,
      hoursUsed: charMastery.hoursUsed || 0,
      level: currentLevelConfig.level,
      productionBonus: currentLevelConfig.productionBonus,
      ability: currentLevelConfig.ability,
      progress
    };
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <IconStar size={24} style={{ marginRight: 8 }} />
        {t('essenceTap.mastery.title', { defaultValue: 'Character Mastery' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {loading ? (
            <EmptyState>{t('common.loading', { defaultValue: 'Loading...' })}</EmptyState>
          ) : assignedCharacters.length === 0 ? (
            <EmptyState>
              {t('essenceTap.mastery.noCharacters', {
                defaultValue: 'No characters assigned. Assign characters to build mastery!'
              })}
            </EmptyState>
          ) : (
            <>
              {/* Summary */}
              <SummaryCard>
                <SummaryLabel>
                  {t('essenceTap.mastery.totalBonus', { defaultValue: 'Total Mastery Bonus' })}
                </SummaryLabel>
                <SummaryValue>
                  +{(totalBonus * 100).toFixed(1)}%
                </SummaryValue>
              </SummaryCard>

              {/* Character List */}
              <CharacterList>
                <AnimatePresence>
                  {assignedMastery.map(({ charId, character, hoursUsed, level, productionBonus, ability, progress }) => (
                    <CharacterCard
                      key={charId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {character && (
                        <CharacterImage
                          src={getAssetUrl(character.image)}
                          alt={character.name}
                          $rarityColor={RARITY_COLORS[character.rarity?.toLowerCase()]}
                        />
                      )}
                      <CharacterInfo>
                        <CharacterHeader>
                          <CharacterName>
                            {character?.name || `Character #${charId}`}
                          </CharacterName>
                          <MasteryLevel>
                            <IconStar size={12} />
                            {t('essenceTap.mastery.level', {
                              level,
                              defaultValue: `Lvl ${level}`
                            })}
                          </MasteryLevel>
                        </CharacterHeader>

                        <ProgressContainer>
                          <ProgressHeader>
                            <ProgressLabel>
                              {level < 10
                                ? t('essenceTap.mastery.progressToNext', { defaultValue: 'Progress to next level' })
                                : t('essenceTap.mastery.maxLevel', { defaultValue: 'Max Level!' })}
                            </ProgressLabel>
                            <ProgressValue>
                              {hoursUsed.toFixed(1)}h
                            </ProgressValue>
                          </ProgressHeader>
                          <ProgressBar>
                            <ProgressFill $percent={progress.percent} />
                          </ProgressBar>
                        </ProgressContainer>

                        <BonusRow>
                          <BonusBadge $active={productionBonus > 0}>
                            +{(productionBonus * 100).toFixed(0)}% production
                          </BonusBadge>

                          {ability && (
                            <AbilityBadge>
                              <IconSparkles size={10} />
                              {ability}
                            </AbilityBadge>
                          )}

                          {level < 10 && (
                            <TimeToNext>
                              <IconClock size={10} />
                              {progress.hoursToNext.toFixed(1)}h to next
                            </TimeToNext>
                          )}
                        </BonusRow>
                      </CharacterInfo>
                    </CharacterCard>
                  ))}
                </AnimatePresence>
              </CharacterList>
            </>
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

CharacterMasteryDisplay.displayName = 'CharacterMasteryDisplay';

export default CharacterMasteryDisplay;
