import React, { useState, useContext, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose, MdHelpOutline, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { FaStar, FaPlay } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// API & Context
import { getActiveBanners, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Design System
import {
  Container,
  Heading2,
  Text,
  IconButton,
  ModalOverlay,
  ModalHeader,
  ModalBody,
  Spinner,
  motionVariants
} from '../styles/DesignSystem';

// Extracted styles
import {
  StyledPageWrapper,
  LoadingContainer,
  LoadingText,
  HeroSection,
  HeroContent,
  LogoText,
  HeroSubtitle,
  HeaderControls,
  PointsPill,
  BannersSection,
  HeroBanner,
  HeroBannerImage,
  HeroBannerOverlay,
  HeroBannerContent,
  HeroBadge,
  HeroTitle,
  HeroMeta,
  HeroSeries,
  HeroDivider,
  HeroStats,
  HeroDescription,
  HeroCTA,
  HeroGradient,
  FeaturedNavArrow,
  FeaturedIndicators,
  FeaturedDot,
  BannerCarouselSection,
  CarouselHeader,
  CarouselTitle,
  CarouselNav,
  NavButton,
  BannerCarousel,
  NetflixBannerCard,
  NetflixCardInner,
  NetflixImageContainer,
  NetflixBannerImage,
  NetflixImageOverlay,
  NetflixCardInfo,
  NetflixCardTitle,
  NetflixCardMeta,
  NetflixSeries,
  NetflixCharCount,
  NetflixCardFooter,
  NetflixCost,
  NetflixBoost,
  StandardGachaCTA,
  CTAContent,
  CTAIcon,
  CTAText,
  CTATitle,
  CTASubtitle,
  CTAButton,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  EmptyText,
  EmptyButton,
  HelpModalContent,
  HelpSection,
  HelpSectionTitle,
} from './GachaPage.styles';

// ==================== MAIN COMPONENT ====================

const GachaPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // State
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const data = await getActiveBanners();
        setBanners(data);
      } catch (err) {
        console.error("Error fetching banners:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const getBannerImage = (src) => src ? getAssetUrl(src) : 'https://via.placeholder.com/300x150?text=Banner';

  // Get featured banners for hero carousel
  const featuredBanners = banners.filter(b => b.featured);
  const otherBanners = banners.filter(b => !b.featured);

  // Ensure index stays in bounds
  const safeFeaturedIndex = featuredBanners.length > 0
    ? Math.min(featuredIndex, featuredBanners.length - 1)
    : 0;
  const currentFeaturedBanner = featuredBanners[safeFeaturedIndex];

  // Featured banner navigation
  const handlePrevFeatured = (e) => {
    e.stopPropagation();
    setFeaturedIndex(prev => (prev > 0 ? prev - 1 : featuredBanners.length - 1));
  };

  const handleNextFeatured = (e) => {
    e.stopPropagation();
    setFeaturedIndex(prev => (prev < featuredBanners.length - 1 ? prev + 1 : 0));
  };

  // Carousel scroll handlers
  const handleCarouselScroll = (direction) => {
    const el = document.getElementById('banner-carousel');
    if (el) {
      el.scrollBy({ left: direction * 340, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="48px" />
        <LoadingText>{t('gacha.loadingBanners')}</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <StyledPageWrapper>
      <Container>
        {/* Hero Section */}
        <HeroSection>
          <HeroContent>
            <LogoText>
              {t('gacha.title')}
            </LogoText>
            <HeroSubtitle>{t('gacha.subtitle')}</HeroSubtitle>
          </HeroContent>
          <HeaderControls>
            <PointsPill>
              <span>🪙</span>
              <span>{user?.points || 0}</span>
            </PointsPill>
            <IconButton
              onClick={() => setShowHelpModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={t('common.openHelp') || 'Open help'}
            >
              <MdHelpOutline />
            </IconButton>
          </HeaderControls>
        </HeroSection>

        {/* Featured Banner Hero */}
        {currentFeaturedBanner && (
          <BannersSection>
            <HeroBanner
              key={currentFeaturedBanner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate(`/banner/${currentFeaturedBanner.id}`)}
            >
              <HeroBannerImage src={getBannerImage(currentFeaturedBanner.image)} alt={currentFeaturedBanner.name} />
              <HeroBannerOverlay />
              <HeroBannerContent>
                <HeroBadge>
                  <FaStar /> {t('gacha.featuredEvent')}
                </HeroBadge>
                <HeroTitle>{currentFeaturedBanner.name}</HeroTitle>
                <HeroMeta>
                  <HeroSeries>{currentFeaturedBanner.series}</HeroSeries>
                  <HeroDivider>•</HeroDivider>
                  <HeroStats>{currentFeaturedBanner.Characters?.length || 0} {t('gacha.characters')}</HeroStats>
                </HeroMeta>
                {currentFeaturedBanner.description && (
                  <HeroDescription>{currentFeaturedBanner.description}</HeroDescription>
                )}
                <HeroCTA
                  onClick={(e) => { e.stopPropagation(); navigate(`/banner/${currentFeaturedBanner.id}`); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaPlay style={{ fontSize: '12px' }} />
                  {t('gacha.rollNow')}
                  <span style={{ opacity: 0.7, marginLeft: 'auto' }}>
                    {Math.floor(100 * (currentFeaturedBanner.costMultiplier || 1.5))} {t('common.points')}
                  </span>
                </HeroCTA>
              </HeroBannerContent>
              <HeroGradient />

              {/* Navigation Arrows for multiple featured banners */}
              {featuredBanners.length > 1 && (
                <>
                  <FeaturedNavArrow
                    $left
                    onClick={handlePrevFeatured}
                    aria-label={t('common.previous') || 'Previous banner'}
                  >
                    <MdChevronLeft />
                  </FeaturedNavArrow>
                  <FeaturedNavArrow
                    onClick={handleNextFeatured}
                    aria-label={t('common.next') || 'Next banner'}
                  >
                    <MdChevronRight />
                  </FeaturedNavArrow>
                  <FeaturedIndicators>
                    {featuredBanners.map((banner, idx) => (
                      <FeaturedDot
                        key={banner.id}
                        $active={idx === safeFeaturedIndex}
                        onClick={(e) => { e.stopPropagation(); setFeaturedIndex(idx); }}
                        aria-label={`Go to banner ${idx + 1}`}
                      />
                    ))}
                  </FeaturedIndicators>
                </>
              )}
            </HeroBanner>
          </BannersSection>
        )}

        {/* All Banners Carousel */}
        {otherBanners.length > 0 && (
          <BannerCarouselSection>
            <CarouselHeader>
              <CarouselTitle>
                <span>🎬</span>
                {t('gacha.allBanners')}
              </CarouselTitle>
              <CarouselNav>
                <NavButton
                  onClick={() => handleCarouselScroll(-1)}
                  aria-label={t('common.scrollLeft') || 'Scroll left'}
                >
                  <MdChevronLeft />
                </NavButton>
                <NavButton
                  onClick={() => handleCarouselScroll(1)}
                  aria-label={t('common.scrollRight') || 'Scroll right'}
                >
                  <MdChevronRight />
                </NavButton>
              </CarouselNav>
            </CarouselHeader>

            <BannerCarousel id="banner-carousel">
              {otherBanners.map((banner, index) => (
                <NetflixBannerCard
                  key={banner.id}
                  onClick={() => navigate(`/banner/${banner.id}`)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover="hover"
                >
                  <NetflixCardInner variants={{ hover: { scale: 1.05, y: -8 } }}>
                    <NetflixImageContainer>
                      <NetflixBannerImage src={getBannerImage(banner.image)} alt={banner.name} />
                      <NetflixImageOverlay />
                    </NetflixImageContainer>
                    <NetflixCardInfo>
                      <NetflixCardTitle>{banner.name}</NetflixCardTitle>
                      <NetflixCardMeta>
                        <NetflixSeries>{banner.series}</NetflixSeries>
                        <NetflixCharCount>{banner.Characters?.length || 0} {t('gacha.chars')}</NetflixCharCount>
                      </NetflixCardMeta>
                      <NetflixCardFooter>
                        <NetflixCost>
                          🪙 {Math.floor(100 * (banner.costMultiplier || 1.5))} {t('common.points')}
                        </NetflixCost>
                        {banner.rateBoost && (
                          <NetflixBoost>+{Math.round((banner.rateBoost - 1) * 100)}% {t('gacha.boost')}</NetflixBoost>
                        )}
                      </NetflixCardFooter>
                    </NetflixCardInfo>
                  </NetflixCardInner>
                </NetflixBannerCard>
              ))}
            </BannerCarousel>
          </BannerCarouselSection>
        )}

        {/* Standard Gacha CTA */}
        <StandardGachaCTA>
          <CTAContent>
            <CTAIcon>✨</CTAIcon>
            <CTAText>
              <CTATitle>{t('gacha.standardGacha')}</CTATitle>
              <CTASubtitle>{t('gacha.standardGachaDesc')}</CTASubtitle>
            </CTAText>
          </CTAContent>
          <CTAButton
            onClick={() => navigate('/roll')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('gacha.rollNow')}
            <span style={{ opacity: 0.7 }}>100 {t('common.points')}</span>
          </CTAButton>
        </StandardGachaCTA>

        {/* Empty State */}
        {banners.length === 0 && !loading && (
          <EmptyState>
            <EmptyIcon>🎰</EmptyIcon>
            <EmptyTitle>{t('gacha.noActiveBanners')}</EmptyTitle>
            <EmptyText>{t('gacha.checkBackSoon')}</EmptyText>
            <EmptyButton
              onClick={() => navigate('/roll')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t('gacha.tryStandardGacha')}
            </EmptyButton>
          </EmptyState>
        )}
      </Container>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowHelpModal(false); }}
          >
            <HelpModalContent
              variants={motionVariants.modal}
            >
              <ModalHeader>
                <Heading2>{t('gacha.howToPlay')}</Heading2>
                <IconButton
                  onClick={() => setShowHelpModal(false)}
                  aria-label={t('common.close') || 'Close'}
                >
                  <MdClose />
                </IconButton>
              </ModalHeader>
              <ModalBody>
                <HelpSection>
                  <HelpSectionTitle>🎰 {t('nav.banners')}</HelpSectionTitle>
                  <Text secondary>{t('gacha.bannersHelp')}</Text>
                </HelpSection>
                <HelpSection>
                  <HelpSectionTitle>✨ {t('gacha.standardGacha')}</HelpSectionTitle>
                  <Text secondary>{t('gacha.standardGachaHelp')}</Text>
                </HelpSection>
                <HelpSection>
                  <HelpSectionTitle>💰 {t('gacha.pointsTitle')}</HelpSectionTitle>
                  <Text secondary>{t('gacha.pointsHelp')}</Text>
                </HelpSection>
              </ModalBody>
            </HelpModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </StyledPageWrapper>
  );
};

export default GachaPage;
