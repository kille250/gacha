/**
 * ForegroundLayer
 *
 * Overlay effects like flash, UI elements, and foreground particles.
 */

import { Container, Graphics } from 'pixi.js';
import { lerp } from '../utils/math';

export class ForegroundLayer {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'foreground-layer';

    this.width = options.width || 800;
    this.height = options.height || 600;

    // Graphics elements
    this.flashOverlay = new Graphics();
    this.dimOverlay = new Graphics();

    this.container.addChild(this.dimOverlay);
    this.container.addChild(this.flashOverlay);

    // Flash state
    this.flashColor = 0xffffff;
    this.flashAlpha = 0;
    this.flashTargetAlpha = 0;
    this.flashDecay = 0.1;

    // Dim state
    this.dimAlpha = 0;
    this.dimTargetAlpha = 0;
  }

  /**
   * Resize layer
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  /**
   * Trigger flash effect
   */
  flash(options = {}) {
    const {
      color = 0xffffff,
      alpha = 0.9,
      decay = 0.1,
    } = options;

    this.flashColor = color;
    this.flashAlpha = alpha;
    this.flashTargetAlpha = 0;
    this.flashDecay = decay;
  }

  /**
   * Set dim overlay
   */
  setDim(alpha) {
    this.dimTargetAlpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Update animation
   */
  update(_dt = 1) {
    // Skip update if layer has been destroyed
    if (!this.container || this.container.destroyed) return;

    // Update flash
    if (this.flashAlpha > 0.001) {
      this.flashAlpha = lerp(this.flashAlpha, this.flashTargetAlpha, this.flashDecay);
      this.drawFlash();
    } else {
      this.flashAlpha = 0;
      this.flashOverlay.clear();
    }

    // Update dim
    this.dimAlpha = lerp(this.dimAlpha, this.dimTargetAlpha, 0.1);
    this.drawDim();
  }

  /**
   * Draw flash overlay
   */
  drawFlash() {
    if (!this.flashOverlay || this.flashOverlay.destroyed) return;
    try {
      this.flashOverlay.clear();
    } catch (e) {
      return;
    }

    if (this.flashAlpha <= 0) return;

    this.flashOverlay.rect(0, 0, this.width, this.height);
    this.flashOverlay.fill({ color: this.flashColor, alpha: this.flashAlpha });
  }

  /**
   * Draw dim overlay
   */
  drawDim() {
    if (!this.dimOverlay || this.dimOverlay.destroyed) return;
    try {
      this.dimOverlay.clear();
    } catch (e) {
      return;
    }

    if (this.dimAlpha <= 0.001) return;

    this.dimOverlay.rect(0, 0, this.width, this.height);
    this.dimOverlay.fill({ color: 0x000000, alpha: this.dimAlpha });
  }

  /**
   * Clear all overlays
   */
  clear() {
    this.flashAlpha = 0;
    this.flashTargetAlpha = 0;
    this.dimAlpha = 0;
    this.dimTargetAlpha = 0;
    this.flashOverlay.clear();
    this.dimOverlay.clear();
  }

  /**
   * Destroy layer
   */
  destroy() {
    this.flashOverlay.destroy();
    this.dimOverlay.destroy();
    this.container.destroy({ children: true });
  }
}

export default ForegroundLayer;
