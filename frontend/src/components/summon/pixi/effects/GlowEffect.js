/**
 * GlowEffect
 *
 * Bloom/glow effect around character during showcase.
 */

import { Container, Graphics } from 'pixi.js';
import { oscillate, lerp } from '../utils/math';

export class GlowEffect {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'glow-effect';

    this.centerX = options.x || 0;
    this.centerY = options.y || 0;
    this.baseRadius = options.radius || 150;
    this.color = options.color || 0xffffff;
    this.intensity = options.intensity || 0.6;

    // Graphics layers
    this.innerGlow = new Graphics();
    this.outerGlow = new Graphics();
    this.rays = new Graphics();

    this.container.addChild(this.outerGlow);
    this.container.addChild(this.innerGlow);
    this.container.addChild(this.rays);

    // Animation state
    this.time = 0;
    this.targetIntensity = 0;
    this.currentIntensity = 0;
    this.isActive = false;
    this.showRays = false;
    this.rayCount = 8;
  }

  /**
   * Start the glow effect
   */
  start(options = {}) {
    this.targetIntensity = options.intensity ?? this.intensity;
    this.isActive = true;
    this.showRays = options.showRays ?? false;
    this.rayCount = options.rayCount ?? 8;
    if (options.color !== undefined) {
      this.color = options.color;
    }
  }

  /**
   * Stop the glow effect
   */
  stop() {
    this.targetIntensity = 0;
  }

  /**
   * Set intensity
   */
  setIntensity(value) {
    this.targetIntensity = Math.max(0, Math.min(1, value));
  }

  /**
   * Update glow animation
   */
  update(dt = 1) {
    this.time += dt / 60;

    // Smooth intensity transition
    this.currentIntensity = lerp(
      this.currentIntensity,
      this.targetIntensity,
      0.1
    );

    // Check if should deactivate
    if (this.targetIntensity === 0 && this.currentIntensity < 0.01) {
      this.isActive = false;
      this.innerGlow.clear();
      this.outerGlow.clear();
      this.rays.clear();
      return false;
    }

    // Pulsing animation
    const pulse = oscillate(this.time, 0.5);
    const pulseMult = 1 + pulse * 0.15 * this.currentIntensity;

    this.drawGlow(pulseMult);

    if (this.showRays) {
      this.drawRays();
    }

    return this.isActive;
  }

  /**
   * Draw glow layers
   */
  drawGlow(pulseMult) {
    const alpha = this.currentIntensity;
    const radius = this.baseRadius * pulseMult;

    // Outer glow (larger, softer)
    this.outerGlow.clear();
    this.outerGlow.position.set(this.centerX, this.centerY);

    // Multiple layers for soft falloff
    for (let i = 5; i >= 0; i--) {
      const layerRadius = radius * (1 + i * 0.3);
      const layerAlpha = alpha * (0.15 - i * 0.02);
      this.outerGlow.circle(0, 0, layerRadius);
      this.outerGlow.fill({ color: this.color, alpha: layerAlpha });
    }

    // Inner glow (brighter core)
    this.innerGlow.clear();
    this.innerGlow.position.set(this.centerX, this.centerY);

    // Core layers
    for (let i = 3; i >= 0; i--) {
      const layerRadius = radius * (0.3 + i * 0.15);
      const layerAlpha = alpha * (0.3 - i * 0.05);
      this.innerGlow.circle(0, 0, layerRadius);
      this.innerGlow.fill({ color: 0xffffff, alpha: layerAlpha });
    }
  }

  /**
   * Draw light rays
   */
  drawRays() {
    this.rays.clear();
    this.rays.position.set(this.centerX, this.centerY);

    const rayLength = this.baseRadius * 2;
    const rayWidth = 30;
    const rotation = this.time * 0.2;

    for (let i = 0; i < this.rayCount; i++) {
      const angle = (i / this.rayCount) * Math.PI * 2 + rotation;
      const rayAlpha = this.currentIntensity * 0.2;

      // Draw tapered ray
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const perpCos = Math.cos(angle + Math.PI / 2);
      const perpSin = Math.sin(angle + Math.PI / 2);

      // Ray points
      const tipX = cos * rayLength;
      const tipY = sin * rayLength;
      const baseOffset = rayWidth / 2;

      this.rays.moveTo(perpCos * baseOffset, perpSin * baseOffset);
      this.rays.lineTo(tipX, tipY);
      this.rays.lineTo(-perpCos * baseOffset, -perpSin * baseOffset);
      this.rays.closePath();
      this.rays.fill({ color: this.color, alpha: rayAlpha });
    }
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Set color
   */
  setColor(color) {
    this.color = color;
  }

  /**
   * Set radius
   */
  setRadius(radius) {
    this.baseRadius = radius;
  }

  /**
   * Destroy effect
   */
  destroy() {
    this.innerGlow.destroy();
    this.outerGlow.destroy();
    this.rays.destroy();
    this.container.destroy({ children: true });
  }
}

export default GlowEffect;
