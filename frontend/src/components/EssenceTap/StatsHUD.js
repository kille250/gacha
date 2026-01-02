/**
 * StatsHUD - Fixed floating stats display for Essence Tap
 *
 * Features:
 * - Animated essence counter with counting effect
 * - Icon + value stat items
 * - Glassmorphism styling
 * - Character bonus quick-access
 * - Production rate indicator
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';
import { formatNumber, formatPerSecond } from '../../hooks/useEssenceTap';
import {
  IconGem,
  IconLightning,
  IconTarget,
  IconSparkles,
  IconCategoryPerson,
  IconLevelUp
} from '../../constants/icons';
import { glassmorphism, statsHudSlide, valueFlash } from './animations';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const HUDContainer = styled(motion.div)`
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: fit-content;
  z-index: 100;
  ${glassmorphism}
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
  max-width: calc(100vw - 32px);
  overflow-x: auto;

  /* Hide scrollbar */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;

  @media (max-width: ${theme.breakpoints.md}) {
    top: auto;
    bottom: 80px;
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    gap: ${theme.spacing.md};
  }
`;

const EssenceSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
`;

const EssenceValue = styled.div`
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #A855F7, #EC4899, #F59E0B);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
  white-space: nowrap;

  ${props => props.$flash && css`
    animation: ${valueFlash} 0.3s ease-out;
  `}
`;

const EssenceLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Divider = styled.div`
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.md};
  transition: all 0.2s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  ${props => props.$clickable && `
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs};
  }
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color || '#A855F7'};
  font-size: 16px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 14px;
  }
`;

const StatValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color || theme.colors.text};
  white-space: nowrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const StatLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  margin-left: 2px;

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const CharacterButton = styled(StatItem)`
  border: 1px solid rgba(16, 185, 129, 0.3);
  cursor: pointer;

  &:hover {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.5);
  }
`;

const ProductionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => {
    if (props.$rate >= 1000000) return '#FFD700';
    if (props.$rate >= 100000) return '#C084FC';
    if (props.$rate >= 10000) return '#A855F7';
    return theme.colors.textSecondary;
  }};
`;

/**
 * Animated number counter hook
 */
const useAnimatedNumber = (value, duration = 500) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();

    if (Math.abs(endValue - startValue) < 1) {
      setDisplayValue(endValue);
      prevValueRef.current = endValue;
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return displayValue;
};

const StatsHUD = memo(({
  essence = 0,
  productionPerSecond = 0,
  clickPower = 1,
  critChance = 0,
  assignedCharacters = [],
  maxCharacters = 5,
  characterBonus = 1,
  onCharacterClick
}) => {
  const animatedEssence = useAnimatedNumber(essence, 300);
  const [essenceFlash, setEssenceFlash] = useState(false);
  const prevEssenceRef = useRef(essence);

  // Flash effect when essence increases significantly
  useEffect(() => {
    if (essence > prevEssenceRef.current + 100) {
      setEssenceFlash(true);
      setTimeout(() => setEssenceFlash(false), 300);
    }
    prevEssenceRef.current = essence;
  }, [essence]);

  return (
    <HUDContainer
      variants={statsHudSlide}
      initial="initial"
      animate="animate"
    >
      {/* Main Essence Counter */}
      <EssenceSection>
        <EssenceValue $flash={essenceFlash}>
          {formatNumber(Math.floor(animatedEssence))}
        </EssenceValue>
        <EssenceLabel>Essence</EssenceLabel>
      </EssenceSection>

      <Divider />

      {/* Production Rate */}
      <StatItem>
        <StatIcon $color="#10B981">
          <IconLevelUp size={16} />
        </StatIcon>
        <ProductionIndicator $rate={productionPerSecond}>
          <StatValue $color="inherit">
            {formatPerSecond(productionPerSecond)}
          </StatValue>
        </ProductionIndicator>
      </StatItem>

      {/* Click Power */}
      <StatItem>
        <StatIcon $color="#A855F7">
          <IconLightning size={16} />
        </StatIcon>
        <StatValue>+{formatNumber(clickPower)}</StatValue>
        <StatLabel>click</StatLabel>
      </StatItem>

      {/* Crit Chance */}
      <StatItem>
        <StatIcon $color="#FCD34D">
          <IconTarget size={16} />
        </StatIcon>
        <StatValue $color="#FCD34D">
          {(critChance * 100).toFixed(1)}%
        </StatValue>
        <StatLabel>crit</StatLabel>
      </StatItem>

      <Divider />

      {/* Character Bonus */}
      <CharacterButton onClick={onCharacterClick} $clickable>
        <StatIcon $color="#10B981">
          <IconCategoryPerson size={16} />
        </StatIcon>
        <StatValue $color="#10B981">
          {assignedCharacters.length}/{maxCharacters}
        </StatValue>
        <StatValue style={{ fontSize: '11px', opacity: 0.8 }}>
          x{characterBonus.toFixed(2)}
        </StatValue>
      </CharacterButton>
    </HUDContainer>
  );
});

StatsHUD.displayName = 'StatsHUD';

export default StatsHUD;
