/**
 * TapTarget - Enhanced main click/tap area for the Essence Tap game
 *
 * Composed from smaller focused components:
 * - TapOrb: Main clickable orb with prestige evolution
 * - ParticleCanvas: PIXI.js particle effects system
 * - ComboIndicator: Combo multiplier display
 * - EssenceDisplay: Floating essence numbers
 *
 * Features:
 * - Large, satisfying tap target with visual feedback
 * - Critical hit and golden essence effects
 * - Haptic feedback for mobile devices
 * - Screen shake on powerful hits
 * - Pulse rings on clicks
 */

import React, { useState, useCallback, useRef, memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { theme } from '../../../design-system';
import { UI_TIMING } from '../../../config/essenceTapConfig';
import TapOrb from './TapOrb';
import ParticleCanvas from './ParticleCanvas';
import ComboIndicator from './ComboIndicator';
import EssenceDisplay from './EssenceDisplay';

// Animations
const screenShake = keyframes`
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-3px, -2px); }
  20% { transform: translate(3px, 2px); }
  30% { transform: translate(-2px, 1px); }
  40% { transform: translate(2px, -1px); }
  50% { transform: translate(-1px, 2px); }
  60% { transform: translate(1px, -2px); }
  70% { transform: translate(-1px, 1px); }
  80% { transform: translate(1px, -1px); }
  90% { transform: translate(0, 1px); }
`;

const goldenBurst = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.7; }
  100% { transform: scale(2); opacity: 0; }
`;

const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
`;

const TapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  position: relative;
  min-height: 350px;

  ${props => props.$shake && css`
    animation: ${screenShake} 0.3s ease-out;
  `}

  @media (min-width: ${theme.breakpoints.md}) {
    min-height: 400px;
  }
`;

const OrbWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GoldenBurstRing = styled.div`
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 4px solid rgba(255, 215, 0, 0.8);
  pointer-events: none;
  animation: ${goldenBurst} 0.5s ease-out forwards;
  z-index: 4;

  @media (min-width: ${theme.breakpoints.md}) {
    width: 280px;
    height: 280px;
  }
`;

const PulseRing = styled.div`
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 2px solid ${props => props.$color || 'rgba(168, 85, 247, 0.6)'};
  pointer-events: none;
  animation: ${pulseRing} 0.4s ease-out forwards;
  z-index: 3;

  @media (min-width: ${theme.breakpoints.md}) {
    width: 280px;
    height: 280px;
  }
`;

/**
 * TapTarget Main Component
 *
 * @param {function} onClick - Click handler
 * @param {number} clickPower - Current click power value
 * @param {object} lastClickResult - Result of last click (essenceGained, isCrit, isGolden)
 * @param {number} comboMultiplier - Current combo multiplier
 * @param {number} prestigeLevel - Current prestige level
 * @param {number} productionRate - Production rate for animation speed
 */
const TapTarget = memo(({
  onClick,
  clickPower = 1,
  lastClickResult,
  comboMultiplier = 1,
  prestigeLevel = 0,
  productionRate = 0
}) => {
  const [floatingNumbers, setFloatingNumbers] = useState([]);
  const [pulseRings, setPulseRings] = useState([]);
  const [showGoldenBurst, setShowGoldenBurst] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const nextIdRef = useRef(0);
  const pulseIdRef = useRef(0);
  const buttonRef = useRef(null);
  const spawnParticlesRef = useRef(null);

  // Store particle spawn function from ParticleCanvas
  const handleParticleReady = useCallback((spawnFn) => {
    spawnParticlesRef.current = spawnFn;
  }, []);

  // Haptic feedback for mobile
  const triggerHaptic = useCallback((type = 'light') => {
    if (window.navigator && window.navigator.vibrate) {
      switch (type) {
        case 'heavy':
          window.navigator.vibrate([30, 10, 30]);
          break;
        case 'medium':
          window.navigator.vibrate(20);
          break;
        case 'light':
        default:
          window.navigator.vibrate(10);
          break;
      }
    }
  }, []);

  const handleClick = useCallback((e) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 110;
    const centerY = rect ? rect.height / 2 : 110;
    const clickX = e.nativeEvent.offsetX || centerX;
    const clickY = e.nativeEvent.offsetY || centerY;

    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = -30 + (Math.random() - 0.5) * 30;

    onClick?.();

    // Trigger haptic feedback and visual effects
    if (lastClickResult?.isGolden) {
      triggerHaptic('heavy');
      setShowGoldenBurst(true);
      setShakeScreen(true);
      setTimeout(() => setShowGoldenBurst(false), 500);
      setTimeout(() => setShakeScreen(false), 300);
    } else if (lastClickResult?.isCrit) {
      triggerHaptic('medium');
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 200);
      const pulseId = pulseIdRef.current++;
      setPulseRings(prev => [...prev, { id: pulseId, color: 'rgba(255, 193, 7, 0.6)' }]);
      setTimeout(() => setPulseRings(prev => prev.filter(r => r.id !== pulseId)), 400);
    } else {
      triggerHaptic('light');
      const pulseId = pulseIdRef.current++;
      setPulseRings(prev => [...prev, { id: pulseId, color: 'rgba(168, 85, 247, 0.4)' }]);
      setTimeout(() => setPulseRings(prev => prev.filter(r => r.id !== pulseId)), 400);
    }

    // Spawn particles at click position
    if (spawnParticlesRef.current) {
      const canvasX = 250 + (clickX - centerX);
      const canvasY = 250 + (clickY - centerY);
      spawnParticlesRef.current(canvasX, canvasY, lastClickResult?.isCrit, lastClickResult?.isGolden);
    }

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

      setTimeout(() => {
        setFloatingNumbers(prev => prev.filter(n => n.id !== id));
      }, UI_TIMING.floatingNumberDuration);
    }
  }, [onClick, lastClickResult, triggerHaptic]);

  // Normalize production rate for animation speed (0-3 range)
  const normalizedProductionRate = Math.min(Math.log10(productionRate + 1) / 2, 3);

  return (
    <TapContainer $shake={shakeScreen}>
      <OrbWrapper>
        {/* Pixi.js particle canvas */}
        <ParticleCanvas onReady={handleParticleReady} />

        {/* Pulse rings for click feedback */}
        {pulseRings.map(ring => (
          <PulseRing key={ring.id} $color={ring.color} />
        ))}

        {/* Golden burst effect */}
        {showGoldenBurst && <GoldenBurstRing />}

        {/* Combo indicator */}
        <ComboIndicator comboMultiplier={comboMultiplier} />

        {/* Main orb */}
        <TapOrb
          prestigeLevel={prestigeLevel}
          isCrit={lastClickResult?.isCrit}
          isGolden={lastClickResult?.isGolden}
          productionRate={normalizedProductionRate}
          clickPower={clickPower}
          onClick={handleClick}
          buttonRef={buttonRef}
        />

        {/* Floating essence numbers */}
        <EssenceDisplay floatingNumbers={floatingNumbers} />
      </OrbWrapper>
    </TapContainer>
  );
});

TapTarget.displayName = 'TapTarget';

export default TapTarget;
