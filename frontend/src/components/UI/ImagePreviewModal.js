import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCheckCircle } from 'react-icons/md';

const ImagePreviewModal = ({ isOpen, onClose, image, name, series, rarity, isOwned, onClaim }) => {
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={handleModalClick}
          >
            <CloseButton onClick={onClose}>
              <span aria-hidden="true">&times;</span>
            </CloseButton>
            
            {isOwned && (
              <OwnedBadge>
                <MdCheckCircle /> In Your Collection
              </OwnedBadge>
            )}
            
            <ImageContainer rarity={rarity}>
              <LargeImage src={image} alt={name} />
            </ImageContainer>
            
            <CharacterDetails>
              <CharacterName>{name}</CharacterName>
              {series && <CharacterSeries>{series}</CharacterSeries>}
              <RarityBadge rarity={rarity}>
                {rarity}
              </RarityBadge>
              
              {onClaim && !isOwned && (
                <ClaimButton onClick={onClaim}>
                  Add to Collection
                </ClaimButton>
              )}
            </CharacterDetails>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

// Styled Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background-color: white;
  border-radius: 20px;
  position: relative;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  margin: 0 15px;
  
  @media (max-width: 480px) {
    max-height: 80vh;
    margin: 0 10px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  font-size: 24px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }
`;

const OwnedBadge = styled.div`
  position: absolute;
  top: 15px;
  left: 15px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  padding: 8px 15px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  z-index: 5;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  
  svg {
    font-size: 18px;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
    padding: 6px 12px;
    top: 10px;
    left: 10px;
  }
`;

const ImageContainer = styled.div`
  width: 100%;
  height: 500px;
  max-height: 60vh;
  overflow: hidden;
  position: relative;
  border-bottom: 4px solid ${props => {
    const rarityColors = {
      common: '#a0a0a0',
      uncommon: '#4caf50',
      rare: '#2196f3',
      epic: '#9c27b0',
      legendary: '#ff9800'
    };
    return rarityColors[props.rarity] || '#a0a0a0';
  }};
  
  @media (max-width: 480px) {
    height: auto;
    max-height: 50vh;
  }
`;

const LargeImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  
  @media (max-width: 480px) {
    object-fit: contain;
  }
`;

const CharacterDetails = styled.div`
  padding: 20px;
  position: relative;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.9));
  
  @media (max-width: 480px) {
    padding: 15px;
  }
`;

const CharacterName = styled.h2`
  margin: 0 0 5px 0;
  font-size: 28px;
  color: #333;
  text-align: center;
  margin-top: 10px;
  
  @media (max-width: 480px) {
    font-size: 24px;
  }
`;

const CharacterSeries = styled.p`
  margin: 0;
  font-size: 16px;
  color: #666;
  font-style: italic;
  text-align: center;
`;

const RarityBadge = styled.div`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => {
    const rarityColors = {
      common: '#a0a0a0',
      uncommon: '#4caf50',
      rare: '#2196f3',
      epic: '#9c27b0',
      legendary: '#ff9800'
    };
    return rarityColors[props.rarity] || '#a0a0a0';
  }};
  color: white;
  padding: 6px 20px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  
  @media (max-width: 480px) {
    font-size: 12px;
    padding: 4px 15px;
  }
`;

const ClaimButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 30px;
  padding: 10px 20px;
  margin: 15px auto 5px auto;
  display: block;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(118, 75, 162, 0.3);
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(118, 75, 162, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 480px) {
    font-size: 14px;
    padding: 8px 16px;
  }
`;

export default ImagePreviewModal;