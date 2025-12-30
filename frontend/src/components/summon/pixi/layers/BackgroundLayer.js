/**
 * BackgroundLayer
 *
 * Animated background with radial gradient, vignette, and color shifts.
 */

import { Container, Graphics } from 'pixi.js';
import { lerp, oscillate } from '../utils/math';
import { lerpColor } from '../utils/colors';

export class BackgroundLayer {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'background-layer';

    this.width = options.width || 800;
    this.height = options.height || 600;
    this.baseColor = options.color || 0x0a0a0f;
    this.accentColor = options.accentColor || 0x1a1a2e;

    // Graphics
    this.background = new Graphics();
    this.gradient = new Graphics();
    this.vignette = new Graphics();
    this.ambientGlow = new Graphics();

    this.container.addChild(this.background);
    this.container.addChild(this.gradient);
    this.container.addChild(this.ambientGlow);
    this.container.addChild(this.vignette);

    // State
    this.time = 0;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.rarityColor = 0xffffff;

    // Initial draw
    this.drawStatic();
  }

  /**
   * Draw static elements
   */
  drawStatic() {
    const { width, height } = this;

    // Background fill
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill(this.baseColor);

    // Vignette
    this.vignette.clear();
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.max(width, height) * 0.8;

    // Create vignette with multiple layers
    for (let i = 10; i >= 0; i--) {
      const radius = maxRadius * (0.4 + i * 0.06);
      const alpha = i * 0.05;
      this.vignette.circle(centerX, centerY, radius);
      this.vignette.fill({ color: 0x000000, alpha });
    }
  }

  /**
   * Set dimensions
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.drawStatic();
  }

  /**
   * Set rarity color for ambient effects
   */
  setRarityColor(color) {
    this.rarityColor = color;
  }

  /**
   * Set intensity (0-1)
   */
  setIntensity(value) {
    this.targetIntensity = Math.max(0, Math.min(1, value));
  }

  /**
   * Update animation
   */
  update(dt = 1) {
    this.time += dt / 60;

    // Smooth intensity transition
    this.intensity = lerp(this.intensity, this.targetIntensity, 0.05);

    // Draw animated elements
    this.drawGradient();
    this.drawAmbientGlow();
  }

  /**
   * Draw animated gradient
   */
  drawGradient() {
    const { width, height } = this;
    const centerX = width / 2;
    const centerY = height / 2;

    this.gradient.clear();

    if (this.intensity < 0.01) return;

    // Pulsing radial gradient
    const pulse = oscillate(this.time, 0.3);
    const gradientRadius = Math.min(width, height) * 0.5 * (1 + pulse * 0.1);

    // Multiple gradient layers
    for (let i = 5; i >= 0; i--) {
      const radius = gradientRadius * (0.5 + i * 0.15);
      const alpha = this.intensity * 0.12 * (1 - i * 0.15);
      const color = lerpColor(this.rarityColor, this.accentColor, i * 0.1);

      this.gradient.circle(centerX, centerY, radius);
      this.gradient.fill({ color, alpha });
    }
  }

  /**
   * Draw ambient glow
   */
  drawAmbientGlow() {
    const { width, height } = this;
    const centerX = width / 2;
    const centerY = height / 2;

    this.ambientGlow.clear();

    if (this.intensity < 0.01) return;

    // Ambient color glow
    const glowRadius = Math.min(width, height) * 0.6;
    const pulse = oscillate(this.time * 1.3, 0.4);
    const alpha = this.intensity * 0.15 * (0.8 + pulse * 0.2);

    this.ambientGlow.circle(centerX, centerY, glowRadius);
    this.ambientGlow.fill({ color: this.rarityColor, alpha });
  }

  /**
   * Flash the background
   */
  flash(_color, _duration = 0.15) {
    // This will be handled by the scene's flash overlay
  }

  /**
   * Destroy layer
   */
  destroy() {
    this.background.destroy();
    this.gradient.destroy();
    this.vignette.destroy();
    this.ambientGlow.destroy();
    this.container.destroy({ children: true });
  }
}

export default BackgroundLayer;
