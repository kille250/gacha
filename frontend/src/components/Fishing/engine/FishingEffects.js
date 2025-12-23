/**
 * Fishing Effects Module
 * 
 * Handles particles, lighting, campfire animations, and visual effects.
 * Uses data-driven particle behaviors for extensibility.
 */

import * as PIXI from 'pixi.js';
import { TILES, MAP_DATA, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from './FishingMap';

// ===========================================
// PARTICLE BEHAVIOR DEFINITIONS (Data-Driven)
// ===========================================

/**
 * Particle behavior configuration.
 * Each particle type defines its own update, draw, and visibility logic.
 * To add a new particle type, simply add an entry here.
 */
const PARTICLE_BEHAVIORS = {
  firefly: {
    visibleDuring: ['night', 'dusk'],
    init: (particle) => {
      particle.vx = 0;
      particle.vy = 0;
      particle.maxLife = 3 + Math.random() * 4;
      particle.size = 2 + Math.random() * 3;
    },
    update: (particle, dt) => {
      particle.x += Math.sin(particle.phase) * 0.3;
      particle.y += Math.cos(particle.phase * 0.7) * 0.2;
    },
    getAlpha: (particle) => 0.4 + Math.sin(particle.phase * 2) * 0.6,
    draw: (gfx, particle, alpha) => {
      // Glowing firefly
      gfx.circle(particle.x, particle.y, particle.size * 2);
      gfx.fill({ color: 0xffff66, alpha: alpha * 0.2 });
      gfx.circle(particle.x, particle.y, particle.size);
      gfx.fill({ color: 0xffffaa, alpha });
      gfx.circle(particle.x, particle.y, particle.size * 0.5);
      gfx.fill({ color: 0xffffff, alpha });
    },
    shouldReset: (particle) => particle.life > particle.maxLife,
    resetOnBoundary: true,
  },

  butterfly: {
    visibleDuring: ['dawn', 'day'],
    init: (particle) => {
      particle.vx = (Math.random() - 0.5) * 0.5;
      particle.vy = 0;
      particle.maxLife = 3 + Math.random() * 4;
      particle.size = 2 + Math.random() * 3;
    },
    update: (particle, dt) => {
      particle.x += particle.vx + Math.sin(particle.phase * 3) * 0.5;
      particle.y += Math.sin(particle.phase * 2) * 0.8;
    },
    getAlpha: (particle) => {
      const fadeIn = Math.min(1, particle.life * 2);
      const fadeOut = Math.max(0, 1 - (particle.life - particle.maxLife + 1));
      return fadeIn * fadeOut;
    },
    draw: (gfx, particle, alpha) => {
      const wingFlap = Math.sin(particle.phase * 10) * 0.6 + 0.4;
      const wingColors = [0xffab91, 0x81d4fa, 0xce93d8, 0xa5d6a7];
      const wingColor = wingColors[Math.floor(particle.phase) % wingColors.length];
      
      // Wings
      gfx.ellipse(particle.x - 5 * wingFlap, particle.y, 5, 4);
      gfx.ellipse(particle.x + 5 * wingFlap, particle.y, 5, 4);
      gfx.fill({ color: wingColor, alpha });
      // Wing patterns
      gfx.circle(particle.x - 4 * wingFlap, particle.y, 2);
      gfx.circle(particle.x + 4 * wingFlap, particle.y, 2);
      gfx.fill({ color: 0xffffff, alpha: alpha * 0.5 });
      // Body
      gfx.ellipse(particle.x, particle.y, 2, 5);
      gfx.fill({ color: 0x5d4037, alpha });
    },
    shouldReset: (particle) => particle.life > particle.maxLife,
    resetOnBoundary: true,
  },

  leaf: {
    visibleDuring: ['dawn', 'day', 'dusk', 'night'], // Always visible
    init: (particle) => {
      particle.vx = (Math.random() - 0.5) * 0.5;
      particle.vy = 0;
      particle.maxLife = 3 + Math.random() * 4;
      particle.size = 2 + Math.random() * 3;
    },
    update: (particle, dt) => {
      particle.x += particle.vx + Math.sin(particle.phase) * 0.3;
      particle.y += 0.5 + Math.sin(particle.phase * 0.5) * 0.2;
    },
    getAlpha: (particle) => {
      const fadeIn = Math.min(1, particle.life * 2);
      const fadeOut = Math.max(0, 1 - (particle.life - particle.maxLife + 1));
      return fadeIn * fadeOut;
    },
    draw: (gfx, particle, alpha) => {
      const rotation = particle.phase * 2;
      const leafWidth = 5 * Math.cos(rotation);
      gfx.ellipse(particle.x, particle.y, Math.abs(leafWidth) + 1, 3);
      gfx.fill({ color: 0x8bc34a, alpha });
      // Leaf vein
      gfx.moveTo(particle.x - 3, particle.y);
      gfx.lineTo(particle.x + 3, particle.y);
      gfx.stroke({ width: 1, color: 0x689f38, alpha: alpha * 0.5 });
    },
    shouldReset: (particle) => particle.life > particle.maxLife || particle.y > particle.bounds.height,
    resetOnBoundary: true,
    onReset: (particle) => { particle.y = -10; },
  },

  smoke: {
    visibleDuring: ['dawn', 'day', 'dusk', 'night'],
    init: (particle) => {
      particle.vx = (Math.random() - 0.5) * 0.5;
      particle.vy = -0.8 - Math.random() * 0.4;
      particle.maxLife = 3 + Math.random() * 2;
      particle.size = 4 + Math.random() * 6;
    },
    update: (particle, dt) => {
      particle.x += Math.sin(particle.phase * 0.5) * 0.5 + particle.vx;
      particle.y += particle.vy;
      particle.size += dt * 2;
    },
    getAlpha: (particle) => Math.max(0, 1 - particle.life / particle.maxLife) * 0.4,
    draw: (gfx, particle, alpha) => {
      gfx.circle(particle.x, particle.y, particle.size);
      gfx.fill({ color: 0x9e9e9e, alpha });
    },
    shouldReset: (particle) => particle.life > particle.maxLife || particle.y < -50,
    resetOnBoundary: false,
    usesStartPos: true,
  },

  ember: {
    visibleDuring: ['dawn', 'day', 'dusk', 'night'],
    init: (particle) => {
      particle.vx = (Math.random() - 0.5) * 0.5;
      particle.vy = 0;
      particle.maxLife = 1 + Math.random();
      particle.size = 2 + Math.random() * 2;
    },
    update: (particle, dt) => {
      particle.x += Math.sin(particle.phase * 2) * 0.3 + particle.vx;
      particle.y -= 1 + Math.random() * 0.5;
      particle.size -= dt * 0.5;
    },
    getAlpha: (particle) => Math.max(0, 1 - particle.life / particle.maxLife),
    draw: (gfx, particle, alpha) => {
      gfx.circle(particle.x, particle.y, particle.size);
      gfx.fill({ color: 0xff8c00, alpha });
      gfx.circle(particle.x, particle.y, particle.size * 0.6);
      gfx.fill({ color: 0xffcc00, alpha });
    },
    shouldReset: (particle) => particle.life > particle.maxLife || particle.size <= 0,
    resetOnBoundary: false,
    usesStartPos: true,
  },

  star: {
    visibleDuring: ['night'],
    init: (particle) => {
      particle.vx = 0;
      particle.vy = 0;
      particle.maxLife = Infinity; // Stars don't die
      particle.size = 1 + Math.random() * 2;
    },
    update: () => {}, // Stars don't move
    getAlpha: (particle) => 0.3 + Math.sin(particle.phase * 0.5) * 0.7,
    draw: (gfx, particle, alpha) => {
      const twinkle = 0.5 + Math.sin(particle.phase + particle.x * 0.1) * 0.5;
      gfx.circle(particle.x, particle.y, particle.size * twinkle);
      gfx.fill({ color: 0xffffff, alpha: alpha * twinkle });
      // Star rays
      if (particle.size > 2 && twinkle > 0.7) {
        const rayLen = particle.size * 2;
        gfx.moveTo(particle.x - rayLen, particle.y);
        gfx.lineTo(particle.x + rayLen, particle.y);
        gfx.moveTo(particle.x, particle.y - rayLen);
        gfx.lineTo(particle.x, particle.y + rayLen);
        gfx.stroke({ width: 1, color: 0xffffff, alpha: alpha * 0.3 });
      }
    },
    shouldReset: () => false, // Never reset
    resetOnBoundary: false,
  },

  fish_splash: {
    visibleDuring: ['dawn', 'day', 'dusk', 'night'],
    init: (particle) => {
      particle.vy = -3 - Math.random() * 2;
      particle.vx = (Math.random() - 0.5) * 2;
      particle.maxLife = 1;
      particle.size = 2 + Math.random() * 2;
    },
    update: (particle, dt) => {
      particle.y += particle.vy;
      particle.vy += 0.15; // gravity
      particle.x += particle.vx;
      particle.size -= dt * 0.5;
    },
    getAlpha: (particle) => {
      const fadeIn = Math.min(1, particle.life * 2);
      const fadeOut = Math.max(0, 1 - (particle.life - particle.maxLife + 1));
      return fadeIn * fadeOut;
    },
    draw: (gfx, particle, alpha) => {
      gfx.circle(particle.x, particle.y, particle.size);
      gfx.fill({ color: 0xb3e5fc, alpha: alpha * 0.8 });
    },
    shouldReset: (particle) => particle.life > particle.maxLife || particle.size <= 0,
    resetOnBoundary: false,
    isTemporary: true, // Removed when done, not reset
  },
};

// ===========================================
// PARTICLE CLASS (Simplified)
// ===========================================

export class Particle {
  constructor(type, bounds, startPos = null) {
    this.type = type;
    this.bounds = bounds;
    this.behavior = PARTICLE_BEHAVIORS[type];
    
    if (!this.behavior) {
      console.warn(`Unknown particle type: ${type}`);
      this.behavior = PARTICLE_BEHAVIORS.firefly; // Fallback
    }
    
    this.reset(startPos);
  }
  
  reset(startPos = null) {
    if (startPos) {
      this.x = startPos.x + (Math.random() - 0.5) * 20;
      this.y = startPos.y;
      this.startX = startPos.x;
      this.startY = startPos.y;
    } else {
      this.x = Math.random() * this.bounds.width;
      this.y = Math.random() * this.bounds.height * 0.6;
    }
    
    this.life = 0;
    this.phase = Math.random() * Math.PI * 2;
    
    // Initialize with behavior defaults
    this.behavior.init(this);
  }
  
  update(dt) {
    this.life += dt;
    this.phase += dt * 2;
    
    // Delegate to behavior
    this.behavior.update(this, dt);
    
    // Check if should reset
    const shouldReset = this.behavior.shouldReset(this) ||
      (this.behavior.resetOnBoundary && this.isOutOfBounds());
    
    if (shouldReset) {
      if (this.behavior.isTemporary) {
        return false; // Remove particle
      }
      
      const resetPos = this.behavior.usesStartPos 
        ? { x: this.startX, y: this.startY } 
        : null;
      this.reset(resetPos);
      
      // Call custom reset handler
      this.behavior.onReset?.(this);
    }
    
    return true; // Keep particle
  }
  
  isOutOfBounds() {
    return this.y > this.bounds.height || 
           this.y < -50 ||
           this.x < -20 || 
           this.x > this.bounds.width + 20;
  }
  
  getAlpha() {
    return this.behavior.getAlpha(this);
  }
  
  isVisibleAt(timeOfDay) {
    return this.behavior.visibleDuring.includes(timeOfDay);
  }
  
  draw(gfx, alpha) {
    this.behavior.draw(gfx, this, alpha);
  }
}

// ===========================================
// LAYER CREATION
// ===========================================

/**
 * Create campfire animation layer and initialize smoke/ember particles
 */
export const createCampfireLayer = (container, particlesRef) => {
  const fireContainer = new PIXI.Container();
  fireContainer.label = 'campfire';
  fireContainer.zIndex = 80;
  
  const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
  
  // Find campfire positions and create fire graphics
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (MAP_DATA[y][x] === TILES.CAMPFIRE) {
        const fire = new PIXI.Graphics();
        fire.tileX = x;
        fire.tileY = y;
        fire.x = x * TILE_SIZE;
        fire.y = y * TILE_SIZE;
        fireContainer.addChild(fire);
        
        // Add smoke particles for this fire
        for (let i = 0; i < 5; i++) {
          const smoke = new Particle('smoke', bounds, { x: x * TILE_SIZE + 20, y: y * TILE_SIZE + 10 });
          particlesRef.current.push(smoke);
        }
        
        // Add ember particles
        for (let i = 0; i < 8; i++) {
          const ember = new Particle('ember', bounds, { x: x * TILE_SIZE + 20, y: y * TILE_SIZE + 20 });
          particlesRef.current.push(ember);
        }
      }
      
      // Add lantern glow particles
      if (MAP_DATA[y][x] === TILES.LANTERN) {
        for (let i = 0; i < 2; i++) {
          const ember = new Particle('ember', bounds, { x: x * TILE_SIZE + 20, y: y * TILE_SIZE + 6 });
          ember.maxLife = 0.5 + Math.random() * 0.5;
          ember.size = 2;
          particlesRef.current.push(ember);
        }
      }
    }
  }
  
  container.addChild(fireContainer);
  container.sortableChildren = true;
};

/**
 * Create particle system layer
 */
export const createParticleLayer = (container, particlesRef) => {
  const particleContainer = new PIXI.Container();
  particleContainer.label = 'particles';
  particleContainer.zIndex = 150;
  
  const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
  
  // Create ambient particles
  const particleCounts = {
    firefly: 12,
    butterfly: 6,
    leaf: 8,
    star: 30,
  };
  
  Object.entries(particleCounts).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      const particle = new Particle(type, bounds);
      
      // Special positioning for stars
      if (type === 'star') {
        particle.x = Math.random() * bounds.width;
        particle.y = Math.random() * bounds.height * 0.5;
      }
      
      particlesRef.current.push(particle);
    }
  });
  
  container.addChild(particleContainer);
};

/**
 * Create lighting overlay layer
 */
export const createLightingLayer = (container) => {
  const lighting = new PIXI.Graphics();
  lighting.label = 'lighting';
  lighting.zIndex = 200;
  container.addChild(lighting);
};

// ===========================================
// UPDATE FUNCTIONS
// ===========================================

/**
 * Update campfire animation
 */
export const updateCampfire = (container, waterTime) => {
  const fireLayer = container.getChildByLabel('campfire');
  if (!fireLayer) return;
  
  fireLayer.children.forEach(fire => {
    fire.clear();
    const t = waterTime * 8;
    
    // Animated flames (multiple layers)
    const flameColors = [0xff6600, 0xff8c00, 0xffcc00, 0xffee88];
    
    // Outer glow
    fire.circle(20, 20, 18 + Math.sin(t) * 2);
    fire.fill({ color: 0xff4400, alpha: 0.15 });
    fire.circle(20, 20, 12 + Math.sin(t * 1.3) * 2);
    fire.fill({ color: 0xff6600, alpha: 0.2 });
    
    // Main flames
    for (let i = 0; i < 5; i++) {
      const flameX = 14 + i * 3;
      const flamePhase = t + i * 1.2;
      const flameHeight = 14 + Math.sin(flamePhase) * 4 + Math.sin(flamePhase * 2.3) * 2;
      const flameWidth = 4 + Math.sin(flamePhase * 0.7) * 1;
      const sway = Math.sin(flamePhase * 0.5) * 2;
      
      fire.moveTo(flameX, 24);
      fire.quadraticCurveTo(
        flameX + sway - flameWidth, 24 - flameHeight * 0.5,
        flameX + sway, 24 - flameHeight
      );
      fire.quadraticCurveTo(
        flameX + sway + flameWidth, 24 - flameHeight * 0.5,
        flameX, 24
      );
      fire.fill(flameColors[i % flameColors.length]);
    }
    
    // Inner bright core
    fire.ellipse(20, 20, 4 + Math.sin(t * 1.5), 3);
    fire.fill(0xffffcc);
  });
};

/**
 * Update particles (simplified with data-driven behaviors)
 */
export const updateParticles = (container, particlesRef, dt, timeOfDay) => {
  const particleLayer = container.getChildByLabel('particles');
  if (!particleLayer) return;
  
  // Get or create the shared particle graphics
  let particleGfx = particleLayer.getChildByLabel('particleGfx');
  if (!particleGfx) {
    particleGfx = new PIXI.Graphics();
    particleGfx.label = 'particleGfx';
    particleLayer.addChild(particleGfx);
  }
  particleGfx.clear();
  
  // Filter out dead particles and update living ones
  particlesRef.current = particlesRef.current.filter(particle => particle.update(dt));
  
  // Draw visible particles
  particlesRef.current.forEach(particle => {
    if (!particle.isVisibleAt(timeOfDay)) return;
    
    const alpha = particle.getAlpha();
    particle.draw(particleGfx, alpha);
  });
};

/**
 * Update lighting overlay
 */
export const updateLighting = (container, timeOfDay, waterTime) => {
  const lighting = container.getChildByLabel('lighting');
  if (!lighting) return;
  
  lighting.clear();
  const w = MAP_WIDTH * TILE_SIZE;
  const h = MAP_HEIGHT * TILE_SIZE;
  
  const isNight = timeOfDay === 'night';
  const isDusk = timeOfDay === 'dusk';
  
  // Time-based overlay
  const overlayConfig = {
    dawn: { color: 0xffcc80, alpha: 0.12 },
    dusk: { color: 0xff7043, alpha: 0.2 },
    night: { color: 0x0a1628, alpha: 0.5 },
    day: { color: 0x000000, alpha: 0 },
  };
  
  const overlay = overlayConfig[timeOfDay] || overlayConfig.day;
  
  if (overlay.alpha > 0) {
    lighting.rect(0, 0, w, h);
    lighting.fill({ color: overlay.color, alpha: overlay.alpha });
  }
  
  // Warm light sources at night/dusk
  if (isNight || isDusk) {
    drawLightSources(lighting, waterTime);
  }
  
  // Subtle vignette
  const vignetteAlpha = isNight ? 0.25 : 0.1;
  lighting.rect(0, 0, w, h * 0.1);
  lighting.fill({ color: 0x000000, alpha: vignetteAlpha });
  lighting.rect(0, h * 0.9, w, h * 0.1);
  lighting.fill({ color: 0x000000, alpha: vignetteAlpha });
};

/**
 * Draw light sources (campfire, lanterns, windows)
 */
function drawLightSources(lighting, waterTime) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = MAP_DATA[y][x];
      
      if (tile === TILES.CAMPFIRE) {
        const cx = x * TILE_SIZE + 20;
        const cy = y * TILE_SIZE + 20;
        const glowRadius = 100 + Math.sin(waterTime * 3) * 10;
        
        // Multiple glow layers
        for (let i = 3; i >= 0; i--) {
          const radius = glowRadius * (1 - i * 0.2);
          const alpha = 0.15 - i * 0.03;
          lighting.circle(cx, cy, radius);
          lighting.fill({ color: 0xff6600, alpha });
        }
      }
      
      if (tile === TILES.LANTERN) {
        const cx = x * TILE_SIZE + 20;
        const cy = y * TILE_SIZE + 6;
        const glowRadius = 50 + Math.sin(waterTime * 2 + x) * 5;
        
        for (let i = 2; i >= 0; i--) {
          const radius = glowRadius * (1 - i * 0.25);
          lighting.circle(cx, cy, radius);
          lighting.fill({ color: 0xffcc66, alpha: 0.12 - i * 0.03 });
        }
      }
      
      // Cabin window glow
      if (tile === TILES.CABIN && x === 7 && y === 0) {
        const cx = x * TILE_SIZE + 20;
        const cy = y * TILE_SIZE + 24;
        lighting.circle(cx, cy, 40);
        lighting.fill({ color: 0xfff8dc, alpha: 0.1 });
      }
    }
  }
}

/**
 * Create fish jump splash particles
 */
export const createFishSplash = (particlesRef, waterTiles) => {
  if (waterTiles.length === 0) return;
  
  const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
  const tile = waterTiles[Math.floor(Math.random() * waterTiles.length)];
  
  // Create splash particles
  for (let i = 0; i < 5; i++) {
    const splash = new Particle('fish_splash', bounds);
    splash.x = tile.x * TILE_SIZE + 20 + (Math.random() - 0.5) * 10;
    splash.y = tile.y * TILE_SIZE + 20;
    particlesRef.current.push(splash);
  }
};

/**
 * Get water tile positions for fish splashes
 */
export const getWaterTiles = () => {
  const waterTiles = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (MAP_DATA[y][x] === TILES.WATER) {
        waterTiles.push({ x, y });
      }
    }
  }
  return waterTiles;
};
