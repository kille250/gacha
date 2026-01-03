/**
 * ParticleCanvas - PIXI.js particle effects system
 *
 * Features:
 * - Particle system initialization with PIXI.js
 * - Click particle spawning
 * - Critical hit particle effects
 * - Golden particle effects
 * - Automatic cleanup on unmount
 */

import React, { useEffect, useRef, memo } from 'react';
import styled from 'styled-components';
import * as PIXI from 'pixi.js';

const CanvasWrapper = styled.div`
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

// Particle colors for different click types
const PARTICLE_COLORS = {
  normal: [0xA855F7, 0xC084FC, 0x9333EA],
  crit: [0xFFC107, 0xFFD54F, 0xFFB300],
  golden: [0xFFD700, 0xFFA500, 0xFFE135]
};

/**
 * Simple particle class for essence effects
 */
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

/**
 * ParticleCanvas Component
 *
 * @param {function} onReady - Callback when PIXI app is ready, receives spawnParticles function
 */
const ParticleCanvas = memo(({ onReady }) => {
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

        // Animation loop
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

        // Provide spawn function to parent
        if (onReady) {
          onReady((x, y, isCrit, isGolden) => {
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
          });
        }
      }
    });

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true });
        pixiAppRef.current = null;
        graphicsRef.current = null;
      }
    };
  }, [onReady]);

  return <CanvasWrapper ref={canvasRef} />;
});

ParticleCanvas.displayName = 'ParticleCanvas';

export default ParticleCanvas;
