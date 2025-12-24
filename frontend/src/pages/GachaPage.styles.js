/**
 * GachaPage Styled Components
 *
 * Extracted from GachaPage.js for better maintainability and reusability.
 * Uses design-system tokens for consistency.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, PageWrapper } from '../design-system';

// ==================== PAGE WRAPPER ====================

export const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

export const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

export const LoadingText = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.lg};
`;

// ==================== HERO SECTION ====================

export const HeroSection = styled.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.xl} 0;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
`;

export const HeroContent = styled.div``;

export const LogoText = styled.h1`
  font-size: clamp(28px, 5vw, 36px);
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.03em;
`;

export const HeroSubtitle = styled.p`
  font-size: 15px;
  color: ${theme.colors.textTertiary};
  margin: 6px 0 0;
`;

export const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const PointsPill = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: 100px;
  font-weight: 600;
  font-size: 14px;
`;

// ==================== BANNERS SECTION ====================

export const BannersSection = styled.section`
  margin-bottom: ${theme.spacing['2xl']};
`;

// ==================== HERO BANNER ====================

export const HeroBanner = styled(motion.div)`
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

export const HeroBannerImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const HeroBannerOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 40%,
    rgba(0, 0, 0, 0.2) 100%
  );
`;

export const HeroBannerContent = styled.div`
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

export const HeroBadge = styled.div`
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

export const HeroTitle = styled.h2`
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

export const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const HeroSeries = styled.span`
  color: #ff6b6b;
  font-weight: 600;
`;

export const HeroDivider = styled.span`
  color: rgba(255, 255, 255, 0.3);
`;

export const HeroStats = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

export const HeroDescription = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 20px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const HeroCTA = styled(motion.button)`
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: white;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const HeroGradient = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  pointer-events: none;
`;

export const FeaturedNavArrow = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.$left ? 'left: 16px;' : 'right: 16px;'}
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  font-size: 28px;
  transition: all 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: translateY(-50%) scale(1.1);
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.md}) {
    width: 40px;
    height: 40px;
    font-size: 24px;
  }
`;

export const FeaturedIndicators = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 10;
`;

export const FeaturedDot = styled.button`
  width: ${props => props.$active ? '24px' : '10px'};
  height: 10px;
  border-radius: 5px;
  background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.4)'};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  /* Ensure minimum touch target size */
  min-width: 44px;
  min-height: 44px;
  padding: 17px 0;
  margin: -17px 0;
  background-clip: content-box;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.6)'};
    }
    /* Reset padding on desktop where hover is available */
    min-width: unset;
    min-height: unset;
    padding: 0;
    margin: 0;
    background-clip: border-box;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

// ==================== CAROUSEL SECTION ====================

export const BannerCarouselSection = styled.div`
  margin-bottom: ${theme.spacing['2xl']};
`;

export const CarouselHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const CarouselTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

export const CarouselNav = styled.div`
  display: flex;
  gap: 8px;
`;

export const NavButton = styled.button`
  width: 44px;
  height: 44px;
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const BannerCarousel = styled.div`
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

// ==================== NETFLIX-STYLE BANNER CARD ====================

export const NetflixBannerCard = styled(motion.div)`
  flex-shrink: 0;
  width: 300px;
  scroll-snap-align: start;
  cursor: pointer;
`;

export const NetflixCardInner = styled(motion.div)`
  background: rgba(30, 30, 40, 0.8);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.3s ease;

  @media (hover: hover) and (pointer: fine) {
    ${NetflixBannerCard}:hover & {
      box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
    }
  }

  ${NetflixBannerCard}:focus-visible & {
    box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const NetflixImageContainer = styled.div`
  position: relative;
  height: 180px;
  overflow: hidden;
`;

export const NetflixBannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;

  @media (hover: hover) and (pointer: fine) {
    ${NetflixBannerCard}:hover & {
      transform: scale(1.05);
    }
  }
`;

export const NetflixImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(30, 30, 40, 1) 0%, transparent 50%);
`;

export const NetflixCardInfo = styled.div`
  padding: 16px;
`;

export const NetflixCardTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const NetflixCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 12px;
`;

export const NetflixSeries = styled.span`
  color: #ff6b6b;
  font-weight: 500;
`;

export const NetflixCharCount = styled.span`
  color: rgba(255, 255, 255, 0.5);
`;

export const NetflixCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const NetflixCost = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
`;

export const NetflixBoost = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
`;

// ==================== STANDARD GACHA CTA ====================

export const StandardGachaCTA = styled.div`
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

export const CTAContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

export const CTAIcon = styled.div`
  font-size: 40px;
`;

export const CTAText = styled.div``;

export const CTATitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
`;

export const CTASubtitle = styled.p`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const CTAButton = styled(motion.button)`
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

// ==================== EMPTY STATE ====================

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
`;

export const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.lg};
`;

export const EmptyTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm};
`;

export const EmptyText = styled.p`
  font-size: 16px;
  color: ${theme.colors.textSecondary};
  margin: 0 0 ${theme.spacing.xl};
`;

export const EmptyButton = styled(motion.button)`
  padding: 14px 28px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
`;

// ==================== HELP MODAL ====================

export const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const HelpSectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm};
`;
