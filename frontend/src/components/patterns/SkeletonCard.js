/**
 * SkeletonCard - Loading placeholder for cards
 *
 * Provides skeleton loading state that matches CharacterCard layout.
 * Reduces perceived loading time with shimmer animation.
 *
 * Variants:
 * - default: Character card with image and text
 * - banner: Wide banner card for gacha page
 * - compact: Smaller card for lists
 * - text: Just text lines (for inline content)
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../design-system';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 25%,
    ${theme.colors.surface} 50%,
    ${theme.colors.backgroundTertiary} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${props => props.$radius || theme.radius.md};
`;

const Card = styled.div`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
`;

const ImageSkeleton = styled(SkeletonBase)`
  aspect-ratio: ${props => props.$ratio || 1};
  border-radius: 0;
`;

const ContentWrapper = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const TitleSkeleton = styled(SkeletonBase)`
  height: ${props => props.$height || '16px'};
  width: ${props => props.$width || '80%'};
`;

const SubtitleSkeleton = styled(SkeletonBase)`
  height: ${props => props.$height || '12px'};
  width: ${props => props.$width || '60%'};
`;

// Standalone skeleton primitives for custom layouts
export const SkeletonLine = styled(SkeletonBase)`
  height: ${props => props.$height || '14px'};
  width: ${props => props.$width || '100%'};
`;

export const SkeletonCircle = styled(SkeletonBase)`
  width: ${props => props.$size || '40px'};
  height: ${props => props.$size || '40px'};
  border-radius: 50%;
`;

export const SkeletonRect = styled(SkeletonBase)`
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '100px'};
`;

/**
 * SkeletonCard Component
 *
 * @param {Object} props
 * @param {string} props.variant - 'default' | 'banner' | 'compact' | 'text'
 */
const SkeletonCard = ({ variant = 'default' }) => {
  if (variant === 'text') {
    return (
      <ContentWrapper aria-hidden="true">
        <TitleSkeleton $width="90%" />
        <SubtitleSkeleton $width="70%" />
        <SubtitleSkeleton $width="50%" />
      </ContentWrapper>
    );
  }

  if (variant === 'banner') {
    return (
      <Card aria-hidden="true" style={{ minHeight: '200px' }}>
        <ImageSkeleton $ratio="21/9" />
        <ContentWrapper>
          <TitleSkeleton $height="20px" $width="60%" />
          <SubtitleSkeleton $width="40%" />
        </ContentWrapper>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card aria-hidden="true">
        <div style={{ display: 'flex', padding: theme.spacing.sm, gap: theme.spacing.sm }}>
          <SkeletonRect $width="60px" $height="60px" $radius={theme.radius.md} />
          <ContentWrapper style={{ padding: 0, flex: 1 }}>
            <TitleSkeleton $width="70%" />
            <SubtitleSkeleton $width="50%" />
          </ContentWrapper>
        </div>
      </Card>
    );
  }

  // Default character card
  return (
    <Card aria-hidden="true">
      <ImageSkeleton />
      <ContentWrapper>
        <TitleSkeleton />
        <SubtitleSkeleton />
      </ContentWrapper>
    </Card>
  );
};

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
`;

/**
 * SkeletonGrid Component
 *
 * @param {Object} props
 * @param {number} props.count - Number of skeleton cards to display
 */
export const SkeletonGrid = ({ count = 12 }) => (
  <GridContainer role="status" aria-label="Loading characters">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </GridContainer>
);

export default SkeletonCard;
