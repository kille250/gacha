/**
 * TapTarget - Enhanced main click/tap area for the Essence Tap game
 *
 * Features:
 * - Large, satisfying tap target with prestige-based visual evolution
 * - Visual feedback on click (pulse, particles)
 * - Critical hit effects
 * - Golden essence effects
 * - Combo indicator
 * - Pixi.js particle effects
 * - Idle breathing animation synced with production
 */

import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import * as PIXI from 'pixi.js';
import { theme } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconGem, IconSparkles, IconLightning, IconFlame, IconStar } from '../../constants/icons';
import { UI_TIMING } from '../../config/essenceTapConfig';
import {
  getOrbStyles,
  orbBreathe,
  orbGlow
} from './animations';

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

const ParticleCanvas = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
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

const FloatingNumber = styled(motion.div)`
  position: absolute;
  font-size: ${props => props.$isGolden ? '36px' : props.$isCrit ? '28px' : '22px'};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isGolden ? '#FFD700' : props.$isCrit ? '#FFC107' : '#C084FC'};
  text-shadow: ${props =>
    props.$isGolden ? '0 0 30px rgba(255, 215, 0, 0.9), 0 2px 4px rgba(0,0,0,0.5)' :
    props.$isCrit ? '0 0 20px rgba(255, 193, 7, 0.7), 0 2px 4px rgba(0,0,0,0.5)' :
    '0 0 15px rgba(192, 132, 252, 0.5), 0 2px 4px rgba(0,0,0,0.3)'};
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
`;

const ComboIndicator = styled(motion.div)`
  position: absolute;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: ${theme.radius.full};
  border: 1px solid ${props =>
    props.$combo > 1.5 ? 'rgba(255, 193, 7, 0.5)' :
    props.$combo > 1.2 ? 'rgba(168, 85, 247, 0.5)' :
    'rgba(255, 255, 255, 0.2)'};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: ${props =>
    props.$combo > 1.5 ? '#FFC107' :
    props.$combo > 1.2 ? '#A855F7' :
    'white'};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const ComboFire = styled.span`
  font-size: 18px;
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

// Particle colors for different click types
const PARTICLE_COLORS = {
  normal: [0xA855F7, 0xC084FC, 0x9333EA],
  crit: [0xFFC107, 0xFFD54F, 0xFFB300],
  golden: [0xFFD700, 0xFFA500, 0xFFE135]
};

// Simple particle class
class EssenceParticle {
  constructor(x, y, color, isGolden = false, isCrit = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isGolden = isGolden;
    this.isCrit = isCrit;

    const angle = Math.random() * Math.PI * 2;
    const speed = (isGolden ? 7 : isCrit ? 6 : 5) + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 3;

    this.gravity = 0.12;
    this.friction = 0.98;
    this.alpha = 1;
    this.alphaDecay = isGolden ? 0.012 : 0.018;
    this.scale = (isGolden ? 1.4 : isCrit ? 1.1 : 0.9) + Math.random() * 0.5;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.25;
    this.alive = true;
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.alphaDecay;
    this.rotation += this.rotationSpeed;
    this.scale *= 0.985;

    if (this.alpha <= 0) {
      this.alive = false;
    }
  }
}

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
  const canvasRef = useRef(null);
  const pixiAppRef = useRef(null);
  const particlesRef = useRef([]);
  const graphicsRef = useRef(null);

  // Initialize Pixi.js application
  useEffect(() => {
    if (!canvasRef.current || pixiAppRef.current) return;

    const app = new PIXI.Application();

    app.init({
      width: 500,
      height: 500,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    }).then(() => {
      if (canvasRef.current && app.canvas) {
        canvasRef.current.appendChild(app.canvas);
        pixiAppRef.current = app;

        const graphics = new PIXI.Graphics();
        app.stage.addChild(graphics);
        graphicsRef.current = graphics;

        app.ticker.add(() => {
          if (!graphicsRef.current) return;

          graphicsRef.current.clear();

          particlesRef.current = particlesRef.current.filter(p => {
            p.update();
            if (!p.alive) return false;

            const g = graphicsRef.current;
            const s = p.scale;
            const cos = Math.cos(p.rotation) * s;
            const sin = Math.sin(p.rotation) * s;

            // Helper to transform a point by rotation and scale, then translate
            const tx = (x, y) => p.x + x * cos - y * sin;
            const ty = (x, y) => p.y + x * sin + y * cos;

            // Draw a 4-point star with transformed coordinates
            g.moveTo(tx(0, -10), ty(0, -10));
            g.lineTo(tx(3, -3), ty(3, -3));
            g.lineTo(tx(10, 0), ty(10, 0));
            g.lineTo(tx(3, 3), ty(3, 3));
            g.lineTo(tx(0, 10), ty(0, 10));
            g.lineTo(tx(-3, 3), ty(-3, 3));
            g.lineTo(tx(-10, 0), ty(-10, 0));
            g.lineTo(tx(-3, -3), ty(-3, -3));
            g.closePath();
            g.fill({ color: p.color, alpha: p.alpha });

            // Add glow for golden/crit
            if (p.isGolden || p.isCrit) {
              g.circle(p.x, p.y, 4 * s);
              g.fill({ color: 0xFFFFFF, alpha: p.alpha * 0.5 });
            }

            return true;
          });
        });
      }
    });

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true });
        pixiAppRef.current = null;
        graphicsRef.current = null;
      }
    };
  }, []);

  // Spawn particles on click
  const spawnParticles = useCallback((x, y, isCrit, isGolden) => {
    const colors = isGolden ? PARTICLE_COLORS.golden :
                   isCrit ? PARTICLE_COLORS.crit :
                   PARTICLE_COLORS.normal;

    const particleCount = isGolden ? 30 : isCrit ? 22 : 15;

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particlesRef.current.push(
        new EssenceParticle(x, y, color, isGolden, isCrit)
      );
    }
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
    const canvasX = 250 + (clickX - centerX);
    const canvasY = 250 + (clickY - centerY);
    spawnParticles(canvasX, canvasY, lastClickResult?.isCrit, lastClickResult?.isGolden);

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
  }, [onClick, lastClickResult, spawnParticles, triggerHaptic]);

  // Normalize production rate for animation speed (0-3 range)
  const normalizedProductionRate = Math.min(Math.log10(productionRate + 1) / 2, 3);

  return (
    <TapContainer $shake={shakeScreen}>
      <OrbWrapper>
        {/* Pixi.js particle canvas */}
        <ParticleCanvas ref={canvasRef} />

        {/* Pulse rings for click feedback */}
        {pulseRings.map(ring => (
          <PulseRing key={ring.id} $color={ring.color} />
        ))}

        {/* Golden burst effect */}
        {showGoldenBurst && <GoldenBurstRing />}

        <AnimatePresence>
          {comboMultiplier > 1.05 && (
            <ComboIndicator
              $combo={comboMultiplier}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <ComboFire>{comboMultiplier > 1.5 ? <IconSparkles size={18} /> : <IconLightning size={18} />}</ComboFire>
              Combo x{comboMultiplier.toFixed(1)}
            </ComboIndicator>
          )}
        </AnimatePresence>

        <TapButton
          ref={buttonRef}
          onClick={handleClick}
          $isCrit={lastClickResult?.isCrit}
          $isGolden={lastClickResult?.isGolden}
          $prestigeLevel={prestigeLevel}
          $productionRate={normalizedProductionRate}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <TapIcon>
            {lastClickResult?.isGolden ? <IconSparkles size={72} /> : <IconGem size={72} />}
          </TapIcon>

          <AnimatePresence>
            {floatingNumbers.map(num => (
              <FloatingNumber
                key={num.id}
                $isCrit={num.isCrit}
                $isGolden={num.isGolden}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -120, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{
                  left: num.x - 50,
                  top: num.y - 20
                }}
              >
                +{formatNumber(num.value)}
                {num.isGolden && <> <IconStar size={14} /> GOLDEN!</>}
                {num.isCrit && !num.isGolden && <> <IconFlame size={14} /> CRIT!</>}
              </FloatingNumber>
            ))}
          </AnimatePresence>
        </TapButton>

        <TapLabel>TAP TO EARN</TapLabel>
      </OrbWrapper>

      <ClickPowerLabel>
        <span>+{formatNumber(clickPower)}</span> per tap
      </ClickPowerLabel>
    </TapContainer>
  );
});

TapTarget.displayName = 'TapTarget';

export default TapTarget;
