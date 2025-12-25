import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { MdHelpOutline, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { FaStar, FaPlay } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// API & Context
import { getActiveBanners, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Hooks
import { usePageError } from '../hooks';

// Components
import { OnboardingModal, hasCompletedOnboarding } from '../components/Onboarding';

// Constants
import { IconPoints, IconSparkle, IconGacha } from '../constants/icons';

// Design System - consolidated imports
import {
  Container,
  IconButton,
  Text,
  LoadingState,
  ErrorState,
  EmptyState,
  Modal,
} from '../design-system';

// Extracted styles
import {
  StyledPageWrapper,
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
  HelpSection,
  HelpSectionTitle,
} from './GachaPage.styles';

// ==================== MAIN COMPONENT ====================

const GachaPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const carouselRef = useRef(null);

  // State
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding for first-time users after initial load
  useEffect(() => {
    if (!loading && !hasCompletedOnboarding()) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Error handling
  const { error, handleError, clearError } = usePageError({
    defaultMessage: t('gacha.loadingError') || 'Failed to load banners. Please try again.'
  });

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        clearError();
        const data = await getActiveBanners();
        setBanners(data);
      } catch (err) {
        handleError(err, { inline: true, toast: true });
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, [clearError, handleError]);

  const getBannerImage = useCallback((src) => {
    return src ? getAssetUrl(src) : 'https://via.placeholder.com/300x150?text=Banner';
  }, []);

  // Get featured banners for hero carousel
  const featuredBanners = banners.filter(b => b.featured);
  const otherBanners = banners.filter(b => !b.featured);

  // Ensure index stays in bounds
  const safeFeaturedIndex = featuredBanners.length > 0
    ? Math.min(featuredIndex, featuredBanners.length - 1)
    : 0;
  const currentFeaturedBanner = featuredBanners[safeFeaturedIndex];

  // Featured banner navigation
  const handlePrevFeatured = useCallback((e) => {
    e.stopPropagation();
    setFeaturedIndex(prev => (prev > 0 ? prev - 1 : featuredBanners.length - 1));
  }, [featuredBanners.length]);

  const handleNextFeatured = useCallback((e) => {
    e.stopPropagation();
    setFeaturedIndex(prev => (prev < featuredBanners.length - 1 ? prev + 1 : 0));
  }, [featuredBanners.length]);

  // Carousel scroll handlers using ref instead of getElementById
  const handleCarouselScroll = useCallback((direction) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 340, behavior: 'smooth' });
    }
  }, []);

  // Keyboard navigation for carousel
  const handleCarouselKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleCarouselScroll(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleCarouselScroll(1);
    }
  }, [handleCarouselScroll]);

  const handleCloseHelp = useCallback(() => {
    setShowHelpModal(false);
  }, []);

  const handleOpenHelp = useCallback(() => {
    setShowHelpModal(true);
  }, []);

  if (loading) {
    return (
      <LoadingState
        message={t('gacha.loadingBanners')}
        fullPage
      />
    );
  }

  // Show error state if loading failed and no banners
  if (error && banners.length === 0) {
    return (
      <ErrorState
        title={t('gacha.loadingErrorTitle') || 'Failed to Load Banners'}
        message={error}
        onRetry={() => window.location.reload()}
        retryLabel={t('common.retry') || 'Retry'}
      />
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
            <PointsPill aria-label={`${user?.points || 0} points`}>
              <IconPoints aria-hidden="true" />
              <span>{user?.points || 0}</span>
            </PointsPill>
            <IconButton
              onClick={handleOpenHelp}
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
          <BannersSection aria-label={t('gacha.featuredBanners') || 'Featured banners'}>
            <HeroBanner
              key={currentFeaturedBanner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate(`/banner/${currentFeaturedBanner.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/banner/${currentFeaturedBanner.id}`);
                }
              }}
              aria-label={`${currentFeaturedBanner.name} - ${t('gacha.featuredEvent')}`}
            >
              <HeroBannerImage src={getBannerImage(currentFeaturedBanner.image)} alt="" />
              <HeroBannerOverlay />
              <HeroBannerContent>
                <HeroBadge>
                  <FaStar aria-hidden="true" /> {t('gacha.featuredEvent')}
                </HeroBadge>
                <HeroTitle>{currentFeaturedBanner.name}</HeroTitle>
                <HeroMeta>
                  <HeroSeries>{currentFeaturedBanner.series}</HeroSeries>
                  <HeroDivider aria-hidden="true">•</HeroDivider>
                  <HeroStats>{currentFeaturedBanner.Characters?.length || 0} {t('gacha.characters')}</HeroStats>
                </HeroMeta>
                {currentFeaturedBanner.description && (
                  <HeroDescription>{currentFeaturedBanner.description}</HeroDescription>
                )}
                <HeroCTA
                  onClick={(e) => { e.stopPropagation(); navigate(`/banner/${currentFeaturedBanner.id}`); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={`${t('gacha.rollNow')} - ${Math.floor(100 * (currentFeaturedBanner.costMultiplier || 1.5))} ${t('common.points')}`}
                >
                  <FaPlay style={{ fontSize: '12px' }} aria-hidden="true" />
                  {t('gacha.rollNow')}
                  <span aria-hidden="true" style={{ opacity: 0.7, marginLeft: 'auto' }}>
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
                    <MdChevronLeft aria-hidden="true" />
                  </FeaturedNavArrow>
                  <FeaturedNavArrow
                    onClick={handleNextFeatured}
                    aria-label={t('common.next') || 'Next banner'}
                  >
                    <MdChevronRight aria-hidden="true" />
                  </FeaturedNavArrow>
                  <FeaturedIndicators role="tablist" aria-label={t('gacha.bannerIndicators') || 'Banner indicators'}>
                    {featuredBanners.map((banner, idx) => (
                      <FeaturedDot
                        key={banner.id}
                        $active={idx === safeFeaturedIndex}
                        onClick={(e) => { e.stopPropagation(); setFeaturedIndex(idx); }}
                        role="tab"
                        aria-selected={idx === safeFeaturedIndex}
                        aria-label={`${banner.name} (${idx + 1} of ${featuredBanners.length})`}
                        tabIndex={idx === safeFeaturedIndex ? 0 : -1}
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
                <FaPlay aria-hidden="true" style={{ fontSize: '0.8em' }} />
                {t('gacha.allBanners')}
              </CarouselTitle>
              <CarouselNav>
                <NavButton
                  onClick={() => handleCarouselScroll(-1)}
                  aria-label={t('common.scrollLeft') || 'Scroll left'}
                >
                  <MdChevronLeft aria-hidden="true" />
                </NavButton>
                <NavButton
                  onClick={() => handleCarouselScroll(1)}
                  aria-label={t('common.scrollRight') || 'Scroll right'}
                >
                  <MdChevronRight aria-hidden="true" />
                </NavButton>
              </CarouselNav>
            </CarouselHeader>

            <BannerCarousel
              ref={carouselRef}
              onKeyDown={handleCarouselKeyDown}
              tabIndex={0}
              role="region"
              aria-label={t('gacha.allBanners') || 'All banners'}
            >
              {otherBanners.map((banner, index) => (
                <NetflixBannerCard
                  key={banner.id}
                  onClick={() => navigate(`/banner/${banner.id}`)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/banner/${banner.id}`);
                    }
                  }}
                  aria-label={`${banner.name} - ${banner.series}`}
                >
                  <NetflixCardInner>
                    <NetflixImageContainer>
                      <NetflixBannerImage src={getBannerImage(banner.image)} alt="" />
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
                          <IconPoints aria-hidden="true" /> {Math.floor(100 * (banner.costMultiplier || 1.5))} {t('common.points')}
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
            <CTAIcon aria-hidden="true"><IconSparkle /></CTAIcon>
            <CTAText>
              <CTATitle>{t('gacha.standardGacha')}</CTATitle>
              <CTASubtitle>{t('gacha.standardGachaDesc')}</CTASubtitle>
            </CTAText>
          </CTAContent>
          <CTAButton
            onClick={() => navigate('/roll')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`${t('gacha.rollNow')} - 100 ${t('common.points')}`}
          >
            {t('gacha.rollNow')}
            <span aria-hidden="true" style={{ opacity: 0.7 }}>100 {t('common.points')}</span>
          </CTAButton>
        </StandardGachaCTA>

        {/* Empty State */}
        {banners.length === 0 && !loading && (
          <EmptyState
            icon={<IconGacha />}
            title={t('gacha.noActiveBanners')}
            description={t('gacha.checkBackSoon')}
            actionLabel={t('gacha.tryStandardGacha')}
            onAction={() => navigate('/roll')}
          />
        )}
      </Container>

      {/* Help Modal - using proper Modal component */}
      <Modal
        isOpen={showHelpModal}
        onClose={handleCloseHelp}
        title={t('gacha.howToPlay')}
        maxWidth="500px"
      >
        <HelpSection>
          <HelpSectionTitle><IconGacha /> {t('nav.banners')}</HelpSectionTitle>
          <Text secondary>{t('gacha.bannersHelp')}</Text>
        </HelpSection>
        <HelpSection>
          <HelpSectionTitle><IconSparkle /> {t('gacha.standardGacha')}</HelpSectionTitle>
          <Text secondary>{t('gacha.standardGachaHelp')}</Text>
        </HelpSection>
        <HelpSection>
          <HelpSectionTitle><IconPoints /> {t('gacha.pointsTitle')}</HelpSectionTitle>
          <Text secondary>{t('gacha.pointsHelp')}</Text>
        </HelpSection>
      </Modal>

      {/* Onboarding Modal for first-time users */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </StyledPageWrapper>
  );
};

export default GachaPage;
