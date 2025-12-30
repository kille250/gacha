/**
 * CardShineEffect
 *
 * Animated shine/gleam effect that sweeps across the card during reveal and showcase.
 * Creates the premium "glossy card" feel seen in high-end gacha games.
 */

import { Container, Graphics } from 'pixi.js';
import { lerp, degToRad } from '../utils/math';
import { easeInOutQuad } from '../utils/easing';

/**
 * Shine effect configurations by rarity
 */
export const CARD_SHINE_CONFIG = {
  common: {
    shineWidth: 40,
    shineOpacity: 0.15,
    sweepDuration: 0, // No sweep for common
    idlePulse: false,
    color: 0xffffff,
    angle: 25,
  },
  uncommon: {
    shineWidth: 50,
    shineOpacity: 0.2,
    sweepDuration: 1.2,
    idlePulse: true,
    pulseSpeed: 0.4,
    color: 0xffffff,
    secondaryColor: 0x86EFAC,
    angle: 25,
  },
  rare: {
    shineWidth: 60,
    shineOpacity: 0.3,
    sweepDuration: 1.0,
    idlePulse: true,
    pulseSpeed: 0.5,
    color: 0xffffff,
    secondaryColor: 0x93C5FD,
    angle: 30,
    hasTrail: true,
  },
  epic: {
    shineWidth: 70,
    shineOpacity: 0.4,
    sweepDuration: 0.9,
    idlePulse: true,
    pulseSpeed: 0.6,
    color: 0xffffff,
    secondaryColor: 0xD8B4FE,
    angle: 30,
    hasTrail: true,
    trailCount: 2,
  },
  legendary: {
    shineWidth: 80,
    shineOpacity: 0.5,
    sweepDuration: 0.8,
    idlePulse: true,
    pulseSpeed: 0.7,
    color: 0xffffff,
    secondaryColor: 0xFDE047,
    tertiaryColor: 0xFEF08A,
    angle: 35,
    hasTrail: true,
    trailCount: 3,
    hasSparkles: true,
  },
};

export class CardShineEffect {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'card-shine-effect';

    // Position
    this.centerX = options.x || 0;
    this.centerY = options.y || 0;

    // Card dimensions
    this.cardWidth = options.width || 280;
    this.cardHeight = options.height || 380;
    this.cornerRadius = options.cornerRadius || 16;

    // Rarity configuration
    this.rarity = 'common';
    this.config = CARD_SHINE_CONFIG.common;

    // Graphics layers
    this.shineLayer = new Graphics();
    this.sparkleLayer = new Graphics();

    this.container.addChild(this.shineLayer);
    this.container.addChild(this.sparkleLayer);

    // Animation state
    this.time = 0;
    this.isActive = false;
    this.opacity = 0;
    this.targetOpacity = 0;

    // Sweep animation state
    this.isSweeping = false;
    this.sweepProgress = 0;
    this.sweepDirection = 1; // 1 = left to right, -1 = right to left

    // Idle animation state
    this.idleTime = 0;

    // Sparkle particles for legendary
    this.sparkles = [];
    this.initSparkles();

    // Mask for clipping shine to card bounds
    this.cardMask = new Graphics();
    this.container.addChild(this.cardMask);
    this.shineLayer.mask = this.cardMask;
  }

  /**
   * Initialize sparkle pool for legendary
   */
  initSparkles() {
    for (let i = 0; i < 12; i++) {
      this.sparkles.push({
        x: 0,
        y: 0,
        size: 0,
        alpha: 0,
        rotation: 0,
        active: false,
        delay: i * 0.1,
      });
    }
  }

  /**
   * Set rarity and apply configuration
   */
  setRarity(rarity) {
    const normalized = rarity?.toLowerCase() || 'common';
    this.rarity = normalized;
    this.config = CARD_SHINE_CONFIG[normalized] || CARD_SHINE_CONFIG.common;
  }

  /**
   * Set card dimensions
   */
  setDimensions(width, height, cornerRadius = 16) {
    this.cardWidth = width;
    this.cardHeight = height;
    this.cornerRadius = cornerRadius;
    this.updateMask();
  }

  /**
   * Update the card mask
   */
  updateMask() {
    this.cardMask.clear();
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    this.cardMask.roundRect(-halfW, -halfH, this.cardWidth, this.cardHeight, this.cornerRadius);
    this.cardMask.fill({ color: 0xffffff });
  }

  /**
   * Start the shine effect
   */
  start(options = {}) {
    this.isActive = true;
    this.targetOpacity = 1;

    // Trigger initial sweep if duration > 0
    if (this.config.sweepDuration > 0) {
      this.triggerSweep(options.sweepDirection || 1);
    }
  }

  /**
   * Trigger a sweep animation
   */
  triggerSweep(direction = 1) {
    this.isSweeping = true;
    this.sweepProgress = 0;
    this.sweepDirection = direction;

    // Trigger sparkles for legendary
    if (this.config.hasSparkles) {
      this.triggerSparkles();
    }
  }

  /**
   * Trigger sparkle burst
   */
  triggerSparkles() {
    this.sparkles.forEach((s, i) => {
      s.active = true;
      s.delay = i * 0.05;
      s.x = (Math.random() - 0.5) * this.cardWidth * 0.8;
      s.y = (Math.random() - 0.5) * this.cardHeight * 0.8;
      s.size = 3 + Math.random() * 4;
      s.alpha = 0;
      s.rotation = Math.random() * Math.PI;
    });
  }

  /**
   * Hide the effect
   */
  hide() {
    this.targetOpacity = 0;
  }

  /**
   * Stop and clear
   */
  stop() {
    this.isActive = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.isSweeping = false;
    this.sweepProgress = 0;
    this.sparkles.forEach(s => { s.active = false; });
    this.clearGraphics();
  }

  /**
   * Clear all graphics
   */
  clearGraphics() {
    this.shineLayer.clear();
    this.sparkleLayer.clear();
  }

  /**
   * Update animation
   */
  update(dt = 1) {
    if (!this.isActive && this.opacity < 0.01) return;

    this.time += dt / 60;
    this.idleTime += dt / 60;

    // Smooth opacity transition
    this.opacity = lerp(this.opacity, this.targetOpacity, 0.1);

    // Update sweep animation
    if (this.isSweeping && this.config.sweepDuration > 0) {
      this.sweepProgress += (dt / 60) / this.config.sweepDuration;
      if (this.sweepProgress >= 1) {
        this.sweepProgress = 1;
        this.isSweeping = false;
      }
    }

    // Check for deactivation
    if (this.targetOpacity === 0 && this.opacity < 0.01) {
      this.isActive = false;
      this.clearGraphics();
      return;
    }

    // Update sparkles
    if (this.config.hasSparkles) {
      this.updateSparkles(dt);
    }

    // Draw
    this.draw();
  }

  /**
   * Main draw function
   */
  draw() {
    this.clearGraphics();

    // Position container
    this.container.position.set(this.centerX, this.centerY);
    this.container.alpha = this.opacity;

    // Update mask
    this.updateMask();

    // Draw shine based on state
    if (this.isSweeping) {
      this.drawSweepShine();
    } else if (this.config.idlePulse) {
      this.drawIdleShine();
    }

    // Draw sparkles for legendary
    if (this.config.hasSparkles) {
      this.drawSparkles();
    }
  }

  /**
   * Draw the sweeping shine animation
   */
  drawSweepShine() {
    const { shineWidth, shineOpacity, angle, color, secondaryColor, hasTrail, trailCount } = this.config;
    const halfW = this.cardWidth / 2;

    // Calculate sweep position
    const sweepEased = easeInOutQuad(this.sweepProgress);
    const startX = this.sweepDirection > 0 ? -halfW - shineWidth : halfW + shineWidth;
    const endX = this.sweepDirection > 0 ? halfW + shineWidth : -halfW - shineWidth;
    const currentX = lerp(startX, endX, sweepEased);

    // Calculate angle offset
    const angleRad = degToRad(angle);
    const heightOffset = Math.tan(angleRad) * this.cardHeight;

    // Draw trailing shines first (behind main)
    if (hasTrail) {
      const trails = trailCount || 2;
      for (let i = trails; i >= 1; i--) {
        const trailOffset = i * shineWidth * 0.6 * -this.sweepDirection;
        const trailOpacity = shineOpacity * (0.3 - i * 0.08);
        const trailWidth = shineWidth * (0.5 + i * 0.1);

        this.drawShineStripe(
          currentX + trailOffset,
          heightOffset,
          trailWidth,
          trailOpacity,
          secondaryColor || color
        );
      }
    }

    // Draw main shine
    this.drawShineStripe(currentX, heightOffset, shineWidth, shineOpacity, color);

    // Draw secondary color layer for higher rarities
    if (secondaryColor) {
      this.drawShineStripe(
        currentX,
        heightOffset,
        shineWidth * 0.5,
        shineOpacity * 0.7,
        secondaryColor
      );
    }

    // Draw bright center line
    this.drawShineStripe(
      currentX,
      heightOffset,
      shineWidth * 0.15,
      shineOpacity * 1.2,
      0xffffff
    );
  }

  /**
   * Draw a single shine stripe
   */
  drawShineStripe(x, heightOffset, width, opacity, color) {
    const halfH = this.cardHeight / 2;
    const halfW = width / 2;

    // Create angled stripe
    this.shineLayer.moveTo(x - halfW, -halfH - 20);
    this.shineLayer.lineTo(x + halfW, -halfH - 20);
    this.shineLayer.lineTo(x + halfW + heightOffset, halfH + 20);
    this.shineLayer.lineTo(x - halfW + heightOffset, halfH + 20);
    this.shineLayer.closePath();

    // Use gradient-like effect with multiple fills
    this.shineLayer.fill({ color, alpha: opacity * 0.3 });

    // Inner brighter stripe
    const innerOffset = width * 0.25;
    this.shineLayer.moveTo(x - halfW + innerOffset, -halfH - 20);
    this.shineLayer.lineTo(x + halfW - innerOffset, -halfH - 20);
    this.shineLayer.lineTo(x + halfW - innerOffset + heightOffset, halfH + 20);
    this.shineLayer.lineTo(x - halfW + innerOffset + heightOffset, halfH + 20);
    this.shineLayer.closePath();
    this.shineLayer.fill({ color, alpha: opacity * 0.5 });
  }

  /**
   * Draw idle pulsing shine effect
   */
  drawIdleShine() {
    const { pulseSpeed, shineOpacity, color, secondaryColor } = this.config;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Pulsing edge highlight
    const pulse = (Math.sin(this.idleTime * pulseSpeed * Math.PI * 2) + 1) / 2;
    const edgeAlpha = shineOpacity * 0.3 * (0.5 + pulse * 0.5);

    // Top edge shine
    const gradientHeight = 30 + pulse * 10;
    for (let i = 0; i < 4; i++) {
      const layerH = gradientHeight * (1 - i * 0.2);
      const layerAlpha = edgeAlpha * (1 - i * 0.25);

      this.shineLayer.roundRect(
        -halfW + this.cornerRadius * 0.5,
        -halfH,
        this.cardWidth - this.cornerRadius,
        layerH,
        this.cornerRadius * 0.3
      );
      this.shineLayer.fill({ color: color, alpha: layerAlpha });
    }

    // Subtle corner highlights
    const cornerGlow = shineOpacity * 0.15 * (0.6 + pulse * 0.4);
    const cornerSize = 40;

    // Top-left corner
    this.shineLayer.circle(-halfW + cornerSize, -halfH + cornerSize, cornerSize);
    this.shineLayer.fill({ color: secondaryColor || color, alpha: cornerGlow });

    // Top-right corner
    this.shineLayer.circle(halfW - cornerSize, -halfH + cornerSize, cornerSize);
    this.shineLayer.fill({ color: secondaryColor || color, alpha: cornerGlow });
  }

  /**
   * Update sparkle particles
   */
  updateSparkles(dt) {
    const elapsed = dt / 60;

    this.sparkles.forEach(s => {
      if (!s.active) return;

      s.delay -= elapsed;
      if (s.delay > 0) return;

      // Fade in and out
      if (s.alpha < 1 && s.delay > -0.3) {
        s.alpha = Math.min(1, s.alpha + elapsed * 4);
      } else {
        s.alpha -= elapsed * 2;
      }

      // Rotate
      s.rotation += elapsed * 2;

      // Deactivate when faded
      if (s.alpha <= 0) {
        s.active = false;
      }
    });
  }

  /**
   * Draw sparkle particles
   */
  drawSparkles() {
    const { tertiaryColor, secondaryColor } = this.config;
    const sparkleColor = tertiaryColor || secondaryColor || 0xffffff;

    this.sparkles.forEach(s => {
      if (!s.active || s.alpha <= 0 || s.delay > 0) return;

      // Draw 4-point star sparkle
      const points = 4;
      const outerRadius = s.size;
      const innerRadius = s.size * 0.35;

      for (let i = 0; i < points * 2; i++) {
        const angle = s.rotation + (i * Math.PI) / points;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = s.x + Math.cos(angle) * radius;
        const py = s.y + Math.sin(angle) * radius;

        if (i === 0) {
          this.sparkleLayer.moveTo(px, py);
        } else {
          this.sparkleLayer.lineTo(px, py);
        }
      }
      this.sparkleLayer.closePath();
      this.sparkleLayer.fill({ color: sparkleColor, alpha: s.alpha * 0.9 });

      // Bright center
      this.sparkleLayer.circle(s.x, s.y, s.size * 0.2);
      this.sparkleLayer.fill({ color: 0xffffff, alpha: s.alpha });
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
    this.isSweeping = false;
    this.sweepProgress = 0;
    this.idleTime = 0;
    this.time = 0;
    this.sparkles.forEach(s => { s.active = false; });
    this.clearGraphics();
  }

  /**
   * Destroy effect
   */
  destroy() {
    this.shineLayer?.destroy();
    this.sparkleLayer?.destroy();
    this.cardMask?.destroy();
    this.container?.destroy({ children: true });
  }
}

export default CardShineEffect;
