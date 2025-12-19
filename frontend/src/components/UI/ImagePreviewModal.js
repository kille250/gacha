import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCheckCircle, MdClose } from 'react-icons/md';
import { FaDice, FaGem, FaTrophy, FaStar } from 'react-icons/fa';
import { theme, getRarityColor, getRarityGlow } from '../../styles/DesignSystem';

const rarityIcons = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />
};

const ImagePreviewModal = ({ isOpen, onClose, image, name, series, rarity, isOwned, isVideo, isBannerCharacter }) => {
  const handleModalClick = (e) => {
    e.stopPropagation();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={handleModalClick}
            rarity={rarity}
          >
            <CloseButton onClick={onClose}>
              <MdClose />
            </CloseButton>
            
            {/* Badges */}
            <BadgeContainer>
              {isOwned && (
                <OwnedBadge>
                  <MdCheckCircle /> Collected
                </OwnedBadge>
              )}
              {isBannerCharacter && (
                <BannerBadge>
                  ★ Banner
                </BannerBadge>
              )}
            </BadgeContainer>
            
            {/* Rarity Glow Effect */}
            <RarityGlowEffect rarity={rarity} />
            
            {/* Image/Video Container */}
            <ImageContainer>
              {isVideo ? (
                <MediaVideo 
                  src={image} 
                  autoPlay 
                  loop
                  playsInline
                  muted
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/300?text=No+Media';
                    }
                  }} 
                />
              ) : (
                <LargeImage 
                  src={image} 
                  alt={name}
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                    }
                  }}
                />
              )}
            </ImageContainer>
            
            {/* Character Details */}
            <DetailsSection>
              <RarityBadge rarity={rarity}>
                {rarityIcons[rarity]} {rarity}
              </RarityBadge>
              <CharacterName>{name}</CharacterName>
              {series && <CharacterSeries>{series}</CharacterSeries>}
            </DetailsSection>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

// Styled Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(${theme.blur.md});
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.lg};
`;

const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius['2xl']};
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: ${props => getRarityGlow(props.rarity)}, ${theme.shadows['2xl']};
  border: 2px solid ${props => getRarityColor(props.rarity)};
  display: flex;
  flex-direction: column;
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.sm});
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  border-radius: ${theme.radius.full};
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  font-size: 20px;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
    transform: scale(1.1);
  }
`;

const BadgeContainer = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  display: flex;
  gap: ${theme.spacing.xs};
  z-index: 15;
`;

const OwnedBadge = styled.div`
  background: linear-gradient(135deg, ${theme.colors.success}, #059669);
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  box-shadow: ${theme.shadows.md};
  
  svg {
    font-size: 14px;
  }
`;

const BannerBadge = styled.div`
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  box-shadow: ${theme.shadows.md};
`;

const RarityGlowEffect = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, ${props => getRarityColor(props.rarity)}25 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
`;

const ImageContainer = styled.div`
  width: 100%;
  height: 400px;
  max-height: 55vh;
  overflow: hidden;
  position: relative;
  z-index: 1;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    height: 300px;
    max-height: 45vh;
  }
`;

const LargeImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const MediaVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const DetailsSection = styled.div`
  padding: ${theme.spacing.xl};
  position: relative;
  background: linear-gradient(to bottom, transparent, ${theme.colors.backgroundSecondary} 30%);
  text-align: center;
  z-index: 1;
`;

const RarityBadge = styled.div`
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => getRarityColor(props.rarity)};
  color: white;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 16px ${props => getRarityColor(props.rarity)}60;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  white-space: nowrap;
  z-index: 10;
  
  svg {
    font-size: 12px;
  }
`;

const CharacterName = styled.h2`
  margin: ${theme.spacing.md} 0 ${theme.spacing.xs};
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  letter-spacing: -0.02em;
`;

const CharacterSeries = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  font-style: italic;
`;

export default ImagePreviewModal;
