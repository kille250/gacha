/**
 * CharacterLayer
 *
 * Character reveal and showcase with animations.
 * Handles silhouette reveal, scale animation, and floating idle.
 */

import { Container, Sprite, Graphics, Texture } from 'pixi.js';
import { lerp, oscillate } from '../utils/math';
import { easeOutBack, easeOutQuad } from '../utils/easing';
import { isVideo } from '../../../../utils/mediaUtils';

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

    // Showcase animation state - separate time tracker for smooth floating start
    this.showcaseTime = 0;

    // Image loading state
    this.imageLoaded = false;
    this.imageUrl = null;
    this.isDestroyed = false;
    // Counter to track current load request and prevent race conditions
    this.loadId = 0;
    // Video element reference for cleanup
    this.videoElement = null;
  }

  /**
   * Set the character image
   */
  async setImage(imageUrl, getImagePath) {
    if (!imageUrl || this.isDestroyed || !this.container) return;

    this.imageUrl = getImagePath ? getImagePath(imageUrl) : imageUrl;

    // Increment load ID to track this specific load request
    // This prevents race conditions when setImage is called multiple times
    const currentLoadId = ++this.loadId;

    // Immediately clear old sprite to prevent showing wrong image during load
    // This is critical for multi-pull where entities change rapidly
    if (this.characterSprite) {
      this.container.removeChild(this.characterSprite);
      this.characterSprite.destroy();
      this.characterSprite = null;
    }
    // Clean up any existing video element
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.load();
      this.videoElement = null;
    }
    this.imageLoaded = false;

    try {
      // Load image using native Image element for reliability
      const texture = await this.loadTexture(this.imageUrl);

      // Check if this load is still current (another setImage may have been called)
      if (currentLoadId !== this.loadId) {
        // This load is stale, discard the texture and abort
        texture.destroy(true);
        return;
      }

      // Create new sprite
      this.characterSprite = new Sprite(texture);

      // Scale to fit within max dimensions while maintaining aspect ratio
      const scaleX = this.maxWidth / texture.width;
      const scaleY = this.maxHeight / texture.height;
      this.baseScale = Math.min(scaleX, scaleY);

      this.characterSprite.anchor.set(0.5);
      this.characterSprite.position.set(this.centerX, this.centerY);

      // Bug fix: Ensure sprite starts fully hidden (alpha 0 AND tiny scale)
      // This prevents any flash during the frame between image load and animation start
      this.characterSprite.alpha = 0;
      this.characterSprite.scale.set(this.baseScale * 0.01);
      this.characterSprite.visible = false; // Double-ensure no flash
      this.characterSprite.tint = 0x000000; // Start with black tint too

      // Add to container after silhouette (safely handle variable child count)
      const insertIndex = Math.min(1, this.container.children.length);
      if (insertIndex < this.container.children.length) {
        this.container.addChildAt(this.characterSprite, insertIndex);
      } else {
        this.container.addChild(this.characterSprite);
      }

      this.imageLoaded = true;
    } catch (error) {
      // Only log error if this is still the current load
      if (currentLoadId === this.loadId) {
        console.warn('Failed to load character image:', error.message || error);
        this.imageLoaded = false;
      }
    }
  }

  /**
   * Load texture from URL - handles both images and videos
   */
  async loadTexture(url) {
    // Check if the URL is a video file
    if (isVideo(url)) {
      return this.loadVideoTexture(url);
    }
    return this.loadImageTexture(url);
  }

  /**
   * Load texture from image URL using native Image element
   */
  async loadImageTexture(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Create load promise that resolves on load or rejects on error
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(new Error(`Image failed to load: ${e.message || 'unknown error'}`));
      img.src = url;
    });

    const texture = Texture.from(img);
    if (!texture || !texture.width || !texture.height) {
      throw new Error('Invalid texture created');
    }
    return texture;
  }

  /**
   * Load texture from video URL using native Video element
   */
  async loadVideoTexture(url) {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    // Prevent video from showing controls
    video.controls = false;
    // Preload metadata to get dimensions
    video.preload = 'auto';

    // Create load promise that resolves when video has enough data
    await new Promise((resolve, reject) => {
      const onCanPlay = () => {
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
        resolve();
      };
      const onError = (e) => {
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
        reject(new Error(`Video failed to load: ${e.message || 'unknown error'}`));
      };
      video.addEventListener('canplaythrough', onCanPlay);
      video.addEventListener('error', onError);
      video.src = url;
      video.load();
    });

    // Store reference for cleanup
    this.videoElement = video;

    // Start playing the video
    try {
      await video.play();
    } catch (playError) {
      // Autoplay might be blocked, but we can still use the texture
      console.warn('Video autoplay blocked, texture will still work:', playError);
    }

    // Create texture from video element
    const texture = Texture.from(video, { resourceOptions: { autoPlay: true } });
    if (!texture || !texture.width || !texture.height) {
      throw new Error('Invalid video texture created');
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
    if (this.isDestroyed) return;
    this.phase = 'revealing';
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.targetScale = options.targetScale || 1;
    this.glowIntensity = options.glowIntensity || 0.6;

    // Resume video playback if this is a video texture
    if (this.videoElement) {
      this.videoElement.play().catch(() => {
        // Ignore autoplay errors
      });
    }

    // Make sprite visible now that reveal is starting
    if (this.characterSprite) {
      this.characterSprite.visible = true;
      // Ensure character starts at center position for reveal
      this.characterSprite.position.set(this.centerX, this.centerY);
      this.characterSprite.rotation = 0;
      // Start with proper initial state for reveal animation
      this.characterSprite.alpha = 0;
      this.characterSprite.scale.set(this.baseScale * 0.85);
      this.characterSprite.tint = 0x000000;
    }
  }

  /**
   * Show silhouette first
   */
  showSilhouette() {
    this.phase = 'silhouette';
    if (this.characterSprite) {
      this.characterSprite.visible = true;
      this.characterSprite.alpha = 0;
      this.characterSprite.tint = 0x000000;
    }
  }

  /**
   * Hide character
   */
  hide() {
    if (this.isDestroyed) return;
    this.phase = 'hidden';
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.currentScale = 0;
    if (this.characterSprite) {
      this.characterSprite.alpha = 0;
      this.characterSprite.visible = false;
      this.characterSprite.scale.set(this.baseScale * 0.01);
      this.characterSprite.tint = 0x000000;
    }
    // Safely clear graphics (may be null if destroyed)
    this.silhouette?.clear();
    this.glowOverlay?.clear();
  }

  /**
   * Update animation
   */
  update(dt = 1) {
    // Skip update if layer has been destroyed
    if (this.isDestroyed || !this.container || this.container.destroyed) return;
    this.time += dt / 60;

    if (this.phase === 'hidden') {
      return;
    }

    if (this.phase === 'silhouette') {
      this.updateSilhouette(dt);
    } else if (this.phase === 'revealing') {
      this.updateReveal(dt);
    } else if (this.phase === 'revealed') {
      this.updateRevealed(dt);
    } else if (this.phase === 'showcase') {
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

    // Keep position locked at center during reveal
    this.characterSprite.position.set(this.centerX, this.centerY);
    this.characterSprite.rotation = 0;

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
   * Update revealed phase (static, waiting for showcase)
   * Character stays at center position without floating.
   */
  updateRevealed(_dt) {
    if (!this.characterSprite) return;

    // Keep character static at center - no floating yet
    this.characterSprite.position.set(this.centerX, this.centerY);
    this.characterSprite.rotation = 0;
    this.characterSprite.alpha = 1;
    this.characterSprite.tint = 0xffffff;
    this.characterSprite.scale.set(this.baseScale * this.targetScale);
  }

  /**
   * Update showcase phase
   * In showcase mode, the Pixi sprite is hidden and the React ShowcaseCard
   * displays the character instead. This method is now a no-op.
   */
  updateShowcase(_dt) {
    // Character is hidden during showcase - React ShowcaseCard displays instead
    // No update needed
  }

  /**
   * Update glow overlay
   */
  updateGlow() {
    if (!this.glowOverlay) return;
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
   * In showcase mode, we hide the Pixi character sprite since the React
   * ShowcaseCard (collection-style card) will display the character instead.
   * This prevents showing duplicate character displays.
   */
  setShowcase() {
    if (this.isDestroyed) return;
    this.phase = 'showcase';
    // Reset showcaseTime for consistency
    this.showcaseTime = 0;
    // Hide the character sprite - the React ShowcaseCard will display instead
    if (this.characterSprite) {
      this.characterSprite.alpha = 0;
      this.characterSprite.visible = false;
    }
    // Clear glow overlay since React card has its own glow
    this.glowIntensity = 0;
    this.glowOverlay?.clear();
  }

  /**
   * Reset
   */
  reset() {
    if (this.isDestroyed) return;
    this.phase = 'hidden';
    this.revealProgress = 0;
    this.scaleProgress = 0;
    this.currentScale = 0;
    this.time = 0;
    this.showcaseTime = 0;
    this.glowIntensity = 0;
    this.targetScale = 1;

    // Increment loadId to invalidate any pending image loads
    // This prevents race conditions where old loads complete after reset
    this.loadId++;

    // Pause video playback when hidden to save resources
    if (this.videoElement) {
      this.videoElement.pause();
    }

    if (this.characterSprite) {
      this.characterSprite.alpha = 0;
      this.characterSprite.visible = false;
      // Use baseScale * tiny multiplier to keep proportions correct but invisible
      this.characterSprite.scale.set(this.baseScale * 0.01);
      this.characterSprite.rotation = 0;
      this.characterSprite.position.set(this.centerX, this.centerY);
      this.characterSprite.tint = 0xffffff;
    }

    // Safely clear graphics (may be null if destroyed)
    this.silhouette?.clear();
    this.glowOverlay?.clear();
  }

  /**
   * Destroy layer
   */
  destroy() {
    this.isDestroyed = true;
    if (this.characterSprite) {
      this.characterSprite.destroy();
      this.characterSprite = null;
    }
    // Clean up video element
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.load();
      this.videoElement = null;
    }
    this.silhouette?.destroy();
    this.silhouette = null;
    this.glowOverlay?.destroy();
    this.glowOverlay = null;
    this.container?.destroy({ children: true });
    this.container = null;
  }
}

export default CharacterLayer;
