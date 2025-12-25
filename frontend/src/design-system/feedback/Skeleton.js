/**
 * Skeleton - Loading placeholder components
 *
 * Provides visual placeholders that match content layout to reduce
 * layout shift and improve perceived performance.
 *
 * Enhanced with:
 * - Smoother shimmer animation
 * - Character card skeleton matching actual layout
 * - Better aspect ratios
 * - Animation delay for stagger effect
 *
 * @example
 * // Basic skeleton
 * <Skeleton width="200px" height="20px" />
 *
 * // Card skeleton
 * <SkeletonCard />
 *
 * // Text skeleton
 * <SkeletonText lines={3} />
 *
 * // Avatar skeleton
 * <SkeletonAvatar size="lg" />
 *
 * // Character card skeleton
 * <SkeletonCharacterCard />
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { theme } from '../tokens';

// Smoother shimmer animation
const shimmer = keyframes`
  0% {
    background-position: -300px 0;
  }
  100% {
    background-position: calc(300px + 100%) 0;
  }
`;

// Pulse animation for reduced motion users
const pulse = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
`;

const skeletonBase = css`
  background-color: rgba(255, 255, 255, 0.04);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.08) 40%,
    rgba(255, 255, 255, 0.08) 60%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 300px 100%;
  background-repeat: no-repeat;
  border-radius: ${theme.radius.md};
  animation: ${shimmer} 1.8s ease-in-out infinite;
  animation-delay: ${props => props.$delay || '0ms'};

  @media (prefers-reduced-motion: reduce) {
    animation: ${pulse} 2s ease-in-out infinite;
    background-image: none;
  }
`;

/**
 * Base Skeleton component
 */
export const Skeleton = styled.div`
  ${skeletonBase}
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$radius || theme.radius.md};
`;

/**
 * Circle skeleton (for avatars)
 */
const circleSizes = {
  xs: '24px',
  sm: '32px',
  md: '48px',
  lg: '64px',
  xl: '96px',
};

export const SkeletonAvatar = styled.div`
  ${skeletonBase}
  width: ${props => circleSizes[props.$size] || circleSizes.md};
  height: ${props => circleSizes[props.$size] || circleSizes.md};
  border-radius: ${theme.radius.full};
  flex-shrink: 0;
`;

/**
 * Text skeleton with multiple lines
 */
const SkeletonTextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  width: 100%;
`;

const SkeletonLine = styled.div`
  ${skeletonBase}
  height: ${props => props.$height || '16px'};
  width: ${props => props.$width || '100%'};
`;

export const SkeletonText = ({ lines = 3, lastLineWidth = '60%' }) => (
  <SkeletonTextWrapper>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLine
        key={index}
        $width={index === lines - 1 ? lastLineWidth : '100%'}
        $delay={`${index * 100}ms`}
      />
    ))}
  </SkeletonTextWrapper>
);

/**
 * Character Card skeleton - matches CharacterCard layout exactly
 */
const SkeletonCharacterWrapper = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  width: 100%;
`;

const SkeletonCharacterImage = styled.div`
  ${skeletonBase}
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SkeletonCharacterContent = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const SkeletonCharacterCard = ({ delay = 0 }) => (
  <SkeletonCharacterWrapper>
    <SkeletonCharacterImage $delay={`${delay}ms`} />
    <SkeletonCharacterContent>
      <Skeleton $height="16px" $width="75%" $delay={`${delay + 50}ms`} />
      <Skeleton $height="12px" $width="55%" $delay={`${delay + 100}ms`} />
    </SkeletonCharacterContent>
  </SkeletonCharacterWrapper>
);

/**
 * Card skeleton - generic card layout
 */
const SkeletonCardWrapper = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  width: 100%;
`;

const SkeletonCardImage = styled.div`
  ${skeletonBase}
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 0;
`;

const SkeletonCardContent = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const SkeletonCard = () => (
  <SkeletonCardWrapper>
    <SkeletonCardImage />
    <SkeletonCardContent>
      <Skeleton $height="18px" $width="70%" />
      <Skeleton $height="14px" $width="50%" $delay="50ms" />
    </SkeletonCardContent>
  </SkeletonCardWrapper>
);

/**
 * Banner skeleton - matches NetflixBannerCard layout
 */
const SkeletonBannerWrapper = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.md};
  overflow: hidden;
  width: 300px;
  flex-shrink: 0;
`;

const SkeletonBannerImage = styled.div`
  ${skeletonBase}
  width: 100%;
  height: 180px;
  border-radius: 0;
`;

const SkeletonBannerContent = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const SkeletonBannerFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${theme.spacing.sm};
`;

export const SkeletonBanner = ({ delay = 0 }) => (
  <SkeletonBannerWrapper>
    <SkeletonBannerImage $delay={`${delay}ms`} />
    <SkeletonBannerContent>
      <Skeleton $height="18px" $width="85%" $delay={`${delay + 50}ms`} />
      <Skeleton $height="14px" $width="60%" $delay={`${delay + 100}ms`} />
      <SkeletonBannerFooter>
        <Skeleton $height="14px" $width="80px" $delay={`${delay + 150}ms`} />
        <Skeleton $height="24px" $width="60px" $radius={theme.radius.sm} $delay={`${delay + 200}ms`} />
      </SkeletonBannerFooter>
    </SkeletonBannerContent>
  </SkeletonBannerWrapper>
);

/**
 * Hero skeleton - matches hero banner layout
 */
const SkeletonHeroWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 450px;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);

  @media (max-width: ${theme.breakpoints.md}) {
    aspect-ratio: 4 / 3;
    max-height: 360px;
  }
`;

const SkeletonHeroGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 40%,
    transparent 100%
  );
`;

const SkeletonHeroOverlay = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  top: 0;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  max-width: 500px;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    padding: 24px;
  }
`;

export const SkeletonHero = () => (
  <SkeletonHeroWrapper>
    <SkeletonHeroGradient />
    <SkeletonHeroOverlay>
      <Skeleton $height="28px" $width="140px" $radius={theme.radius.sm} />
      <Skeleton $height="42px" $width="320px" $delay="50ms" />
      <Skeleton $height="16px" $width="220px" $delay="100ms" />
      <Skeleton $height="20px" $width="180px" $delay="150ms" />
      <Skeleton $height="52px" $width="200px" $radius={theme.radius.md} $delay="200ms" />
    </SkeletonHeroOverlay>
  </SkeletonHeroWrapper>
);

/**
 * Table row skeleton
 */
const SkeletonRowWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.surfaceBorderSubtle};
`;

export const SkeletonRow = ({ columns = 4, delay = 0 }) => (
  <SkeletonRowWrapper>
    {Array.from({ length: columns }).map((_, index) => (
      <Skeleton
        key={index}
        $height="16px"
        $width={index === 0 ? '40%' : '20%'}
        $delay={`${delay + index * 50}ms`}
      />
    ))}
  </SkeletonRowWrapper>
);

/**
 * Grid of skeleton character cards
 */
const SkeletonGridWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
`;

export const SkeletonCharacterGrid = ({ count = 8 }) => (
  <SkeletonGridWrapper>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCharacterCard key={index} delay={index * 50} />
    ))}
  </SkeletonGridWrapper>
);

/**
 * Grid of skeleton cards (generic)
 */
export const SkeletonGrid = ({ count = 6 }) => (
  <SkeletonGridWrapper>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </SkeletonGridWrapper>
);

/**
 * Carousel of skeleton banners
 */
const SkeletonCarouselWrapper = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  overflow: hidden;
  padding: ${theme.spacing.sm} 0;
`;

export const SkeletonBannerCarousel = ({ count = 4 }) => (
  <SkeletonCarouselWrapper>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonBanner key={index} delay={index * 80} />
    ))}
  </SkeletonCarouselWrapper>
);

/**
 * Stats skeleton - matches collection stats
 */
const SkeletonStatsWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.lg};
`;

const SkeletonStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const SkeletonStats = () => (
  <SkeletonStatsWrapper>
    {Array.from({ length: 3 }).map((_, index) => (
      <SkeletonStatItem key={index}>
        <Skeleton $height="32px" $width="64px" $delay={`${index * 100}ms`} />
        <Skeleton $height="14px" $width="80px" $delay={`${index * 100 + 50}ms`} />
      </SkeletonStatItem>
    ))}
  </SkeletonStatsWrapper>
);

/**
 * Progress bar skeleton
 */
const SkeletonProgressWrapper = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const SkeletonProgressFill = styled.div`
  ${skeletonBase}
  width: 60%;
  height: 100%;
  border-radius: ${theme.radius.full};
`;

export const SkeletonProgress = () => (
  <SkeletonProgressWrapper>
    <SkeletonProgressFill />
  </SkeletonProgressWrapper>
);

/**
 * Search/filter bar skeleton
 */
const SkeletonControlsWrapper = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;
  margin-bottom: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const SkeletonControls = () => (
  <SkeletonControlsWrapper>
    <Skeleton $height="44px" $width="100%" $radius={theme.radius.lg} style={{ maxWidth: '320px' }} />
    <Skeleton $height="44px" $width="120px" $radius={theme.radius.lg} $delay="50ms" />
    <Skeleton $height="44px" $width="100px" $radius={theme.radius.lg} $delay="100ms" />
  </SkeletonControlsWrapper>
);

/**
 * Button skeleton
 */
export const SkeletonButton = styled.div`
  ${skeletonBase}
  height: ${props => props.$size === 'sm' ? '36px' : props.$size === 'lg' ? '52px' : '44px'};
  width: ${props => props.$width || '120px'};
  border-radius: ${theme.radius.lg};
`;

/**
 * Input skeleton
 */
export const SkeletonInput = styled.div`
  ${skeletonBase}
  height: 44px;
  width: 100%;
  border-radius: ${theme.radius.md};
`;

/**
 * Badge/chip skeleton
 */
export const SkeletonBadge = styled.div`
  ${skeletonBase}
  height: 24px;
  width: ${props => props.$width || '60px'};
  border-radius: ${theme.radius.full};
`;

export default Skeleton;
