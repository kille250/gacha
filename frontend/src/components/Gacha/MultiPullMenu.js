import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdAdd, MdRemove, MdClose } from 'react-icons/md';
import { FaDice } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import { modalVariants, overlayVariants } from './animations';

// ==================== MULTI PULL MENU COMPONENT ====================

export const MultiPullMenu = ({
  isOpen,
  onClose,
  multiPullCount,
  setMultiPullCount,
  maxPossiblePulls,
  currentMultiPullCost,
  onConfirm,
  userPoints,
  singlePullCost,
  // Pricing data from server - REQUIRED, no defaults to ensure single source of truth
  discountTiers,
  quickSelectOptions
}) => {
  const getRecommendedPulls = () => {
    if (!quickSelectOptions?.length) return [1];
    // Filter quick select options based on what user can afford
    return quickSelectOptions.filter(count => count <= maxPossiblePulls || count === 1);
  };

  const getDiscount = (count) => {
    if (!discountTiers?.length) return 0;
    // Use discount tiers from pricing config
    for (const tier of discountTiers) {
      if (count >= tier.minCount) return Math.round(tier.discount * 100);
    }
    return 0;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Backdrop
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <MenuPanel
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <PanelHeader>
              <h2>🎯 Multi Pull</h2>
              <CloseBtn onClick={onClose}>
                <MdClose />
              </CloseBtn>
            </PanelHeader>
            
            <PanelContent>
              {/* Selection Display */}
              <SelectionBox>
                <PullCount>{multiPullCount}×</PullCount>
                <CostDisplay>
                  <span>{currentMultiPullCost} points</span>
                  {getDiscount(multiPullCount) > 0 && (
                    <DiscountTag>{getDiscount(multiPullCount)}% OFF</DiscountTag>
                  )}
                </CostDisplay>
              </SelectionBox>
              
              {/* Quick Select */}
              <QuickSelectGrid>
                {getRecommendedPulls().map(count => {
                  const cost = Math.floor(count * singlePullCost * (1 - getDiscount(count) / 100));
                  const isDisabled = userPoints < cost;
                  
                  return (
                    <QuickSelectBtn
                      key={count}
                      onClick={() => !isDisabled && setMultiPullCount(count)}
                      $active={multiPullCount === count}
                      $disabled={isDisabled}
                    >
                      <span>{count}× Pull</span>
                      {getDiscount(count) > 0 && (
                        <QuickDiscountBadge>-{getDiscount(count)}%</QuickDiscountBadge>
                      )}
                    </QuickSelectBtn>
                  );
                })}
              </QuickSelectGrid>
              
              {/* Slider Control */}
              <SliderSection>
                <CounterRow>
                  <CounterBtn
                    onClick={() => setMultiPullCount(Math.max(1, multiPullCount - 1))}
                    disabled={multiPullCount <= 1}
                  >
                    <MdRemove />
                  </CounterBtn>
                  <CounterDisplay>{multiPullCount}</CounterDisplay>
                  <CounterBtn
                    onClick={() => setMultiPullCount(Math.min(maxPossiblePulls, multiPullCount + 1))}
                    disabled={multiPullCount >= maxPossiblePulls}
                  >
                    <MdAdd />
                  </CounterBtn>
                </CounterRow>
                <SliderInput
                  type="range"
                  min="1"
                  max={maxPossiblePulls || 1}
                  value={multiPullCount}
                  onChange={(e) => setMultiPullCount(parseInt(e.target.value))}
                />
              </SliderSection>
              
              {/* Info Cards */}
              <InfoGrid>
                <InfoCard>
                  <InfoEmoji>💰</InfoEmoji>
                  <InfoTitle>Total Cost</InfoTitle>
                  <InfoAmount>{currentMultiPullCost} pts</InfoAmount>
                </InfoCard>
                <InfoCard>
                  <InfoEmoji>🎲</InfoEmoji>
                  <InfoTitle>Pull Count</InfoTitle>
                  <InfoAmount>{multiPullCount}×</InfoAmount>
                </InfoCard>
                {getDiscount(multiPullCount) > 0 && (
                  <InfoCard $accent>
                    <InfoEmoji>✨</InfoEmoji>
                    <InfoTitle>You Save</InfoTitle>
                    <InfoAmount>{getDiscount(multiPullCount)}%</InfoAmount>
                  </InfoCard>
                )}
              </InfoGrid>
              
              {/* Confirm Button */}
              <ConfirmButton
                onClick={onConfirm}
                disabled={userPoints < currentMultiPullCost}
                whileHover={{ scale: userPoints >= currentMultiPullCost ? 1.02 : 1 }}
                whileTap={{ scale: userPoints >= currentMultiPullCost ? 0.98 : 1 }}
              >
                <FaDice /> Pull {multiPullCount}× for {currentMultiPullCost} points
              </ConfirmButton>
              
              {userPoints < currentMultiPullCost && (
                <ErrorMessage>
                  Not enough points! You need <strong>{currentMultiPullCost - userPoints}</strong> more.
                </ErrorMessage>
              )}
            </PanelContent>
          </MenuPanel>
        </Backdrop>
      )}
    </AnimatePresence>
  );
};

// ==================== STYLED COMPONENTS ====================

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.md};
`;

const MenuPanel = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 420px;
  box-shadow: ${theme.shadows.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  
  h2 {
    margin: 0;
    font-size: ${theme.fontSizes.lg};
    font-weight: ${theme.fontWeights.semibold};
    color: white;
  }
`;

const CloseBtn = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: ${theme.radius.full};
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const PanelContent = styled.div`
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const SelectionBox = styled.div`
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

const PullCount = styled.div`
  font-size: 42px;
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CostDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  span {
    font-size: ${theme.fontSizes.lg};
    font-weight: ${theme.fontWeights.semibold};
    color: ${theme.colors.text};
  }
`;

const DiscountTag = styled.span`
  display: inline-block;
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  padding: 4px 10px;
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs} !important;
  font-weight: ${theme.fontWeights.bold} !important;
  color: white !important;
`;

const QuickSelectGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  justify-content: center;
`;

const QuickSelectBtn = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.radius.full};
  border: 1px solid ${props => props.$active 
    ? theme.colors.accent
    : theme.colors.surfaceBorder};
  background: ${props => props.$active 
    ? 'rgba(88, 86, 214, 0.15)' 
    : theme.colors.glass};
  color: ${props => props.$disabled 
    ? theme.colors.textMuted 
    : theme.colors.text};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  font-weight: ${theme.fontWeights.medium};
  font-size: ${theme.fontSizes.sm};
  position: relative;
  transition: all ${theme.transitions.fast};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  
  ${props => props.$active && `
    box-shadow: 0 0 20px rgba(88, 86, 214, 0.3);
  `}
  
  &:hover:not(:disabled) {
    border-color: ${theme.colors.accent};
    background: rgba(88, 86, 214, 0.1);
  }
`;

const QuickDiscountBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${theme.colors.warning};
  color: white;
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  padding: 2px 6px;
  border-radius: ${theme.radius.sm};
`;

const SliderSection = styled.div`
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
`;

const CounterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const CounterBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.4 : 1};
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: scale(1.05);
  }
`;

const CounterDisplay = styled.div`
  font-size: 48px;
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  min-width: 80px;
  text-align: center;
`;

const SliderInput = styled.input`
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.full};
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: ${theme.shadows.sm};
    transition: transform ${theme.transitions.fast};
    
    &:hover {
      transform: scale(1.1);
    }
  }
  
  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: none;
    box-shadow: ${theme.shadows.sm};
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: ${theme.spacing.sm};
`;

const InfoCard = styled.div`
  background: ${props => props.$accent 
    ? 'rgba(88, 86, 214, 0.15)' 
    : theme.colors.glass};
  border: 1px solid ${props => props.$accent 
    ? theme.colors.accent 
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoEmoji = styled.div`
  font-size: 24px;
`;

const InfoTitle = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoAmount = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const ConfirmButton = styled(motion.button)`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: ${theme.radius.full};
  padding: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
  
  &:disabled {
    background: ${theme.colors.backgroundTertiary};
    cursor: not-allowed;
    box-shadow: none;
  }
  
  svg {
    font-size: 18px;
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  
  strong {
    color: ${theme.colors.error};
    font-weight: ${theme.fontWeights.semibold};
  }
`;

export default MultiPullMenu;
