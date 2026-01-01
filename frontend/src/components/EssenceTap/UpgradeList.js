/**
 * UpgradeList - Displays purchasable upgrades organized by category
 */

import React, { memo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const TabBar = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;

  /* Hide scrollbar */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const Tab = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.$active ? 'rgba(138, 43, 226, 0.3)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(138, 43, 226, 0.6)' : 'transparent'};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? theme.colors.text : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'rgba(138, 43, 226, 0.4)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const UpgradeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  overflow-y: auto;
  flex: 1;

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const UpgradeCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.md};
  background: ${props => {
    if (props.$purchased) return 'rgba(16, 185, 129, 0.1)';
    if (props.$canAfford && props.$unlocked) return 'rgba(138, 43, 226, 0.15)';
    return 'rgba(255, 255, 255, 0.03)';
  }};
  border: 1px solid ${props => {
    if (props.$purchased) return 'rgba(16, 185, 129, 0.4)';
    if (props.$canAfford && props.$unlocked) return 'rgba(138, 43, 226, 0.4)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  border-radius: ${theme.radius.lg};
  opacity: ${props => (props.$unlocked || props.$purchased) ? 1 : 0.5};
  cursor: ${props => (!props.$purchased && props.$canAfford && props.$unlocked) ? 'pointer' : 'default'};
  transition: all 0.2s ease;

  ${props => (!props.$purchased && props.$canAfford && props.$unlocked) && `
    &:hover {
      background: rgba(138, 43, 226, 0.25);
      border-color: rgba(138, 43, 226, 0.6);
      transform: translateY(-2px);
    }
  `}
`;

const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const UpgradeDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
  flex: 1;
`;

const UpgradeFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UpgradeCost = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => {
    if (props.$purchased) return '#10B981';
    if (props.$canAfford) return '#A855F7';
    return '#EF4444';
  }};
`;

const PurchasedBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: #10B981;
  background: rgba(16, 185, 129, 0.2);
  padding: 2px 8px;
  border-radius: ${theme.radius.sm};
`;

const LockedReason = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const TABS = [
  { id: 'click', label: 'Click' },
  { id: 'generator', label: 'Generators' },
  { id: 'global', label: 'Global' },
  { id: 'synergy', label: 'Synergy' }
];

const UpgradeList = memo(({
  upgrades = {},
  _essence = 0,
  onPurchase
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('click');

  const handlePurchase = useCallback((upgrade) => {
    if (upgrade.purchased || !upgrade.canAfford || !upgrade.unlocked || !upgrade.meetsRequirements) {
      return;
    }
    onPurchase?.(upgrade.id);
  }, [onPurchase]);

  const currentUpgrades = upgrades[activeTab] || [];

  // Sort: available first, then purchased, then locked
  const sortedUpgrades = [...currentUpgrades].sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.canAfford !== b.canAfford) return a.canAfford ? -1 : 1;
    return (a.tier || 0) - (b.tier || 0);
  });

  return (
    <Container>
      <TabBar>
        {TABS.map(tab => (
          <Tab
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(`essenceTap.tab.${tab.id}`, { defaultValue: tab.label })}
          </Tab>
        ))}
      </TabBar>

      <UpgradeGrid>
        {sortedUpgrades.length === 0 ? (
          <EmptyState>
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
                onClick={() => handlePurchase(upgrade)}
                whileHover={(!upgrade.purchased && upgrade.canAfford && !isLocked) ? { scale: 1.02 } : {}}
                whileTap={(!upgrade.purchased && upgrade.canAfford && !isLocked) ? { scale: 0.98 } : {}}
              >
                <UpgradeName>
                  {upgrade.name}
                </UpgradeName>

                <UpgradeDescription>
                  {upgrade.description}
                </UpgradeDescription>

                <UpgradeFooter>
                  {upgrade.purchased ? (
                    <PurchasedBadge>
                      {t('essenceTap.purchased', { defaultValue: 'Purchased' })}
                    </PurchasedBadge>
                  ) : isLocked ? (
                    <LockedReason>
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
                      <Button
                        variant={upgrade.canAfford ? 'primary' : 'secondary'}
                        disabled={!upgrade.canAfford}
                        size="sm"
                      >
                        {t('essenceTap.buy', { defaultValue: 'Buy' })}
                      </Button>
                    </>
                  )}
                </UpgradeFooter>
              </UpgradeCard>
            );
          })
        )}
      </UpgradeGrid>
    </Container>
  );
});

UpgradeList.displayName = 'UpgradeList';

export default UpgradeList;
