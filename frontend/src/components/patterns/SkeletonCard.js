/**
 * SkeletonCard - Loading placeholder for cards
 *
 * Provides skeleton loading state that matches CharacterCard layout.
 * Reduces perceived loading time with shimmer animation.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../styles/DesignSystem';

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
  aspect-ratio: 1;
  border-radius: 0;
`;

const ContentWrapper = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const TitleSkeleton = styled(SkeletonBase)`
  height: 16px;
  width: 80%;
`;

const SubtitleSkeleton = styled(SkeletonBase)`
  height: 12px;
  width: 60%;
`;

/**
 * SkeletonCard Component
 *
 * Single skeleton card placeholder
 */
const SkeletonCard = () => (
  <Card aria-hidden="true">
    <ImageSkeleton />
    <ContentWrapper>
      <TitleSkeleton />
      <SubtitleSkeleton />
    </ContentWrapper>
  </Card>
);

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
