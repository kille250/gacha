/**
 * TapTarget - Main click/tap area for the Essence Tap game
 *
 * Features:
 * - Large, satisfying tap target
 * - Visual feedback on click (pulse, particles)
 * - Critical hit effects
 * - Golden essence effects
 * - Combo indicator
 */

import React, { useState, useCallback, useRef, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';

// Animations
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 30px rgba(138, 43, 226, 0.3), 0 0 60px rgba(138, 43, 226, 0.1); }
  50% { box-shadow: 0 0 50px rgba(138, 43, 226, 0.5), 0 0 100px rgba(138, 43, 226, 0.2); }
`;

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

const floatUp = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-80px) scale(1.2);
  }
`;

const TapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  position: relative;
`;

const TapButton = styled(motion.button)`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  position: relative;
  background: radial-gradient(circle at 30% 30%, rgba(160, 100, 255, 0.9), rgba(100, 50, 200, 0.8), rgba(60, 20, 140, 0.9));
  animation: ${glow} 3s ease-in-out infinite;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  ${props => props.$isCrit && css`
    animation: ${critGlow} 0.3s ease-out;
  `}

  ${props => props.$isGolden && css`
    animation: ${goldenGlow} 0.5s ease-out;
    background: radial-gradient(circle at 30% 30%, rgba(255, 235, 150, 0.95), rgba(255, 200, 80, 0.9), rgba(200, 150, 50, 0.95));
  `}

  &:active {
    transform: scale(0.95);
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), transparent 50%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    pointer-events: none;
  }

  @media (min-width: ${theme.breakpoints.md}) {
    width: 220px;
    height: 220px;
  }
`;

const TapIcon = styled.div`
  font-size: 64px;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  pointer-events: none;

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: 80px;
  }
`;

const TapLabel = styled.div`
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
`;

const FloatingNumber = styled(motion.div)`
  position: absolute;
  font-size: ${props => props.$isGolden ? '32px' : props.$isCrit ? '26px' : '20px'};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isGolden ? '#FFD700' : props.$isCrit ? '#FFC107' : '#A855F7'};
  text-shadow: ${props =>
    props.$isGolden ? '0 0 20px rgba(255, 215, 0, 0.8), 0 2px 4px rgba(0,0,0,0.5)' :
    props.$isCrit ? '0 0 15px rgba(255, 193, 7, 0.6), 0 2px 4px rgba(0,0,0,0.5)' :
    '0 2px 4px rgba(0,0,0,0.3)'};
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
`;

const ComboIndicator = styled(motion.div)`
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.6);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$combo > 1.5 ? '#FFC107' : props.$combo > 1.2 ? '#A855F7' : 'white'};
`;

const ClickPowerLabel = styled.div`
  margin-top: ${theme.spacing.md};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const TapTarget = memo(({
  onClick,
  clickPower = 1,
  lastClickResult,
  comboMultiplier = 1
}) => {
  const [floatingNumbers, setFloatingNumbers] = useState([]);
  const nextIdRef = useRef(0);
  const buttonRef = useRef(null);

  const handleClick = useCallback((e) => {
    // Get click position relative to button center
    const rect = buttonRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 90;
    const centerY = rect ? rect.height / 2 : 90;
    const clickX = e.nativeEvent.offsetX || centerX;
    const clickY = e.nativeEvent.offsetY || centerY;

    // Random offset from click position
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = -20 + (Math.random() - 0.5) * 20;

    onClick?.();

    // Add floating number at click position
    if (lastClickResult) {
      const id = nextIdRef.current++;
      setFloatingNumbers(prev => [...prev, {
        id,
        x: clickX + offsetX,
        y: clickY + offsetY,
        value: lastClickResult.essenceGained,
        isCrit: lastClickResult.isCrit,
        isGolden: lastClickResult.isGolden
      }]);

      // Remove after animation
      setTimeout(() => {
        setFloatingNumbers(prev => prev.filter(n => n.id !== id));
      }, 600);
    }
  }, [onClick, lastClickResult]);

  return (
    <TapContainer>
      <AnimatePresence>
        {comboMultiplier > 1.05 && (
          <ComboIndicator
            $combo={comboMultiplier}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Combo x{comboMultiplier.toFixed(1)}
          </ComboIndicator>
        )}
      </AnimatePresence>

      <TapButton
        ref={buttonRef}
        onClick={handleClick}
        $isCrit={lastClickResult?.isCrit}
        $isGolden={lastClickResult?.isGolden}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <TapIcon>
          {lastClickResult?.isGolden ? '✨' : '💎'}
        </TapIcon>
        <TapLabel>TAP!</TapLabel>

        <AnimatePresence>
          {floatingNumbers.map(num => (
            <FloatingNumber
              key={num.id}
              $isCrit={num.isCrit}
              $isGolden={num.isGolden}
              initial={{ opacity: 1, y: 0, x: num.x - 40, scale: 1 }}
              animate={{ opacity: 0, y: -80, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                left: num.x - 40,
                top: num.y - 10
              }}
            >
              +{formatNumber(num.value)}
              {num.isGolden && ' GOLDEN!'}
              {num.isCrit && !num.isGolden && ' CRIT!'}
            </FloatingNumber>
          ))}
        </AnimatePresence>
      </TapButton>

      <ClickPowerLabel>
        +{formatNumber(clickPower)} per tap
      </ClickPowerLabel>
    </TapContainer>
  );
});

TapTarget.displayName = 'TapTarget';

export default TapTarget;
