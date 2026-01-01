/**
 * TapTarget - Main click/tap area for the Essence Tap game
 *
 * Features:
 * - Large, satisfying tap target
 * - Visual feedback on click (pulse, particles)
 * - Critical hit effects
 * - Golden essence effects
 * - Combo indicator
 * - Pixi.js particle effects
 */

import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import * as PIXI from 'pixi.js';
import { theme } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconGem, IconSparkles } from '../../constants/icons';

// Animations
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

const TapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  position: relative;
`;

const ParticleCanvas = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
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

  /* Mobile touch optimizations */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -ms-touch-action: manipulation;
  outline: none;

  /* Prevent double-tap zoom */
  touch-action: manipulation;

  /* Faster touch response */
  @media (hover: none) and (pointer: coarse) {
    &:active {
      transform: scale(0.92);
      transition: transform 0.05s ease-out;
    }
  }

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

// Particle colors for different click types
const PARTICLE_COLORS = {
  normal: [0xA855F7, 0xC084FC, 0x9333EA], // Purple shades
  crit: [0xFFC107, 0xFFD54F, 0xFFB300],   // Golden/amber shades
  golden: [0xFFD700, 0xFFA500, 0xFFE135]  // Bright gold shades
};

// Create a simple particle class
class EssenceParticle {
  constructor(x, y, color, isGolden = false, isCrit = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isGolden = isGolden;
    this.isCrit = isCrit;

    // Random velocity - particles burst outward
    const angle = Math.random() * Math.PI * 2;
    const speed = (isGolden ? 6 : isCrit ? 5 : 4) + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2; // Slight upward bias

    this.gravity = 0.15;
    this.friction = 0.98;
    this.alpha = 1;
    this.alphaDecay = isGolden ? 0.015 : 0.02;
    this.scale = (isGolden ? 1.2 : isCrit ? 1.0 : 0.8) + Math.random() * 0.4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
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
    this.scale *= 0.98;

    if (this.alpha <= 0) {
      this.alive = false;
    }
  }
}

const TapTarget = memo(({
  onClick,
  clickPower = 1,
  lastClickResult,
  comboMultiplier = 1
}) => {
  const [floatingNumbers, setFloatingNumbers] = useState([]);
  const nextIdRef = useRef(0);
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
      width: 400,
      height: 400,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    }).then(() => {
      if (canvasRef.current && app.canvas) {
        canvasRef.current.appendChild(app.canvas);
        pixiAppRef.current = app;

        // Create graphics object for particles
        const graphics = new PIXI.Graphics();
        app.stage.addChild(graphics);
        graphicsRef.current = graphics;

        // Animation loop
        app.ticker.add(() => {
          if (!graphicsRef.current) return;

          graphicsRef.current.clear();

          // Update and draw particles
          particlesRef.current = particlesRef.current.filter(p => {
            p.update();
            if (!p.alive) return false;

            // Draw particle as a star/diamond shape
            const g = graphicsRef.current;
            g.save();
            g.translate(p.x, p.y);
            g.rotate(p.rotation);
            g.scale(p.scale, p.scale);

            // Draw a 4-point star
            g.beginFill({ color: p.color, alpha: p.alpha });
            g.moveTo(0, -8);
            g.lineTo(2, -2);
            g.lineTo(8, 0);
            g.lineTo(2, 2);
            g.lineTo(0, 8);
            g.lineTo(-2, 2);
            g.lineTo(-8, 0);
            g.lineTo(-2, -2);
            g.closePath();
            g.endFill();

            // Add glow for golden/crit
            if (p.isGolden || p.isCrit) {
              g.beginFill({ color: 0xFFFFFF, alpha: p.alpha * 0.5 });
              g.circle(0, 0, 3);
              g.endFill();
            }

            g.restore();

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

    const particleCount = isGolden ? 25 : isCrit ? 18 : 12;

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
          window.navigator.vibrate([30, 10, 30]); // Golden click
          break;
        case 'medium':
          window.navigator.vibrate(20); // Crit click
          break;
        case 'light':
        default:
          window.navigator.vibrate(10); // Normal click
          break;
      }
    }
  }, []);

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

    // Trigger haptic feedback
    if (lastClickResult?.isGolden) {
      triggerHaptic('heavy');
    } else if (lastClickResult?.isCrit) {
      triggerHaptic('medium');
    } else {
      triggerHaptic('light');
    }

    // Spawn particles at click position (offset for canvas position)
    const canvasX = 200 + (clickX - centerX);
    const canvasY = 200 + (clickY - centerY);
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

      // Remove after animation
      setTimeout(() => {
        setFloatingNumbers(prev => prev.filter(n => n.id !== id));
      }, 600);
    }
  }, [onClick, lastClickResult, spawnParticles, triggerHaptic]);

  return (
    <TapContainer>
      {/* Pixi.js particle canvas */}
      <ParticleCanvas ref={canvasRef} />

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
          {lastClickResult?.isGolden ? <IconSparkles size={48} /> : <IconGem size={48} />}
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
