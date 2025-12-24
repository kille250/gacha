/**
 * BannerCard - Card display for banner items
 *
 * Netflix-style card with image, info, and hover effects.
 * Used in banner carousels and grids.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';

const CardContainer = styled(motion.div)`
  flex-shrink: 0;
  width: 300px;
  scroll-snap-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CardInner = styled(motion.div)`
  background: rgba(30, 30, 40, 0.8);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.3s ease;

  ${CardContainer}:hover & {
    box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  height: 180px;
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

const BannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;

  ${CardContainer}:hover & {
    transform: scale(1.05);
  }
`;

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(30, 30, 40, 1) 0%, transparent 50%);
`;

const CardInfo = styled.div`
  padding: 16px;
`;

const CardTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${theme.colors.text};
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 12px;
`;

const CardSeries = styled.span`
  color: #ff6b6b;
  font-weight: 500;
`;

const CharCount = styled.span`
  color: rgba(255, 255, 255, 0.5);
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardCost = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
`;

const BoostBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
`;

/**
 * BannerCard Component
 *
 * @param {Object} props
 * @param {Object} props.banner - Banner data object
 * @param {string} props.imageSrc - Banner image URL
 * @param {string} props.cost - Cost display text
 * @param {string} props.boostLabel - Rate boost label
 * @param {string} props.charactersLabel - Label for character count suffix
 * @param {Function} props.onClick - Click handler
 * @param {number} props.index - Index for stagger animation
 */
const BannerCard = memo(({
  banner,
  imageSrc,
  cost,
  boostLabel,
  charactersLabel = 'chars',
  onClick,
  index = 0,
  ...props
}) => {
  return (
    <CardContainer
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover="hover"
      tabIndex={0}
      role="button"
      aria-label={`${banner.name} - ${banner.series}`}
      {...props}
    >
      <CardInner variants={{ hover: { scale: 1.05, y: -8 } }}>
        <ImageContainer>
          <BannerImage
            src={imageSrc}
            alt={banner.name}
            loading="lazy"
            decoding="async"
          />
          <ImageOverlay />
        </ImageContainer>
        <CardInfo>
          <CardTitle>{banner.name}</CardTitle>
          <CardMeta>
            <CardSeries>{banner.series}</CardSeries>
            <CharCount>{banner.Characters?.length || 0} {charactersLabel}</CharCount>
          </CardMeta>
          <CardFooter>
            <CardCost>{cost}</CardCost>
            {boostLabel && <BoostBadge>{boostLabel}</BoostBadge>}
          </CardFooter>
        </CardInfo>
      </CardInner>
    </CardContainer>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.banner.id === nextProps.banner.id &&
    prevProps.cost === nextProps.cost
  );
});

BannerCard.displayName = 'BannerCard';

export default BannerCard;
