/**
 * SparkEffect
 *
 * Quick directional spark bursts for reveal moments.
 */

import { Container, Graphics } from 'pixi.js';
import { random, degToRad } from '../utils/math';
import { lerpColor } from '../utils/colors';
import { easeOutQuad, easeOutCubic } from '../utils/easing';

class Spark {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 1;
    this.maxLife = 1;
    this.size = 3;
    this.length = 15;
    this.color = 0xffffff;
    this.alpha = 1;
    this.angle = 0;
    this.gravity = 0;
    this.friction = 0.98;
    this.active = false;
  }

  get progress() {
    return 1 - this.life / this.maxLife;
  }
}

export class SparkEffect {
  constructor(options = {}) {
    this.container = new Container();
    this.container.label = 'spark-effect';

    this.centerX = options.x || 0;
    this.centerY = options.y || 0;
    this.color = options.color || 0xffffff;
    this.colorEnd = options.colorEnd || 0xffff00;

    // Spark pool
    this.sparks = [];
    this.pool = [];
    this.graphics = new Map();

    // Pre-allocate
    for (let i = 0; i < 200; i++) {
      this.pool.push(new Spark());
    }
  }

  /**
   * Emit a burst of sparks
   */
  burst(count, options = {}) {
    const {
      x = this.centerX,
      y = this.centerY,
      angleMin = 0,
      angleMax = 360,
      speedMin = 200,
      speedMax = 600,
      sizeMin = 2,
      sizeMax = 5,
      lengthMin = 10,
      lengthMax = 30,
      lifeMin = 0.3,
      lifeMax = 0.8,
      gravity = 200,
      color = this.color,
      colorEnd = this.colorEnd,
    } = options;

    for (let i = 0; i < count; i++) {
      const spark = this.pool.pop();
      if (!spark) break;

      spark.reset();
      spark.x = x;
      spark.y = y;

      const angle = degToRad(random(angleMin, angleMax));
      const speed = random(speedMin, speedMax);
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;

      spark.size = random(sizeMin, sizeMax);
      spark.length = random(lengthMin, lengthMax);
      spark.life = random(lifeMin, lifeMax);
      spark.maxLife = spark.life;
      spark.color = color;
      spark.colorEnd = colorEnd;
      spark.gravity = gravity;
      spark.angle = angle;
      spark.active = true;

      this.sparks.push(spark);
    }
  }

  /**
   * Emit radial burst (all directions)
   */
  radialBurst(count, options = {}) {
    this.burst(count, {
      ...options,
      angleMin: 0,
      angleMax: 360,
    });
  }

  /**
   * Emit upward burst
   */
  upwardBurst(count, options = {}) {
    this.burst(count, {
      ...options,
      angleMin: 225,
      angleMax: 315,
      gravity: options.gravity ?? 400,
    });
  }

  /**
   * Update all sparks
   */
  update(dt = 1) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];

      // Physics
      spark.vy += spark.gravity * dt / 60;
      spark.vx *= spark.friction;
      spark.vy *= spark.friction;
      spark.x += spark.vx * dt / 60;
      spark.y += spark.vy * dt / 60;

      // Update angle based on velocity
      spark.angle = Math.atan2(spark.vy, spark.vx);

      // Life
      spark.life -= dt / 60;

      if (spark.life <= 0) {
        const g = this.graphics.get(spark);
        if (g) {
          g.clear();
          g.visible = false;
        }
        spark.active = false;
        this.pool.push(spark);
        this.sparks.splice(i, 1);
        continue;
      }

      // Draw
      this.drawSpark(spark);
    }

    return this.sparks.length > 0;
  }

  /**
   * Draw a spark
   */
  drawSpark(spark) {
    let g = this.graphics.get(spark);
    if (!g) {
      g = new Graphics();
      this.container.addChild(g);
      this.graphics.set(spark, g);
    }

    const progress = spark.progress;
    const alpha = easeOutQuad(1 - progress);
    const sizeMult = easeOutCubic(1 - progress * 0.5);
    const color = lerpColor(spark.color, spark.colorEnd, progress);

    // Calculate tail based on velocity
    const speed = Math.sqrt(spark.vx * spark.vx + spark.vy * spark.vy);
    const tailLength = Math.min(spark.length * sizeMult, speed * 0.05);

    const tailX = spark.x - Math.cos(spark.angle) * tailLength;
    const tailY = spark.y - Math.sin(spark.angle) * tailLength;

    g.clear();
    g.visible = true;
    g.alpha = alpha;

    // Draw spark line with gradient effect
    g.moveTo(tailX, tailY);
    g.lineTo(spark.x, spark.y);
    g.stroke({ width: spark.size * sizeMult, color, cap: 'round' });

    // Bright tip
    g.circle(spark.x, spark.y, spark.size * sizeMult * 0.5);
    g.fill(0xffffff);
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Set colors
   */
  setColors(color, colorEnd) {
    this.color = color;
    this.colorEnd = colorEnd || color;
  }

  /**
   * Clear all sparks
   */
  clear() {
    for (const spark of this.sparks) {
      const g = this.graphics.get(spark);
      if (g) g.clear();
      this.pool.push(spark);
    }
    this.sparks = [];
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
    return this.sparks.length > 0;
  }
}

export default SparkEffect;
