/**
 * GachaPage Styled Components
 *
 * Extracted from GachaPage.js for better maintainability and reusability.
 * Uses design-system tokens for consistency.
 *
 * Updated with:
 * - Improved visual hierarchy
 * - Better typography scale
 * - Softer shadows
 * - Enhanced transitions
 */

import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme, PageWrapper } from '../design-system';

// ==================== ANIMATIONS ====================

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// ==================== PAGE WRAPPER ====================

export const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

// ==================== HERO SECTION ====================

export const HeroSection = styled.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg} 0 ${theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
`;

export const HeroContent = styled.div``;

export const LogoText = styled.h1`
  font-size: clamp(${theme.fontSizes.xl}, 5vw, ${theme.fontSizes['2xl']});
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  letter-spacing: ${theme.letterSpacing.snug};
  line-height: ${theme.lineHeights.tight};
  color: ${theme.colors.text};
`;

export const HeroSubtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textTertiary};
  margin: ${theme.spacing.xs} 0 0;
  line-height: ${theme.lineHeights.normal};
`;

export const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const PointsPill = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 10px 18px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  box-shadow: ${theme.shadows.sm};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut};

  svg {
    color: ${theme.colors.featured};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.glassHover};
      border-color: ${theme.colors.glassBorder};
    }
  }
`;

// ==================== BANNERS SECTION ====================

export const BannersSection = styled.section`
  margin-bottom: ${theme.spacing['2xl']};
`;

// ==================== HERO BANNER ====================

export const HeroBanner = styled(motion.div)`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 480px;
  border-radius: ${theme.radius['2xl']};
  overflow: hidden;
  cursor: pointer;
  box-shadow: ${theme.shadows.lg};

  @media (max-width: ${theme.breakpoints.md}) {
    aspect-ratio: 4 / 3;
    max-height: 380px;
    border-radius: ${theme.radius.xl};
  }
`;

export const HeroBannerImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.timing.slower} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    ${HeroBanner}:hover & {
      transform: scale(1.02);
    }
  }
`;

export const HeroBannerOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.6) 35%,
    rgba(0, 0, 0, 0.15) 100%
  );
`;

export const HeroBannerContent = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  top: 0;
  padding: ${theme.spacing['2xl']};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  max-width: 520px;
  z-index: 2;

  @media (max-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.lg};
    max-width: 100%;
  }
`;

export const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, ${theme.colors.featured}, ${theme.colors.error});
  padding: 8px 14px;
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: ${theme.letterSpacing.widest};
  width: fit-content;
  margin-bottom: ${theme.spacing.md};
  box-shadow: ${theme.shadows.sm};
`;

export const HeroTitle = styled.h2`
  font-size: clamp(${theme.fontSizes.xl}, 5vw, ${theme.fontSizes['3xl']});
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.sm};
  letter-spacing: ${theme.letterSpacing.snug};
  line-height: ${theme.lineHeights.tight};
  color: white;
`;

export const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
`;

export const HeroSeries = styled.span`
  color: ${theme.colors.accent};
  font-weight: ${theme.fontWeights.semibold};
`;

export const HeroDivider = styled.span`
  color: ${theme.colors.textMuted};
`;

export const HeroStats = styled.span`
  color: ${theme.colors.textSecondary};
`;

export const HeroDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 ${theme.spacing.lg};
  line-height: ${theme.lineHeights.normal};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const HeroCTA = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: white;
  color: ${theme.colors.background};
  border: none;
  padding: 14px 28px;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  width: fit-content;
  box-shadow: ${theme.shadows.md};
  transition:
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: ${theme.shadows.lg};
      transform: translateY(-2px);
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${theme.shadows.sm};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing},
      ${theme.shadows.lg};
  }
`;

export const HeroGradient = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 140px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  pointer-events: none;
`;

export const FeaturedNavArrow = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.$left ? 'left: 16px;' : 'right: 16px;'}
  width: 48px;
  height: 48px;
  border-radius: ${theme.radius.full};
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  font-size: 24px;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring},
    border-color ${theme.timing.fast} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-50%) scale(1.08);
    }
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
  }

  @media (max-width: ${theme.breakpoints.md}) {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
`;

export const FeaturedIndicators = styled.div`
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  gap: ${theme.spacing.sm};
  z-index: 10;

  @media (max-width: ${theme.breakpoints.md}) {
    bottom: 16px;
    right: 16px;
  }
`;

export const FeaturedDot = styled.button`
  width: ${props => props.$active ? '28px' : '10px'};
  height: 10px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.4)'};
  border: none;
  cursor: pointer;
  transition:
    width ${theme.timing.normal} ${theme.easing.appleSpring},
    background ${theme.timing.fast} ${theme.easing.easeOut};
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
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
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
  margin-bottom: ${theme.spacing.lg};
`;

export const CarouselTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  letter-spacing: ${theme.letterSpacing.snug};
  margin: 0;
  color: ${theme.colors.text};
`;

export const CarouselNav = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

export const NavButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  font-size: 20px;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.glassHover};
      border-color: ${theme.colors.glassBorder};
    }
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const BannerCarousel = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: ${theme.spacing.sm} 0 ${theme.spacing.lg};
  margin: 0 -${theme.spacing.sm};
  padding-left: ${theme.spacing.sm};
  padding-right: ${theme.spacing.sm};

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

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 260px;
  }
`;

export const NetflixCardInner = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  box-shadow: ${theme.shadows.card};
  transition:
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    ${NetflixBannerCard}:hover & {
      box-shadow: ${theme.shadows.cardHover};
      border-color: ${theme.colors.surfaceBorder};
    }
  }

  ${NetflixBannerCard}:focus-visible & {
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing},
      ${theme.shadows.cardHover};
  }
`;

export const NetflixImageContainer = styled.div`
  position: relative;
  height: 180px;
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

export const NetflixBannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.timing.slow} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    ${NetflixBannerCard}:hover & {
      transform: scale(1.06);
    }
  }
`;

export const NetflixImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    ${theme.colors.surfaceSolid} 0%,
    transparent 60%
  );
`;

export const NetflixCardInfo = styled.div`
  padding: ${theme.spacing.md};
`;

export const NetflixCardTitle = styled.h4`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  margin: 0 0 ${theme.spacing.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${theme.colors.text};
`;

export const NetflixCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.md};
`;

export const NetflixSeries = styled.span`
  color: ${theme.colors.accent};
  font-weight: ${theme.fontWeights.medium};
`;

export const NetflixCharCount = styled.span`
  color: ${theme.colors.textTertiary};
`;

export const NetflixCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const NetflixCost = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
`;

export const NetflixBoost = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.success};
  background: ${theme.colors.successMuted};
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
  letter-spacing: ${theme.letterSpacing.wide};
`;

// Shimmer effect for featured cards
export const NetflixFeaturedBadge = styled.span`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  padding: 4px 10px;
  background: linear-gradient(135deg, ${theme.colors.featured}, ${theme.colors.warning});
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: ${theme.letterSpacing.wider};
  color: white;
  z-index: 2;
  box-shadow: ${theme.shadows.sm};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 30%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 70%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 2.5s ease-in-out infinite;
    border-radius: inherit;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
`;

// ==================== STANDARD GACHA CTA ====================

export const StandardGachaCTA = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.xl};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  margin-top: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.card};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    text-align: center;
    padding: ${theme.spacing.lg};
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
  line-height: 1;
`;

export const CTAText = styled.div``;

export const CTATitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 4px;
  color: ${theme.colors.text};
`;

export const CTASubtitle = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: ${theme.lineHeights.normal};
`;

export const CTAButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 14px 28px;
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  white-space: nowrap;
  box-shadow: ${theme.shadows.buttonPrimary};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.primaryHover};
      box-shadow: ${theme.shadows.buttonPrimaryHover};
      transform: translateY(-2px);
    }
  }

  &:active {
    transform: translateY(0);
    background: ${theme.colors.primaryActive};
    box-shadow: ${theme.shadows.buttonPressed};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing},
      ${theme.shadows.buttonPrimaryHover};
  }
`;

// ==================== HELP MODAL ====================

export const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const HelpSectionTitle = styled.h3`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.sm};
  color: ${theme.colors.text};
`;

export const HelpText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: ${theme.lineHeights.relaxed};
`;
