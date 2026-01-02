/**
 * AchievementToast - Display component for achievement unlocks
 *
 * Shows an animated toast notification when a player unlocks an achievement.
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../design-system';
import { ACHIEVEMENTS, UI_TIMING } from '../../config/essenceTapConfig';
import {
  IconTrophy,
  IconGem,
  IconSparkles,
  IconFlame,
  IconCheckmark
} from '../../constants/icons';

// Animations
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const Container = styled(motion.div)`
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
`;

const ToastCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: linear-gradient(
    135deg,
    rgba(138, 43, 226, 0.95) 0%,
    rgba(168, 85, 247, 0.95) 50%,
    rgba(138, 43, 226, 0.95) 100%
  );
  border-radius: ${theme.radius.lg};
  box-shadow:
    0 4px 20px rgba(138, 43, 226, 0.4),
    0 0 40px rgba(168, 85, 247, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: ${pulse} 2s ease-in-out infinite;
  min-width: 280px;
  max-width: 400px;
`;

const IconContainer = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.3) 0%,
    rgba(255, 165, 0, 0.2) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 215, 0, 0.5);
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
`;

const Label = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
`;

const Title = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  background: linear-gradient(
    90deg,
    #FFD700 0%,
    #FFF 25%,
    #FFD700 50%,
    #FFF 75%,
    #FFD700 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${shimmer} 3s linear infinite;
`;

const Description = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
`;

// Icon mapping for achievement categories
const CATEGORY_ICONS = {
  basics: IconCheckmark,
  clicks: IconGem,
  generators: IconSparkles,
  prestige: IconFlame,
  luck: IconSparkles,
  combat: IconFlame,
  characters: IconGem,
  competitive: IconTrophy,
  skill: IconSparkles
};

const AchievementToast = memo(({ achievement, onComplete }) => {
  if (!achievement) return null;

  // Get achievement details from config or use provided data
  const achievementData = ACHIEVEMENTS[achievement.id] || achievement;
  const CategoryIcon = CATEGORY_ICONS[achievementData.category] || IconTrophy;

  return (
    <AnimatePresence>
      <Container
        initial={{ opacity: 0, y: -50, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: -30, x: '-50%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onAnimationComplete={() => {
          // Auto-dismiss after display time
          setTimeout(onComplete, UI_TIMING.achievementDisplayTime);
        }}
      >
        <ToastCard>
          <IconContainer>
            <CategoryIcon size={24} color="#FFD700" />
          </IconContainer>
          <Content>
            <Label>Achievement Unlocked!</Label>
            <Title>{achievementData.name || achievement.name}</Title>
            <Description>
              {achievementData.description || achievement.description}
            </Description>
          </Content>
        </ToastCard>
      </Container>
    </AnimatePresence>
  );
});

AchievementToast.displayName = 'AchievementToast';

export default AchievementToast;
