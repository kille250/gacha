/**
 * BannerRollControls - Main roll action buttons
 *
 * Provides single and multi-pull buttons with cost display.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdFastForward } from 'react-icons/md';

import { IconSparkles, IconArrowRight, IconPoints } from '../../../constants/icons';

import {
  ControlsSection,
  PullActionsContainer,
  PrimaryPullCard,
  PullCardIcon,
  PullCardContent,
  PullCardTitle,
  PullCardCost,
  CostAmount,
  CostUnit,
  PullCardArrow,
  MultiPullGrid,
  MultiPullCard,
  RecommendedTag,
  MultiPullCount,
  MultiPullCost,
  MultiPullDiscount,
  ControlsFooter,
  PointsDisplay,
  PointsIcon,
  PointsValue,
  PointsLabel,
  FastModeToggle,
} from './BannerPage.styles';

const BannerRollControls = ({
  user,
  singlePullCost,
  pullOptions = [],
  bestValueCount,
  isRolling,
  locked,
  pricingLoaded,
  pricingError,
  skipAnimations,
  onSetSkipAnimations,
  onSingleRoll,
  onMultiRoll,
  getDisabledReason,
  setError,
}) => {
  const { t } = useTranslation();

  const handleSingleRoll = () => {
    const reason = getDisabledReason(singlePullCost);
    if (reason) {
      setError(reason);
      return;
    }
    onSingleRoll(false);
  };

  const handleMultiRoll = (count, cost) => {
    const reason = getDisabledReason(cost);
    if (reason) {
      setError(reason);
      return;
    }
    onMultiRoll(count, false);
  };

  const isSingleDisabled = isRolling || (!pricingLoaded && !pricingError) || pricingError || locked || user?.points < singlePullCost;

  return (
    <ControlsSection
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <PullActionsContainer>
        {/* Primary Single Pull */}
        <PrimaryPullCard
          onClick={handleSingleRoll}
          disabled={isSingleDisabled}
          title={getDisabledReason(singlePullCost)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          aria-label={`${t('common.single')} - ${singlePullCost} ${t('common.points')}`}
        >
          <PullCardIcon aria-hidden="true"><IconSparkles /></PullCardIcon>
          <PullCardContent>
            <PullCardTitle>
              {isRolling ? t('common.summoning') : t('common.single')}
            </PullCardTitle>
            <PullCardCost>
              <CostAmount>{singlePullCost}</CostAmount>
              <CostUnit>{t('common.points')}</CostUnit>
            </PullCardCost>
          </PullCardContent>
          <PullCardArrow aria-hidden="true"><IconArrowRight /></PullCardArrow>
        </PrimaryPullCard>

        {/* Multi-Pull Options Grid */}
        <MultiPullGrid role="group" aria-label={t('common.multiPullOptions', 'Multi-pull options')}>
          {pullOptions.filter(opt => opt.count > 1).map((option) => {
            const canAfford = (user?.points || 0) >= option.finalCost;
            const isDisabled = isRolling || (!pricingLoaded && !pricingError) || pricingError || locked || !canAfford;

            return (
              <MultiPullCard
                key={option.count}
                onClick={() => handleMultiRoll(option.count, option.finalCost)}
                disabled={isDisabled}
                title={getDisabledReason(option.finalCost)}
                $canAfford={canAfford && pricingLoaded && !pricingError}
                $isRecommended={option.count === bestValueCount}
                whileHover={{ scale: canAfford ? 1.03 : 1, y: canAfford ? -3 : 0 }}
                whileTap={{ scale: canAfford ? 0.97 : 1 }}
                aria-label={`${option.count} pulls - ${option.finalCost} points${option.discountPercent > 0 ? ` (${option.discountPercent}% off)` : ''}`}
              >
                {option.count === bestValueCount && option.discountPercent > 0 && (
                  <RecommendedTag>{t('common.best') || 'BEST'}</RecommendedTag>
                )}
                <MultiPullCount>{option.count}×</MultiPullCount>
                <MultiPullCost>
                  <span>{option.finalCost}</span>
                  <small>pts</small>
                </MultiPullCost>
                {option.discountPercent > 0 && (
                  <MultiPullDiscount>-{option.discountPercent}%</MultiPullDiscount>
                )}
              </MultiPullCard>
            );
          })}
        </MultiPullGrid>
      </PullActionsContainer>

      {/* Footer with points and fast mode */}
      <ControlsFooter>
        <PointsDisplay>
          <PointsIcon aria-hidden="true"><IconPoints /></PointsIcon>
          <PointsValue aria-label={`${user?.points || 0} ${t('common.points')}`}>
            {user?.points || 0}
          </PointsValue>
          <PointsLabel>{t('common.pointsAvailable')}</PointsLabel>
        </PointsDisplay>

        <FastModeToggle
          $active={skipAnimations}
          onClick={() => onSetSkipAnimations(!skipAnimations)}
          aria-pressed={skipAnimations}
          aria-label={skipAnimations ? t('common.fastMode') : t('common.normal')}
        >
          <MdFastForward aria-hidden="true" />
          <span>{skipAnimations ? t('common.fastMode') : t('common.normal')}</span>
        </FastModeToggle>
      </ControlsFooter>
    </ControlsSection>
  );
};

export default BannerRollControls;
