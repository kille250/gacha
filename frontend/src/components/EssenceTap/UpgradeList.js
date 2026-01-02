/**
 * UpgradeList - Redesigned upgrades panel with premium styling
 *
 * Features:
 * - Collapsible panel
 * - Pill-shaped category tabs
 * - Enhanced card states with icons
 * - Category-colored accents
 * - Clear locked/available/purchased visual states
 */

import React, { memo, useState, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import {
  IconLightning,
  IconLevelUp,
  IconGlobe,
  IconCategoryPerson,
  IconCheck,
  IconLocked,
  IconTriangleDown
} from '../../constants/icons';
import {
  affordableGlow,
  staggerContainer,
  staggerItem
} from './animations';

// Tab configurations with icons and colors
const TABS = [
  { id: 'click', label: 'Click', icon: IconLightning, color: '#F59E0B' },
  { id: 'generator', label: 'Generators', icon: IconLevelUp, color: '#10B981' },
  { id: 'global', label: 'Global', icon: IconGlobe, color: '#3B82F6' },
  { id: 'synergy', label: 'Synergy', icon: IconCategoryPerson, color: '#EC4899' }
];

const purchaseFlash = keyframes`
  0% { background: rgba(16, 185, 129, 0.3); }
  100% { background: rgba(16, 185, 129, 0.1); }
`;

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
  color: #EC4899;
  display: flex;
  align-items: center;
`;

const PurchasedCount = styled.span`
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const TabBar = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.2);
  overflow-x: auto;

  /* Hide scrollbar */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.$active
    ? `${props.$color}25`
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active
    ? `${props.$color}50`
    : 'rgba(255, 255, 255, 0.08)'};
  border-radius: ${theme.radius.full};
  color: ${props => props.$active ? props.$color : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active
      ? `${props.$color}30`
      : 'rgba(255, 255, 255, 0.06)'};
  }
`;

const TabIcon = styled.span`
  display: flex;
  align-items: center;
`;

const UpgradeGrid = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  overflow-y: auto;
  flex: 1;

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

const UpgradeCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.md};
  background: ${props => {
    if (props.$purchased) return 'rgba(16, 185, 129, 0.08)';
    if (props.$canAfford && props.$unlocked) return 'rgba(168, 85, 247, 0.08)';
    return 'rgba(255, 255, 255, 0.02)';
  }};
  border: 1px solid ${props => {
    if (props.$purchased) return 'rgba(16, 185, 129, 0.3)';
    if (props.$canAfford && props.$unlocked) return 'rgba(168, 85, 247, 0.3)';
    return 'rgba(255, 255, 255, 0.06)';
  }};
  border-left: 3px solid ${props => props.$categoryColor || 'transparent'};
  border-radius: ${theme.radius.lg};
  opacity: ${props => (props.$unlocked || props.$purchased) ? 1 : 0.5};
  cursor: ${props => (!props.$purchased && props.$canAfford && props.$unlocked) ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  position: relative;

  ${props => (!props.$purchased && props.$canAfford && props.$unlocked) && css`
    animation: ${affordableGlow} 3s ease-in-out infinite;

    &:hover {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.5);
      transform: translateY(-2px);
    }
  `}

  ${props => props.$justPurchased && css`
    animation: ${purchaseFlash} 0.3s ease-out;
  `}
`;

const UpgradeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.xs};
`;

const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${props => props.$purchased
    ? 'rgba(16, 185, 129, 0.2)'
    : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$purchased
    ? '#10B981'
    : theme.colors.textSecondary};
`;

const UpgradeDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
  line-height: 1.4;
`;

const UpgradeFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
`;

const UpgradeCost = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => {
    if (props.$purchased) return '#10B981';
    if (props.$canAfford) return '#A855F7';
    return '#EF4444';
  }};
`;

const PurchasedBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.xs};
  color: #10B981;
  background: rgba(16, 185, 129, 0.15);
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
`;

const BuyButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.lg};
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

  ${props => props.$canAfford && `
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
    }

    &:active {
      transform: scale(0.95);
    }
  `}
`;

const LockedReason = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const EmptyIcon = styled.div`
  font-size: 32px;
  opacity: 0.5;
`;

const UpgradeList = memo(({
  upgrades = {},
  _essence = 0,
  onPurchase,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('click');
  const [justPurchased, setJustPurchased] = useState(null);

  const handlePurchase = useCallback((upgrade) => {
    if (upgrade.purchased || !upgrade.canAfford || !upgrade.unlocked || !upgrade.meetsRequirements) {
      return;
    }
    setJustPurchased(upgrade.id);
    setTimeout(() => setJustPurchased(null), 300);
    onPurchase?.(upgrade.id);
  }, [onPurchase]);

  const currentUpgrades = upgrades[activeTab] || [];
  const activeTabConfig = TABS.find(t => t.id === activeTab);

  // Sort: available first, then purchased, then locked
  const sortedUpgrades = [...currentUpgrades].sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.canAfford !== b.canAfford) return a.canAfford ? -1 : 1;
    return (a.tier || 0) - (b.tier || 0);
  });

  // Count total purchased upgrades
  const totalPurchased = Object.values(upgrades).flat().filter(u => u.purchased).length;
  const totalUpgrades = Object.values(upgrades).flat().length;

  return (
    <Container>
      <PanelHeader onClick={onToggleCollapse}>
        <HeaderLeft>
          <HeaderIcon><IconLevelUp size={20} /></HeaderIcon>
          Upgrades
          <PurchasedCount>
            ({totalPurchased}/{totalUpgrades})
          </PurchasedCount>
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
            <TabBar>
              {TABS.map(tab => {
                const TabIconComponent = tab.icon;
                const tabUpgrades = upgrades[tab.id] || [];
                const purchasedCount = tabUpgrades.filter(u => u.purchased).length;

                return (
                  <Tab
                    key={tab.id}
                    $active={activeTab === tab.id}
                    $color={tab.color}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <TabIcon>
                      <TabIconComponent size={14} />
                    </TabIcon>
                    {t(`essenceTap.tab.${tab.id}`, { defaultValue: tab.label })}
                    <span style={{ opacity: 0.7 }}>
                      ({purchasedCount}/{tabUpgrades.length})
                    </span>
                  </Tab>
                );
              })}
            </TabBar>

            <UpgradeGrid
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              key={activeTab}
            >
              {sortedUpgrades.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>📦</EmptyIcon>
                  {t('essenceTap.noUpgrades', { defaultValue: 'No upgrades in this category' })}
                </EmptyState>
              ) : (
                sortedUpgrades.map(upgrade => {
                  const isLocked = !upgrade.unlocked || !upgrade.meetsRequirements;

                  return (
                    <UpgradeCard
                      key={upgrade.id}
                      $purchased={upgrade.purchased}
                      $canAfford={upgrade.canAfford}
                      $unlocked={!isLocked}
                      $categoryColor={activeTabConfig?.color}
                      $justPurchased={justPurchased === upgrade.id}
                      onClick={() => handlePurchase(upgrade)}
                      variants={staggerItem}
                      whileHover={(!upgrade.purchased && upgrade.canAfford && !isLocked) ? { scale: 1.01 } : {}}
                      whileTap={(!upgrade.purchased && upgrade.canAfford && !isLocked) ? { scale: 0.99 } : {}}
                    >
                      <UpgradeHeader>
                        <UpgradeName>
                          {upgrade.name}
                        </UpgradeName>
                        <StatusIcon $purchased={upgrade.purchased}>
                          {upgrade.purchased ? (
                            <IconCheck size={14} />
                          ) : isLocked ? (
                            <IconLocked size={12} />
                          ) : null}
                        </StatusIcon>
                      </UpgradeHeader>

                      <UpgradeDescription>
                        {upgrade.description}
                      </UpgradeDescription>

                      <UpgradeFooter>
                        {upgrade.purchased ? (
                          <PurchasedBadge>
                            <IconCheck size={12} />
                            {t('essenceTap.purchased', { defaultValue: 'Purchased' })}
                          </PurchasedBadge>
                        ) : isLocked ? (
                          <LockedReason>
                            <IconLocked size={12} />
                            {!upgrade.unlocked
                              ? t('essenceTap.unlockAt', {
                                  amount: formatNumber(upgrade.unlockEssence),
                                  defaultValue: `Need ${formatNumber(upgrade.unlockEssence)} lifetime`
                                })
                              : !upgrade.meetsRequirements
                                ? t('essenceTap.requirementNotMet', { defaultValue: 'Requirements not met' })
                                : ''}
                          </LockedReason>
                        ) : (
                          <>
                            <UpgradeCost $canAfford={upgrade.canAfford}>
                              {formatNumber(upgrade.cost)}
                            </UpgradeCost>
                            <BuyButton
                              $canAfford={upgrade.canAfford}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchase(upgrade);
                              }}
                            >
                              {t('essenceTap.buy', { defaultValue: 'Buy' })}
                            </BuyButton>
                          </>
                        )}
                      </UpgradeFooter>
                    </UpgradeCard>
                  );
                })
              )}
            </UpgradeGrid>
          </ContentWrapper>
        )}
      </AnimatePresence>
    </Container>
  );
});

UpgradeList.displayName = 'UpgradeList';

export default UpgradeList;
