/**
 * DojoFacilityCard - Dojo facility upgrade section
 *
 * Shows current facility tier and allows upgrading to next tier.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaBuilding, FaLock, FaCheck, FaCoins } from 'react-icons/fa';
import { MdAutorenew } from 'react-icons/md';

import {
  FacilitySection,
  FacilityHeader,
  FacilityTitle,
  FacilityCurrentTier,
  FacilityTierName,
  FacilityTierBadge,
  FacilityUpgradeCard,
  FacilityUpgradeInfo,
  FacilityUpgradeName,
  FacilityUpgradeDesc,
  FacilityUpgradeFeatures,
  FacilityFeatureTag,
  FacilityUpgradeCost,
  FacilityUpgradeButton,
  FacilityRequirement,
  FacilityMaxed,
} from './DojoPage.styles';

const DojoFacilityCard = ({
  facility,
  userLevel,
  userPoints,
  upgrading,
  onUpgrade,
  setError,
}) => {
  const { t } = useTranslation();

  if (!facility) return null;

  const { current, nextTier } = facility;
  const canAfford = nextTier ? userPoints >= nextTier.unlockCost : false;
  const meetsLevel = nextTier ? userLevel >= nextTier.requiredLevel : false;
  const canUpgrade = nextTier && canAfford && meetsLevel && !upgrading;

  const handleUpgrade = async () => {
    if (!canUpgrade) {
      if (!meetsLevel) {
        setError(t('dojo.facility.requiresLevel', { level: nextTier.requiredLevel }));
      } else if (!canAfford) {
        setError(t('dojo.facility.notEnoughPoints'));
      }
      return;
    }

    try {
      await onUpgrade(nextTier.id);
    } catch (err) {
      // Error handled by hook
    }
  };

  // Find new features in next tier
  const currentFeatures = current?.features || [];
  const nextFeatures = nextTier?.features || [];
  const newFeatures = nextFeatures.filter(f => !currentFeatures.includes(f));

  return (
    <FacilitySection role="region" aria-label={t('dojo.facility.title')}>
      <FacilityHeader>
        <FacilityTitle>
          <FaBuilding aria-hidden="true" />
          <span>{t('dojo.facility.title')}</span>
        </FacilityTitle>
      </FacilityHeader>

      <FacilityCurrentTier>
        <FacilityTierBadge $tier={current?.id}>
          <FaCheck aria-hidden="true" />
        </FacilityTierBadge>
        <FacilityTierName>
          {t(`dojo.facility.tiers.${current?.id}.name`, { defaultValue: current?.name })}
        </FacilityTierName>
      </FacilityCurrentTier>

      {nextTier ? (
        <FacilityUpgradeCard
          as={motion.div}
          $canUpgrade={canUpgrade}
          $locked={!meetsLevel}
          whileHover={canUpgrade ? { scale: 1.01 } : {}}
        >
          <FacilityUpgradeInfo>
            <FacilityUpgradeName>
              {t(`dojo.facility.tiers.${nextTier.id}.name`, { defaultValue: nextTier.name })}
            </FacilityUpgradeName>
            <FacilityUpgradeDesc>
              {t(`dojo.facility.tiers.${nextTier.id}.description`, { defaultValue: nextTier.description })}
            </FacilityUpgradeDesc>

            {newFeatures.length > 0 && (
              <FacilityUpgradeFeatures>
                {newFeatures.map(feature => (
                  <FacilityFeatureTag key={feature}>
                    + {t(`dojo.facility.features.${feature}`, { defaultValue: feature })}
                  </FacilityFeatureTag>
                ))}
              </FacilityUpgradeFeatures>
            )}

            {!meetsLevel && (
              <FacilityRequirement>
                <FaLock aria-hidden="true" />
                <span>{t('dojo.facility.requiresLevel', { level: nextTier.requiredLevel })}</span>
              </FacilityRequirement>
            )}
          </FacilityUpgradeInfo>

          <FacilityUpgradeCost>
            <FacilityUpgradeButton
              onClick={handleUpgrade}
              disabled={!canUpgrade}
              $canAfford={canAfford}
              $meetsLevel={meetsLevel}
            >
              {upgrading ? (
                <MdAutorenew className="spin" aria-hidden="true" />
              ) : (
                <>
                  <FaCoins aria-hidden="true" />
                  <span>{nextTier.unlockCost.toLocaleString()}</span>
                </>
              )}
            </FacilityUpgradeButton>
          </FacilityUpgradeCost>
        </FacilityUpgradeCard>
      ) : (
        <FacilityMaxed>
          <FaCheck aria-hidden="true" />
          <span>{t('dojo.facility.maxed')}</span>
        </FacilityMaxed>
      )}
    </FacilitySection>
  );
};

export default DojoFacilityCard;
