/**
 * RarityPresets - Preset configurations for rarity values
 *
 * Provides quick-start templates for common rarity configurations.
 * Each preset includes balanced values for drop rates, visual effects,
 * and animation settings based on typical gacha game patterns.
 */

// Common rarity configuration presets
export const RARITY_PRESETS = {
  common: {
    labelKey: 'presetCommon',
    descKey: 'presetCommonDesc',
    values: {
      dropRateStandardSingle: 70,
      dropRateStandardMulti: 65,
      dropRateBannerSingle: 60,
      dropRateBannerMulti: 55,
      dropRatePremiumSingle: 0,
      dropRatePremiumMulti: 0,
      dropRatePity: 0,
      multiplierScaling: 0,
      minimumRate: 35,
      isPityEligible: false,
      glowIntensity: 0.3,
      buildupTime: 800,
      orbCount: 3,
      ringCount: 1,
    }
  },
  uncommon: {
    labelKey: 'presetUncommon',
    descKey: 'presetUncommonDesc',
    values: {
      dropRateStandardSingle: 20,
      dropRateStandardMulti: 22,
      dropRateBannerSingle: 22,
      dropRateBannerMulti: 24,
      dropRatePremiumSingle: 0,
      dropRatePremiumMulti: 0,
      dropRatePity: 0,
      multiplierScaling: 0.5,
      minimumRate: 0,
      isPityEligible: false,
      glowIntensity: 0.5,
      buildupTime: 1000,
      orbCount: 4,
      ringCount: 1,
    }
  },
  rare: {
    labelKey: 'presetRare',
    descKey: 'presetRareDesc',
    values: {
      dropRateStandardSingle: 7,
      dropRateStandardMulti: 9,
      dropRateBannerSingle: 12,
      dropRateBannerMulti: 14,
      dropRatePremiumSingle: 70,
      dropRatePremiumMulti: 65,
      dropRatePity: 85,
      multiplierScaling: 1.0,
      minimumRate: 0,
      isPityEligible: true,
      glowIntensity: 0.7,
      buildupTime: 1400,
      orbCount: 5,
      ringCount: 2,
    }
  },
  epic: {
    labelKey: 'presetEpic',
    descKey: 'presetEpicDesc',
    values: {
      dropRateStandardSingle: 2.5,
      dropRateStandardMulti: 3.5,
      dropRateBannerSingle: 5,
      dropRateBannerMulti: 6,
      dropRatePremiumSingle: 25,
      dropRatePremiumMulti: 28,
      dropRatePity: 14,
      multiplierScaling: 1.5,
      minimumRate: 0,
      isPityEligible: true,
      glowIntensity: 0.85,
      buildupTime: 1800,
      orbCount: 6,
      ringCount: 2,
    }
  },
  legendary: {
    labelKey: 'presetLegendary',
    descKey: 'presetLegendaryDesc',
    values: {
      dropRateStandardSingle: 0.5,
      dropRateStandardMulti: 0.5,
      dropRateBannerSingle: 1,
      dropRateBannerMulti: 1,
      dropRatePremiumSingle: 5,
      dropRatePremiumMulti: 7,
      dropRatePity: 1,
      multiplierScaling: 2.0,
      minimumRate: 0,
      isPityEligible: true,
      glowIntensity: 1.0,
      buildupTime: 2200,
      orbCount: 8,
      ringCount: 3,
    }
  }
};

// Tooltip translation keys for form fields
export const FIELD_TOOLTIP_KEYS = {
  dropRateStandardSingle: 'tooltipStandardSingle',
  dropRateStandardMulti: 'tooltipStandardMulti',
  dropRateBannerSingle: 'tooltipBannerSingle',
  dropRateBannerMulti: 'tooltipBannerMulti',
  dropRatePremiumSingle: 'tooltipPremiumSingle',
  dropRatePremiumMulti: 'tooltipPremiumMulti',
  dropRatePity: 'tooltipPity',
  capSingle: 'tooltipCapSingle',
  capMulti: 'tooltipCapMulti',
  multiplierScaling: 'tooltipMultiplierScaling',
  minimumRate: 'tooltipMinimumRate',
  isPityEligible: 'tooltipPityEligible',
  order: 'tooltipOrder',
};

// Empty form data template
export function getEmptyFormData() {
  return {
    name: '',
    displayName: '',
    order: 0,
    dropRateStandardSingle: 0,
    dropRateStandardMulti: 0,
    dropRateBannerSingle: 0,
    dropRateBannerMulti: 0,
    dropRatePremiumSingle: 0,
    dropRatePremiumMulti: 0,
    dropRatePity: 0,
    capSingle: '',
    capMulti: '',
    multiplierScaling: 1,
    minimumRate: 0,
    color: '#8e8e93',
    accentColor: '',
    glowIntensity: 0.5,
    buildupTime: 1000,
    orbCount: 3,
    ringCount: 1,
    isPityEligible: false,
  };
}
