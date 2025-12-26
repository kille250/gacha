/**
 * BaitShop - Fishing bait purchase interface
 *
 * Allows players to purchase different tiers of bait
 * to improve their fishing results.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { GiWorm, GiFishingLure, GiSquid } from 'react-icons/gi';
import { useBaitInventory } from '../../hooks/useGameEnhancements';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 215, 0, 0.1);
  padding: 8px 12px;
  border-radius: 20px;
  color: #ffd700;
  font-weight: 600;
`;

const BaitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
`;

const BaitCard = styled(motion.div)`
  background: ${props => props.$tier === 'premium'
    ? 'linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(103, 58, 183, 0.2) 100%)'
    : props.$tier === 'standard'
    ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(3, 169, 244, 0.2) 100%)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$tier === 'premium'
    ? 'rgba(156, 39, 176, 0.5)'
    : props.$tier === 'standard'
    ? 'rgba(33, 150, 243, 0.5)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const BaitIcon = styled.div`
  font-size: 3rem;
`;

const BaitName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
`;

const BaitStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
`;

const StatLabel = styled.span`
  color: #888;
`;

const StatValue = styled.span`
  color: ${props => props.$positive ? '#4caf50' : '#fff'};
`;

const InventoryBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #888;
`;

const PurchaseSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const QuantityButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const QuantityValue = styled.span`
  color: #fff;
  min-width: 30px;
  text-align: center;
  font-weight: 600;
`;

const BuyButton = styled(motion.button)`
  flex: 1;
  background: ${props => props.$affordable
    ? 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  border-radius: 8px;
  padding: 10px;
  color: ${props => props.$affordable ? '#fff' : '#666'};
  font-weight: 600;
  cursor: ${props => props.$affordable ? 'pointer' : 'default'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

const SuccessMessage = styled(motion.div)`
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: #fff;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const BAIT_DATA = {
  basic: {
    Icon: GiWorm,
    name: 'Basic Bait',
    tier: 'basic',
    price: 50,
    rareBonus: 0,
    epicBonus: 0,
    description: 'Standard worm bait'
  },
  standard: {
    Icon: GiFishingLure,
    name: 'Quality Bait',
    tier: 'standard',
    price: 200,
    rareBonus: 15,
    epicBonus: 5,
    description: 'Attracts better fish'
  },
  premium: {
    Icon: GiSquid,
    name: 'Premium Bait',
    tier: 'premium',
    price: 500,
    rareBonus: 30,
    epicBonus: 15,
    description: 'Irresistible to rare fish'
  }
};

export function BaitShop({ userPoints = 0 }) {
  const { inventory, loading, error, purchaseBait, refreshInventory } = useBaitInventory();
  const [quantities, setQuantities] = useState({ basic: 1, standard: 1, premium: 1 });
  const [successMessage, setSuccessMessage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  const updateQuantity = (baitType, delta) => {
    setQuantities(prev => ({
      ...prev,
      [baitType]: Math.max(1, Math.min(99, prev[baitType] + delta))
    }));
  };

  const handlePurchase = async (baitType) => {
    const quantity = quantities[baitType];
    const totalCost = BAIT_DATA[baitType].price * quantity;

    if (userPoints < totalCost || purchasing) return;

    setPurchasing(true);
    try {
      await purchaseBait(baitType, quantity);
      setSuccessMessage(`Purchased ${quantity}x ${BAIT_DATA[baitType].name}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await refreshInventory();
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Title>Loading bait shop...</Title>
      </Container>
    );
  }

  if (error) {
    return null;
  }

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>Bait Shop</Title>
          <PointsDisplay>
            <span>{userPoints.toLocaleString()}</span>
          </PointsDisplay>
        </Header>

        <BaitGrid>
          {Object.entries(BAIT_DATA).map(([type, bait]) => {
            const quantity = quantities[type];
            const totalCost = bait.price * quantity;
            const affordable = userPoints >= totalCost;
            const owned = inventory?.[type] || 0;

            return (
              <BaitCard
                key={type}
                $tier={bait.tier}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <BaitIcon><bait.Icon size={48} /></BaitIcon>
                <BaitName>{bait.name}</BaitName>

                <BaitStats>
                  <StatRow>
                    <StatLabel>Rare chance</StatLabel>
                    <StatValue $positive={bait.rareBonus > 0}>
                      {bait.rareBonus > 0 ? `+${bait.rareBonus}%` : 'Base'}
                    </StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>Epic chance</StatLabel>
                    <StatValue $positive={bait.epicBonus > 0}>
                      {bait.epicBonus > 0 ? `+${bait.epicBonus}%` : 'Base'}
                    </StatValue>
                  </StatRow>
                </BaitStats>

                <InventoryBadge>Owned: {owned}</InventoryBadge>

                <PurchaseSection>
                  <QuantityControl>
                    <QuantityButton
                      onClick={() => updateQuantity(type, -1)}
                      disabled={quantities[type] <= 1}
                      whileTap={{ scale: 0.9 }}
                    >
                      -
                    </QuantityButton>
                    <QuantityValue>{quantity}</QuantityValue>
                    <QuantityButton
                      onClick={() => updateQuantity(type, 1)}
                      disabled={quantities[type] >= 99}
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </QuantityButton>
                  </QuantityControl>

                  <BuyButton
                    $affordable={affordable}
                    onClick={() => handlePurchase(type)}
                    disabled={!affordable || purchasing}
                    whileHover={affordable ? { scale: 1.02 } : {}}
                    whileTap={affordable ? { scale: 0.98 } : {}}
                  >
                    {totalCost.toLocaleString()}
                  </BuyButton>
                </PurchaseSection>
              </BaitCard>
            );
          })}
        </BaitGrid>
      </Container>

      <AnimatePresence>
        {successMessage && (
          <SuccessMessage
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            {successMessage}
          </SuccessMessage>
        )}
      </AnimatePresence>
    </>
  );
}

export default BaitShop;
