import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const ImagePreviewModal = ({ isOpen, onClose, image, name, series, rarity }) => {
  if (!isOpen) return null;
  
  // Verhindere, dass Klicks auf das Modal zum Schließen führen
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
              <FaTimes />
            </CloseButton>
            
            <ImageContainer rarity={rarity}>
              <LargeImage src={image} alt={name} />
            </ImageContainer>
            
            <CharacterDetails>
              <CharacterName>{name}</CharacterName>
              {series && <CharacterSeries>{series}</CharacterSeries>}
              {rarity && <RarityBadge rarity={rarity}>{rarity}</RarityBadge>}
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
  margin: 0 15px; /* Seitliche Ränder auf kleinen Bildschirmen */
  
  @media (max-width: 480px) {
    max-height: 80vh;
    margin: 0 10px; /* Kleinere Ränder auf sehr kleinen Bildschirmen */
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.2);
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
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    top: 8px;
    right: 8px;
  }
`;

const ImageContainer = styled.div`
  width: 100%;
  height: 500px;
  max-height: 60vh; /* Weniger Höhe auf mobilen Geräten */
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
  object-fit: cover;
  
  @media (max-width: 480px) {
    object-fit: contain; /* Zeigt das ganze Bild, ggf. mit Rändern */
  }
`;

const CharacterDetails = styled.div`
  padding: 20px;
  position: relative;
  
  @media (max-width: 480px) {
    padding: 15px;
  }
`;

const CharacterName = styled.h2`
  margin: 0 0 5px 0;
  font-size: 28px;
  color: #333;
  
  @media (max-width: 480px) {
    font-size: 24px;
    margin-right: 80px; /* Platz für das Rarität-Badge */
  }
`;

const CharacterSeries = styled.p`
  margin: 0;
  font-size: 16px;
  color: #666;
  font-style: italic;
`;

const RarityBadge = styled.span`
  position: absolute;
  top: -15px;
  right: 20px;
  font-size: 14px;
  padding: 5px 15px;
  border-radius: 15px;
  text-transform: uppercase;
  font-weight: bold;
  color: white;
  background-color: ${props => {
    const rarityColors = {
      common: '#a0a0a0',
      uncommon: '#4caf50',
      rare: '#2196f3',
      epic: '#9c27b0',
      legendary: '#ff9800'
    };
    return rarityColors[props.rarity] || '#a0a0a0';
  }};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

export default ImagePreviewModal;