import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FaExclamationTriangle, FaTimesCircle, FaEye, FaExchangeAlt, FaCheck } from 'react-icons/fa';
import { getAssetUrl } from '../../utils/api';
import { isVideo } from '../../utils/mediaUtils';

/**
 * DuplicateWarningBanner - Displays duplicate detection results in a user-friendly way
 *
 * Supports two modes:
 * - possible_duplicate: Non-blocking warning, user can continue or change media
 * - confirmed_duplicate: Blocking notice, user must change media
 *
 * Design principles:
 * - Clear, calm, non-accusatory messaging
 * - Shows what the existing match looks like
 * - Provides clear next steps
 */
const DuplicateWarningBanner = ({
  status, // 'possible_duplicate' | 'confirmed_duplicate'
  explanation,
  similarity,
  existingMatch,
  onContinue,      // For possible_duplicate only - proceed with upload
  onChangeMedia,   // User wants to pick different media
  onViewExisting,  // Optional: view the existing character
  onDismiss,       // Optional: dismiss the warning
  mediaType = 'image', // 'image' | 'video'
  compact = false, // Compact mode for inline display
}) => {
  const isBlocking = status === 'confirmed_duplicate';

  // Generate thumbnail URL for existing match
  const matchThumbnail = existingMatch?.image
    ? getAssetUrl(existingMatch.image)
    : existingMatch?.thumbnailUrl;

  const matchIsVideo = existingMatch?.image
    ? isVideo(existingMatch.image)
    : existingMatch?.mediaType === 'video';

  const getTitle = () => {
    if (isBlocking) {
      return mediaType === 'video'
        ? 'This video already exists'
        : 'This image already exists';
    }
    return mediaType === 'video'
      ? 'This video looks similar to an existing character'
      : 'This looks similar to an existing character';
  };

  const getDefaultExplanation = () => {
    if (isBlocking) {
      return `The exact same ${mediaType} is already registered in the system.`;
    }
    return `We found a character that appears similar to this ${mediaType}. You can still upload if this is intentional.`;
  };

  if (compact) {
    return (
      <CompactBanner $blocking={isBlocking}>
        <CompactIcon $blocking={isBlocking}>
          {isBlocking ? <FaTimesCircle /> : <FaExclamationTriangle />}
        </CompactIcon>
        <CompactContent>
          <CompactTitle $blocking={isBlocking}>
            {isBlocking ? 'Duplicate detected' : 'Possible duplicate'}
          </CompactTitle>
          {similarity && (
            <CompactSimilarity>{similarity}% similar</CompactSimilarity>
          )}
        </CompactContent>
        {existingMatch && (
          <CompactMatch onClick={onViewExisting}>
            {matchIsVideo ? (
              <CompactMatchVideo src={matchThumbnail} muted loop />
            ) : (
              <CompactMatchImage src={matchThumbnail} alt={existingMatch.name} />
            )}
          </CompactMatch>
        )}
      </CompactBanner>
    );
  }

  return (
    <BannerContainer $blocking={isBlocking}>
      <BannerHeader>
        <BannerIcon $blocking={isBlocking}>
          {isBlocking ? <FaTimesCircle /> : <FaExclamationTriangle />}
        </BannerIcon>
        <BannerTitle $blocking={isBlocking}>
          {getTitle()}
        </BannerTitle>
        {onDismiss && !isBlocking && (
          <DismissButton onClick={onDismiss} title="Dismiss warning">
            ×
          </DismissButton>
        )}
      </BannerHeader>

      <BannerBody>
        <BannerExplanation>
          {explanation || getDefaultExplanation()}
        </BannerExplanation>

        {existingMatch && (
          <ExistingMatchCard onClick={onViewExisting} $clickable={!!onViewExisting}>
            <MatchMedia>
              {matchIsVideo ? (
                <MatchVideo src={matchThumbnail} muted loop autoPlay playsInline />
              ) : (
                <MatchImage src={matchThumbnail} alt={existingMatch.name} />
              )}
              {matchIsVideo && <VideoIndicator>VIDEO</VideoIndicator>}
            </MatchMedia>
            <MatchInfo>
              <MatchName>{existingMatch.name}</MatchName>
              {existingMatch.series && (
                <MatchSeries>{existingMatch.series}</MatchSeries>
              )}
              {similarity && (
                <MatchSimilarity $high={similarity >= 90}>
                  {similarity}% similar
                </MatchSimilarity>
              )}
            </MatchInfo>
            {onViewExisting && (
              <ViewButton>
                <FaEye /> View
              </ViewButton>
            )}
          </ExistingMatchCard>
        )}
      </BannerBody>

      <BannerActions>
        {!isBlocking && onContinue && (
          <ActionButton $primary onClick={onContinue}>
            <FaCheck /> Upload Anyway
          </ActionButton>
        )}
        {onChangeMedia && (
          <ActionButton $secondary={!isBlocking} onClick={onChangeMedia}>
            <FaExchangeAlt /> Choose Different {mediaType === 'video' ? 'Video' : 'Image'}
          </ActionButton>
        )}
      </BannerActions>
    </BannerContainer>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const BannerContainer = styled.div`
  background: ${props => props.$blocking
    ? 'rgba(231, 76, 60, 0.12)'
    : 'rgba(241, 196, 15, 0.12)'};
  border: 1px solid ${props => props.$blocking
    ? 'rgba(231, 76, 60, 0.3)'
    : 'rgba(241, 196, 15, 0.3)'};
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
`;

const BannerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const BannerIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$blocking
    ? 'rgba(231, 76, 60, 0.2)'
    : 'rgba(241, 196, 15, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: ${props => props.$blocking ? '#e74c3c' : '#f1c40f'};
    font-size: 16px;
  }
`;

const BannerTitle = styled.h4`
  margin: 0;
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: ${props => props.$blocking ? '#e74c3c' : '#f39c12'};
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
`;

const BannerBody = styled.div`
  margin-bottom: 16px;
`;

const BannerExplanation = styled.p`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const ExistingMatchCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 10px;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: all 0.2s;

  ${props => props.$clickable && `
    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  `}
`;

const MatchMedia = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #000;
`;

const MatchImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MatchVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoIndicator = styled.div`
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 3px;
`;

const MatchInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MatchName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MatchSeries = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

const MatchSimilarity = styled.div`
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$high ? '#e74c3c' : '#f39c12'};
  background: ${props => props.$high
    ? 'rgba(231, 76, 60, 0.2)'
    : 'rgba(241, 196, 15, 0.2)'};
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
`;

const ViewButton = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  transition: all 0.2s;

  ${ExistingMatchCard}:hover & {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
`;

const BannerActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: #fff;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
    }
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
  `}

  &:active {
    transform: translateY(0);
  }
`;

// Compact variant styles
const CompactBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: ${props => props.$blocking
    ? 'rgba(231, 76, 60, 0.15)'
    : 'rgba(241, 196, 15, 0.15)'};
  border: 1px solid ${props => props.$blocking
    ? 'rgba(231, 76, 60, 0.3)'
    : 'rgba(241, 196, 15, 0.3)'};
  border-radius: 8px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const CompactIcon = styled.div`
  flex-shrink: 0;

  svg {
    color: ${props => props.$blocking ? '#e74c3c' : '#f1c40f'};
    font-size: 14px;
  }
`;

const CompactContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CompactTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$blocking ? '#e74c3c' : '#f39c12'};
`;

const CompactSimilarity = styled.div`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
`;

const CompactMatch = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const CompactMatchImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CompactMatchVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export default DuplicateWarningBanner;
