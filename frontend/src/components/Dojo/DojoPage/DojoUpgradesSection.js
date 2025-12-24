/**
 * DojoUpgradesSection - Available upgrades list
 *
 * Displays purchasable upgrades with costs.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdAutorenew } from 'react-icons/md';
import { FaCoins } from 'react-icons/fa';

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
