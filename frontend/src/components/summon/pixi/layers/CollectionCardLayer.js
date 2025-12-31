/**
 * CollectionCardLayer
 *
 * Renders a collection-style card in Pixi.js that matches the ShowcaseCard design.
 * Displays character image, name, series, NEW badge, and rarity indicator.
 */

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { lerp } from '../utils/math';
import { easeOutBack } from '../utils/easing';
import { isVideo } from '../../../../utils/mediaUtils';

// Rarity color configurations
const RARITY_COLORS = {
  common: { border: 0x9CA3AF, glow: 0xD1D5DB },
  uncommon: { border: 0x22C55E, glow: 0x86EFAC },
  rare: { border: 0x3B82F6, glow: 0x93C5FD },
  epic: { border: 0xA855F7, glow: 0xD8B4FE },
  legendary: { border: 0xF59E0B, glow: 0xFDE047 },
};

export class CollectionCardLayer {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'collection-card-layer';

    // Position
    this.centerX = options.x || 0;
    this.centerY = options.y || 0;

    // Card dimensions
    this.cardWidth = options.width || 280;
    this.cardHeight = options.height || 360;
    this.cornerRadius = 16;
    this.borderWidth = 3;

    // Entity data
    this.entity = null;
    this.rarity = 'common';
    this.colors = RARITY_COLORS.common;

    // Graphics layers
    this.glowLayer = new Graphics();
    this.cardBackground = new Graphics();
    this.imageContainer = new Container();
    this.imageMask = new Graphics();
    this.characterSprite = null;
    this.rarityIndicator = new Graphics();
    this.newBadge = new Container();
    this.textContainer = new Container();

    // Add layers in order
    this.container.addChild(this.glowLayer);
    this.container.addChild(this.cardBackground);
    this.container.addChild(this.imageContainer);
    this.container.addChild(this.rarityIndicator);
    this.container.addChild(this.newBadge);
    this.container.addChild(this.textContainer);

    // Animation state
    this.time = 0;
    this.isActive = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.scale = 0.8;
    this.targetScale = 1;
    this.revealProgress = 0;
    this.shakeIntensity = 0; // For shake effect on reveal
    this.shakeDuration = 0; // How long shake lasts (in seconds)
    this.shakeMaxDuration = 0.8; // Total shake duration

    // Image loading
    this.imageLoaded = false;
    this.loadId = 0;
    this.videoElement = null;
    this.getImagePath = null;

    // Text objects
    this.nameText = null;
    this.seriesText = null;
  }

  /**
   * Set the image path resolver
   */
  setImagePathResolver(fn) {
    this.getImagePath = fn;
  }

  /**
   * Set entity data and load image
   */
  async setEntity(entity) {
    if (!entity) return;

    this.entity = entity;
    this.rarity = entity.rarity?.toLowerCase() || 'common';
    this.colors = RARITY_COLORS[this.rarity] || RARITY_COLORS.common;

    // Load character image
    if (entity.image) {
      await this.loadImage(entity.image);
    }

    // Update text
    this.updateText();
  }

  /**
   * Load character image
   */
  async loadImage(imageUrl) {
    const currentLoadId = ++this.loadId;
    const resolvedUrl = this.getImagePath ? this.getImagePath(imageUrl) : imageUrl;

    // Clear existing sprite
    if (this.characterSprite) {
      this.imageContainer.removeChild(this.characterSprite);
      this.characterSprite.destroy();
      this.characterSprite = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement = null;
    }
    this.imageLoaded = false;

    try {
      let texture;

      if (isVideo(resolvedUrl)) {
        texture = await this.loadVideoTexture(resolvedUrl);
      } else {
        texture = await this.loadImageTexture(resolvedUrl);
      }

      // Check if load is still current
      if (currentLoadId !== this.loadId) {
        texture.destroy(true);
        return;
      }

      // Create sprite
      this.characterSprite = new Sprite(texture);

      // Calculate image area (square, top portion of card)
      const imageSize = this.cardWidth - this.borderWidth * 2;

      // Scale to cover the image area
      const scaleX = imageSize / texture.width;
      const scaleY = imageSize / texture.height;
      const scale = Math.max(scaleX, scaleY);

      this.characterSprite.scale.set(scale);
      this.characterSprite.anchor.set(0.5);
      this.characterSprite.position.set(0, -this.cardHeight / 2 + imageSize / 2 + this.borderWidth);

      // Apply mask for rounded corners
      this.updateImageMask();
      this.characterSprite.mask = this.imageMask;

      this.imageContainer.addChild(this.characterSprite);
      this.imageLoaded = true;
    } catch (error) {
      if (currentLoadId === this.loadId) {
        console.warn('Failed to load character image:', error);
      }
    }
  }

  /**
   * Load image texture
   */
  async loadImageTexture(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    return Texture.from(img);
  }

  /**
   * Load video texture
   */
  async loadVideoTexture(url) {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';

    await new Promise((resolve, reject) => {
      video.addEventListener('canplaythrough', resolve, { once: true });
      video.addEventListener('error', reject, { once: true });
      video.src = url;
      video.load();
    });

    this.videoElement = video;
    video.play().catch(() => {});

    return Texture.from(video);
  }

  /**
   * Update image mask for rounded corners
   */
  updateImageMask() {
    this.imageMask.clear();

    const imageSize = this.cardWidth - this.borderWidth * 2;
    const halfWidth = this.cardWidth / 2;
    const topY = -this.cardHeight / 2;

    // Rounded rect mask for image area (only top corners rounded)
    this.imageMask.roundRect(
      -halfWidth + this.borderWidth,
      topY + this.borderWidth,
      imageSize,
      imageSize,
      this.cornerRadius - this.borderWidth
    );
    this.imageMask.fill({ color: 0xffffff });

    if (!this.imageMask.parent) {
      this.imageContainer.addChild(this.imageMask);
    }
  }

  /**
   * Update text elements
   */
  updateText() {
    // Clear existing text
    this.textContainer.removeChildren();

    if (!this.entity) return;

    const imageSize = this.cardWidth - this.borderWidth * 2;
    const textAreaTop = -this.cardHeight / 2 + imageSize + this.borderWidth + 12;
    const textX = -this.cardWidth / 2 + 16;

    // Rarity symbol - using plain ASCII symbols for PixiJS text compatibility
    const raritySymbols = {
      common: '*',
      uncommon: '+',
      rare: '**',
      epic: '***',
      legendary: '****',
    };
    const symbol = raritySymbols[this.rarity] || '*';

    // Name text with rarity symbol
    this.nameText = new Text({
      text: `${symbol} ${this.entity.name || 'Unknown'}`,
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 16,
        fontWeight: '600',
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: this.cardWidth - 32,
      },
    });
    this.nameText.position.set(textX, textAreaTop);
    this.textContainer.addChild(this.nameText);

    // Series text
    if (this.entity.series) {
      this.seriesText = new Text({
        text: this.entity.series,
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          fill: 0x9CA3AF,
          wordWrap: true,
          wordWrapWidth: this.cardWidth - 32,
        },
      });
      this.seriesText.position.set(textX, textAreaTop + 22);
      this.textContainer.addChild(this.seriesText);
    }
  }

  /**
   * Start the card reveal animation
   */
  start(options = {}) {
    this.isActive = true;
    this.targetOpacity = 1;
    this.targetScale = 1;
    this.revealProgress = 0;

    // Trigger shake effect on reveal (stronger for higher rarities)
    const shakeByRarity = {
      common: 4,
      uncommon: 6,
      rare: 8,
      epic: 12,
      legendary: 18,
    };
    this.shakeIntensity = shakeByRarity[this.rarity] || 6;
    this.shakeDuration = this.shakeMaxDuration;

    if (options.instant) {
      this.opacity = 1;
      this.scale = 1;
      this.revealProgress = 1;
      this.shakeIntensity = 0; // No shake on instant
      this.shakeDuration = 0;
    }

    // Resume video if present
    if (this.videoElement) {
      this.videoElement.play().catch(() => {});
    }
  }

  /**
   * Hide the card
   */
  hide() {
    this.targetOpacity = 0;
    this.targetScale = 0.9;
  }

  /**
   * Reset the card
   */
  reset() {
    this.isActive = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.scale = 0.8;
    this.targetScale = 1;
    this.revealProgress = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.time = 0;

    if (this.videoElement) {
      this.videoElement.pause();
    }

    this.container.alpha = 0;
    this.container.scale.set(0.8);
    this.container.rotation = 0;
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Update animation
   */
  update(dt = 1) {
    // Skip update if layer has been destroyed
    if (!this.container || this.container.destroyed) return;
    if (!this.isActive && this.opacity < 0.01) return;

    this.time += dt / 60;

    // Smooth transitions
    this.opacity = lerp(this.opacity, this.targetOpacity, 0.15);
    this.scale = lerp(this.scale, this.targetScale, 0.12);

    // Reveal progress
    if (this.revealProgress < 1) {
      this.revealProgress = Math.min(1, this.revealProgress + dt / 20);
    }

    // Check for deactivation
    if (this.targetOpacity === 0 && this.opacity < 0.01) {
      this.isActive = false;
      return;
    }

    // Draw card
    this.draw();
  }

  /**
   * Main draw function
   */
  draw() {
    const revealEased = easeOutBack(this.revealProgress);
    const currentScale = this.scale * (0.9 + revealEased * 0.1);

    // Calculate shake offset based on remaining duration
    let shakeX = 0;
    let shakeY = 0;
    let shakeRotation = 0;
    if (this.shakeDuration > 0) {
      // Calculate decay factor (1.0 at start, 0.0 at end)
      const decayFactor = this.shakeDuration / this.shakeMaxDuration;
      const currentIntensity = this.shakeIntensity * decayFactor;

      // Use sine waves for smoother shake instead of pure random
      const shakeSpeed = 25; // How fast the shake oscillates
      shakeX = Math.sin(this.time * shakeSpeed) * currentIntensity;
      shakeY = Math.cos(this.time * shakeSpeed * 1.3) * currentIntensity * 0.7;
      shakeRotation = Math.sin(this.time * shakeSpeed * 0.8) * currentIntensity * 0.003;

      // Decrease duration based on deltaTime (roughly 1/60 per frame)
      this.shakeDuration -= 1 / 60;
      if (this.shakeDuration < 0) this.shakeDuration = 0;
    }

    // Apply container transforms with shake
    this.container.position.set(this.centerX + shakeX, this.centerY + shakeY);
    this.container.scale.set(currentScale);
    this.container.alpha = this.opacity;
    this.container.rotation = shakeRotation;

    // Draw components
    this.drawGlow();
    this.drawCard();
    this.drawRarityIndicator();
    this.drawNewBadge();
  }

  /**
   * Draw outer glow
   */
  drawGlow() {
    this.glowLayer.clear();

    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;
    const pulse = 0.8 + Math.sin(this.time * 2) * 0.2;

    // Multiple glow layers
    for (let i = 4; i >= 0; i--) {
      const expansion = (i + 1) * 12;
      const layerAlpha = 0.15 * pulse * (1 - i * 0.18);

      this.glowLayer.roundRect(
        -halfW - expansion,
        -halfH - expansion,
        this.cardWidth + expansion * 2,
        this.cardHeight + expansion * 2,
        this.cornerRadius + expansion * 0.5
      );
      this.glowLayer.fill({ color: this.colors.glow, alpha: layerAlpha });
    }
  }

  /**
   * Draw card background
   */
  drawCard() {
    this.cardBackground.clear();

    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Border
    this.cardBackground.roundRect(
      -halfW,
      -halfH,
      this.cardWidth,
      this.cardHeight,
      this.cornerRadius
    );
    this.cardBackground.fill({ color: this.colors.border });

    // Inner background
    this.cardBackground.roundRect(
      -halfW + this.borderWidth,
      -halfH + this.borderWidth,
      this.cardWidth - this.borderWidth * 2,
      this.cardHeight - this.borderWidth * 2,
      this.cornerRadius - 2
    );
    this.cardBackground.fill({ color: 0x1a1a2e });
  }

  /**
   * Draw rarity indicator bar at bottom of image
   */
  drawRarityIndicator() {
    this.rarityIndicator.clear();

    const imageSize = this.cardWidth - this.borderWidth * 2;
    const halfW = this.cardWidth / 2;
    const indicatorY = -this.cardHeight / 2 + imageSize + this.borderWidth;

    // Rarity bar
    this.rarityIndicator.rect(
      -halfW + this.borderWidth,
      indicatorY - 3,
      imageSize,
      3
    );
    this.rarityIndicator.fill({ color: this.colors.border });

    // Glow effect on bar
    for (let i = 2; i >= 0; i--) {
      const expand = i * 2;
      const alpha = 0.3 * (1 - i * 0.25);
      this.rarityIndicator.rect(
        -halfW + this.borderWidth - expand,
        indicatorY - 3 - expand,
        imageSize + expand * 2,
        3 + expand * 2
      );
      this.rarityIndicator.fill({ color: this.colors.glow, alpha });
    }
  }

  /**
   * Draw NEW badge
   */
  drawNewBadge() {
    // Only draw once
    if (this.newBadge.children.length > 0) return;

    const badgeGraphics = new Graphics();
    const badgeWidth = 45;
    const badgeHeight = 22;
    const halfW = this.cardWidth / 2;
    const halfH = this.cardHeight / 2;

    // Position in top-right of image area
    const badgeX = halfW - badgeWidth - 12;
    const badgeY = -halfH + 12;

    // Badge background with gradient effect
    badgeGraphics.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 11);
    badgeGraphics.fill({ color: 0x34C759 });

    // Highlight
    badgeGraphics.roundRect(badgeX + 2, badgeY + 2, badgeWidth - 4, badgeHeight / 2, 8);
    badgeGraphics.fill({ color: 0x4ADE80, alpha: 0.3 });

    this.newBadge.addChild(badgeGraphics);

    // NEW text
    const badgeText = new Text({
      text: 'NEW',
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        fill: 0xffffff,
        letterSpacing: 0.5,
      },
    });
    badgeText.anchor.set(0.5);
    badgeText.position.set(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    this.newBadge.addChild(badgeText);
  }

  /**
   * Destroy layer
   */
  destroy() {
    if (this.characterSprite) {
      this.characterSprite.destroy();
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
    }
    this.glowLayer?.destroy();
    this.cardBackground?.destroy();
    this.imageContainer?.destroy({ children: true });
    this.rarityIndicator?.destroy();
    this.newBadge?.destroy({ children: true });
    this.textContainer?.destroy({ children: true });
    this.container?.destroy({ children: true });
  }
}

export default CollectionCardLayer;
