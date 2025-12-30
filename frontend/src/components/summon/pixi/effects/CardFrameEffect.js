/**
 * CardFrameEffect
 *
 * Decorative card frame that wraps around the character image during summon reveal.
 * Features rarity-based styling with borders, glow effects, and animated elements.
 */

import { Container, Graphics } from 'pixi.js';
import { oscillate, lerp, random } from '../utils/math';
import { easeOutBack } from '../utils/easing';

/**
 * Card frame configurations by rarity
 */
export const CARD_FRAME_CONFIG = {
  common: {
    borderWidth: 4,
    cornerRadius: 12,
    borderColor: 0x9CA3AF,
    borderColorSecondary: 0x6B7280,
    glowColor: 0xD1D5DB,
    glowIntensity: 0.2,
    hasInnerGlow: false,
    hasOuterGlow: false,
    hasCornerAccents: false,
    hasAnimatedGlow: false,
    hasParticles: false,
    shadowBlur: 8,
    shadowAlpha: 0.3,
  },
  uncommon: {
    borderWidth: 5,
    cornerRadius: 14,
    borderColor: 0x22C55E,
    borderColorSecondary: 0x16A34A,
    glowColor: 0x86EFAC,
    glowIntensity: 0.3,
    hasInnerGlow: true,
    hasOuterGlow: false,
    hasCornerAccents: false,
    hasAnimatedGlow: false,
    hasParticles: false,
    shadowBlur: 12,
    shadowAlpha: 0.4,
  },
  rare: {
    borderWidth: 6,
    cornerRadius: 16,
    borderColor: 0x3B82F6,
    borderColorSecondary: 0x2563EB,
    glowColor: 0x93C5FD,
    glowIntensity: 0.5,
    hasInnerGlow: true,
    hasOuterGlow: true,
    hasCornerAccents: true,
    hasAnimatedGlow: true,
    hasParticles: false,
    shadowBlur: 16,
    shadowAlpha: 0.5,
  },
  epic: {
    borderWidth: 7,
    cornerRadius: 18,
    borderColor: 0xA855F7,
    borderColorSecondary: 0x9333EA,
    glowColor: 0xD8B4FE,
    glowIntensity: 0.7,
    hasInnerGlow: true,
    hasOuterGlow: true,
    hasCornerAccents: true,
    hasAnimatedGlow: true,
    hasParticles: true,
    particleCount: 8,
    shadowBlur: 20,
    shadowAlpha: 0.6,
  },
  legendary: {
    borderWidth: 8,
    cornerRadius: 20,
    borderColor: 0xF59E0B,
    borderColorSecondary: 0xD97706,
    glowColor: 0xFDE047,
    glowIntensity: 0.9,
    hasInnerGlow: true,
    hasOuterGlow: true,
    hasCornerAccents: true,
    hasAnimatedGlow: true,
    hasParticles: true,
    particleCount: 16,
    hasOrnateFrame: true,
    shadowBlur: 24,
    shadowAlpha: 0.7,
  },
};

export class CardFrameEffect {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'card-frame-effect';

    // Position
    this.centerX = options.x || 0;
    this.centerY = options.y || 0;

    // Card dimensions (will be set based on character sprite size)
    this.cardWidth = options.width || 280;
    this.cardHeight = options.height || 380;
    this.padding = options.padding || 16;

    // Rarity configuration
    this.rarity = 'common';
    this.config = CARD_FRAME_CONFIG.common;

    // Graphics layers (back to front)
    this.shadowLayer = new Graphics();
    this.outerGlowLayer = new Graphics();
    this.backgroundLayer = new Graphics();
    this.borderLayer = new Graphics();
    this.innerGlowLayer = new Graphics();
    this.accentLayer = new Graphics();
    this.particleLayer = new Graphics();

    // Add in correct order
    this.container.addChild(this.shadowLayer);
    this.container.addChild(this.outerGlowLayer);
    this.container.addChild(this.backgroundLayer);
    this.container.addChild(this.borderLayer);
    this.container.addChild(this.innerGlowLayer);
    this.container.addChild(this.accentLayer);
    this.container.addChild(this.particleLayer);

    // Animation state
    this.time = 0;
    this.isActive = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.scale = 0.8;
    this.targetScale = 1;
    this.revealProgress = 0;

    // Particle state (for epic/legendary)
    this.particles = [];
    this.initParticles();
  }

  /**
   * Initialize particle pool for higher rarities
   */
  initParticles() {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        alpha: 0,
        angle: 0,
        active: false,
      });
    }
  }

  /**
   * Set rarity and apply configuration
   */
  setRarity(rarity) {
    const normalized = rarity?.toLowerCase() || 'common';
    this.rarity = normalized;
    this.config = CARD_FRAME_CONFIG[normalized] || CARD_FRAME_CONFIG.common;
  }

  /**
   * Set card dimensions based on character sprite
   */
  setDimensions(width, height) {
    this.cardWidth = width + this.padding * 2;
    this.cardHeight = height + this.padding * 2;
  }

  /**
   * Start the frame effect with reveal animation
   */
  start(options = {}) {
    this.isActive = true;
    this.targetOpacity = 1;
    this.targetScale = 1;
    this.revealProgress = 0;

    if (options.instant) {
      this.opacity = 1;
      this.scale = 1;
      this.revealProgress = 1;
    }
  }

  /**
   * Hide the frame
   */
  hide() {
    this.targetOpacity = 0;
    this.targetScale = 0.9;
  }

  /**
   * Stop and clear
   */
  stop() {
    this.isActive = false;
    this.opacity = 0;
    this.scale = 0.8;
    this.revealProgress = 0;
    this.clearGraphics();
  }

  /**
   * Clear all graphics
   */
  clearGraphics() {
    this.shadowLayer.clear();
    this.outerGlowLayer.clear();
    this.backgroundLayer.clear();
    this.borderLayer.clear();
    this.innerGlowLayer.clear();
    this.accentLayer.clear();
    this.particleLayer.clear();
  }

  /**
   * Update animation
   */
  update(dt = 1) {
    if (!this.isActive && this.opacity < 0.01) return;

    this.time += dt / 60;

    // Smooth opacity and scale transitions
    this.opacity = lerp(this.opacity, this.targetOpacity, 0.15);
    this.scale = lerp(this.scale, this.targetScale, 0.12);

    // Reveal animation progress
    if (this.revealProgress < 1) {
      this.revealProgress = Math.min(1, this.revealProgress + dt / 25);
    }

    // Check for deactivation
    if (this.targetOpacity === 0 && this.opacity < 0.01) {
      this.isActive = false;
      this.clearGraphics();
      return;
    }

    // Draw all frame components
    this.draw();

    // Update particles for epic/legendary
    if (this.config.hasParticles) {
      this.updateParticles(dt);
    }
  }

  /**
   * Main draw function
   */
  draw() {
    this.clearGraphics();

    const revealEased = easeOutBack(this.revealProgress);
    const currentScale = this.scale * (0.85 + revealEased * 0.15);

    // Apply container transformations
    this.container.position.set(this.centerX, this.centerY);
    this.container.scale.set(currentScale);
    this.container.alpha = this.opacity;

    // Draw components
    this.drawShadow();
    if (this.config.hasOuterGlow) {
      this.drawOuterGlow();
    }
    this.drawBackground();
    this.drawBorder();
    if (this.config.hasInnerGlow) {
      this.drawInnerGlow();
    }
    if (this.config.hasCornerAccents) {
      this.drawCornerAccents();
    }
    if (this.config.hasParticles) {
      this.drawParticles();
    }
  }

  /**
   * Draw drop shadow
   */
  drawShadow() {
    const { shadowBlur, shadowAlpha, cornerRadius } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Multiple shadow layers for soft effect
    for (let i = 4; i >= 0; i--) {
      const offset = i * (shadowBlur / 4);
      const layerAlpha = shadowAlpha * (1 - i * 0.2) * this.opacity * 0.5;

      this.shadowLayer.roundRect(
        -halfW - offset,
        -halfH - offset + shadowBlur * 0.3, // Offset down slightly
        this.cardWidth + offset * 2,
        this.cardHeight + offset * 2,
        cornerRadius + offset
      );
      this.shadowLayer.fill({ color: 0x000000, alpha: layerAlpha });
    }
  }

  /**
   * Draw outer glow (for rare+ rarities)
   */
  drawOuterGlow() {
    const { glowColor, glowIntensity, cornerRadius } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Animated glow intensity
    let pulseIntensity = 1;
    if (this.config.hasAnimatedGlow) {
      pulseIntensity = 0.7 + oscillate(this.time, 0.6) * 0.3;
    }

    // Multiple glow layers
    for (let i = 4; i >= 0; i--) {
      const expansion = (i + 1) * 8;
      const layerAlpha = glowIntensity * pulseIntensity * (0.15 - i * 0.025);

      this.outerGlowLayer.roundRect(
        -halfW - expansion,
        -halfH - expansion,
        this.cardWidth + expansion * 2,
        this.cardHeight + expansion * 2,
        cornerRadius + expansion * 0.5
      );
      this.outerGlowLayer.fill({ color: glowColor, alpha: layerAlpha });
    }
  }

  /**
   * Draw card background with gradient effect
   */
  drawBackground() {
    const { cornerRadius, borderWidth, borderColor } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Semi-transparent dark background
    this.backgroundLayer.roundRect(
      -halfW + borderWidth,
      -halfH + borderWidth,
      this.cardWidth - borderWidth * 2,
      this.cardHeight - borderWidth * 2,
      cornerRadius - borderWidth * 0.5
    );
    this.backgroundLayer.fill({ color: 0x0a0a0a, alpha: 0.85 });

    // Subtle inner radial gradient effect (lighter in center)
    const gradientSize = Math.min(this.cardWidth, this.cardHeight) * 0.6;
    for (let i = 3; i >= 0; i--) {
      const radius = gradientSize * (0.3 + i * 0.2);
      const layerAlpha = 0.03 * (1 - i * 0.2);
      this.backgroundLayer.circle(0, 0, radius);
      this.backgroundLayer.fill({ color: borderColor, alpha: layerAlpha });
    }
  }

  /**
   * Draw the main border
   */
  drawBorder() {
    const { borderWidth, cornerRadius, borderColor, borderColorSecondary } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Main border
    this.borderLayer.roundRect(
      -halfW,
      -halfH,
      this.cardWidth,
      this.cardHeight,
      cornerRadius
    );
    this.borderLayer.stroke({
      color: borderColor,
      width: borderWidth,
      alpha: 1
    });

    // Inner secondary border for depth
    if (borderColorSecondary) {
      this.borderLayer.roundRect(
        -halfW + borderWidth * 0.7,
        -halfH + borderWidth * 0.7,
        this.cardWidth - borderWidth * 1.4,
        this.cardHeight - borderWidth * 1.4,
        cornerRadius - borderWidth * 0.3
      );
      this.borderLayer.stroke({
        color: borderColorSecondary,
        width: borderWidth * 0.4,
        alpha: 0.6
      });
    }

    // Ornate frame for legendary
    if (this.config.hasOrnateFrame) {
      this.drawOrnateFrame();
    }
  }

  /**
   * Draw ornate frame decorations (legendary only)
   */
  drawOrnateFrame() {
    const { borderColor, glowColor } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;
    const pulse = oscillate(this.time, 0.8);

    // Top and bottom ornamental bars
    const barWidth = this.cardWidth * 0.5;
    const barHeight = 6;

    // Top bar
    this.borderLayer.roundRect(-barWidth / 2, -halfH - barHeight - 4, barWidth, barHeight, 3);
    this.borderLayer.fill({ color: borderColor, alpha: 0.9 });

    // Top bar inner glow
    this.borderLayer.roundRect(-barWidth / 2 + 2, -halfH - barHeight - 2, barWidth - 4, barHeight - 4, 2);
    this.borderLayer.fill({ color: glowColor, alpha: 0.3 + pulse * 0.2 });

    // Bottom bar
    this.borderLayer.roundRect(-barWidth / 2, halfH + 4, barWidth, barHeight, 3);
    this.borderLayer.fill({ color: borderColor, alpha: 0.9 });

    // Bottom bar inner glow
    this.borderLayer.roundRect(-barWidth / 2 + 2, halfH + 6, barWidth - 4, barHeight - 4, 2);
    this.borderLayer.fill({ color: glowColor, alpha: 0.3 + pulse * 0.2 });

    // Side diamonds
    const diamondSize = 8;
    const sideY = [-halfH * 0.3, halfH * 0.3];

    sideY.forEach(y => {
      // Left diamond
      this.drawDiamond(-halfW - diamondSize, y, diamondSize, borderColor, glowColor, pulse);
      // Right diamond
      this.drawDiamond(halfW + diamondSize, y, diamondSize, borderColor, glowColor, pulse);
    });
  }

  /**
   * Draw a diamond shape decoration
   */
  drawDiamond(x, y, size, borderColor, glowColor, pulse) {
    // Outer diamond
    this.borderLayer.moveTo(x, y - size);
    this.borderLayer.lineTo(x + size, y);
    this.borderLayer.lineTo(x, y + size);
    this.borderLayer.lineTo(x - size, y);
    this.borderLayer.closePath();
    this.borderLayer.fill({ color: borderColor, alpha: 0.9 });

    // Inner glow
    const innerSize = size * 0.5;
    this.borderLayer.moveTo(x, y - innerSize);
    this.borderLayer.lineTo(x + innerSize, y);
    this.borderLayer.lineTo(x, y + innerSize);
    this.borderLayer.lineTo(x - innerSize, y);
    this.borderLayer.closePath();
    this.borderLayer.fill({ color: glowColor, alpha: 0.5 + pulse * 0.3 });
  }

  /**
   * Draw inner vignette/glow
   */
  drawInnerGlow() {
    const { glowColor, glowIntensity, cornerRadius, borderWidth } = this.config;
    const halfW = this.cardWidth / 2 - borderWidth;
    const halfH = this.cardHeight / 2 - borderWidth;

    let pulseIntensity = 1;
    if (this.config.hasAnimatedGlow) {
      pulseIntensity = 0.8 + oscillate(this.time, 0.5) * 0.2;
    }

    // Inner border glow
    const glowWidth = 12;
    for (let i = 3; i >= 0; i--) {
      const inset = i * (glowWidth / 3);
      const layerAlpha = glowIntensity * pulseIntensity * (0.15 - i * 0.03);

      this.innerGlowLayer.roundRect(
        -halfW + inset,
        -halfH + inset,
        (halfW - inset) * 2,
        (halfH - inset) * 2,
        Math.max(0, cornerRadius - borderWidth - inset)
      );
      this.innerGlowLayer.stroke({ color: glowColor, width: glowWidth - i * 3, alpha: layerAlpha });
    }
  }

  /**
   * Draw corner accent decorations
   */
  drawCornerAccents() {
    const { borderColor, glowColor } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;
    const accentSize = 20;
    const pulse = oscillate(this.time, 0.7);

    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];

    corners.forEach(({ x, y }) => {
      // Corner bracket shape
      const offsetX = x > 0 ? -accentSize : accentSize;
      const offsetY = y > 0 ? -accentSize : accentSize;

      // L-shaped corner bracket
      this.accentLayer.moveTo(x + offsetX * 0.1, y);
      this.accentLayer.lineTo(x + offsetX, y);
      this.accentLayer.lineTo(x + offsetX, y + offsetY * 0.3);
      this.accentLayer.stroke({ color: borderColor, width: 3, alpha: 0.9 });

      this.accentLayer.moveTo(x, y + offsetY * 0.1);
      this.accentLayer.lineTo(x, y + offsetY);
      this.accentLayer.lineTo(x + offsetX * 0.3, y + offsetY);
      this.accentLayer.stroke({ color: borderColor, width: 3, alpha: 0.9 });

      // Small corner dot
      const dotX = x + (x > 0 ? -8 : 8);
      const dotY = y + (y > 0 ? -8 : 8);
      this.accentLayer.circle(dotX, dotY, 3);
      this.accentLayer.fill({ color: glowColor, alpha: 0.6 + pulse * 0.3 });
    });
  }

  /**
   * Update floating particles
   */
  updateParticles(dt) {
    const particleCount = this.config.particleCount || 8;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    this.particles.forEach((p, i) => {
      if (i >= particleCount) {
        p.active = false;
        return;
      }

      if (!p.active || p.life <= 0) {
        // Respawn particle
        const side = Math.floor(random(0, 4));
        const t = random(0, 1);

        switch (side) {
          case 0: // Top
            p.x = lerp(-halfW, halfW, t);
            p.y = -halfH - 10;
            p.vy = random(15, 30);
            p.vx = random(-5, 5);
            break;
          case 1: // Bottom
            p.x = lerp(-halfW, halfW, t);
            p.y = halfH + 10;
            p.vy = -random(15, 30);
            p.vx = random(-5, 5);
            break;
          case 2: // Left
            p.x = -halfW - 10;
            p.y = lerp(-halfH, halfH, t);
            p.vx = random(15, 30);
            p.vy = random(-5, 5);
            break;
          case 3: // Right
            p.x = halfW + 10;
            p.y = lerp(-halfH, halfH, t);
            p.vx = -random(15, 30);
            p.vy = random(-5, 5);
            break;
        }

        p.life = random(0.8, 1.5);
        p.maxLife = p.life;
        p.size = random(2, 5);
        p.angle = random(0, Math.PI * 2);
        p.active = true;
      }

      // Update particle
      p.life -= dt / 60;
      p.x += p.vx * dt / 60;
      p.y += p.vy * dt / 60;
      p.angle += dt / 60 * 2;

      // Fade out
      p.alpha = Math.max(0, p.life / p.maxLife);

      // Drift toward center slightly
      const toCenterX = -p.x * 0.01;
      const toCenterY = -p.y * 0.01;
      p.vx += toCenterX;
      p.vy += toCenterY;
    });
  }

  /**
   * Draw particles
   */
  drawParticles() {
    const { glowColor } = this.config;

    this.particles.forEach(p => {
      if (!p.active || p.alpha <= 0) return;

      // Star/sparkle shape
      const outerSize = p.size;
      const innerSize = p.size * 0.4;

      // Draw 4-point star
      for (let i = 0; i < 4; i++) {
        const angle = p.angle + (i * Math.PI / 2);
        const nextAngle = angle + Math.PI / 4;

        const outerX = p.x + Math.cos(angle) * outerSize;
        const outerY = p.y + Math.sin(angle) * outerSize;
        const innerX = p.x + Math.cos(nextAngle) * innerSize;
        const innerY = p.y + Math.sin(nextAngle) * innerSize;

        this.particleLayer.moveTo(p.x, p.y);
        this.particleLayer.lineTo(outerX, outerY);
        this.particleLayer.lineTo(innerX, innerY);
        this.particleLayer.closePath();
      }

      this.particleLayer.fill({ color: glowColor, alpha: p.alpha * 0.8 });

      // Center dot
      this.particleLayer.circle(p.x, p.y, p.size * 0.3);
      this.particleLayer.fill({ color: 0xffffff, alpha: p.alpha });
    });
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Reset effect
   */
  reset() {
    this.isActive = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.scale = 0.8;
    this.targetScale = 1;
    this.revealProgress = 0;
    this.time = 0;
    this.particles.forEach(p => {
      p.active = false;
      p.life = 0;
    });
    this.clearGraphics();
  }

  /**
   * Destroy effect
   */
  destroy() {
    this.shadowLayer?.destroy();
    this.outerGlowLayer?.destroy();
    this.backgroundLayer?.destroy();
    this.borderLayer?.destroy();
    this.innerGlowLayer?.destroy();
    this.accentLayer?.destroy();
    this.particleLayer?.destroy();
    this.container?.destroy({ children: true });
  }
}

export default CardFrameEffect;
