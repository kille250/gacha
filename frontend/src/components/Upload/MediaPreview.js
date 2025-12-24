/**
 * MediaPreview - Unified image/video preview with loading states
 *
 * Features:
 * - Handles both images and videos
 * - Shows skeleton while loading
 * - Status overlay for checking/uploading states
 * - Optimized for performance (video preload="metadata")
 */
import React, { useState, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaVideo, FaImage } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const MediaPreview = memo(({
  src,
  isVideo = false,
  status,
  progress,
  alt = '',
  aspectRatio = '4/3',
  showTypeIcon = true,
  onClick,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
  };

  const handleError = () => {
    setLoaded(true);
    setError(true);
  };

  return (
    <PreviewContainer
      $aspectRatio={aspectRatio}
      onClick={onClick}
      $clickable={!!onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Skeleton loader */}
      {!loaded && <Skeleton />}

      {/* Media content */}
      {error ? (
        <ErrorPlaceholder>
          <FaImage />
          <span>Failed to load</span>
        </ErrorPlaceholder>
      ) : isVideo ? (
        <Video
          src={src}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onLoadedData={handleLoad}
          onError={handleError}
          $loaded={loaded}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          $loaded={loaded}
          loading="lazy"
        />
      )}

      {/* Type indicator */}
      {showTypeIcon && loaded && !error && (
        <TypeIcon aria-label={isVideo ? 'Video file' : 'Image file'}>
          {isVideo ? <FaVideo /> : <FaImage />}
        </TypeIcon>
      )}

      {/* Status overlays */}
      {status === 'checking' && (
        <StatusOverlay aria-label="Analyzing file">
          <Spinner />
          <StatusText>Analyzing...</StatusText>
        </StatusOverlay>
      )}

      {status === 'uploading' && (
        <StatusOverlay aria-label={`Uploading: ${progress || 0}%`}>
          <ProgressRing progress={progress || 0} />
          <StatusText>{progress || 0}%</StatusText>
        </StatusOverlay>
      )}
    </PreviewContainer>
  );
});

MediaPreview.displayName = 'MediaPreview';

// Progress ring component
const ProgressRing = ({ progress }) => {
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <ProgressSvg width={size} height={size}>
      <circle
        stroke="rgba(255, 255, 255, 0.2)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <ProgressCircle
        stroke="white"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }}
      />
    </ProgressSvg>
  );
};

// Styled components
const PreviewContainer = styled.div`
  position: relative;
  aspect-ratio: ${props => props.$aspectRatio};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  overflow: hidden;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  ${props => props.$clickable && `
    &:hover {
      opacity: 0.9;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.primary};
      outline-offset: 2px;
    }
  `}
`;

const Skeleton = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 0%,
    ${theme.colors.backgroundSecondary} 50%,
    ${theme.colors.backgroundTertiary} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.$loaded ? 1 : 0};
  transition: opacity 0.2s ease;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.$loaded ? 1 : 0};
  transition: opacity 0.2s ease;
`;

const ErrorPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};

  svg {
    font-size: 24px;
  }
`;

const TypeIcon = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: ${theme.radius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
`;

const StatusOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
`;

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const StatusText = styled.span`
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
`;

const ProgressSvg = styled.svg`
  transform: rotate(-90deg);
`;

const ProgressCircle = styled.circle`
  transition: stroke-dashoffset 0.3s ease;
`;

export default MediaPreview;
