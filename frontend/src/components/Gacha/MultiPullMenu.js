import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdAdd, MdRemove } from 'react-icons/md';
import { FaDice } from 'react-icons/fa';
import { theme } from './theme';
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
  singlePullCost = 100
}) => {
  const getRecommendedPulls = () => {
    const recommendations = [1];
    if (maxPossiblePulls >= 5) recommendations.push(5);
    if (maxPossiblePulls >= 10) recommendations.push(10);
    if (maxPossiblePulls > 10 && !recommendations.includes(maxPossiblePulls)) {
      recommendations.push(maxPossiblePulls);
    }
    return recommendations;
  };

  const getDiscount = (count) => {
    if (count >= 10) return 10;
    if (count >= 5) return 5;
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
              <CloseBtn onClick={onClose}>×</CloseBtn>
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
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: ${theme.spacing.md};
`;

const MenuPanel = styled(motion.div)`
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid ${theme.border.light};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid ${theme.border.subtle};
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: white;
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.text.secondary};
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
  
  &:hover {
    color: white;
  }
`;

const PanelContent = styled.div`
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const SelectionBox = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
  border: 1px solid ${theme.border.subtle};
`;

const PullCount = styled.div`
  font-size: 42px;
  font-weight: 800;
  background: ${theme.gradient.purple};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CostDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  span {
    font-size: 18px;
    font-weight: 600;
    color: white;
  }
`;

const DiscountTag = styled.span`
  background: ${theme.gradient.gold};
  padding: 4px 10px;
  border-radius: ${theme.radius.sm};
  font-size: 12px !important;
  font-weight: 700 !important;
  color: white !important;
`;

const QuickSelectGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  justify-content: center;
`;

const QuickSelectBtn = styled.button`
  padding: 10px 18px;
  border-radius: ${theme.radius.full};
  border: 2px solid ${props => props.$active 
    ? 'rgba(158, 85, 148, 0.5)' 
    : theme.border.subtle};
  background: ${props => props.$active 
    ? 'rgba(158, 85, 148, 0.2)' 
    : theme.background.glass};
  color: ${props => props.$disabled 
    ? theme.text.muted 
    : theme.text.primary};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  font-weight: 600;
  font-size: 14px;
  position: relative;
  transition: all 0.2s;
  opacity: ${props => props.$disabled ? 0.5 : 1};
  
  ${props => props.$active && `
    box-shadow: 0 0 20px rgba(158, 85, 148, 0.3);
  `}
  
  &:hover:not(:disabled) {
    border-color: rgba(158, 85, 148, 0.5);
  }
`;

const QuickDiscountBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${theme.colors.secondary};
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: ${theme.radius.sm};
`;

const SliderSection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const CounterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.md};
`;

const CounterBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${theme.background.glass};
  border: 2px solid ${theme.border.medium};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.4 : 1};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }
`;

const CounterDisplay = styled.div`
  font-size: 48px;
  font-weight: 800;
  color: white;
  min-width: 80px;
  text-align: center;
`;

const SliderInput = styled.input`
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: linear-gradient(90deg, 
    ${theme.colors.primary} 0%, 
    ${theme.colors.secondary} 100%);
  border-radius: ${theme.radius.full};
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s;
    
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
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: ${theme.spacing.sm};
`;

const InfoCard = styled.div`
  background: ${props => props.$accent 
    ? 'rgba(158, 85, 148, 0.2)' 
    : theme.background.glass};
  border: 1px solid ${props => props.$accent 
    ? 'rgba(158, 85, 148, 0.4)' 
    : theme.border.subtle};
  border-radius: ${theme.radius.md};
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
  font-size: 11px;
  color: ${theme.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoAmount = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: white;
`;

const ConfirmButton = styled(motion.button)`
  background: ${theme.gradient.purple};
  color: white;
  border: none;
  border-radius: ${theme.radius.full};
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  box-shadow: 0 4px 20px rgba(110, 72, 170, 0.4);
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  svg {
    font-size: 18px;
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: #f87171;
  font-size: 14px;
  
  strong {
    color: #fca5a5;
  }
`;

export default MultiPullMenu;

