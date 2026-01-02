/**
 * GeneratorList - Redesigned generators panel with premium styling
 *
 * Features:
 * - Collapsible panel
 * - Enhanced card design with icons and glow
 * - Production contribution bars
 * - Progress indicators for next unlock
 * - Satisfying purchase animations
 */

import React, { memo, useCallback, useState } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
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
  IconLocked,
  IconTriangleDown
} from '../../constants/icons';
import {
  affordableGlow,
  purchaseBurst,
  staggerContainer,
  staggerItem
} from './animations';

// Generator icons mapping
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

// Generator colors for visual variety
const GENERATOR_COLORS = {
  essence_sprite: '#A855F7',
  mana_well: '#3B82F6',
  crystal_node: '#10B981',
  arcane_altar: '#8B5CF6',
  spirit_beacon: '#F59E0B',
  void_rift: '#6366F1',
  celestial_gate: '#EC4899',
  eternal_nexus: '#14B8A6',
  primordial_core: '#F97316',
  infinity_engine: '#EAB308',
  default: '#A855F7'
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const PanelHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.03);
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const HeaderIcon = styled.div`
  color: #A855F7;
  display: flex;
  align-items: center;
`;

const TotalProduction = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.normal};
`;

const CollapseIcon = styled(motion.div)`
  color: ${theme.colors.textSecondary};
  display: flex;
  align-items: center;
`;

const ContentWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const BuyModeButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.2);
`;

const BuyModeButton = styled.button`
  flex: 1;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  min-height: 36px;
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? '#A855F7' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  /* Touch optimization */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:hover {
    background: ${props => props.$active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    min-height: 44px;
  }
`;

const ListContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  padding-top: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
  min-height: 300px;

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
    ? 'rgba(168, 85, 247, 0.08)'
    : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$canAfford
    ? 'rgba(168, 85, 247, 0.3)'
    : 'rgba(255, 255, 255, 0.06)'};
  border-radius: ${theme.radius.lg};
  opacity: ${props => props.$unlocked ? 1 : 0.5};
  cursor: ${props => props.$canAfford && props.$unlocked ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  ${props => props.$canAfford && props.$unlocked && css`
    animation: ${affordableGlow} 3s ease-in-out infinite;

    &:hover {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.5);
      transform: translateX(4px);
    }
  `}

  ${props => props.$justPurchased && css`
    animation: ${purchaseBurst} 0.3s ease-out;
  `}
`;

const GeneratorIconWrapper = styled.div`
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: ${props => props.$owned > 0
    ? `linear-gradient(135deg, ${props.$color}20, ${props.$color}10)`
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$owned > 0
    ? `${props.$color}40`
    : 'rgba(255, 255, 255, 0.06)'};
  border-radius: ${theme.radius.lg};
  flex-shrink: 0;
  color: ${props => props.$color || '#A855F7'};

  ${props => props.$owned > 0 && css`
    box-shadow: 0 0 15px ${props.$color}30;
  `}
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
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const OwnedBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: ${theme.radius.sm};
`;

const GeneratorOutput = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || '#A855F7'};
  margin-bottom: 4px;
`;

const ProductionBar = styled.div`
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
`;

const ProductionFill = styled.div`
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const BuySection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 80px;
`;

const CostLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canAfford ? '#10B981' : '#EF4444'};
`;

const BuyButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  min-height: 36px;
  background: ${props => props.$canAfford
    ? 'linear-gradient(135deg, #A855F7, #8B5CF6)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$canAfford ? 'white' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: ${props => props.$canAfford ? 'pointer' : 'not-allowed'};
  opacity: ${props => props.$canAfford ? 1 : 0.5};
  transition: all 0.2s ease;
  /* Touch optimization */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  ${props => props.$canAfford && `
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
    }

    &:active {
      transform: scale(0.95);
    }
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    min-height: 40px;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

const LockedCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.lg};
  opacity: 0.5;
`;

const LockedIconWrapper = styled.div`
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
`;

const LockedInfo = styled.div`
  flex: 1;
`;

const LockedName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const LockedRequirement = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
`;

const ProgressToUnlock = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #A855F7, #EC4899);
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const GeneratorList = memo(({
  generators = [],
  essence = 0,
  lifetimeEssence = 0,
  totalProduction = 0,
  onPurchase,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { t } = useTranslation();
  const [buyMode, setBuyMode] = useState('1');
  const [justPurchased, setJustPurchased] = useState(null);

  const handlePurchase = useCallback((generator) => {
    if (!generator.unlocked) return;

    let count = 1;
    if (buyMode === '10') count = Math.min(10, generator.maxPurchasable);
    else if (buyMode === '100') count = Math.min(100, generator.maxPurchasable);
    else if (buyMode === 'max') count = generator.maxPurchasable;

    // Calculate cost for the buy count
    const r = generator.costMultiplier || 1.15;
    const baseCost = generator.baseCost || generator.cost;
    const owned = generator.owned || 0;
    let totalCost = 0;
    for (let i = 0; i < count; i++) {
      totalCost += Math.floor(baseCost * Math.pow(r, owned + i));
    }

    // Use live essence prop instead of stale generator.canAfford
    if (essence < totalCost) return;

    if (count > 0) {
      setJustPurchased(generator.id);
      setTimeout(() => setJustPurchased(null), 300);
      onPurchase?.(generator.id, count);
    }
  }, [buyMode, onPurchase, essence]);

  const getDisplayCost = useCallback((generator) => {
    if (buyMode === '1') return generator.cost;

    let count = 1;
    if (buyMode === '10') count = Math.min(10, generator.maxPurchasable);
    else if (buyMode === '100') count = Math.min(100, generator.maxPurchasable);
    else if (buyMode === 'max') count = generator.maxPurchasable;

    if (count <= 1) return generator.cost;

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
      <Container>
        <PanelHeader onClick={onToggleCollapse}>
          <HeaderLeft>
            <HeaderIcon><IconLightning size={20} /></HeaderIcon>
            Generators
          </HeaderLeft>
        </PanelHeader>
        <EmptyState>
          {t('essenceTap.noGenerators', { defaultValue: 'No generators available' })}
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <PanelHeader onClick={onToggleCollapse}>
        <HeaderLeft>
          <HeaderIcon><IconLightning size={20} /></HeaderIcon>
          Generators
          <TotalProduction>
            ({formatNumber(totalProduction)}/s)
          </TotalProduction>
        </HeaderLeft>
        <CollapseIcon
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <IconTriangleDown size={20} />
        </CollapseIcon>
      </PanelHeader>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <ContentWrapper
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
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

            <ListContainer
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {unlockedGenerators.map(generator => {
                const displayCost = getDisplayCost(generator);
                const canAffordBulk = essence >= displayCost;
                const buyCount = buyMode === '1' ? 1 :
                  buyMode === '10' ? Math.min(10, generator.maxPurchasable) :
                  buyMode === '100' ? Math.min(100, generator.maxPurchasable) :
                  generator.maxPurchasable;
                const color = GENERATOR_COLORS[generator.id] || GENERATOR_COLORS.default;
                const IconComponent = GENERATOR_ICONS[generator.id] || GENERATOR_ICONS.default;
                const productionPercentage = totalProduction > 0
                  ? ((generator.baseOutput * generator.owned) / totalProduction) * 100
                  : 0;

                return (
                  <GeneratorCard
                    key={generator.id}
                    $canAfford={canAffordBulk}
                    $unlocked={true}
                    $justPurchased={justPurchased === generator.id}
                    onClick={() => handlePurchase(generator)}
                    variants={staggerItem}
                    whileHover={canAffordBulk ? { scale: 1.01 } : {}}
                    whileTap={canAffordBulk ? { scale: 0.99 } : {}}
                  >
                    <GeneratorIconWrapper
                      $color={color}
                      $owned={generator.owned}
                    >
                      <IconComponent size={26} />
                    </GeneratorIconWrapper>

                    <GeneratorInfo>
                      <GeneratorName>
                        {generator.name}
                        {generator.owned > 0 && (
                          <OwnedBadge>x{generator.owned}</OwnedBadge>
                        )}
                      </GeneratorName>
                      <GeneratorOutput $color={color}>
                        +{formatNumber(generator.baseOutput)}/sec each
                      </GeneratorOutput>
                      {generator.owned > 0 && totalProduction > 0 && (
                        <ProductionBar>
                          <ProductionFill
                            style={{
                              background: color,
                              width: `${Math.min(productionPercentage, 100)}%`
                            }}
                          />
                        </ProductionBar>
                      )}
                    </GeneratorInfo>

                    <BuySection>
                      <CostLabel $canAfford={canAffordBulk}>
                        {formatNumber(displayCost)}
                      </CostLabel>
                      <BuyButton
                        $canAfford={canAffordBulk && buyCount > 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchase(generator);
                        }}
                      >
                        Buy {buyCount}
                      </BuyButton>
                    </BuySection>
                  </GeneratorCard>
                );
              })}

              {lockedGenerators.slice(0, 2).map(generator => {
                const unlockProgress = Math.min(
                  (lifetimeEssence / generator.unlockEssence) * 100,
                  100
                );

                return (
                  <LockedCard
                    key={generator.id}
                    variants={staggerItem}
                  >
                    <LockedIconWrapper>
                      <IconLocked size={24} />
                    </LockedIconWrapper>

                    <LockedInfo>
                      <LockedName>{generator.name}</LockedName>
                      <LockedRequirement>
                        {t('essenceTap.unlockAt', {
                          amount: formatNumber(generator.unlockEssence),
                          defaultValue: `Unlock at ${formatNumber(generator.unlockEssence)} lifetime`
                        })}
                      </LockedRequirement>
                      <ProgressToUnlock>
                        <ProgressFill style={{ width: `${unlockProgress}%` }} />
                      </ProgressToUnlock>
                    </LockedInfo>
                  </LockedCard>
                );
              })}
            </ListContainer>
          </ContentWrapper>
        )}
      </AnimatePresence>
    </Container>
  );
});

GeneratorList.displayName = 'GeneratorList';

export default GeneratorList;
