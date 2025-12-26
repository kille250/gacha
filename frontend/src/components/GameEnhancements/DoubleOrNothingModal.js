/**
 * DoubleOrNothingModal - Risk/reward gambling modal for fishing
 *
 * After catching a fish, players can risk their catch
 * for a chance at double rewards.
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFish, FaCoins, FaHeartBroken } from 'react-icons/fa';
import { GiPartyPopper } from 'react-icons/gi';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.2);
`;

const Title = styled.h2`
  color: #ffd700;
  margin: 0 0 8px 0;
  font-size: 1.5rem;
`;

const Subtitle = styled.div`
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 24px;
`;

const FishDisplay = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`;

const FishIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 8px;
`;

const FishName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 4px;
`;

const FishValue = styled.div`
  color: #4caf50;
  font-size: 1.2rem;
  font-weight: 700;
`;

const MultiplierDisplay = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const MultiplierBadge = styled.div`
  background: ${props => props.$active
    ? 'linear-gradient(135deg, #ffd700 0%, #ffab00 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? '#1a1a2e' : '#666'};
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 1.1rem;
`;

const OddsDisplay = styled.div`
  background: rgba(255, 87, 34, 0.1);
  border: 1px solid rgba(255, 87, 34, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 24px;
`;

const OddsLabel = styled.div`
  color: #ff5722;
  font-weight: 600;
  font-size: 0.9rem;
`;

const OddsValue = styled.div`
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled(motion.button)`
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
`;

const DoubleButton = styled(Button)`
  background: linear-gradient(135deg, #ffd700 0%, #ffab00 100%);
  color: #1a1a2e;
`;

const CashOutButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.2);
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const CoinFlipContainer = styled(motion.div)`
  padding: 40px;
`;

const Coin = styled(motion.div)`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  background: linear-gradient(135deg, #ffd700 0%, #ffab00 100%);
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
`;

const FlipText = styled.div`
  color: #fff;
  font-size: 1.2rem;
  animation: ${pulse} 1s ease-in-out infinite;
`;

const ResultContainer = styled(motion.div)`
  padding: 20px;
`;

const ResultIcon = styled(motion.div)`
  font-size: 5rem;
  margin-bottom: 16px;
`;

const ResultText = styled.div`
  color: ${props => props.$win ? '#4caf50' : '#f44336'};
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const ResultValue = styled.div`
  color: #fff;
  font-size: 1.2rem;
`;

const StreakBadge = styled.div`
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  margin-top: 16px;
  display: inline-block;
`;

export function DoubleOrNothingModal({
  fish,
  currentValue,
  currentMultiplier = 1,
  winChance = 50,
  maxStreak = 5,
  onDouble,
  onCashOut,
  onClose
}) {
  const [state, setState] = useState('choice'); // choice, flipping, result
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);

  const potentialValue = currentValue * 2;
  const nextMultiplier = currentMultiplier * 2;
  const atMaxStreak = streak >= maxStreak;

  const handleDouble = useCallback(async () => {
    if (atMaxStreak) return;

    setState('flipping');

    // Simulate coin flip animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Determine result (this should actually come from backend)
    const won = Math.random() * 100 < winChance;
    setResult(won);

    if (won) {
      setStreak(s => s + 1);
    }

    setState('result');

    // Call the appropriate callback
    if (won) {
      onDouble?.(potentialValue, nextMultiplier);
    }
  }, [atMaxStreak, winChance, potentialValue, nextMultiplier, onDouble]);

  const handleCashOut = () => {
    onCashOut?.(currentValue, currentMultiplier);
    onClose?.();
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Modal
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <AnimatePresence mode="wait">
          {state === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Title>Double or Nothing?</Title>
              <Subtitle>Risk your catch for double rewards!</Subtitle>

              <FishDisplay>
                <FishIcon><FaFish size={64} /></FishIcon>
                <FishName>{fish?.name || 'Your Catch'}</FishName>
                <FishValue>{currentValue.toLocaleString()} Points</FishValue>
              </FishDisplay>

              <MultiplierDisplay>
                <MultiplierBadge $active={false}>Current</MultiplierBadge>
                <MultiplierBadge $active={true}>x{currentMultiplier}</MultiplierBadge>
              </MultiplierDisplay>

              <OddsDisplay>
                <OddsLabel>Win Chance</OddsLabel>
                <OddsValue>{winChance}%</OddsValue>
              </OddsDisplay>

              {streak > 0 && (
                <StreakBadge>
                  {streak} Win Streak!
                </StreakBadge>
              )}

              <div style={{ marginBottom: 16 }} />

              <ButtonGroup>
                <CashOutButton
                  onClick={handleCashOut}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cash Out
                </CashOutButton>
                {!atMaxStreak && (
                  <DoubleButton
                    onClick={handleDouble}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Double It!
                  </DoubleButton>
                )}
              </ButtonGroup>

              {atMaxStreak && (
                <div style={{ marginTop: 12, color: '#ffd700', fontSize: '0.85rem' }}>
                  Maximum streak reached! Cash out now.
                </div>
              )}
            </motion.div>
          )}

          {state === 'flipping' && (
            <CoinFlipContainer
              key="flipping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Coin
                animate={{
                  rotateY: [0, 1800],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut'
                }}
              >
                <FaCoins size={48} color="#1a1a2e" />
              </Coin>
              <FlipText>Flipping...</FlipText>
            </CoinFlipContainer>
          )}

          {state === 'result' && (
            <ResultContainer
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ResultIcon
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                {result ? <GiPartyPopper size={80} color="#4caf50" /> : <FaHeartBroken size={80} color="#f44336" />}
              </ResultIcon>

              <ResultText $win={result}>
                {result ? 'YOU WIN!' : 'You Lost...'}
              </ResultText>

              <ResultValue>
                {result
                  ? `${potentialValue.toLocaleString()} Points!`
                  : 'Better luck next time!'}
              </ResultValue>

              {result && streak > 0 && (
                <StreakBadge>
                  {streak} Win Streak!
                </StreakBadge>
              )}

              <div style={{ marginTop: 24 }}>
                {result ? (
                  <ButtonGroup>
                    <CashOutButton
                      onClick={handleCashOut}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cash Out ({potentialValue.toLocaleString()})
                    </CashOutButton>
                    {streak < maxStreak && (
                      <DoubleButton
                        onClick={() => setState('choice')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Go Again!
                      </DoubleButton>
                    )}
                  </ButtonGroup>
                ) : (
                  <CashOutButton
                    onClick={() => onClose?.()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: '100%' }}
                  >
                    Close
                  </CashOutButton>
                )}
              </div>
            </ResultContainer>
          )}
        </AnimatePresence>
      </Modal>
    </Overlay>
  );
}

export default DoubleOrNothingModal;
