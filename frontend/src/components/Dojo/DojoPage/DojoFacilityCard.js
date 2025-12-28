/**
 * DojoFacilityCard - Dojo facility upgrade section
 *
 * Shows current facility tier and allows upgrading to next tier.
 * Displays clear progression hints for locked facilities.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaBuilding, FaLock, FaCheck, FaCoins, FaStar } from 'react-icons/fa';
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
  FacilityMaxed,
} from './DojoPage.styles';

// Enhanced requirement display with progression hints
const RequirementBox = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: rgba(88, 86, 214, 0.1);
  border: 1px solid rgba(88, 86, 214, 0.3);
  border-radius: 10px;
`;

const RequirementHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #5856d6;
  font-weight: 600;
  font-size: 14px;
`;

const RequirementProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #5856d6 0%, #af52de 100%);
  border-radius: 3px;
`;

const ProgressText = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  min-width: 70px;
  text-align: right;
`;

const HintText = styled.p`
  margin: 8px 0 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
`;

// Step indicator for facility progression (desktop enhancement)
const TierSteps = styled.div`
  display: none;
  gap: 4px;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const TierStep = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${props => props.$completed
    ? 'linear-gradient(90deg, #5856d6 0%, #af52de 100%)'
    : props.$current
      ? 'linear-gradient(90deg, rgba(88, 86, 214, 0.5), rgba(175, 82, 222, 0.5))'
      : 'rgba(255, 255, 255, 0.1)'};
  transition: background 0.3s ease;
`;

const TierLabel = styled.div`
  display: none;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.62);
  margin-bottom: 8px;

  @media (min-width: 768px) {
    display: flex;
  }
`;

// All facility tiers for step indicator
const ALL_TIERS = ['basic', 'warriors_hall', 'masters_temple', 'grandmasters_sanctum'];

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
  const currentTierIndex = ALL_TIERS.indexOf(current?.id) || 0;
  const canAfford = nextTier ? userPoints >= nextTier.unlockCost : false;
  const meetsLevel = nextTier ? userLevel >= nextTier.requiredLevel : false;
  const canUpgrade = nextTier && canAfford && meetsLevel && !upgrading;

  // Calculate level progress toward requirement
  const levelProgress = nextTier ? Math.min(userLevel / nextTier.requiredLevel, 1) : 1;
  const levelsNeeded = nextTier ? Math.max(0, nextTier.requiredLevel - userLevel) : 0;

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
    } catch (_err) {
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

      {/* Tier progression indicator - visible on desktop */}
      <TierLabel>
        {ALL_TIERS.map((tier, idx) => (
          <span key={tier} style={{ opacity: idx <= currentTierIndex ? 1 : 0.5 }}>
            {t(`dojo.facility.tiers.${tier}.name`, { defaultValue: tier.replace('_', ' ') })}
          </span>
        ))}
      </TierLabel>
      <TierSteps role="progressbar" aria-valuenow={currentTierIndex + 1} aria-valuemax={ALL_TIERS.length} aria-label="Facility progression">
        {ALL_TIERS.map((tier, idx) => (
          <TierStep
            key={tier}
            $completed={idx < currentTierIndex}
            $current={idx === currentTierIndex}
          />
        ))}
      </TierSteps>

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
              <RequirementBox>
                <RequirementHeader>
                  <FaLock aria-hidden="true" />
                  <span>{t('dojo.facility.requiresLevel', { level: nextTier.requiredLevel })}</span>
                </RequirementHeader>

                <RequirementProgress>
                  <FaStar style={{ color: '#5856d6', fontSize: 14 }} aria-hidden="true" />
                  <ProgressBar>
                    <ProgressFill
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </ProgressBar>
                  <ProgressText>
                    Lv. {userLevel} / {nextTier.requiredLevel}
                  </ProgressText>
                </RequirementProgress>

                <HintText>
                  {t('dojo.facility.progressHint', {
                    levels: levelsNeeded,
                    defaultValue: `${levelsNeeded} more level${levelsNeeded !== 1 ? 's' : ''} needed. Earn XP by summoning warriors, collecting new characters, and training in the Dojo.`
                  })}
                </HintText>
              </RequirementBox>
            )}
          </FacilityUpgradeInfo>

          <FacilityUpgradeCost>
            <FacilityUpgradeButton
              onClick={handleUpgrade}
              $canAfford={canAfford}
              $meetsLevel={meetsLevel}
              $disabled={!canUpgrade}
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
