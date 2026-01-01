/**
 * GeneratorList - Displays purchasable generators for passive income
 */

import React, { memo, useCallback, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import {
  IconSparkle,
  IconWater,
  IconGem,
  IconMagic,
  IconFlame,
  IconStorm,
  IconStar,
  IconSparkles,
  IconDiamond,
  IconLightning,
  IconLocked
} from '../../constants/icons';

// Generator icons mapping using React Icons
const GENERATOR_ICONS = {
  essence_sprite: IconSparkle,
  mana_well: IconWater,
  crystal_node: IconGem,
  arcane_altar: IconMagic,
  spirit_beacon: IconFlame,
  void_rift: IconStorm,
  celestial_gate: IconStar,
  eternal_nexus: IconSparkles,
  primordial_core: IconDiamond,
  infinity_engine: IconLightning,
  default: IconLightning
};

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;

  /* Scrollbar styling */
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

const GeneratorCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$canAfford
    ? 'rgba(138, 43, 226, 0.15)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$canAfford
    ? 'rgba(138, 43, 226, 0.4)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.lg};
  opacity: ${props => props.$unlocked ? 1 : 0.5};
  transition: all 0.2s ease;

  ${props => props.$canAfford && props.$unlocked && `
    cursor: pointer;
    &:hover {
      background: rgba(138, 43, 226, 0.25);
      border-color: rgba(138, 43, 226, 0.6);
      transform: translateX(4px);
    }
  `}
`;

const GeneratorIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
  flex-shrink: 0;
`;

const GeneratorInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GeneratorName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: 2px;
`;

const GeneratorDescription = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GeneratorStats = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$canAfford ? '#A855F7' : theme.colors.textSecondary};
`;

const GeneratorOwned = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  min-width: 40px;
  text-align: right;
`;

const BuySection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${theme.spacing.xs};
`;

const CostLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$canAfford ? '#10B981' : '#EF4444'};
  font-weight: ${theme.fontWeights.medium};
`;

const BuyButton = styled(Button)`
  min-width: 80px;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
`;

const LockedOverlay = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

const BuyModeButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.md};
  padding: 0 ${theme.spacing.md};
`;

const BuyModeButton = styled.button`
  flex: 1;
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

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const GeneratorList = memo(({
  generators = [],
  essence = 0,
  onPurchase
}) => {
  const { t } = useTranslation();
  const [buyMode, setBuyMode] = useState('1'); // '1', '10', '100', 'max'

  const handlePurchase = useCallback((generator) => {
    if (!generator.unlocked || !generator.canAfford) return;

    let count = 1;
    if (buyMode === '10') count = Math.min(10, generator.maxPurchasable);
    else if (buyMode === '100') count = Math.min(100, generator.maxPurchasable);
    else if (buyMode === 'max') count = generator.maxPurchasable;

    if (count > 0) {
      onPurchase?.(generator.id, count);
    }
  }, [buyMode, onPurchase]);

  const getDisplayCost = useCallback((generator) => {
    if (buyMode === '1') return generator.cost;
    // For bulk purchases, we need to calculate the total
    // This is a simplification - the actual cost is calculated server-side
    let count = 1;
    if (buyMode === '10') count = Math.min(10, generator.maxPurchasable);
    else if (buyMode === '100') count = Math.min(100, generator.maxPurchasable);
    else if (buyMode === 'max') count = generator.maxPurchasable;

    if (count <= 1) return generator.cost;

    // Approximate bulk cost using geometric series
    const r = generator.costMultiplier || 1.15;
    const baseCost = generator.baseCost || generator.cost;
    const owned = generator.owned || 0;

    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(baseCost * Math.pow(r, owned + i));
    }
    return total;
  }, [buyMode]);

  const unlockedGenerators = generators.filter(g => g.unlocked);
  const lockedGenerators = generators.filter(g => !g.unlocked);

  if (generators.length === 0) {
    return (
      <EmptyState>
        {t('essenceTap.noGenerators', { defaultValue: 'No generators available' })}
      </EmptyState>
    );
  }

  return (
    <>
      <BuyModeButtons>
        {['1', '10', '100', 'max'].map(mode => (
          <BuyModeButton
            key={mode}
            $active={buyMode === mode}
            onClick={() => setBuyMode(mode)}
          >
            {mode === 'max' ? 'MAX' : `x${mode}`}
          </BuyModeButton>
        ))}
      </BuyModeButtons>

      <ListContainer>
        {unlockedGenerators.map(generator => {
          const displayCost = getDisplayCost(generator);
          const canAffordBulk = essence >= displayCost;
          const buyCount = buyMode === '1' ? 1 :
            buyMode === '10' ? Math.min(10, generator.maxPurchasable) :
            buyMode === '100' ? Math.min(100, generator.maxPurchasable) :
            generator.maxPurchasable;

          return (
            <GeneratorCard
              key={generator.id}
              $canAfford={canAffordBulk}
              $unlocked={true}
              onClick={() => handlePurchase(generator)}
              whileHover={canAffordBulk ? { scale: 1.01 } : {}}
              whileTap={canAffordBulk ? { scale: 0.99 } : {}}
            >
              <GeneratorIcon>
                {React.createElement(GENERATOR_ICONS[generator.id] || GENERATOR_ICONS.default, { size: 24 })}
              </GeneratorIcon>

              <GeneratorInfo>
                <GeneratorName>{generator.name}</GeneratorName>
                <GeneratorDescription>{generator.description}</GeneratorDescription>
                <GeneratorStats $canAfford={canAffordBulk}>
                  +{formatNumber(generator.baseOutput)}/sec each
                </GeneratorStats>
              </GeneratorInfo>

              <GeneratorOwned>x{generator.owned}</GeneratorOwned>

              <BuySection>
                <CostLabel $canAfford={canAffordBulk}>
                  {formatNumber(displayCost)}
                </CostLabel>
                <BuyButton
                  variant={canAffordBulk ? 'primary' : 'secondary'}
                  disabled={!canAffordBulk || buyCount === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchase(generator);
                  }}
                >
                  {buyMode === 'max' ? `Buy ${buyCount}` : `Buy ${buyCount}`}
                </BuyButton>
              </BuySection>
            </GeneratorCard>
          );
        })}

        {lockedGenerators.slice(0, 2).map(generator => (
          <GeneratorCard
            key={generator.id}
            $canAfford={false}
            $unlocked={false}
          >
            <GeneratorIcon><IconLocked size={24} /></GeneratorIcon>

            <GeneratorInfo>
              <GeneratorName>{generator.name}</GeneratorName>
              <LockedOverlay>
                {t('essenceTap.unlockAt', {
                  amount: formatNumber(generator.unlockEssence),
                  defaultValue: `Unlock at ${formatNumber(generator.unlockEssence)} lifetime essence`
                })}
              </LockedOverlay>
            </GeneratorInfo>
          </GeneratorCard>
        ))}
      </ListContainer>
    </>
  );
});

GeneratorList.displayName = 'GeneratorList';

export default GeneratorList;
