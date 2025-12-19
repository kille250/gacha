import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCheckCircle, MdClose } from 'react-icons/md';
import { FaDice, FaGem, FaTrophy, FaStar } from 'react-icons/fa';
import { getRarityColor } from '../../styles/DesignSystem';

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
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={handleModalClick}
            rarity={rarity}
          >
            {/* Close Button */}
            <CloseButton onClick={onClose}>
              <MdClose />
            </CloseButton>
            
            {/* Image/Video - Natural aspect ratio */}
            <MediaWrapper>
              {isVideo ? (
                <Media 
                  as="video"
                  src={image} 
                  autoPlay 
                  loop
                  playsInline
                  muted
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/400x600?text=No+Media';
                    }
                  }} 
                />
              ) : (
                <Media 
                  as="img"
                  src={image} 
                  alt={name}
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/400x600?text=No+Image';
                    }
                  }}
                />
              )}
              
              {/* Subtle rarity glow at bottom */}
              <RarityGlow rarity={rarity} />
            </MediaWrapper>
            
            {/* Info Bar */}
            <InfoBar>
              <InfoContent>
                {/* Badges Row */}
                <BadgesRow>
                  {isOwned && (
                    <Badge variant="owned">
                      <MdCheckCircle /> Owned
                    </Badge>
                  )}
                  {isBannerCharacter && (
                    <Badge variant="banner">
                      ★ Featured
                    </Badge>
                  )}
                  <RarityPill rarity={rarity}>
                    {rarityIcons[rarity]}
                    <span>{rarity}</span>
                  </RarityPill>
                </BadgesRow>
                
                {/* Character Info */}
                <CharacterInfo>
                  <CharacterName>{name}</CharacterName>
                  {series && <CharacterSeries>{series}</CharacterSeries>}
                </CharacterInfo>
              </InfoContent>
            </InfoBar>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

// ==================== STYLED COMPONENTS ====================

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
`;

const ModalContent = styled(motion.div)`
  background: #1c1c1e;
  border-radius: 20px;
  position: relative;
  max-width: 420px;
  width: 100%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  /* Subtle shadow instead of heavy border */
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 25px 80px -12px rgba(0, 0, 0, 0.6),
    0 0 60px ${props => getRarityColor(props.rarity)}15;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  font-size: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.05);
  }
`;

const MediaWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  min-height: 300px;
  max-height: 60vh;
  overflow: hidden;
`;

const Media = styled.div`
  width: 100%;
  height: auto;
  max-height: 60vh;
  object-fit: contain;
  display: block;
`;

const RarityGlow = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(
    to top,
    ${props => getRarityColor(props.rarity)}30 0%,
    transparent 100%
  );
  pointer-events: none;
`;

const InfoBar = styled.div`
  background: #1c1c1e;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const InfoContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const BadgesRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  
  ${props => props.variant === 'owned' && `
    background: rgba(52, 199, 89, 0.15);
    color: #34C759;
    
    svg {
      font-size: 14px;
    }
  `}
  
  ${props => props.variant === 'banner' && `
    background: rgba(255, 159, 10, 0.15);
    color: #FF9F0A;
  `}
`;

const RarityPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  background: ${props => getRarityColor(props.rarity)}20;
  color: ${props => getRarityColor(props.rarity)};
  margin-left: auto;
  
  svg {
    font-size: 11px;
  }
`;

const CharacterInfo = styled.div`
  text-align: left;
`;

const CharacterName = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.2;
`;

const CharacterSeries = styled.p`
  margin: 4px 0 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
`;

export default ImagePreviewModal;
