/**
 * DojoUpgradesSection - Available upgrades list
 *
 * Displays purchasable upgrades with costs.
 * Shows point deficit when user can't afford an upgrade.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdAutorenew } from 'react-icons/md';
import { FaCoins } from 'react-icons/fa';
import styled from 'styled-components';
import { theme } from '../../../design-system';

import {
  UpgradesSection,
  UpgradesTitle,
  UpgradesGrid,
  UpgradeCard,
  UpgradeIcon,
  UpgradeInfo,
  UpgradeName,
  UpgradeDesc,
  UpgradeCost,
  NoUpgrades,
} from './DojoPage.styles';

// Deficit display for when user can't afford
const DeficitBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  margin-top: 4px;
  white-space: nowrap;
`;

const DojoUpgradesSection = ({
  status,
  user,
  upgrading,
  locked,
  onUpgrade,
  getUpgradeDisabledReason,
  setError,
}) => {
  const { t } = useTranslation();

  const availableUpgrades = status?.availableUpgrades || [];

  const handleUpgradeClick = (upgrade, isDisabled, disabledReason) => {
    if (isDisabled && disabledReason) {
      setError(disabledReason);
      return;
    }
    onUpgrade(upgrade.type, upgrade.rarity);
  };

  return (
    <UpgradesSection role="region" aria-label={t('dojo.upgrades')}>
      <UpgradesTitle>⬆️ {t('dojo.upgrades')}</UpgradesTitle>
      <UpgradesGrid>
        {availableUpgrades.map((upgrade, idx) => {
          const isUpgrading = upgrading === (upgrade.type + (upgrade.rarity || ''));
          const canAfford = (user?.points || 0) >= upgrade.cost;
          const isDisabled = !canAfford || isUpgrading || locked;
          const disabledReason = getUpgradeDisabledReason(upgrade, isUpgrading, canAfford);

          return (
            <UpgradeCard
              key={idx}
              as={motion.button}
              type="button"
              disabled={isDisabled}
              $canAfford={canAfford && !locked}
              $disabled={isDisabled}
              onClick={() => handleUpgradeClick(upgrade, isDisabled, disabledReason)}
              title={disabledReason}
              whileHover={!isDisabled ? { scale: 1.02 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
              aria-label={`${upgrade.name} - ${upgrade.cost.toLocaleString()} ${t('common.points')}`}
              aria-disabled={isDisabled}
            >
              <UpgradeIcon aria-hidden="true">{upgrade.icon}</UpgradeIcon>
              <UpgradeInfo>
                <UpgradeName>{upgrade.name}</UpgradeName>
                <UpgradeDesc>{upgrade.description}</UpgradeDesc>
              </UpgradeInfo>
              <UpgradeCost $canAfford={canAfford}>
                {isUpgrading ? (
                  <MdAutorenew className="spin" aria-hidden="true" />
                ) : (
                  <>
                    <FaCoins aria-hidden="true" />
                    <span>{upgrade.cost.toLocaleString()}</span>
                    {!canAfford && (
                      <DeficitBadge>
                        {t('dojo.needMore', {
                          amount: (upgrade.cost - (user?.points || 0)).toLocaleString(),
                          defaultValue: `Need ${(upgrade.cost - (user?.points || 0)).toLocaleString()} more`
                        })}
                      </DeficitBadge>
                    )}
                  </>
                )}
              </UpgradeCost>
            </UpgradeCard>
          );
        })}

        {availableUpgrades.length === 0 && (
          <NoUpgrades>{t('dojo.allUpgradesPurchased')}</NoUpgrades>
        )}
      </UpgradesGrid>
    </UpgradesSection>
  );
};

export default DojoUpgradesSection;
