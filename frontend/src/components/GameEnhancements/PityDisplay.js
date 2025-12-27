/**
 * PityDisplay - Visible pity progress for gacha
 *
 * Shows detailed pity counters and progress toward
 * guaranteed pulls with soft pity boost percentages.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { usePityState } from '../../hooks/useGameEnhancements';
import { useTranslation } from 'react-i18next';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 16px;
  margin: 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h4`
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionTitle = styled.div`
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SharedBadge = styled.span`
  background: rgba(33, 150, 243, 0.2);
  color: #64b5f6;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
`;

const IsolatedBadge = styled.span`
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
`;

const InfoTooltip = styled.div`
  color: #666;
  font-size: 0.75rem;
  margin-top: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  line-height: 1.4;
`;

const PityRow = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const RarityLabel = styled.span`
  color: ${props => props.$color || '#fff'};
  font-weight: 600;
  font-size: 0.9rem;
`;

const PityCount = styled.span`
  color: #888;
  font-size: 0.85rem;
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 8px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)`
  background: ${props => props.$color || '#2196f3'};
  height: 100%;
  border-radius: 8px;
`;

const SoftPityMarker = styled.div`
  position: absolute;
  left: ${props => props.$position}%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.5);
`;

const PityInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
`;

const SoftPityBadge = styled.span`
  background: ${props => props.$active ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? '#ffc107' : '#888'};
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
`;

const SoftPityBoostText = styled.span`
  color: #ffc107;
  font-weight: 600;
  margin-left: 4px;
`;

const FiftyFiftyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${props => props.$guaranteed
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%)'};
  border: 1px solid ${props => props.$guaranteed ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 193, 7, 0.3)'};
  color: ${props => props.$guaranteed ? '#4caf50' : '#ffc107'};
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const CascadingResetNotice = styled(motion.div)`
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.1) 100%);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 12px;
  font-size: 0.85rem;
  color: #64b5f6;
`;

const GuaranteedMessage = styled(motion.div)`
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  margin-top: 16px;
`;

const BannerPitySection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const GuaranteedLabel = styled.div`
  color: #4caf50;
  font-weight: 600;
  font-size: 0.9rem;
`;

const LoadingState = styled.div`
  color: #888;
  text-align: center;
  padding: 20px;
`;

const RARITY_COLORS = {
  legendary: '#ffd700',
  epic: '#9c27b0',
  rare: '#2196f3'
};

export function PityDisplay({ bannerId = null, compact = false, pullResult = null }) {
  const { t } = useTranslation();
  const { pityState, loading, error } = usePityState(bannerId);

  // Get config-driven thresholds from pityState (centralized from backend)
  const pityConfig = useMemo(() => {
    if (!pityState?.config) {
      // Fallback defaults if config not available
      return {
        legendary: { hardPity: 90, softPity: 75, boostPerPull: 0.06 },
        epic: { hardPity: 50, softPity: 40, boostPerPull: 0.03 },
        rare: { hardPity: 10, softPity: 7, boostPerPull: 0.10 }
      };
    }
    return pityState.config.standard;
  }, [pityState?.config]);

  // Format soft pity boost for display
  const formatSoftPityBadge = (softPityInfo, rarity) => {
    if (!softPityInfo) return null;

    const config = pityConfig[rarity];
    if (softPityInfo.active) {
      const boostPercent = Math.round(softPityInfo.currentBoost * 100);
      const perPullPercent = Math.round((config?.boostPerPull || 0.06) * 100);
      return {
        text: t('pity.softPityActive', 'Soft Pity Active'),
        boost: `+${boostPercent}%`,
        tooltip: t('pity.softPityTooltip', { perPull: perPullPercent, threshold: config?.softPity }) ||
          `+${perPullPercent}% per pull above ${config?.softPity}`
      };
    }
    return {
      text: t('pity.softPityAt', { threshold: config?.softPity }) || `Soft Pity @ ${config?.softPity}`,
      boost: null,
      tooltip: t('pity.softPityInactiveTooltip', { threshold: config?.softPity }) ||
        `Rate boost activates at ${config?.softPity} pulls`
    };
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>{t('pity.loading', 'Loading pity info...')}</LoadingState>
      </Container>
    );
  }

  if (error || !pityState) {
    return null;
  }

  const { standard, banner } = pityState;

  if (compact) {
    // Compact version for inline display
    return (
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ padding: '12px' }}
      >
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <RarityLabel $color={RARITY_COLORS.legendary}>
              {standard.progress.legendary.current}/{standard.progress.legendary.max}
            </RarityLabel>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>Legendary</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <RarityLabel $color={RARITY_COLORS.epic}>
              {standard.progress.epic.current}/{standard.progress.epic.max}
            </RarityLabel>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>Epic</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <RarityLabel $color={RARITY_COLORS.rare}>
              {standard.progress.rare.current}/{standard.progress.rare.max}
            </RarityLabel>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>Rare</div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Title>Pity Progress</Title>

      {/* Standard Pity Section - Shared Across All Banners */}
      <SectionTitle>
        Standard Pity
        <SharedBadge>Shared</SharedBadge>
      </SectionTitle>

      {/* Legendary Pity */}
      <PityRow>
        <PityHeader>
          <RarityLabel $color={RARITY_COLORS.legendary}>{t('rarity.legendary', 'Legendary')}</RarityLabel>
          <PityCount>
            {standard.progress.legendary.current} / {standard.progress.legendary.max}
            {standard.untilGuaranteed.legendary === 0 && ` (${t('pity.guaranteed', 'Guaranteed!')})`}
          </PityCount>
        </PityHeader>
        <ProgressBar>
          {/* Config-driven soft pity marker */}
          <SoftPityMarker $position={(pityConfig.legendary.softPity / pityConfig.legendary.hardPity) * 100} />
          <ProgressFill
            $color={RARITY_COLORS.legendary}
            initial={{ width: 0 }}
            animate={{ width: `${standard.progress.legendary.percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBar>
        <PityInfo>
          <span>{standard.untilGuaranteed.legendary} {t('pity.pullsUntilGuaranteed', 'pulls until guaranteed')}</span>
          {(() => {
            const badgeInfo = formatSoftPityBadge(standard.softPity.legendary, 'legendary');
            return (
              <SoftPityBadge $active={standard.softPity.legendary?.active} title={badgeInfo?.tooltip}>
                {badgeInfo?.text}
                {badgeInfo?.boost && <SoftPityBoostText>{badgeInfo.boost}</SoftPityBoostText>}
              </SoftPityBadge>
            );
          })()}
        </PityInfo>
      </PityRow>

      {/* Epic Pity */}
      <PityRow>
        <PityHeader>
          <RarityLabel $color={RARITY_COLORS.epic}>{t('rarity.epic', 'Epic')}</RarityLabel>
          <PityCount>
            {standard.progress.epic.current} / {standard.progress.epic.max}
          </PityCount>
        </PityHeader>
        <ProgressBar>
          {/* Config-driven soft pity marker */}
          <SoftPityMarker $position={(pityConfig.epic.softPity / pityConfig.epic.hardPity) * 100} />
          <ProgressFill
            $color={RARITY_COLORS.epic}
            initial={{ width: 0 }}
            animate={{ width: `${standard.progress.epic.percent}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </ProgressBar>
        <PityInfo>
          <span>{standard.untilGuaranteed.epic} {t('pity.pullsUntilGuaranteed', 'pulls until guaranteed')}</span>
          {(() => {
            const badgeInfo = formatSoftPityBadge(standard.softPity.epic, 'epic');
            return (
              <SoftPityBadge $active={standard.softPity.epic?.active} title={badgeInfo?.tooltip}>
                {badgeInfo?.text}
                {badgeInfo?.boost && <SoftPityBoostText>{badgeInfo.boost}</SoftPityBoostText>}
              </SoftPityBadge>
            );
          })()}
        </PityInfo>
      </PityRow>

      {/* Rare Pity */}
      <PityRow>
        <PityHeader>
          <RarityLabel $color={RARITY_COLORS.rare}>{t('rarity.rare', 'Rare')}</RarityLabel>
          <PityCount>
            {standard.progress.rare.current} / {standard.progress.rare.max}
          </PityCount>
        </PityHeader>
        <ProgressBar>
          {/* Config-driven soft pity marker */}
          <SoftPityMarker $position={(pityConfig.rare.softPity / pityConfig.rare.hardPity) * 100} />
          <ProgressFill
            $color={RARITY_COLORS.rare}
            initial={{ width: 0 }}
            animate={{ width: `${standard.progress.rare.percent}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </ProgressBar>
        <PityInfo>
          <span>{standard.untilGuaranteed.rare} {t('pity.pullsUntilGuaranteed', 'pulls until guaranteed')}</span>
          {(() => {
            const badgeInfo = formatSoftPityBadge(standard.softPity.rare, 'rare');
            return (
              <SoftPityBadge $active={standard.softPity.rare?.active} title={badgeInfo?.tooltip}>
                {badgeInfo?.text}
                {badgeInfo?.boost && <SoftPityBoostText>{badgeInfo.boost}</SoftPityBoostText>}
              </SoftPityBadge>
            );
          })()}
        </PityInfo>
      </PityRow>

      {/* Info about shared pity */}
      <InfoTooltip>
        Standard pity progress is shared across all banners. Pulling on any banner advances these counters.
      </InfoTooltip>

      {/* Banner-specific pity with 50/50 terminology */}
      {banner && (
        <BannerPitySection>
          <SectionTitle>
            {t('pity.featuredCharacterPity', 'Featured Character Pity')}
            <IsolatedBadge>{t('pity.thisBannerOnly', 'This Banner Only')}</IsolatedBadge>
          </SectionTitle>

          {/* 50/50 Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <FiftyFiftyBadge $guaranteed={banner.guaranteedFeatured}>
              {banner.guaranteedFeatured ? (
                <>
                  <span>✓</span>
                  {t('pity.guaranteedFeatured', 'GUARANTEED Featured')}
                </>
              ) : (
                <>
                  <span>50/50</span>
                  {t('pity.fiftyFiftyChance', '50/50 Chance')}
                </>
              )}
            </FiftyFiftyBadge>
          </div>

          {banner.guaranteedFeatured ? (
            <GuaranteedMessage
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <GuaranteedLabel>
                {t('pity.nextFiveStarGuaranteed', 'Next 5-star is GUARANTEED to be the featured character!')}
              </GuaranteedLabel>
            </GuaranteedMessage>
          ) : (
            <PityInfo style={{ justifyContent: 'center', color: '#888' }}>
              {banner.message || t('pity.fiftyFiftyMessage', 'Next 5-star has 50/50 chance to be featured (guaranteed after loss)')}
            </PityInfo>
          )}
          <InfoTooltip>
            {t('pity.bannerPityInfo', 'This progress is specific to this banner. If you pull a non-featured 5-star, your next 5-star on this banner is guaranteed to be featured.')}
          </InfoTooltip>
        </BannerPitySection>
      )}

      {/* Cascading Reset Notification - shows when a pull result has reset info */}
      {pullResult?.cascadingResets && pullResult.cascadingResets.length > 0 && (
        <CascadingResetNotice
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <strong>{pullResult.resetMessage || t('pity.pityReset', 'Pity counters reset!')}</strong>
          <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
            {pullResult.cascadingResets.map((reset, idx) => (
              <div key={idx}>{reset.message}</div>
            ))}
          </div>
        </CascadingResetNotice>
      )}

      {/* Near guarantee message */}
      {standard.untilGuaranteed.legendary <= 10 && standard.untilGuaranteed.legendary > 0 && (
        <GuaranteedMessage
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span style={{ color: '#ffc107' }}>
            {t('pity.nearGuarantee', { pulls: standard.untilGuaranteed.legendary }) ||
              `Only ${standard.untilGuaranteed.legendary} pulls away from guaranteed Legendary!`}
          </span>
        </GuaranteedMessage>
      )}
    </Container>
  );
}

export default PityDisplay;
