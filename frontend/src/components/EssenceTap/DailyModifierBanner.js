/**
 * DailyModifierBanner - Displays the current daily modifier for Essence Tap
 *
 * Features:
 * - Shows active daily bonus
 * - Countdown to next modifier
 * - Visual effects based on modifier type
 */

import React, { useState, useEffect, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import {
  IconStar,
  IconStorm,
  IconTap,
  IconPoints,
  IconLightning,
  IconMagic,
  IconFlame
} from '../../constants/icons';
// Import base modifier config to ensure effects stay in sync
import { DAILY_MODIFIERS as BASE_DAILY_MODIFIERS } from '../../config/essenceTapConfig';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const Banner = styled(motion.div)`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$gradient || 'linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(236, 72, 153, 0.2))'};
  border: 1px solid ${props => props.$borderColor || 'rgba(138, 43, 226, 0.4)'};
  border-radius: ${theme.radius.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    text-align: center;
  }
`;

const ModifierInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const ModifierIcon = styled.div`
  font-size: 28px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ModifierText = styled.div`
  display: flex;
  flex-direction: column;
`;

const ModifierTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  background: ${props => props.$textGradient || 'linear-gradient(90deg, #A855F7, #EC4899)'};
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const ModifierDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const Countdown = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  @media (max-width: ${theme.breakpoints.md}) {
    align-items: center;
  }
`;

const CountdownLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
`;

const CountdownTime = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  font-variant-numeric: tabular-nums;
`;

// UI-specific styling data for daily modifiers (extends base config from essenceTapConfig)
const MODIFIER_UI_DATA = {
  0: { // Sunday
    IconComponent: IconStar,
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    textGradient: 'linear-gradient(90deg, #FBBF24, #F59E0B)'
  },
  1: { // Monday
    IconComponent: IconStorm,
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    textGradient: 'linear-gradient(90deg, #06B6D4, #3B82F6)'
  },
  2: { // Tuesday
    IconComponent: IconTap,
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2))',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    textGradient: 'linear-gradient(90deg, #A855F7, #8B5CF6)'
  },
  3: { // Wednesday
    IconComponent: IconPoints,
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.2))',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    textGradient: 'linear-gradient(90deg, #10B981, #34D399)'
  },
  4: { // Thursday
    IconComponent: IconLightning,
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    textGradient: 'linear-gradient(90deg, #F59E0B, #EF4444)'
  },
  5: { // Friday
    IconComponent: IconMagic,
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(132, 204, 22, 0.2))',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    textGradient: 'linear-gradient(90deg, #22C55E, #84CC16)'
  },
  6: { // Saturday
    IconComponent: IconFlame,
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(236, 72, 153, 0.2))',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    textGradient: 'linear-gradient(90deg, #EF4444, #EC4899)'
  }
};

// Merge base config with UI-specific data
const DAILY_MODIFIERS = Object.fromEntries(
  Object.entries(BASE_DAILY_MODIFIERS).map(([day, baseConfig]) => [
    day,
    { ...baseConfig, ...MODIFIER_UI_DATA[day] }
  ])
);

const DailyModifierBanner = memo(({ onModifierChange }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState('');
  const [currentModifier, setCurrentModifier] = useState(null);

  useEffect(() => {
    const updateModifier = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const modifier = DAILY_MODIFIERS[dayOfWeek];
      setCurrentModifier(modifier);
      onModifierChange?.(modifier);

      // Calculate time until next day
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow - now;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateModifier();
    const interval = setInterval(updateModifier, 1000);

    return () => clearInterval(interval);
  }, [onModifierChange]);

  if (!currentModifier) return null;

  return (
    <Banner
      $gradient={currentModifier.gradient}
      $borderColor={currentModifier.borderColor}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ModifierInfo>
        <ModifierIcon><currentModifier.IconComponent size={28} /></ModifierIcon>
        <ModifierText>
          <ModifierTitle $textGradient={currentModifier.textGradient}>
            {t(`essenceTap.modifiers.${currentModifier.id}.name`, { defaultValue: currentModifier.name })}
          </ModifierTitle>
          <ModifierDescription>
            {t(`essenceTap.modifiers.${currentModifier.id}.description`, { defaultValue: currentModifier.description })}
          </ModifierDescription>
        </ModifierText>
      </ModifierInfo>

      <Countdown>
        <CountdownLabel>
          {t('essenceTap.nextModifier', { defaultValue: 'Next modifier in' })}
        </CountdownLabel>
        <CountdownTime>{countdown}</CountdownTime>
      </Countdown>
    </Banner>
  );
});

DailyModifierBanner.displayName = 'DailyModifierBanner';

// Export modifiers for use in calculations
export { DAILY_MODIFIERS };
export default DailyModifierBanner;
