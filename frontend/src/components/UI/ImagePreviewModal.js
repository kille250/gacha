import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCheckCircle, MdClose } from 'react-icons/md';
import { FaDice, FaGem, FaTrophy, FaStar, FaArrowUp } from 'react-icons/fa';
import { useRarity } from '../../context/RarityContext';

const rarityIcons = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />
};

const ImagePreviewModal = ({ 
  isOpen, onClose, image, name, series, rarity, isOwned, isVideo, isBannerCharacter, 
  level, shards, shardsToNextLevel, canLevelUp, onLevelUp, characterId
}) => {
  const { getRarityColor } = useRarity();
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  
  const handleLevelUp = async () => {
    if (!onLevelUp || isLevelingUp) return;
    setIsLevelingUp(true);
    try {
      await onLevelUp(characterId);
    } finally {
      setIsLevelingUp(false);
    }
  };
  
  const handleModalClick = (e) => {
    e.stopPropagation();
  };
  
  // Get colors for styled components
  const rarityColor = getRarityColor(rarity);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={onClose}
        >
          <ModalContent
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onMouseDown={handleModalClick}
            $color={rarityColor}
          >
            {/* Close Button */}
            <CloseButton onClick={onClose} aria-label="Close preview">
              <MdClose aria-hidden="true" />
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
                  aria-label={`Video of ${name}`}
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
              <RarityGlow $color={rarityColor} />
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
                  <RarityPill $color={rarityColor}>
                    {rarityIcons[rarity]}
                    <span>{rarity}</span>
                  </RarityPill>
                </BadgesRow>
                
                {/* Character Info */}
                <CharacterInfo>
                  <CharacterName>{name}</CharacterName>
                  {series && <CharacterSeries>{series}</CharacterSeries>}
                </CharacterInfo>
                
                {/* Level Section - Only for owned characters */}
                {isOwned && (
                  <LevelSection>
                    <LevelHeader>
                      <LevelTitle>
                        <span>⚔️ Card Level</span>
                        <LevelValue $isMaxLevel={level >= 5}>
                          Lv.{level}{level >= 5 ? ' MAX' : ''}
                        </LevelValue>
                      </LevelTitle>
                    </LevelHeader>
                    
                    {level < 5 && (
                      <>
                        <ProgressContainer>
                          <ProgressLabel>
                            <span>◆ Shards</span>
                            <span>{shards || 0} / {shardsToNextLevel || '?'}</span>
                          </ProgressLabel>
                          <ProgressBar>
                            <ProgressFill 
                              style={{ width: `${Math.min(100, ((shards || 0) / (shardsToNextLevel || 1)) * 100)}%` }}
                              $complete={canLevelUp}
                            />
                          </ProgressBar>
                        </ProgressContainer>
                        
                        <ShardHint>
                          💡 Roll duplicates to earn shards for leveling up!
                        </ShardHint>
                      </>
                    )}
                    
                    {level >= 5 && (
                      <MaxLevelInfo>
                        🎉 Max level reached! Duplicates now give +50 bonus points.
                      </MaxLevelInfo>
                    )}
                    
                    {/* Level Up Button */}
                    {canLevelUp && onLevelUp && (
                      <LevelUpButton 
                        onClick={handleLevelUp}
                        disabled={isLevelingUp}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FaArrowUp />
                        {isLevelingUp ? 'Leveling...' : `Level Up → Lv.${level + 1}`}
                      </LevelUpButton>
                    )}
                  </LevelSection>
                )}
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
    0 0 60px ${props => props.$color}15;
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
    ${props => props.$color}30 0%,
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
  
  ${props => props.variant === 'level' && `
    background: rgba(88, 86, 214, 0.15);
    color: #5856D6;
  `}
  
  ${props => props.variant === 'maxLevel' && `
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 140, 0, 0.25));
    color: #FFD700;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
  `}
  
  ${props => props.variant === 'banner' && `
    background: rgba(255, 159, 10, 0.15);
    color: #FF9F0A;
  `}
  
  ${props => props.variant === 'shards' && `
    background: rgba(175, 82, 222, 0.15);
    color: #AF52DE;
  `}
`;

const LevelUpButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #34C759, #30B350);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    font-size: 14px;
  }
  
  &:hover:not(:disabled) {
    box-shadow: 0 4px 20px rgba(52, 199, 89, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
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
  background: ${props => props.$color}20;
  color: ${props => props.$color};
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

const LevelSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LevelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const LevelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const LevelValue = styled.span`
  font-weight: 700;
  font-size: 16px;
  color: ${props => props.$isMaxLevel ? '#FFD700' : '#fff'};
  ${props => props.$isMaxLevel && `
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  `}
`;

const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  
  span:last-child {
    color: #AF52DE;
    font-weight: 600;
  }
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$complete 
    ? 'linear-gradient(90deg, #34C759, #4ade80)' 
    : 'linear-gradient(90deg, #AF52DE, #BF5AF2)'};
  border-radius: 100px;
  transition: width 0.3s ease;
  
  ${props => props.$complete && `
    animation: glow 1.5s ease-in-out infinite;
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px rgba(52, 199, 89, 0.5); }
      50% { box-shadow: 0 0 15px rgba(52, 199, 89, 0.8); }
    }
  `}
`;

const ShardHint = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  font-style: italic;
`;

const MaxLevelInfo = styled.div`
  font-size: 12px;
  color: #FFD700;
  text-align: center;
  padding: 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
`;

export default ImagePreviewModal;
