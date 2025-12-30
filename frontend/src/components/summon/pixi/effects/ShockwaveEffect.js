/**
 * ShockwaveEffect
 *
 * Expanding ring shockwave for the reveal moment.
 */

import { Container, Graphics } from 'pixi.js';
import { easeOutQuart, easeOutCubic } from '../utils/easing';

class ShockwaveRing {
  constructor() {
    this.reset();
  }

  reset() {
    this.radius = 0;
    this.maxRadius = 400;
    this.thickness = 8;
    this.color = 0xffffff;
    this.alpha = 1;
    this.progress = 0;
    this.duration = 0.5;
    this.elapsed = 0;
    this.active = false;
  }
}

export class ShockwaveEffect {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'shockwave-effect';

    this.centerX = options.x || 0;
    this.centerY = options.y || 0;
    this.color = options.color || 0xffffff;

    // Ring pool
    this.rings = [];
    this.pool = [];
    this.graphics = new Map();

    // Pre-allocate
    for (let i = 0; i < 10; i++) {
      this.pool.push(new ShockwaveRing());
    }
  }

  /**
   * Trigger a shockwave
   */
  trigger(options = {}) {
    const {
      x = this.centerX,
      y = this.centerY,
      maxRadius = 400,
      thickness = 8,
      duration = 0.5,
      color = this.color,
    } = options;

    const ring = this.pool.pop() || new ShockwaveRing();
    ring.reset();
    ring.x = x;
    ring.y = y;
    ring.maxRadius = maxRadius;
    ring.thickness = thickness;
    ring.duration = duration;
    ring.color = color;
    ring.active = true;

    this.rings.push(ring);
    return ring;
  }

  /**
   * Trigger multiple rings for dramatic effect
   */
  triggerMultiple(count, options = {}) {
    const { delay = 0.08, ...ringOptions } = options;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.trigger({
          ...ringOptions,
          maxRadius: (ringOptions.maxRadius || 400) * (1 - i * 0.15),
          thickness: (ringOptions.thickness || 8) * (1 - i * 0.2),
        });
      }, i * delay * 1000);
    }
  }

  /**
   * Update all rings
   */
  update(dt = 1) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];

      ring.elapsed += dt / 60;
      ring.progress = Math.min(1, ring.elapsed / ring.duration);

      if (ring.progress >= 1) {
        const g = this.graphics.get(ring);
        if (g) {
          g.clear();
          g.visible = false;
        }
        ring.active = false;
        this.pool.push(ring);
        this.rings.splice(i, 1);
        continue;
      }

      // Animate radius and alpha
      ring.radius = easeOutQuart(ring.progress) * ring.maxRadius;
      ring.alpha = easeOutCubic(1 - ring.progress);

      // Draw
      this.drawRing(ring);
    }

    return this.rings.length > 0;
  }

  /**
   * Draw a ring
   */
  drawRing(ring) {
    let g = this.graphics.get(ring);
    if (!g) {
      g = new Graphics();
      this.container.addChild(g);
      this.graphics.set(ring, g);
    }

    const thickness = ring.thickness * (1 - ring.progress * 0.5);

    g.clear();
    g.visible = true;
    g.alpha = ring.alpha;
    g.position.set(ring.x, ring.y);

    // Draw ring
    g.circle(0, 0, ring.radius);
    g.stroke({ width: thickness, color: ring.color });

    // Inner glow ring
    g.circle(0, 0, ring.radius * 0.95);
    g.stroke({ width: thickness * 0.5, color: 0xffffff, alpha: 0.5 });
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
   * Clear all rings
   */
  clear() {
    for (const ring of this.rings) {
      const g = this.graphics.get(ring);
      if (g) g.clear();
      this.pool.push(ring);
    }
    this.rings = [];
  }

  /**
   * Destroy effect
   */
  destroy() {
    this.clear();
    this.graphics.forEach((g) => g.destroy());
    this.graphics.clear();
    this.container.destroy({ children: true });
  }

  /**
   * Check if active
   */
  get isActive() {
    return this.rings.length > 0;
  }
}

export default ShockwaveEffect;
