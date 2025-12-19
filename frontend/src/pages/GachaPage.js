import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdHelpOutline, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { FaStar, FaPlay } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// API & Context
import { getActiveBanners, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Design System
import {
  theme,
  PageWrapper,
  Container,
  Heading2,
  Text,
  IconButton,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Spinner,
  motionVariants
} from '../styles/DesignSystem';

// ==================== MAIN COMPONENT ====================

const GachaPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  
  // State
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Effects
  useEffect(() => { refreshUser(); }, [refreshUser]);
  
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
  
  // Get featured banner for hero
  const featuredBanner = banners.find(b => b.featured);
  const otherBanners = banners.filter(b => !b.featured);
  
  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="48px" />
        <LoadingText>Loading banners...</LoadingText>
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
              Gacha<LogoAccent>Master</LogoAccent>
            </LogoText>
            <HeroSubtitle>Discover rare characters. Build your collection.</HeroSubtitle>
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
            >
              <MdHelpOutline />
            </IconButton>
          </HeaderControls>
        </HeroSection>
        
        {/* Featured Banner Hero */}
        {featuredBanner && (
          <BannersSection>
            <HeroBanner
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <HeroBannerImage src={getBannerImage(featuredBanner.image)} alt={featuredBanner.name} />
              <HeroBannerOverlay />
              <HeroBannerContent>
                <HeroBadge>
                  <FaStar /> Featured Event
                </HeroBadge>
                <HeroTitle>{featuredBanner.name}</HeroTitle>
                <HeroMeta>
                  <HeroSeries>{featuredBanner.series}</HeroSeries>
                  <HeroDivider>•</HeroDivider>
                  <HeroStats>{featuredBanner.Characters?.length || 0} Characters</HeroStats>
                </HeroMeta>
                {featuredBanner.description && (
                  <HeroDescription>{featuredBanner.description}</HeroDescription>
                )}
                <HeroCTA
                  onClick={() => navigate(`/banner/${featuredBanner.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaPlay style={{ fontSize: '12px' }} />
                  Roll Now
                  <span style={{ opacity: 0.7, marginLeft: 'auto' }}>
                    {Math.floor(100 * (featuredBanner.costMultiplier || 1.5))} pts
                  </span>
                </HeroCTA>
              </HeroBannerContent>
              <HeroGradient />
            </HeroBanner>
          </BannersSection>
        )}
        
        {/* All Banners Carousel */}
        {otherBanners.length > 0 && (
          <BannerCarouselSection>
            <CarouselHeader>
              <CarouselTitle>
                <span>🎬</span>
                All Banners
              </CarouselTitle>
              <CarouselNav>
                <NavButton onClick={() => {
                  const el = document.getElementById('banner-carousel');
                  if (el) el.scrollBy({ left: -340, behavior: 'smooth' });
                }}>
                  <MdChevronLeft />
                </NavButton>
                <NavButton onClick={() => {
                  const el = document.getElementById('banner-carousel');
                  if (el) el.scrollBy({ left: 340, behavior: 'smooth' });
                }}>
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
                      <NetflixPlayIcon
                        variants={{ hover: { opacity: 1, scale: 1 } }}
                        initial={{ opacity: 0, scale: 0.8 }}
                      >
                        <FaPlay />
                      </NetflixPlayIcon>
                    </NetflixImageContainer>
                    <NetflixCardInfo>
                      <NetflixCardTitle>{banner.name}</NetflixCardTitle>
                      <NetflixCardMeta>
                        <NetflixSeries>{banner.series}</NetflixSeries>
                        <NetflixCharCount>{banner.Characters?.length || 0} chars</NetflixCharCount>
                      </NetflixCardMeta>
                      <NetflixCardFooter>
                        <NetflixCost>
                          🪙 {Math.floor(100 * (banner.costMultiplier || 1.5))} pts
                        </NetflixCost>
                        {banner.rateBoost && (
                          <NetflixBoost>+{Math.round((banner.rateBoost - 1) * 100)}% boost</NetflixBoost>
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
              <CTATitle>Standard Gacha</CTATitle>
              <CTASubtitle>Roll for characters from the entire pool</CTASubtitle>
            </CTAText>
          </CTAContent>
          <CTAButton
            onClick={() => navigate('/roll')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Roll Now
            <span style={{ opacity: 0.7 }}>100 pts</span>
          </CTAButton>
        </StandardGachaCTA>
        
        {/* Empty State */}
        {banners.length === 0 && !loading && (
          <EmptyState>
            <EmptyIcon>🎰</EmptyIcon>
            <EmptyTitle>No Active Banners</EmptyTitle>
            <EmptyText>Check back soon for new events and banners!</EmptyText>
            <EmptyButton
              onClick={() => navigate('/roll')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Try Standard Gacha
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
            onClick={() => setShowHelpModal(false)}
          >
            <HelpModalContent
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <Heading2>How to Play</Heading2>
                <IconButton onClick={() => setShowHelpModal(false)}>
                  <MdClose />
                </IconButton>
              </ModalHeader>
              <ModalBody>
                <HelpSection>
                  <HelpSectionTitle>🎰 Banners</HelpSectionTitle>
                  <Text secondary>Featured banners have boosted rates for specific characters. Click on a banner to roll!</Text>
                </HelpSection>
                <HelpSection>
                  <HelpSectionTitle>✨ Standard Gacha</HelpSectionTitle>
                  <Text secondary>Roll from the entire character pool at 100 points per pull.</Text>
                </HelpSection>
                <HelpSection>
                  <HelpSectionTitle>💰 Points</HelpSectionTitle>
                  <Text secondary>Earn points through daily rewards and coupons. Use them to roll for characters!</Text>
                </HelpSection>
                <HelpSection>
                  <HelpSectionTitle>⭐ Rarity</HelpSectionTitle>
                  <RarityList>
                    <RarityItem color={theme.colors.rarityCommon}>Common - 50%</RarityItem>
                    <RarityItem color={theme.colors.rarityUncommon}>Uncommon - 30%</RarityItem>
                    <RarityItem color={theme.colors.rarityRare}>Rare - 15%</RarityItem>
                    <RarityItem color={theme.colors.rarityEpic}>Epic - 4%</RarityItem>
                    <RarityItem color={theme.colors.rarityLegendary}>Legendary - 1%</RarityItem>
                  </RarityList>
                </HelpSection>
              </ModalBody>
            </HelpModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </StyledPageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

const LoadingText = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.lg};
`;

// Hero Section
const HeroSection = styled.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.xl} 0;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
`;

const HeroContent = styled.div``;

const LogoText = styled.h1`
  font-size: clamp(28px, 5vw, 36px);
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.03em;
`;

const LogoAccent = styled.span`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroSubtitle = styled.p`
  font-size: 15px;
  color: ${theme.colors.textTertiary};
  margin: 6px 0 0;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const PointsPill = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: 100px;
  font-weight: 600;
  font-size: 14px;
`;

// Banners Section
const BannersSection = styled.section`
  margin-bottom: ${theme.spacing['2xl']};
`;

// Hero Banner
const HeroBanner = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: ${theme.breakpoints.md}) {
    height: 320px;
  }
`;

const HeroBannerImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const HeroBannerOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 40%,
    rgba(0, 0, 0, 0.2) 100%
  );
`;

const HeroBannerContent = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  top: 0;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  max-width: 500px;
  z-index: 2;
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: 24px;
    max-width: 100%;
  }
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ff3b5c, #ff1744);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
  margin-bottom: 16px;
`;

const HeroTitle = styled.h2`
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const HeroSeries = styled.span`
  color: #ff6b6b;
  font-weight: 600;
`;

const HeroDivider = styled.span`
  color: rgba(255, 255, 255, 0.3);
`;

const HeroStats = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const HeroDescription = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 20px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const HeroCTA = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.95);
  color: #1a1a2e;
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
  transition: all 0.2s ease;
  
  &:hover {
    background: white;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`;

const HeroGradient = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  pointer-events: none;
`;

// Carousel Section
const BannerCarouselSection = styled.div`
  margin-bottom: ${theme.spacing['2xl']};
`;

const CarouselHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CarouselTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const CarouselNav = styled.div`
  display: flex;
  gap: 8px;
`;

const NavButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 24px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const BannerCarousel = styled.div`
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 10px 0 20px;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

// Netflix-style Banner Card
const NetflixBannerCard = styled(motion.div)`
  flex-shrink: 0;
  width: 300px;
  scroll-snap-align: start;
  cursor: pointer;
`;

const NetflixCardInner = styled(motion.div)`
  background: rgba(30, 30, 40, 0.8);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.3s ease;
  
  ${NetflixBannerCard}:hover & {
    box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
  }
`;

const NetflixImageContainer = styled.div`
  position: relative;
  height: 180px;
  overflow: hidden;
`;

const NetflixBannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  
  ${NetflixBannerCard}:hover & {
    transform: scale(1.05);
  }
`;

const NetflixImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(30, 30, 40, 1) 0%, transparent 50%);
`;

const NetflixPlayIcon = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a2e;
  font-size: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  opacity: 0;
`;

const NetflixCardInfo = styled.div`
  padding: 16px;
`;

const NetflixCardTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NetflixCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 12px;
`;

const NetflixSeries = styled.span`
  color: #ff6b6b;
  font-weight: 500;
`;

const NetflixCharCount = styled.span`
  color: rgba(255, 255, 255, 0.5);
`;

const NetflixCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const NetflixCost = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
`;

const NetflixBoost = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
`;

// Standard Gacha CTA
const StandardGachaCTA = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.xl};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  margin-top: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    text-align: center;
  }
`;

const CTAContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const CTAIcon = styled.div`
  font-size: 40px;
`;

const CTAText = styled.div``;

const CTATitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
`;

const CTASubtitle = styled.p`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const CTAButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  
  &:hover {
    box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
  }
`;

// Empty State
const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.lg};
`;

const EmptyTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm};
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: ${theme.colors.textSecondary};
  margin: 0 0 ${theme.spacing.xl};
`;

const EmptyButton = styled(motion.button)`
  padding: 14px 28px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
`;

// Help Modal
const HelpModalContent = styled(ModalContent)`
  max-width: 500px;
`;

const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const HelpSectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm};
`;

const RarityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RarityItem = styled.div`
  font-size: 14px;
  color: ${props => props.color};
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid ${props => props.color};
`;

export default GachaPage;
