/**
 * FatePointsDisplay - Fate points accumulation and exchange
 *
 * Shows fate points earned from pulling and allows
 * exchange for guaranteed characters.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaHeart, FaCrown, FaSync, FaMagic } from 'react-icons/fa';
import { useFatePoints } from '../../hooks/useGameEnhancements';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1px solid rgba(156, 39, 176, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PointsCounter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(103, 58, 183, 0.2) 100%);
  padding: 8px 16px;
  border-radius: 20px;
`;

const PointsIcon = styled.span`
  font-size: 1.2rem;
`;

const PointsValue = styled.span`
  color: #ba68c8;
  font-weight: 700;
  font-size: 1.1rem;
`;

const ProgressSection = styled.div`
  margin-bottom: 20px;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
`;

const ProgressText = styled.span`
  color: #888;
`;

const ProgressCount = styled.span`
  color: #ba68c8;
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  height: 12px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  background: linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%);
  height: 100%;
  border-radius: 10px;
`;

const ExchangeSection = styled.div`
  margin-top: 16px;
`;

const ExchangeTitle = styled.div`
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 12px;
`;

const ExchangeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const ExchangeCard = styled(motion.div)`
  background: ${props => props.$affordable
    ? 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(103, 58, 183, 0.15) 100%)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px solid ${props => props.$affordable
    ? 'rgba(156, 39, 176, 0.4)'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: ${props => props.$affordable ? 'pointer' : 'default'};
  opacity: ${props => props.$affordable ? 1 : 0.5};
  transition: all 0.2s ease;

  &:hover {
    ${props => props.$affordable && `
      border-color: rgba(156, 39, 176, 0.6);
      transform: translateY(-2px);
    `}
  }
`;

const ItemIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 8px;
`;

const ItemName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
`;

const ItemCost = styled.div`
  color: #ba68c8;
  font-size: 0.8rem;
  font-weight: 600;
`;

const ExchangeModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 28px;
  max-width: 360px;
  width: 90%;
  text-align: center;
  border: 2px solid rgba(156, 39, 176, 0.4);
`;

const ModalIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
`;

const ModalTitle = styled.div`
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const ModalDesc = styled.div`
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
`;

const ModalCost = styled.div`
  background: rgba(156, 39, 176, 0.2);
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const CostLabel = styled.div`
  color: #888;
  font-size: 0.8rem;
`;

const CostValue = styled.div`
  color: #ba68c8;
  font-size: 1.4rem;
  font-weight: 700;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled(motion.button)`
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
`;

const ExchangeButton = styled(Button)`
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  color: #fff;
`;

const CancelButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
`;

const InfoBox = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 0.8rem;
  color: #888;
`;

const EXCHANGE_OPTIONS = [
  {
    id: 'rare_selector',
    Icon: FaTicketAlt,
    name: 'Rare Selector',
    cost: 100,
    description: 'Choose any rare character'
  },
  {
    id: 'epic_selector',
    Icon: FaHeart,
    name: 'Epic Selector',
    cost: 300,
    description: 'Choose any epic character'
  },
  {
    id: 'legendary_selector',
    Icon: FaCrown,
    name: 'Legendary Selector',
    cost: 600,
    description: 'Choose any legendary character'
  },
  {
    id: 'banner_pity_reset',
    Icon: FaSync,
    name: 'Pity Reset',
    cost: 150,
    description: 'Reset pity to 50% of max'
  }
];

export function FatePointsDisplay({ bannerId = null }) {
  const { fatePoints, loading, error, exchangePoints, refreshFatePoints } = useFatePoints(bannerId);
  const [selectedItem, setSelectedItem] = useState(null);
  const [exchanging, setExchanging] = useState(false);

  if (loading) {
    return (
      <Container>
        <Title>Loading fate points...</Title>
      </Container>
    );
  }

  if (error || !fatePoints) {
    return null;
  }

  const { points, pointsThisWeek, weeklyMax } = fatePoints;

  const handleExchange = async () => {
    if (!selectedItem || exchanging) return;

    setExchanging(true);
    try {
      await exchangePoints(selectedItem.id);
      await refreshFatePoints();
      setSelectedItem(null);
    } catch (err) {
      console.error('Exchange failed:', err);
    } finally {
      setExchanging(false);
    }
  };

  const weeklyProgress = (pointsThisWeek / weeklyMax) * 100;

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>Fate Points</Title>
          <PointsCounter>
            <PointsIcon><FaMagic size={16} /></PointsIcon>
            <PointsValue>{points}</PointsValue>
          </PointsCounter>
        </Header>

        <ProgressSection>
          <ProgressLabel>
            <ProgressText>Weekly Earnings</ProgressText>
            <ProgressCount>{pointsThisWeek} / {weeklyMax}</ProgressCount>
          </ProgressLabel>
          <ProgressBar>
            <ProgressFill
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(weeklyProgress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </ProgressBar>
        </ProgressSection>

        <ExchangeSection>
          <ExchangeTitle>Exchange for Rewards</ExchangeTitle>
          <ExchangeGrid>
            {EXCHANGE_OPTIONS.map(option => {
              const affordable = points >= option.cost;
              return (
                <ExchangeCard
                  key={option.id}
                  $affordable={affordable}
                  onClick={() => affordable && setSelectedItem(option)}
                  whileHover={affordable ? { scale: 1.02 } : {}}
                  whileTap={affordable ? { scale: 0.98 } : {}}
                >
                  <ItemIcon><option.Icon size={40} /></ItemIcon>
                  <ItemName>{option.name}</ItemName>
                  <ItemCost>{option.cost} FP</ItemCost>
                </ExchangeCard>
              );
            })}
          </ExchangeGrid>
        </ExchangeSection>

        <InfoBox>
          Earn Fate Points by pulling on banners. 1 pull = 1 FP. Weekly cap ensures fair progression.
        </InfoBox>
      </Container>

      <AnimatePresence>
        {selectedItem && (
          <ExchangeModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalIcon><selectedItem.Icon size={64} /></ModalIcon>
              <ModalTitle>{selectedItem.name}</ModalTitle>
              <ModalDesc>{selectedItem.description}</ModalDesc>

              <ModalCost>
                <CostLabel>Cost</CostLabel>
                <CostValue>{selectedItem.cost} Fate Points</CostValue>
              </ModalCost>

              <ButtonGroup>
                <CancelButton
                  onClick={() => setSelectedItem(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </CancelButton>
                <ExchangeButton
                  onClick={handleExchange}
                  disabled={exchanging}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {exchanging ? 'Exchanging...' : 'Exchange'}
                </ExchangeButton>
              </ButtonGroup>
            </ModalContent>
          </ExchangeModal>
        )}
      </AnimatePresence>
    </>
  );
}

export default FatePointsDisplay;
