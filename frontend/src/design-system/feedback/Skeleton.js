/**
 * Skeleton - Loading placeholder components
 *
 * Provides visual placeholders that match content layout to reduce
 * layout shift and improve perceived performance.
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
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { theme } from '../tokens';

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const skeletonBase = css`
  background-color: ${theme.colors.backgroundTertiary};
  background-image: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 0%,
    ${theme.colors.backgroundSecondary} 20%,
    ${theme.colors.backgroundTertiary} 40%,
    ${theme.colors.backgroundTertiary} 100%
  );
  background-size: 200px 100%;
  background-repeat: no-repeat;
  border-radius: ${theme.radius.md};
  animation: ${shimmer} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
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
      />
    ))}
  </SkeletonTextWrapper>
);

/**
 * Card skeleton - matches CharacterCard layout
 */
const SkeletonCardWrapper = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
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
      <Skeleton $height="14px" $width="50%" />
    </SkeletonCardContent>
  </SkeletonCardWrapper>
);

/**
 * Banner skeleton - matches banner card layout
 */
const SkeletonBannerWrapper = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
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

export const SkeletonBanner = () => (
  <SkeletonBannerWrapper>
    <SkeletonBannerImage />
    <SkeletonBannerContent>
      <Skeleton $height="18px" $width="80%" />
      <Skeleton $height="14px" $width="60%" />
      <Skeleton $height="14px" $width="40%" />
    </SkeletonBannerContent>
  </SkeletonBannerWrapper>
);

/**
 * Hero skeleton - matches hero banner layout
 */
const SkeletonHeroWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 24px;
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};

  @media (max-width: ${theme.breakpoints.md}) {
    height: 320px;
  }
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
    <SkeletonHeroOverlay>
      <Skeleton $height="24px" $width="120px" $radius={theme.radius.sm} />
      <Skeleton $height="40px" $width="300px" />
      <Skeleton $height="16px" $width="200px" />
      <Skeleton $height="48px" $width="180px" $radius={theme.radius.md} />
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
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const SkeletonRow = ({ columns = 4 }) => (
  <SkeletonRowWrapper>
    {Array.from({ length: columns }).map((_, index) => (
      <Skeleton
        key={index}
        $height="16px"
        $width={index === 0 ? '40%' : '20%'}
      />
    ))}
  </SkeletonRowWrapper>
);

/**
 * Grid of skeleton cards
 */
const SkeletonGridWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.lg};
`;

export const SkeletonGrid = ({ count = 6 }) => (
  <SkeletonGridWrapper>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </SkeletonGridWrapper>
);

/**
 * Stats skeleton - matches collection stats
 */
const SkeletonStatsWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
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
        <Skeleton $height="28px" $width="60px" />
        <Skeleton $height="14px" $width="80px" />
      </SkeletonStatItem>
    ))}
  </SkeletonStatsWrapper>
);

export default Skeleton;
