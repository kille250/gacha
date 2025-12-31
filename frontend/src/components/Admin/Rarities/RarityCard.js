/**
 * RarityCard - Display component for a single rarity
 *
 * Shows rarity details including:
 * - Drop rates across different pool types
 * - Visual settings (colors, glow)
 * - Animation configuration
 * - Edit/Delete actions
 *
 * Accessibility:
 * - Uses semantic heading structure
 * - Action buttons have proper labels
 * - Color information conveyed through text, not just color
 */
import React from 'react';
import PropTypes from 'prop-types';
import { FaPercent, FaPalette, FaEdit, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { motionVariants } from '../../../design-system';
import { IconArrowRight } from '../../../constants/icons';
import { IconButton } from '../Admin.styles';
import {
  RarityCard as StyledRarityCard,
  RarityHeader,
  RarityName,
  RarityBadge,
  RarityBody,
  RaritySection,
  SectionLabel,
  RateGrid,
  RateItem,
  RateLabel,
  RateValue,
  EffectiveRate,
  VisualRow,
  ColorSwatch,
  VisualInfo,
  RarityMeta,
  MetaItem,
  RarityActions,
} from './Rarity.styles';

const RarityCard = ({
  rarity,
  rateTotals,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  // Get effective rate for a pool type
  const getEffectiveRate = (poolKey) => {
    const pool = rateTotals?.find(p => p.key === poolKey);
    return pool?.effectiveRates?.[rarity.name] || '0.0';
  };

  return (
    <StyledRarityCard
      variants={motionVariants.card}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      $color={rarity.color}
    >
      <RarityHeader $color={rarity.color}>
        <RarityName>{rarity.displayName}</RarityName>
        <RarityBadge $color={rarity.color}>{rarity.name}</RarityBadge>
      </RarityHeader>

      <RarityBody>
        {/* Drop Rates Section */}
        <RaritySection>
          <SectionLabel>
            <FaPercent aria-hidden="true" /> {t('admin.rarities.dropRates')}
          </SectionLabel>
          <RateGrid role="list" aria-label={t('admin.rarities.dropRates')}>
            <RateItem role="listitem">
              <RateLabel>{t('admin.rarities.standard')}</RateLabel>
              <RateValue>
                {rarity.dropRateStandardSingle}% / {rarity.dropRateStandardMulti}%
              </RateValue>
              {rateTotals && (
                <EffectiveRate>
                  <IconArrowRight /> {getEffectiveRate('standardSingle')}% / {getEffectiveRate('standardMulti')}%
                </EffectiveRate>
              )}
            </RateItem>
            <RateItem role="listitem">
              <RateLabel>{t('admin.rarities.banner')}</RateLabel>
              <RateValue>
                {rarity.dropRateBannerSingle}% / {rarity.dropRateBannerMulti}%
              </RateValue>
              {rateTotals && (
                <EffectiveRate>
                  <IconArrowRight /> {getEffectiveRate('bannerSingle')}% / {getEffectiveRate('bannerMulti')}%
                </EffectiveRate>
              )}
            </RateItem>
            <RateItem role="listitem">
              <RateLabel>{t('admin.rarities.premium')}</RateLabel>
              <RateValue>
                {rarity.dropRatePremiumSingle}% / {rarity.dropRatePremiumMulti}%
              </RateValue>
              {rateTotals && (
                <EffectiveRate>
                  <IconArrowRight /> {getEffectiveRate('premiumSingle')}% / {getEffectiveRate('premiumMulti')}%
                </EffectiveRate>
              )}
            </RateItem>
            <RateItem role="listitem">
              <RateLabel>{t('admin.rarities.pity')}</RateLabel>
              <RateValue>{rarity.dropRatePity}%</RateValue>
              {rateTotals && (
                <EffectiveRate>
                  <IconArrowRight /> {getEffectiveRate('pity')}%
                </EffectiveRate>
              )}
            </RateItem>
          </RateGrid>
        </RaritySection>

        {/* Visual Settings Section */}
        <RaritySection>
          <SectionLabel>
            <FaPalette aria-hidden="true" /> {t('admin.rarities.visual')}
          </SectionLabel>
          <VisualRow>
            <ColorSwatch
              $color={rarity.color}
              title={`${t('admin.rarities.primaryColor')}: ${rarity.color}`}
              aria-label={`${t('admin.rarities.primaryColor')}: ${rarity.color}`}
            />
            {rarity.accentColor && (
              <ColorSwatch
                $color={rarity.accentColor}
                title={`${t('admin.rarities.accentColor')}: ${rarity.accentColor}`}
                aria-label={`${t('admin.rarities.accentColor')}: ${rarity.accentColor}`}
              />
            )}
            <VisualInfo>
              <span>{t('admin.rarities.glow')}: {Math.round(rarity.glowIntensity * 100)}%</span>
              <span>{t('admin.rarities.orbs')}: {rarity.orbCount}</span>
            </VisualInfo>
          </VisualRow>
        </RaritySection>

        {/* Metadata */}
        <RarityMeta>
          <MetaItem>{t('admin.rarities.order')}: {rarity.order}</MetaItem>
          {rarity.minimumRate > 0 && (
            <MetaItem $warning>{t('admin.rarities.min')}: {rarity.minimumRate}%</MetaItem>
          )}
          {rarity.isPityEligible && (
            <MetaItem $highlight>{t('admin.rarities.pityEligible')}</MetaItem>
          )}
          {rarity.isDefault && (
            <MetaItem $muted>{t('admin.rarities.default')}</MetaItem>
          )}
        </RarityMeta>
      </RarityBody>

      {/* Actions */}
      <RarityActions>
        <IconButton
          onClick={() => onEdit(rarity)}
          aria-label={t('admin.rarities.editRarity', { name: rarity.displayName })}
        >
          <FaEdit aria-hidden="true" />
        </IconButton>
        {!rarity.isDefault && (
          <IconButton
            $danger
            onClick={() => onDelete(rarity)}
            aria-label={t('admin.rarities.deleteRarity', { name: rarity.displayName })}
          >
            <FaTrash aria-hidden="true" />
          </IconButton>
        )}
      </RarityActions>
    </StyledRarityCard>
  );
};

RarityCard.propTypes = {
  rarity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    accentColor: PropTypes.string,
    order: PropTypes.number.isRequired,
    dropRateStandardSingle: PropTypes.number,
    dropRateStandardMulti: PropTypes.number,
    dropRateBannerSingle: PropTypes.number,
    dropRateBannerMulti: PropTypes.number,
    dropRatePremiumSingle: PropTypes.number,
    dropRatePremiumMulti: PropTypes.number,
    dropRatePity: PropTypes.number,
    minimumRate: PropTypes.number,
    glowIntensity: PropTypes.number,
    orbCount: PropTypes.number,
    isPityEligible: PropTypes.bool,
    isDefault: PropTypes.bool,
  }).isRequired,
  rateTotals: PropTypes.array,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default React.memo(RarityCard);
