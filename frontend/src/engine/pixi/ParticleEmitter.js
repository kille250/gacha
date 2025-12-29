/**
 * ParticleEmitter
 *
 * Lightweight particle system for visual effects.
 * Uses Pixi.js Graphics for particles (no sprite assets required).
 */

import { Container, Graphics } from 'pixi.js';

/**
 * Particle class
 */
class Particle {
  constructor(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.ax = config.ax || 0; // Acceleration
    this.ay = config.ay || 0;
    this.life = config.life || 1;
    this.maxLife = config.life || 1;
    this.size = config.size || 4;
    this.sizeEnd = config.sizeEnd ?? config.size;
    this.color = config.color || 0xffffff;
    this.colorEnd = config.colorEnd ?? config.color;
    this.alpha = config.alpha ?? 1;
    this.alphaEnd = config.alphaEnd ?? 0;
    this.rotation = config.rotation || 0;
    this.rotationSpeed = config.rotationSpeed || 0;
    this.shape = config.shape || 'circle'; // circle, square, star
    this.gravity = config.gravity || 0;
    this.friction = config.friction || 1;
    this.graphics = null;
  }

  get progress() {
    return 1 - (this.life / this.maxLife);
  }

  get isAlive() {
    return this.life > 0;
  }

  update(delta) {
    // Update velocity with acceleration and gravity
    this.vx += this.ax * delta;
    this.vy += (this.ay + this.gravity) * delta;

    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Update position
    this.x += this.vx * delta;
    this.y += this.vy * delta;

    // Update rotation
    this.rotation += this.rotationSpeed * delta;

    // Update life
    this.life -= delta / 60; // Assuming 60fps
  }

  getCurrentSize() {
    return this.size + (this.sizeEnd - this.size) * this.progress;
  }

  getCurrentAlpha() {
    return this.alpha + (this.alphaEnd - this.alpha) * this.progress;
  }

  getCurrentColor() {
    // Simple linear interpolation between colors
    const startR = (this.color >> 16) & 0xff;
    const startG = (this.color >> 8) & 0xff;
    const startB = this.color & 0xff;

    const endR = (this.colorEnd >> 16) & 0xff;
    const endG = (this.colorEnd >> 8) & 0xff;
    const endB = this.colorEnd & 0xff;

    const r = Math.round(startR + (endR - startR) * this.progress);
    const g = Math.round(startG + (endG - startG) * this.progress);
    const b = Math.round(startB + (endB - startB) * this.progress);

    return (r << 16) | (g << 8) | b;
  }
}

/**
 * Particle Emitter
 */
export class ParticleEmitter {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'particle-emitter';

    this.particles = [];
    this.isEmitting = false;
    this.elapsed = 0;

    // Emitter configuration
    this.config = {
      // Position
      x: options.x || 0,
      y: options.y || 0,
      spawnRadius: options.spawnRadius || 0,

      // Emission
      maxParticles: options.maxParticles || 100,
      emitRate: options.emitRate || 10, // Particles per second
      burst: options.burst || false,
      burstCount: options.burstCount || 20,

      // Particle properties
      life: options.life || { min: 0.5, max: 1.5 },
      speed: options.speed || { min: 50, max: 150 },
      angle: options.angle || { min: 0, max: 360 }, // Direction in degrees
      size: options.size || { min: 4, max: 8 },
      sizeEnd: options.sizeEnd,
      color: options.color || 0xffffff,
      colorEnd: options.colorEnd,
      alpha: options.alpha ?? 1,
      alphaEnd: options.alphaEnd ?? 0,
      rotation: options.rotation || { min: 0, max: 0 },
      rotationSpeed: options.rotationSpeed || { min: 0, max: 0 },
      shape: options.shape || 'circle',
      gravity: options.gravity || 0,
      friction: options.friction || 1,

      // Lifecycle
      autoDestroy: options.autoDestroy ?? true,
      duration: options.duration || null // null = infinite
    };

    // Graphics pool for reuse
    this.graphicsPool = [];
  }

  /**
   * Get a value from a range config
   */
  getValueFromRange(config) {
    if (typeof config === 'number') return config;
    if (config.min !== undefined && config.max !== undefined) {
      return config.min + Math.random() * (config.max - config.min);
    }
    return config;
  }

  /**
   * Get or create a graphics object
   */
  getGraphics() {
    if (this.graphicsPool.length > 0) {
      return this.graphicsPool.pop();
    }
    return new Graphics();
  }

  /**
   * Return graphics to pool
   */
  returnGraphics(graphics) {
    graphics.clear();
    this.container.removeChild(graphics);
    this.graphicsPool.push(graphics);
  }

  /**
   * Create a new particle
   */
  createParticle() {
    if (this.particles.length >= this.config.maxParticles) return null;

    const { config } = this;

    // Calculate spawn position
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.random() * config.spawnRadius;
    const x = config.x + Math.cos(spawnAngle) * spawnDist;
    const y = config.y + Math.sin(spawnAngle) * spawnDist;

    // Calculate velocity from angle and speed
    const angle = this.getValueFromRange(config.angle) * (Math.PI / 180);
    const speed = this.getValueFromRange(config.speed);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const particle = new Particle({
      x,
      y,
      vx,
      vy,
      life: this.getValueFromRange(config.life),
      size: this.getValueFromRange(config.size),
      sizeEnd: config.sizeEnd !== undefined
        ? this.getValueFromRange(config.sizeEnd)
        : undefined,
      color: config.color,
      colorEnd: config.colorEnd,
      alpha: config.alpha,
      alphaEnd: config.alphaEnd,
      rotation: this.getValueFromRange(config.rotation) * (Math.PI / 180),
      rotationSpeed: this.getValueFromRange(config.rotationSpeed) * (Math.PI / 180),
      shape: config.shape,
      gravity: config.gravity,
      friction: config.friction
    });

    // Create graphics for the particle
    particle.graphics = this.getGraphics();
    this.container.addChild(particle.graphics);

    this.particles.push(particle);
    return particle;
  }

  /**
   * Emit a burst of particles
   */
  burst(count) {
    const particlesToCreate = count || this.config.burstCount;
    for (let i = 0; i < particlesToCreate; i++) {
      this.createParticle();
    }
  }

  /**
   * Start continuous emission
   */
  start() {
    this.isEmitting = true;
    this.elapsed = 0;

    if (this.config.burst) {
      this.burst();
    }
  }

  /**
   * Stop emission (particles continue to live)
   */
  stop() {
    this.isEmitting = false;
  }

  /**
   * Update emitter and all particles
   */
  update(delta = 1) {
    // Emit new particles
    if (this.isEmitting && !this.config.burst) {
      this.elapsed += delta / 60;

      // Check duration
      if (this.config.duration && this.elapsed >= this.config.duration) {
        this.stop();
      }

      // Emit based on rate
      const particlesToEmit = Math.floor(this.config.emitRate * delta / 60);
      for (let i = 0; i < particlesToEmit; i++) {
        this.createParticle();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      particle.update(delta);

      if (particle.isAlive) {
        // Draw particle
        this.drawParticle(particle);
      } else {
        // Remove dead particle
        this.returnGraphics(particle.graphics);
        this.particles.splice(i, 1);
      }
    }

    // Auto destroy when all particles are dead
    if (this.config.autoDestroy && !this.isEmitting && this.particles.length === 0) {
      this.destroy();
      return false;
    }

    return true;
  }

  /**
   * Draw a particle
   */
  drawParticle(particle) {
    const g = particle.graphics;
    const size = particle.getCurrentSize();
    const color = particle.getCurrentColor();
    const alpha = particle.getCurrentAlpha();

    g.clear();
    g.position.set(particle.x, particle.y);
    g.rotation = particle.rotation;
    g.alpha = alpha;

    switch (particle.shape) {
      case 'square':
        g.rect(-size / 2, -size / 2, size, size);
        g.fill(color);
        break;

      case 'star':
        this.drawStar(g, 0, 0, 5, size, size / 2, color);
        break;

      case 'circle':
      default:
        g.circle(0, 0, size / 2);
        g.fill(color);
        break;
    }
  }

  /**
   * Draw a star shape
   */
  drawStar(graphics, x, y, points, outerRadius, innerRadius, color) {
    const step = Math.PI / points;

    graphics.moveTo(x, y - outerRadius);

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI / 2;
      graphics.lineTo(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      );
    }

    graphics.closePath();
    graphics.fill(color);
  }

  /**
   * Set emitter position
   */
  setPosition(x, y) {
    this.config.x = x;
    this.config.y = y;
  }

  /**
   * Destroy emitter and all particles
   */
  destroy() {
    // Return all graphics to pool (won't be reused, but good practice)
    for (const particle of this.particles) {
      if (particle.graphics) {
        particle.graphics.destroy();
      }
    }
    this.particles = [];

    // Destroy pooled graphics
    for (const graphics of this.graphicsPool) {
      graphics.destroy();
    }
    this.graphicsPool = [];

    // Destroy container
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  /**
   * Check if emitter is still active
   */
  get isActive() {
    return this.isEmitting || this.particles.length > 0;
  }
}

export default ParticleEmitter;
