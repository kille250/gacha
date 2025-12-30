/**
 * ParticleSystem
 *
 * GPU-optimized particle system for summon animations.
 * Uses object pooling for zero garbage collection during animation.
 */

import { Container, Graphics } from 'pixi.js';
import { random, randomPointOnCircle, degToRad } from './utils/math';
import { lerpColor } from './utils/colors';

/**
 * Individual particle class
 */
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 4;
    this.sizeEnd = 0;
    this.color = 0xffffff;
    this.colorEnd = 0xffffff;
    this.alpha = 1;
    this.alphaEnd = 0;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.gravity = 0;
    this.friction = 1;
    this.shape = 'circle';
    this.active = false;
  }

  get progress() {
    return 1 - this.life / this.maxLife;
  }

  get isAlive() {
    return this.life > 0;
  }

  update(dt) {
    if (!this.active) return;

    // Physics
    this.vx += this.ax * dt;
    this.vy += (this.ay + this.gravity) * dt;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    // Life
    this.life -= dt / 60;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  getCurrentSize() {
    return this.size + (this.sizeEnd - this.size) * this.progress;
  }

  getCurrentAlpha() {
    return this.alpha + (this.alphaEnd - this.alpha) * this.progress;
  }

  getCurrentColor() {
    return lerpColor(this.color, this.colorEnd, this.progress);
  }
}

/**
 * Particle Emitter System
 */
export class ParticleSystem {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'particle-system';

    // Configuration
    this.config = {
      maxParticles: options.maxParticles || 200,
      emitRate: options.emitRate || 20,
      x: options.x || 0,
      y: options.y || 0,
      spawnRadius: options.spawnRadius || 0,
      life: options.life || { min: 0.5, max: 1.5 },
      speed: options.speed || { min: 50, max: 150 },
      angle: options.angle || { min: 0, max: 360 },
      size: options.size || { min: 4, max: 8 },
      sizeEnd: options.sizeEnd,
      color: options.color || 0xffffff,
      colorEnd: options.colorEnd || 0xffffff,
      alpha: options.alpha ?? 1,
      alphaEnd: options.alphaEnd ?? 0,
      rotation: options.rotation || { min: 0, max: 0 },
      rotationSpeed: options.rotationSpeed || { min: 0, max: 0 },
      shape: options.shape || 'circle',
      gravity: options.gravity || 0,
      friction: options.friction || 1,
      blendMode: options.blendMode || 'normal',
    };

    // Particle pool
    this.particles = [];
    this.pool = [];
    this.graphics = new Map();

    // State
    this.isEmitting = false;
    this.emitAccumulator = 0;

    // Pre-allocate pool
    for (let i = 0; i < this.config.maxParticles; i++) {
      this.pool.push(new Particle());
    }
  }

  /**
   * Get a value from range config
   */
  getValue(config) {
    if (typeof config === 'number') return config;
    if (config.min !== undefined && config.max !== undefined) {
      return random(config.min, config.max);
    }
    return config;
  }

  /**
   * Get or create graphics for a particle
   */
  getGraphics(particle) {
    if (!this.graphics.has(particle)) {
      const g = new Graphics();
      this.container.addChild(g);
      this.graphics.set(particle, g);
    }
    return this.graphics.get(particle);
  }

  /**
   * Emit a single particle
   */
  emit() {
    if (this.particles.length >= this.config.maxParticles) return null;

    // Get from pool or create new
    const particle = this.pool.pop() || new Particle();
    particle.reset();

    // Position
    if (this.config.spawnRadius > 0) {
      const point = randomPointOnCircle(this.config.x, this.config.y, this.config.spawnRadius);
      particle.x = point.x;
      particle.y = point.y;
    } else {
      particle.x = this.config.x;
      particle.y = this.config.y;
    }

    // Velocity
    const angle = degToRad(this.getValue(this.config.angle));
    const speed = this.getValue(this.config.speed);
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;

    // Properties
    particle.life = this.getValue(this.config.life);
    particle.maxLife = particle.life;
    particle.size = this.getValue(this.config.size);
    particle.sizeEnd = this.config.sizeEnd !== undefined
      ? this.getValue(this.config.sizeEnd)
      : 0;
    particle.color = this.config.color;
    particle.colorEnd = this.config.colorEnd;
    particle.alpha = this.config.alpha;
    particle.alphaEnd = this.config.alphaEnd;
    particle.rotation = degToRad(this.getValue(this.config.rotation));
    particle.rotationSpeed = degToRad(this.getValue(this.config.rotationSpeed));
    particle.shape = this.config.shape;
    particle.gravity = this.config.gravity;
    particle.friction = this.config.friction;
    particle.active = true;

    this.particles.push(particle);
    return particle;
  }

  /**
   * Emit burst of particles
   */
  burst(count) {
    for (let i = 0; i < count; i++) {
      this.emit();
    }
  }

  /**
   * Start continuous emission
   */
  start() {
    this.isEmitting = true;
    this.emitAccumulator = 0;
  }

  /**
   * Stop emission (particles continue to live)
   */
  stop() {
    this.isEmitting = false;
  }

  /**
   * Update all particles
   */
  update(dt = 1) {
    // Emit new particles
    if (this.isEmitting) {
      this.emitAccumulator += this.config.emitRate * dt / 60;
      while (this.emitAccumulator >= 1) {
        this.emit();
        this.emitAccumulator -= 1;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(dt);

      if (particle.active) {
        this.drawParticle(particle);
      } else {
        // Return to pool
        const g = this.graphics.get(particle);
        if (g) {
          g.clear();
          g.visible = false;
        }
        this.pool.push(particle);
        this.particles.splice(i, 1);
      }
    }

    return this.particles.length > 0 || this.isEmitting;
  }

  /**
   * Draw a particle
   */
  drawParticle(particle) {
    const g = this.getGraphics(particle);
    const size = particle.getCurrentSize();
    const color = particle.getCurrentColor();
    const alpha = particle.getCurrentAlpha();

    g.clear();
    g.visible = true;
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
   * Draw star shape
   */
  drawStar(g, x, y, points, outerR, innerR, color) {
    const step = Math.PI / points;
    g.moveTo(x, y - outerR);
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      g.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    g.closePath();
    g.fill(color);
  }

  /**
   * Set emitter position
   */
  setPosition(x, y) {
    this.config.x = x;
    this.config.y = y;
  }

  /**
   * Clear all particles
   */
  clear() {
    for (const particle of this.particles) {
      const g = this.graphics.get(particle);
      if (g) g.clear();
      this.pool.push(particle);
    }
    this.particles = [];
  }

  /**
   * Destroy emitter
   */
  destroy() {
    this.clear();
    this.graphics.forEach((g) => g.destroy());
    this.graphics.clear();
    this.container.destroy({ children: true });
  }

  /**
   * Check if system is active
   */
  get isActive() {
    return this.isEmitting || this.particles.length > 0;
  }
}

export default ParticleSystem;
