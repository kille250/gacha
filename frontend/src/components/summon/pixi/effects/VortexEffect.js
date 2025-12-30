/**
 * VortexEffect
 *
 * Swirling energy vortex for the build-up phase.
 * Particles converge toward the center with increasing speed.
 */

import { Container, Graphics } from 'pixi.js';
import { random } from '../utils/math';
import { lighten } from '../utils/colors';
import { easeInQuad, easeOutQuad } from '../utils/easing';

class VortexParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.radius = 0;
    this.targetRadius = 0;
    this.angularSpeed = 0;
    this.radialSpeed = 0;
    this.size = 4;
    this.alpha = 1;
    this.color = 0xffffff;
    this.life = 1;
    this.maxLife = 1;
    this.active = false;
  }
}

export class VortexEffect {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'vortex-effect';

    this.centerX = options.x || 0;
    this.centerY = options.y || 0;
    this.maxRadius = options.maxRadius || 300;
    this.minRadius = options.minRadius || 20;
    this.particleCount = options.particleCount || 60;
    this.color = options.color || 0xffffff;
    this.colorSecondary = options.colorSecondary || lighten(this.color, 0.3);

    // Particle pool
    this.particles = [];
    this.pool = [];
    this.graphics = new Map();

    // Animation state
    this.intensity = 0;
    this.time = 0;
    this.isActive = false;

    // Pre-allocate
    for (let i = 0; i < this.particleCount * 2; i++) {
      this.pool.push(new VortexParticle());
    }
  }

  /**
   * Spawn a vortex particle
   */
  spawnParticle() {
    if (this.particles.length >= this.particleCount) return;

    const particle = this.pool.pop();
    if (!particle) return;

    particle.reset();
    particle.angle = random(0, Math.PI * 2);
    particle.radius = random(this.maxRadius * 0.8, this.maxRadius);
    particle.targetRadius = this.minRadius;
    particle.angularSpeed = random(1.5, 3) * (Math.random() > 0.5 ? 1 : -1);
    particle.radialSpeed = random(80, 150);
    particle.size = random(3, 7);
    particle.life = random(1.5, 2.5);
    particle.maxLife = particle.life;
    particle.color = Math.random() > 0.3 ? this.color : this.colorSecondary;
    particle.active = true;

    // Calculate initial position
    particle.x = this.centerX + Math.cos(particle.angle) * particle.radius;
    particle.y = this.centerY + Math.sin(particle.angle) * particle.radius;

    this.particles.push(particle);
  }

  /**
   * Start the vortex effect
   */
  start() {
    this.isActive = true;
    this.intensity = 0;
    this.time = 0;

    // Initial burst of particles
    for (let i = 0; i < this.particleCount / 2; i++) {
      this.spawnParticle();
    }
  }

  /**
   * Stop the vortex (particles fade out)
   */
  stop() {
    this.isActive = false;
  }

  /**
   * Set intensity (0-1)
   */
  setIntensity(value) {
    this.intensity = Math.min(1, Math.max(0, value));
  }

  /**
   * Update vortex animation
   */
  update(dt = 1) {
    this.time += dt / 60;

    // Spawn new particles
    if (this.isActive && this.particles.length < this.particleCount) {
      const spawnRate = 2 + this.intensity * 4;
      if (Math.random() < spawnRate * dt / 60) {
        this.spawnParticle();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Angular movement (spiral)
      const speedMult = 1 + this.intensity * 2;
      p.angle += p.angularSpeed * speedMult * dt / 60;

      // Radial movement (toward center)
      const radialMult = easeInQuad(1 - p.radius / this.maxRadius);
      p.radius -= p.radialSpeed * (0.5 + radialMult * 0.5) * speedMult * dt / 60;

      // Update position
      p.x = this.centerX + Math.cos(p.angle) * p.radius;
      p.y = this.centerY + Math.sin(p.angle) * p.radius;

      // Life and alpha
      p.life -= dt / 60;
      const lifeProgress = 1 - p.life / p.maxLife;
      const radiusProgress = 1 - p.radius / this.maxRadius;

      // Fade out at center and at end of life
      p.alpha = Math.min(
        easeOutQuad(Math.min(1, lifeProgress * 4)), // Fade in
        1 - easeInQuad(Math.max(0, lifeProgress - 0.7) / 0.3), // Fade out at end
        1 - easeInQuad(Math.max(0, radiusProgress - 0.8) / 0.2) // Fade at center
      );

      // Size shrinks toward center
      const sizeMult = 1 - radiusProgress * 0.6;

      // Check if dead
      if (p.life <= 0 || p.radius <= this.minRadius) {
        const g = this.graphics.get(p);
        if (g) {
          g.clear();
          g.visible = false;
        }
        this.pool.push(p);
        this.particles.splice(i, 1);
        continue;
      }

      // Draw particle
      this.drawParticle(p, sizeMult);
    }

    return this.particles.length > 0 || this.isActive;
  }

  /**
   * Draw a vortex particle
   */
  drawParticle(particle, sizeMult = 1) {
    let g = this.graphics.get(particle);
    if (!g) {
      g = new Graphics();
      this.container.addChild(g);
      this.graphics.set(particle, g);
    }

    const size = particle.size * sizeMult;

    g.clear();
    g.visible = true;
    g.alpha = particle.alpha * (0.7 + this.intensity * 0.3);
    g.position.set(particle.x, particle.y);

    // Draw with glow effect
    g.circle(0, 0, size);
    g.fill(particle.color);

    // Outer glow
    g.circle(0, 0, size * 1.5);
    g.fill({ color: particle.color, alpha: 0.3 });
  }

  /**
   * Set colors
   */
  setColors(primary, secondary) {
    this.color = primary;
    this.colorSecondary = secondary || lighten(primary, 0.3);
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Clear all particles
   */
  clear() {
    for (const p of this.particles) {
      const g = this.graphics.get(p);
      if (g) g.clear();
      this.pool.push(p);
    }
    this.particles = [];
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
}

export default VortexEffect;
