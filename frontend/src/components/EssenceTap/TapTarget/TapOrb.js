/**
 * TapOrb - The main clickable orb component
 *
 * Features:
 * - Prestige-based visual evolution
 * - Click handler with accessibility
 * - Idle breathing animation
 * - Critical and golden glow effects
 * - Mobile touch optimizations
 */

import React, { memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';
import { IconGem, IconSparkles } from '../../../constants/icons';
import { getOrbStyles, orbBreathe, orbGlow } from '../animations';
import { formatNumber } from '../../../hooks/useEssenceTap';

// Animations
const critGlow = keyframes`
  0% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 80px rgba(255, 215, 0, 0.8), 0 0 150px rgba(255, 215, 0, 0.5); }
  100% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.3); }
`;

const goldenGlow = keyframes`
  0% { box-shadow: 0 0 80px rgba(255, 215, 0, 0.8), 0 0 150px rgba(255, 215, 0, 0.5), 0 0 200px rgba(255, 165, 0, 0.3); }
  50% { box-shadow: 0 0 120px rgba(255, 215, 0, 1), 0 0 200px rgba(255, 215, 0, 0.7), 0 0 300px rgba(255, 165, 0, 0.5); }
  100% { box-shadow: 0 0 80px rgba(255, 215, 0, 0.8), 0 0 150px rgba(255, 215, 0, 0.5), 0 0 200px rgba(255, 165, 0, 0.3); }
`;

const TapButton = styled(motion.button)`
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -ms-touch-action: manipulation;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Apply prestige-based orb styles */
  ${props => getOrbStyles(props.$prestigeLevel || 0)}

  /* Idle breathing animation */
  ${props => !props.$isCrit && !props.$isGolden && css`
    animation: ${orbBreathe} ${4 - Math.min(props.$productionRate || 0, 3)}s ease-in-out infinite,
               ${orbGlow} 4s ease-in-out infinite;
  `}

  ${props => props.$isCrit && css`
    animation: ${critGlow} 0.3s ease-out !important;
  `}

  ${props => props.$isGolden && css`
    animation: ${goldenGlow} 0.5s ease-out !important;
    background: radial-gradient(circle at 30% 30%, rgba(255, 235, 150, 0.95), rgba(255, 200, 80, 0.9), rgba(200, 150, 50, 0.95)) !important;
  `}

  /* Outer glow ring */
  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.15);
    pointer-events: none;
    transition: all 0.3s ease;
  }

  &:hover::after {
    border-color: rgba(255, 255, 255, 0.25);
    inset: -8px;
  }

  /* Mobile touch optimizations */
  @media (hover: none) and (pointer: coarse) {
    &:active {
      transform: scale(0.92);
      transition: transform 0.05s ease-out;
    }
  }

  @media (min-width: ${theme.breakpoints.md}) {
    width: 280px;
    height: 280px;
  }
`;

const TapIcon = styled.div`
  font-size: 72px;
  color: white;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 2;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: 90px;
  }
`;

const TapLabel = styled.div`
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const ClickPowerLabel = styled.div`
  margin-top: 60px;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  span {
    color: #A855F7;
  }
`;

/**
 * TapOrb Component
 *
 * @param {number} prestigeLevel - Current prestige level for visual evolution
 * @param {boolean} isCrit - Whether the last click was a critical hit
 * @param {boolean} isGolden - Whether the last click was a golden essence
 * @param {number} productionRate - Normalized production rate (0-3) for animation speed
 * @param {number} clickPower - Current click power value
 * @param {function} onClick - Click handler
 * @param {object} buttonRef - Ref to the button element
 */
const TapOrb = memo(({
  prestigeLevel = 0,
  isCrit = false,
  isGolden = false,
  productionRate = 0,
  clickPower = 1,
  onClick,
  buttonRef
}) => {
  return (
    <>
      <TapButton
        ref={buttonRef}
        onClick={onClick}
        $isCrit={isCrit}
        $isGolden={isGolden}
        $prestigeLevel={prestigeLevel}
        $productionRate={productionRate}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        role="button"
        aria-label={`Tap to earn essence. Current power: ${formatNumber(clickPower)} per tap`}
        tabIndex={0}
      >
        <TapIcon>
          {isGolden ? <IconSparkles size={72} /> : <IconGem size={72} />}
        </TapIcon>
        <TapLabel>TAP TO EARN</TapLabel>
      </TapButton>

      <ClickPowerLabel>
        <span>+{formatNumber(clickPower)}</span> per tap
      </ClickPowerLabel>
    </>
  );
});

TapOrb.displayName = 'TapOrb';

export default TapOrb;
