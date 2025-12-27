/**
 * LevelUpNotification - Celebratory level up animation overlay
 *
 * Shows a dramatic full-screen animation when the player levels up,
 * highlighting new unlocks and rewards.
 */

import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaUnlock, FaArrowUp } from 'react-icons/fa';

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(88, 86, 214, 0.4),
                0 0 40px rgba(88, 86, 214, 0.2),
                0 0 60px rgba(175, 82, 222, 0.1);
  }
  50% {
    box-shadow: 0 0 40px rgba(88, 86, 214, 0.6),
                0 0 80px rgba(88, 86, 214, 0.4),
                0 0 120px rgba(175, 82, 222, 0.2);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  backdrop-filter: blur(8px);
`;

const Content = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 400px;
  text-align: center;
`;

const LevelCircle = styled(motion.div)`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${pulseGlow} 2s ease-in-out infinite;
`;

const LevelNumber = styled.span`
  font-size: 48px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
`;

const LevelUpText = styled(motion.h1)`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(
    90deg,
    #5856d6 0%,
    #af52de 25%,
    #ffd700 50%,
    #af52de 75%,
    #5856d6 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${shimmer} 3s linear infinite;
`;

const Subtitle = styled(motion.p)`
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
`;

const UnlocksContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

const UnlockCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(52, 199, 89, 0.15);
  border: 1px solid rgba(52, 199, 89, 0.4);
  border-radius: 12px;
`;

const UnlockIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52, 199, 89, 0.2);
  border-radius: 10px;
  color: #34c759;
  font-size: 18px;
`;

const UnlockInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const UnlockTitle = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #34c759;
  margin-bottom: 2px;
`;

const UnlockName = styled.span`
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
`;

const ContinueButton = styled(motion.button)`
  margin-top: 16px;
  padding: 14px 32px;
  min-height: 48px;
  min-width: 120px;
  background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(88, 86, 214, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

const ArrowIcon = styled(motion.div)`
  position: absolute;
  color: rgba(88, 86, 214, 0.6);
  font-size: 24px;
`;

const LevelUpNotification = ({
  isVisible,
  oldLevel,
  newLevel,
  unlocks = [],
  onDismiss
}) => {
  const { t } = useTranslation();
  const [showUnlocks, setShowUnlocks] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Show unlocks after initial animation
      const timer = setTimeout(() => setShowUnlocks(true), 800);
      return () => clearTimeout(timer);
    } else {
      setShowUnlocks(false);
    }
  }, [isVisible]);

  // Generate floating arrow particles (reduced count for better performance)
  const arrows = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    delay: Math.random() * 0.5
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
        >
          {/* Floating arrow particles */}
          {arrows.map((arrow) => (
            <ArrowIcon
              key={arrow.id}
              initial={{ y: 100, x: arrow.x, opacity: 0 }}
              animate={{
                y: [-100, -300],
                opacity: [0, 0.8, 0]
              }}
              transition={{
                duration: 2,
                delay: arrow.delay,
                repeat: Infinity,
                repeatDelay: 1
              }}
              style={{ bottom: 0 }}
            >
              <FaArrowUp />
            </ArrowIcon>
          ))}

          <Content onClick={(e) => e.stopPropagation()}>
            <LevelCircle
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.1
              }}
            >
              <LevelNumber>{newLevel}</LevelNumber>
            </LevelCircle>

            <LevelUpText
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('accountLevel.levelUp', 'Level Up!')}
            </LevelUpText>

            <Subtitle
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t('accountLevel.reachedLevel', 'You reached Account Level {{level}}!', { level: newLevel })}
            </Subtitle>

            {showUnlocks && unlocks.length > 0 && (
              <UnlocksContainer
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {unlocks.map((unlock, index) => (
                  <UnlockCard
                    key={unlock.id || index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <UnlockIcon>
                      <FaUnlock aria-hidden="true" />
                    </UnlockIcon>
                    <UnlockInfo>
                      <UnlockTitle>{t('accountLevel.newUnlock', 'New Unlock!')}</UnlockTitle>
                      <UnlockName>{unlock.name}</UnlockName>
                    </UnlockInfo>
                  </UnlockCard>
                ))}
              </UnlocksContainer>
            )}

            <ContinueButton
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: unlocks.length > 0 ? 0.6 : 0.5 }}
              onClick={onDismiss}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t('common.continue', 'Continue')}
            </ContinueButton>
          </Content>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default LevelUpNotification;
