/**
 * HeroBanner - Featured banner display component
 *
 * Large hero-style banner with image, overlay, and call-to-action.
 * Used for featured content on the Gacha page.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaStar, FaPlay } from 'react-icons/fa';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { theme } from '../../design-system';

const BannerContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;

  @media (max-width: ${theme.breakpoints.md}) {
    height: 320px;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const BannerImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const BannerOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 40%,
    rgba(0, 0, 0, 0.2) 100%
  );
`;

const BannerContent = styled.div`
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

const FeaturedBadge = styled.div`
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

const BannerTitle = styled.h2`
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const BannerMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const BannerSeries = styled.span`
  color: #ff6b6b;
  font-weight: 600;
`;

const MetaDivider = styled.span`
  color: rgba(255, 255, 255, 0.3);
`;

const BannerStats = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const BannerDescription = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 20px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CTAButton = styled(motion.button)`
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

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const BottomGradient = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  pointer-events: none;
`;

const NavArrow = styled.button`
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

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: translateY(-50%) scale(1.1);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.md}) {
    width: 40px;
    height: 40px;
    font-size: 24px;
  }
`;

const Indicators = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 10;
`;

const IndicatorDot = styled.button`
  width: ${props => props.$active ? '24px' : '10px'};
  height: 10px;
  border-radius: 5px;
  background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.4)'};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.6)'};
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

/**
 * HeroBanner Component
 *
 * @param {Object} props
 * @param {Object} props.banner - Banner data object
 * @param {string} props.imageSrc - Banner image URL
 * @param {string} props.featuredLabel - Label for featured badge
 * @param {string} props.ctaLabel - Label for CTA button
 * @param {string} props.ctaPrice - Price text for CTA
 * @param {string} props.charactersLabel - Label for character count
 * @param {Function} props.onClick - Click handler for banner
 * @param {Function} props.onCTAClick - Click handler for CTA button
 * @param {boolean} props.showNavigation - Whether to show navigation arrows
 * @param {number} props.totalItems - Total number of banners
 * @param {number} props.currentIndex - Current banner index
 * @param {Function} props.onPrevious - Previous arrow click handler
 * @param {Function} props.onNext - Next arrow click handler
 * @param {Function} props.onDotClick - Dot indicator click handler
 */
const HeroBanner = ({
  banner,
  imageSrc,
  featuredLabel = 'Featured Event',
  ctaLabel = 'Roll Now',
  ctaPrice,
  charactersLabel = 'characters',
  onClick,
  onCTAClick,
  showNavigation = false,
  totalItems = 1,
  currentIndex = 0,
  onPrevious,
  onNext,
  onDotClick,
}) => {
  const handleCTAClick = (e) => {
    e.stopPropagation();
    onCTAClick?.();
  };

  return (
    <BannerContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${banner.name} - ${banner.series}`}
    >
      <BannerImage src={imageSrc} alt={banner.name} loading="lazy" />
      <BannerOverlay />
      <BannerContent>
        <FeaturedBadge>
          <FaStar /> {featuredLabel}
        </FeaturedBadge>
        <BannerTitle>{banner.name}</BannerTitle>
        <BannerMeta>
          <BannerSeries>{banner.series}</BannerSeries>
          <MetaDivider>•</MetaDivider>
          <BannerStats>{banner.Characters?.length || 0} {charactersLabel}</BannerStats>
        </BannerMeta>
        {banner.description && (
          <BannerDescription>{banner.description}</BannerDescription>
        )}
        <CTAButton
          onClick={handleCTAClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FaPlay style={{ fontSize: '12px' }} />
          {ctaLabel}
          {ctaPrice && (
            <span style={{ opacity: 0.7, marginLeft: 'auto' }}>{ctaPrice}</span>
          )}
        </CTAButton>
      </BannerContent>
      <BottomGradient />

      {showNavigation && totalItems > 1 && (
        <>
          <NavArrow
            $left
            onClick={(e) => { e.stopPropagation(); onPrevious?.(); }}
            aria-label="Previous banner"
          >
            <MdChevronLeft />
          </NavArrow>
          <NavArrow
            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            aria-label="Next banner"
          >
            <MdChevronRight />
          </NavArrow>
          <Indicators>
            {Array.from({ length: totalItems }).map((_, idx) => (
              <IndicatorDot
                key={idx}
                $active={idx === currentIndex}
                onClick={(e) => { e.stopPropagation(); onDotClick?.(idx); }}
                aria-label={`Go to banner ${idx + 1}`}
                aria-current={idx === currentIndex ? 'true' : undefined}
              />
            ))}
          </Indicators>
        </>
      )}
    </BannerContainer>
  );
};

export default HeroBanner;
