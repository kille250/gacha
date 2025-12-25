/**
 * BannerInfoPanel - Slide-out info panel
 *
 * Displays banner details, drop rates, and featured characters.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import { FaChevronRight, FaGem, FaDice, FaTrophy, FaStar } from 'react-icons/fa';

import {
  IconButton,
  ModalOverlay,
  Heading2,
  Text,
  motionVariants,
} from '../../../design-system';
import { isVideo } from '../../../utils/mediaUtils';

import {
  InfoPanel,
  InfoPanelHeader,
  InfoPanelContent,
  InfoBlock,
  InfoBlockTitle,
  InfoNote,
  InfoNoteAccent,
  DropRatesContainer,
  DropRateSection,
  DropRateSectionTitle,
  DropRateGrid,
  DropRateItem,
  RarityIcon,
  DropRateLabel,
  DropRateValue,
  PremiumNote,
  PityInfoBox,
  PityInfoTitle,
  PityInfoText,
  FeaturedList,
  FeaturedItem,
  FeaturedThumb,
  FeaturedInfo,
  FeaturedName,
  FeaturedRarity,
  OwnedLabel,
  RollFromPanelBtn,
} from './BannerPage.styles';

const RARITY_ICONS = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />,
};

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

const BannerInfoPanel = ({
  isOpen,
  onClose,
  banner,
  pricing,
  singlePullCost,
  getRarityColor,
  getImagePath,
  isInCollection,
  onCharacterClick,
  onRoll,
  isRolling,
  locked,
  canAfford,
}) => {
  const { t } = useTranslation();

  if (!banner) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          variants={motionVariants.overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <InfoPanel
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-label={`${banner.name} details`}
          >
            <InfoPanelHeader>
              <Heading2>{banner.name}</Heading2>
              <IconButton
                onClick={onClose}
                label="Close info panel"
                aria-label="Close info panel"
              >
                <MdClose />
              </IconButton>
            </InfoPanelHeader>

            <InfoPanelContent>
              {/* About Banner */}
              <InfoBlock>
                <InfoBlockTitle>{t('common.aboutBanner')}</InfoBlockTitle>
                <Text secondary>
                  {banner.description || `${t('banner.specialBanner')} - ${banner.series}.`}
                </Text>
                {banner.endDate && (
                  <InfoNote>
                    {t('common.availableUntil')}: {new Date(banner.endDate).toLocaleDateString()}
                  </InfoNote>
                )}
                <InfoNoteAccent>
                  {t('common.pullCost')}: {singlePullCost} {t('common.points')}
                </InfoNoteAccent>
              </InfoBlock>

              {/* Drop Rates */}
              {pricing?.dropRates && (
                <InfoBlock>
                  <InfoBlockTitle>{t('banner.dropRates') || 'Drop Rates'}</InfoBlockTitle>
                  <DropRatesContainer>
                    {/* Banner Pool */}
                    <DropRateSection>
                      <DropRateSectionTitle>
                        ⭐ {t('banner.bannerRates') || 'Banner Pool'} ({pricing.dropRates.bannerPullChance}%)
                      </DropRateSectionTitle>
                      <DropRateGrid>
                        {RARITY_ORDER.map((rarity) => (
                          <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                            <RarityIcon $color={getRarityColor(rarity)} aria-hidden="true">
                              {RARITY_ICONS[rarity]}
                            </RarityIcon>
                            <DropRateLabel>{rarity}</DropRateLabel>
                            <DropRateValue $color={getRarityColor(rarity)}>
                              {pricing.dropRates.banner[rarity]}%
                            </DropRateValue>
                          </DropRateItem>
                        ))}
                      </DropRateGrid>
                    </DropRateSection>

                    {/* Standard Pool */}
                    <DropRateSection>
                      <DropRateSectionTitle>
                        📦 {t('banner.standardRates') || 'Standard Pool'} ({100 - pricing.dropRates.bannerPullChance}%)
                      </DropRateSectionTitle>
                      <DropRateGrid>
                        {RARITY_ORDER.map((rarity) => (
                          <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                            <RarityIcon $color={getRarityColor(rarity)} aria-hidden="true">
                              {RARITY_ICONS[rarity]}
                            </RarityIcon>
                            <DropRateLabel>{rarity}</DropRateLabel>
                            <DropRateValue $color={getRarityColor(rarity)}>
                              {pricing.dropRates.standard[rarity]}%
                            </DropRateValue>
                          </DropRateItem>
                        ))}
                      </DropRateGrid>
                    </DropRateSection>

                    {/* Premium Ticket */}
                    <DropRateSection $premium>
                      <DropRateSectionTitle>
                        🌟 {t('banner.premiumRates') || 'Premium Ticket'}
                      </DropRateSectionTitle>
                      <DropRateGrid>
                        {['legendary', 'epic', 'rare'].map((rarity) => (
                          <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                            <RarityIcon $color={getRarityColor(rarity)} aria-hidden="true">
                              {RARITY_ICONS[rarity]}
                            </RarityIcon>
                            <DropRateLabel>{rarity}</DropRateLabel>
                            <DropRateValue $color={getRarityColor(rarity)}>
                              {pricing.dropRates.premium[rarity]}%
                            </DropRateValue>
                          </DropRateItem>
                        ))}
                      </DropRateGrid>
                      <PremiumNote>
                        ✨ {t('banner.guaranteedRare') || 'Guaranteed Rare or better!'}
                      </PremiumNote>
                    </DropRateSection>

                    {/* Pity Info */}
                    <PityInfoBox>
                      <PityInfoTitle>
                        🎯 {t('banner.pitySystem') || '10-Pull Pity'}
                      </PityInfoTitle>
                      <PityInfoText>
                        {t('banner.pityDescription') || 'Every 10-pull guarantees at least one Rare or higher character!'}
                      </PityInfoText>
                    </PityInfoBox>
                  </DropRatesContainer>
                </InfoBlock>
              )}

              {/* Featured Characters - sorted by rarity (highest first) */}
              <InfoBlock>
                <InfoBlockTitle>{t('banner.featuredCharacters')}</InfoBlockTitle>
                <FeaturedList role="list">
                  {[...(banner.Characters || [])]
                    .sort((a, b) => {
                      const aIndex = RARITY_ORDER.indexOf(a.rarity?.toLowerCase());
                      const bIndex = RARITY_ORDER.indexOf(b.rarity?.toLowerCase());
                      return aIndex - bIndex; // Lower index = higher rarity
                    })
                    .map((char) => {
                    const owned = isInCollection(char);
                    return (
                      <FeaturedItem
                        key={char.id}
                        onClick={() => onCharacterClick({ ...char, isOwned: owned })}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                        role="listitem"
                        aria-label={`${char.name} - ${char.rarity}${owned ? ' (owned)' : ''}`}
                      >
                        <FeaturedThumb $color={getRarityColor(char.rarity)}>
                          {isVideo(char.image) ? (
                            <video
                              src={getImagePath(char.image)}
                              autoPlay
                              loop
                              muted
                              playsInline
                              aria-hidden="true"
                            />
                          ) : (
                            <img
                              src={getImagePath(char.image)}
                              alt={char.name}
                            />
                          )}
                        </FeaturedThumb>
                        <FeaturedInfo>
                          <FeaturedName>{char.name}</FeaturedName>
                          <FeaturedRarity $color={getRarityColor(char.rarity)}>
                            {RARITY_ICONS[char.rarity]} {char.rarity}
                          </FeaturedRarity>
                          {owned && (
                            <OwnedLabel>
                              ✓ {t('common.owned')}
                            </OwnedLabel>
                          )}
                        </FeaturedInfo>
                        <FaChevronRight
                          style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
                          aria-hidden="true"
                        />
                      </FeaturedItem>
                    );
                  })}
                </FeaturedList>
              </InfoBlock>

              {/* Roll from Panel */}
              <RollFromPanelBtn
                onClick={() => {
                  onClose();
                  setTimeout(() => onRoll(false), 300);
                }}
                disabled={isRolling || locked || !canAfford}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={t('common.rollNow')}
              >
                {t('common.rollNow')}
              </RollFromPanelBtn>
            </InfoPanelContent>
          </InfoPanel>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default BannerInfoPanel;
