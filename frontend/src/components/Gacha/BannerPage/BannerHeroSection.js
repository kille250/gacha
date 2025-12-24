/**
 * BannerHeroSection - Hero section for banner page
 *
 * Displays banner title, series, description, and metadata badges.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  HeroSection,
  HeroContent,
  BannerTitle,
  BannerSeries,
  BannerDescription,
  BadgeRow,
  CostBadge,
  DateBadge,
} from './BannerPage.styles';

const BannerHeroSection = ({
  banner,
  singlePullCost,
}) => {
  const { t } = useTranslation();

  if (!banner) return null;

  return (
    <HeroSection>
      <HeroContent>
        <BannerTitle>{banner.name}</BannerTitle>
        <BannerSeries>{banner.series}</BannerSeries>
        {banner.description && (
          <BannerDescription>{banner.description}</BannerDescription>
        )}
        <BadgeRow>
          <CostBadge>
            {singlePullCost} {t('banner.ptsPerPull')}
          </CostBadge>
          <DateBadge>
            {banner.endDate
              ? `${t('common.ends')}: ${new Date(banner.endDate).toLocaleDateString()}`
              : t('common.limitedTime')}
          </DateBadge>
        </BadgeRow>
      </HeroContent>
    </HeroSection>
  );
};

export default BannerHeroSection;
