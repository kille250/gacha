/**
 * CharacterLayer
 *
 * Character reveal and showcase with animations.
 * Handles silhouette reveal, scale animation, and floating idle.
 */

import { Container, Sprite, Graphics, Texture } from 'pixi.js';
import { lerp, oscillate } from '../utils/math';
import { easeOutBack, easeOutQuad } from '../utils/easing';

export class CharacterLayer {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'character-layer';

    this.centerX = options.x || 400;
    this.centerY = options.y || 300;
    this.maxWidth = options.maxWidth || 300;
    this.maxHeight = options.maxHeight || 400;

    // Character sprite (will be set when image loads)
    this.characterSprite = null;
    this.silhouette = new Graphics();
    this.glowOverlay = new Graphics();

    this.container.addChild(this.silhouette);
    this.container.addChild(this.glowOverlay);

    // Animation state
    this.time = 0;
    this.phase = 'hidden'; // hidden, silhouette, revealing, revealed, showcase
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.baseScale = 1; // Scale to fit image within bounds (calculated on image load)
    this.targetScale = 1; // Animation target scale multiplier
    this.currentScale = 0;
    this.glowColor = 0xffffff;
    this.glowIntensity = 0;

    // Image loading state
    this.imageLoaded = false;
    this.imageUrl = null;
  }

  /**
   * Set the character image
   */
  async setImage(imageUrl, getImagePath) {
    if (!imageUrl) return;

    this.imageUrl = getImagePath ? getImagePath(imageUrl) : imageUrl;

    try {
      // Load image using native Image element for reliability
      const texture = await this.loadTexture(this.imageUrl);

      // Remove old sprite if exists
      if (this.characterSprite) {
        this.container.removeChild(this.characterSprite);
        this.characterSprite.destroy();
      }

      // Create new sprite
      this.characterSprite = new Sprite(texture);

      // Scale to fit within max dimensions while maintaining aspect ratio
      const scaleX = this.maxWidth / texture.width;
      const scaleY = this.maxHeight / texture.height;
      this.baseScale = Math.min(scaleX, scaleY);

      this.characterSprite.scale.set(this.baseScale);
      this.characterSprite.anchor.set(0.5);
      this.characterSprite.position.set(this.centerX, this.centerY);
      this.characterSprite.alpha = 0;

      // Add to container after silhouette
      this.container.addChildAt(this.characterSprite, 1);

      this.imageLoaded = true;
    } catch (error) {
      console.warn('Failed to load character image:', error);
      this.imageLoaded = false;
    }
  }

  /**
   * Load texture from URL using native Image element
   */
  async loadTexture(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Create load promise that resolves on load or rejects on error
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(new Error(`Image failed to load: ${e.message || 'unknown error'}`));
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Image load timeout')), 10000);
    });

    // Set src after event handlers are attached
    img.src = url;

    // Wait for load with timeout
    await Promise.race([loadPromise, timeoutPromise]);

    const texture = Texture.from(img);
    if (!texture || !texture.width || !texture.height) {
      throw new Error('Invalid texture created');
    }
    return texture;
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.centerX = x;
    this.centerY = y;
    if (this.characterSprite) {
      this.characterSprite.position.set(x, y);
    }
  }

  /**
   * Set glow color
   */
  setGlowColor(color) {
    this.glowColor = color;
  }

  /**
   * Start reveal animation
   */
  reveal(options = {}) {
    this.phase = 'revealing';
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.targetScale = options.targetScale || 1;
    this.glowIntensity = options.glowIntensity || 0.6;
  }

  /**
   * Show silhouette first
   */
  showSilhouette() {
    this.phase = 'silhouette';
    if (this.characterSprite) {
      this.characterSprite.alpha = 0;
      this.characterSprite.tint = 0x000000;
    }
  }

  /**
   * Hide character
   */
  hide() {
    this.phase = 'hidden';
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.currentScale = 0;
    if (this.characterSprite) {
      this.characterSprite.alpha = 0;
      // Set to baseScale * 0 effectively (or just use baseScale for hidden state)
      this.characterSprite.scale.set(this.baseScale * 0.01);
    }
    this.silhouette.clear();
    this.glowOverlay.clear();
  }

  /**
   * Update animation
   */
  update(dt = 1) {
    this.time += dt / 60;

    if (this.phase === 'hidden') {
      return;
    }

    if (this.phase === 'silhouette') {
      this.updateSilhouette(dt);
    } else if (this.phase === 'revealing') {
      this.updateReveal(dt);
    } else if (this.phase === 'revealed' || this.phase === 'showcase') {
      this.updateShowcase(dt);
    }

    this.updateGlow();
  }

  /**
   * Update silhouette phase
   */
  updateSilhouette(_dt) {
    if (!this.characterSprite) return;

    // Show as dark silhouette
    this.characterSprite.alpha = 0.8;
    this.characterSprite.tint = 0x111111;

    // Slight scale pulse (using baseScale to maintain proper sizing)
    const pulse = oscillate(this.time, 0.5);
    const scaleMult = 0.95 + pulse * 0.05;
    this.characterSprite.scale.set(this.baseScale * this.targetScale * scaleMult);
  }

  /**
   * Update reveal animation
   */
  updateReveal(dt) {
    if (!this.characterSprite) return;

    // Progress reveal
    this.revealProgress = Math.min(1, this.revealProgress + dt / 30); // ~0.5s reveal
    this.scaleProgress = Math.min(1, this.scaleProgress + dt / 20); // Scale animation

    // Scale with overshoot (baseScale ensures proper sizing, targetScale is animation multiplier)
    const scaleEased = easeOutBack(this.scaleProgress);
    const scaleMult = lerp(0.85, this.targetScale, scaleEased);
    this.currentScale = this.baseScale * scaleMult;

    // Apply scale
    this.characterSprite.scale.set(this.currentScale);

    // Tint transition from black to white (full color)
    const tintProgress = easeOutQuad(this.revealProgress);
    const tintValue = Math.floor(tintProgress * 255);
    this.characterSprite.tint = (tintValue << 16) | (tintValue << 8) | tintValue;

    // Alpha
    this.characterSprite.alpha = Math.min(1, this.revealProgress * 2);

    // Check if reveal complete
    if (this.revealProgress >= 1 && this.scaleProgress >= 1) {
      this.phase = 'revealed';
      this.characterSprite.tint = 0xffffff;
    }
  }

  /**
   * Update showcase phase (idle floating)
   */
  updateShowcase(_dt) {
    if (!this.characterSprite) return;

    // Floating animation
    const floatY = Math.sin(this.time * 2) * 8;
    const floatRotation = Math.sin(this.time * 1.5) * 0.02;

    this.characterSprite.position.set(this.centerX, this.centerY + floatY);
    this.characterSprite.rotation = floatRotation;
    this.characterSprite.alpha = 1;
    this.characterSprite.tint = 0xffffff;

    // Subtle scale pulse (baseScale ensures proper sizing)
    const scalePulse = 1 + Math.sin(this.time * 2.5) * 0.02;
    this.characterSprite.scale.set(this.baseScale * this.targetScale * scalePulse);
  }

  /**
   * Update glow overlay
   */
  updateGlow() {
    this.glowOverlay.clear();

    if (this.glowIntensity <= 0 || !this.characterSprite) return;

    const { x, y } = this.characterSprite.position;
    const width = this.characterSprite.width;
    const height = this.characterSprite.height;

    // Glow behind character
    const glowRadius = Math.max(width, height) * 0.6;
    const pulse = oscillate(this.time, 0.4);
    const alpha = this.glowIntensity * 0.3 * (0.8 + pulse * 0.2);

    for (let i = 3; i >= 0; i--) {
      const r = glowRadius * (0.5 + i * 0.2);
      const a = alpha * (1 - i * 0.2);
      this.glowOverlay.circle(x, y, r);
      this.glowOverlay.fill({ color: this.glowColor, alpha: a });
    }
  }

  /**
   * Set showcase mode
   */
  setShowcase() {
    this.phase = 'showcase';
  }

  /**
   * Reset
   */
  reset() {
    this.phase = 'hidden';
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.currentScale = 0;
    this.time = 0;
    this.glowIntensity = 0;
    this.targetScale = 1;

    if (this.characterSprite) {
      this.characterSprite.alpha = 0;
      // Use baseScale * tiny multiplier to keep proportions correct but invisible
      this.characterSprite.scale.set(this.baseScale * 0.01);
      this.characterSprite.rotation = 0;
      this.characterSprite.tint = 0xffffff;
    }

    this.silhouette.clear();
    this.glowOverlay.clear();
  }

  /**
   * Destroy layer
   */
  destroy() {
    if (this.characterSprite) {
      this.characterSprite.destroy();
    }
    this.silhouette.destroy();
    this.glowOverlay.destroy();
    this.container.destroy({ children: true });
  }
}

export default CharacterLayer;
