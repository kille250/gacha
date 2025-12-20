import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';

// Cozy Stardew-inspired color palette - warmer and more saturated
const PALETTE = {
  grass: [0x5a9945, 0x4d8a3a, 0x6ba850, 0x3f7830],
  grassDark: [0x3d7030, 0x356528, 0x458538, 0x2d5820],
  sand: [0xf0dca0, 0xe6d090, 0xf8e8b0, 0xdcc480],
  path: [0x9b8060, 0x8a7050, 0xab9070, 0x705840],
  wood: [0xa06830, 0x885828, 0xb87838, 0x704820],
  woodDark: [0x5d4020, 0x4a3018, 0x6d5028, 0x382010],
  water: [0x3a80a8, 0x4890b8, 0x5aa0c8, 0x2870a0],
  waterDeep: [0x2a6088, 0x3a7098, 0x4a80a8, 0x1a5078],
  roof: [0x8b4040, 0x7a3535, 0x9c4a4a, 0x6a2a2a],
  stone: [0x808080, 0x707070, 0x909090, 0x606060],
};

// Tile types
const TILES = {
  GRASS: 0, WATER: 1, SAND: 2, FLOWERS: 3, PATH: 4,
  TREE: 5, ROCK: 6, BUSH: 7, DOCK: 8, TALL_GRASS: 9, LILY: 10,
  CABIN: 11, CAMPFIRE: 12, LANTERN: 13, FENCE: 14, LOG: 15
};

// Map configuration
const TILE_SIZE = 40;
const MAP_WIDTH = 24;
const MAP_HEIGHT = 14;

// Enhanced map with cabin and campfire
const MAP_DATA = [
  [5, 0, 0, 3, 0, 5, 11, 11, 11, 0, 0, 5, 0, 3, 0, 0, 0, 5, 0, 0, 3, 0, 0, 5],
  [0, 7, 0, 0, 14, 14, 11, 11, 11, 14, 7, 0, 0, 0, 9, 0, 0, 0, 0, 7, 0, 0, 9, 0],
  [0, 0, 6, 0, 4, 4, 4, 4, 4, 4, 0, 0, 6, 0, 0, 4, 4, 4, 0, 0, 0, 6, 0, 0],
  [3, 15, 0, 0, 4, 0, 12, 0, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0, 3],
  [5, 0, 9, 0, 4, 0, 0, 0, 7, 4, 3, 0, 9, 0, 0, 4, 0, 0, 7, 0, 0, 9, 0, 5],
  [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 7, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 3, 0, 7, 0, 3, 0, 0],
  [6, 0, 0, 0, 9, 0, 0, 3, 0, 0, 4, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
  [2, 2, 2, 2, 2, 2, 13, 2, 2, 2, 8, 2, 2, 2, 2, 2, 13, 2, 2, 2, 2, 2, 2, 2],
  [1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 8, 1, 1, 1, 10, 1, 1, 1, 1, 1, 10, 1, 1, 1],
  [1, 1, 10, 1, 1, 1, 1, 10, 1, 1, 8, 1, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 10, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1, 10, 1, 1],
  [1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1],
];

const isWalkable = (x, y) => {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const tile = MAP_DATA[y]?.[x];
  return ![1, 5, 6, 10, 11, 14, 15].includes(tile);
};

const isWaterAdjacent = (x, y, dir) => {
  let checkX = x, checkY = y;
  
  if (dir === 'down') checkY += 1;
  else if (dir === 'up') checkY -= 1;
  else if (dir === 'left') checkX -= 1;
  else if (dir === 'right') checkX += 1;
  
  if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) return false;
  const targetTile = MAP_DATA[checkY]?.[checkX];
  return [1, 10].includes(targetTile);
};

// Particle class for ambient effects
class Particle {
  constructor(type, bounds, startPos = null) {
    this.type = type;
    this.bounds = bounds;
    this.reset(startPos);
  }
  
  reset(startPos = null) {
    if (startPos) {
      this.x = startPos.x + (Math.random() - 0.5) * 20;
      this.y = startPos.y;
    } else {
      this.x = Math.random() * this.bounds.width;
      this.y = Math.random() * this.bounds.height * 0.6;
    }
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = this.type === 'smoke' ? -0.8 - Math.random() * 0.4 : 0;
    this.life = 0;
    this.maxLife = this.type === 'smoke' ? 3 + Math.random() * 2 : 3 + Math.random() * 4;
    this.size = this.type === 'smoke' ? 4 + Math.random() * 6 : 2 + Math.random() * 3;
    this.phase = Math.random() * Math.PI * 2;
    this.startX = this.x;
    this.startY = this.y;
  }
  
  update(dt) {
    this.life += dt;
    this.phase += dt * 2;
    
    if (this.type === 'firefly') {
      this.x += Math.sin(this.phase) * 0.3;
      this.y += Math.cos(this.phase * 0.7) * 0.2;
    } else if (this.type === 'butterfly') {
      this.x += this.vx + Math.sin(this.phase * 3) * 0.5;
      this.y += Math.sin(this.phase * 2) * 0.8;
    } else if (this.type === 'leaf') {
      this.x += this.vx + Math.sin(this.phase) * 0.3;
      this.y += 0.5 + Math.sin(this.phase * 0.5) * 0.2;
    } else if (this.type === 'smoke') {
      this.x += Math.sin(this.phase * 0.5) * 0.5 + this.vx;
      this.y += this.vy;
      this.size += dt * 2;
    } else if (this.type === 'ember') {
      this.x += Math.sin(this.phase * 2) * 0.3 + this.vx;
      this.y -= 1 + Math.random() * 0.5;
      this.size -= dt * 0.5;
    } else if (this.type === 'star') {
      // Stars just twinkle, don't move
    } else if (this.type === 'fish_splash') {
      this.y += this.vy;
      this.vy += 0.15; // gravity
      this.x += this.vx;
      this.size -= dt * 0.5;
    }
    
    const shouldReset = 
      this.life > this.maxLife || 
      this.y > this.bounds.height || 
      this.y < -50 ||
      this.x < -20 || 
      this.x > this.bounds.width + 20 ||
      this.size <= 0;
    
    if (shouldReset && this.type !== 'fish_splash') {
      this.reset(this.type === 'smoke' || this.type === 'ember' ? { x: this.startX, y: this.startY } : null);
      if (this.type === 'leaf') this.y = -10;
    }
    
    return !shouldReset || this.type !== 'fish_splash';
  }
  
  getAlpha() {
    if (this.type === 'firefly') {
      return 0.4 + Math.sin(this.phase * 2) * 0.6;
    }
    if (this.type === 'star') {
      return 0.3 + Math.sin(this.phase * 0.5) * 0.7;
    }
    if (this.type === 'smoke') {
      const fadeOut = Math.max(0, 1 - this.life / this.maxLife);
      return fadeOut * 0.4;
    }
    if (this.type === 'ember') {
      return Math.max(0, 1 - this.life / this.maxLife);
    }
    const fadeIn = Math.min(1, this.life * 2);
    const fadeOut = Math.max(0, 1 - (this.life - this.maxLife + 1));
    return fadeIn * fadeOut;
  }
}

// Main game engine hook
export const useFishingEngine = ({
  containerRef,
  playerPos,
  setPlayerPos,
  playerDir,
  setPlayerDir,
  gameState,
  timeOfDay,
  onCanFishChange
}) => {
  const appRef = useRef(null);
  const containerObjRef = useRef(null);
  const playerRef = useRef(null);
  const particlesRef = useRef([]);
  const waterTimeRef = useRef(0);
  const bobberRef = useRef(null);
  const fishingLineRef = useRef(null);
  const updateGameRef = useRef(null);
  const animFrameRef = useRef(0);
  const fishJumpTimerRef = useRef(0);
  
  // Visual player position (for smooth interpolation)
  const visualPosRef = useRef({ x: playerPos.x, y: playerPos.y });
  
  // Initialize PIXI Application
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;
    
    const initApp = async () => {
      const app = new PIXI.Application();
      await app.init({
        width: MAP_WIDTH * TILE_SIZE,
        height: MAP_HEIGHT * TILE_SIZE,
        backgroundColor: 0x1a3050,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;
      
      // Create main container
      const mainContainer = new PIXI.Container();
      app.stage.addChild(mainContainer);
      containerObjRef.current = mainContainer;
      
      // Create layers in order (back to front)
      createSkyLayer(mainContainer);
      createTileLayer(mainContainer);
      createWaterLayer(mainContainer);
      createDecorationLayer(mainContainer);
      createCampfireLayer(mainContainer);
      createPlayer(mainContainer);
      createParticleLayer(mainContainer);
      createLightingLayer(mainContainer);
      createFishingElements(mainContainer);
      
      // Game loop
      app.ticker.add((ticker) => {
        const dt = ticker.deltaTime / 60;
        animFrameRef.current += dt;
        updateGameRef.current?.(dt);
      });
    };
    
    initApp();
    
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);
  
  // Create sky gradient layer
  const createSkyLayer = (container) => {
    const sky = new PIXI.Graphics();
    sky.label = 'sky';
    sky.zIndex = -10;
    container.addChild(sky);
  };
  
  // Create tile layer with pixel-perfect art
  const createTileLayer = (container) => {
    const tileContainer = new PIXI.Container();
    tileContainer.label = 'tiles';
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = MAP_DATA[y][x];
        const graphics = new PIXI.Graphics();
        
        drawTile(graphics, tile, x, y);
        graphics.x = x * TILE_SIZE;
        graphics.y = y * TILE_SIZE;
        tileContainer.addChild(graphics);
      }
    }
    
    container.addChild(tileContainer);
  };
  
  // Draw pixel art dithering pattern
  const drawDither = (g, x, y, w, h, color1, color2, density = 0.3) => {
    g.rect(x, y, w, h);
    g.fill(color1);
    for (let dy = 0; dy < h; dy += 2) {
      for (let dx = (dy % 4 === 0 ? 0 : 1); dx < w; dx += 2) {
        if (Math.random() < density) {
          g.rect(x + dx, y + dy, 1, 1);
          g.fill(color2);
        }
      }
    }
  };
  
  // Draw individual tile with enhanced pixel art
  const drawTile = (g, tile, x, y) => {
    const variant = (x + y) % 4;
    const seed = x * 1000 + y;
    
    switch (tile) {
      case TILES.GRASS:
        // Base grass with subtle variation
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        
        // Pixel dither for texture
        for (let i = 0; i < 8; i++) {
          const gx = ((seed + i * 7) % 36) + 2;
          const gy = ((seed + i * 13) % 36) + 2;
          g.rect(gx, gy, 2, 2);
          g.fill(PALETTE.grassDark[variant]);
        }
        
        // Grass blades
        for (let i = 0; i < 4; i++) {
          const gx = 6 + i * 10 + (variant * 2);
          const gy = 36;
          const height = 8 + ((seed + i) % 5);
          g.moveTo(gx, gy);
          g.lineTo(gx - 1, gy - height);
          g.lineTo(gx + 1, gy - height + 2);
          g.fill(PALETTE.grass[(variant + 1) % 4]);
        }
        break;
        
      case TILES.SAND:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.sand[variant % 2]);
        // Sandy texture
        for (let i = 0; i < 6; i++) {
          const px = (seed * (i + 1)) % 35 + 2;
          const py = ((seed + 50) * (i + 1)) % 35 + 2;
          g.rect(px, py, 2, 2);
          g.fill(PALETTE.sand[(variant + 2) % 4]);
        }
        // Small shells/pebbles
        if (variant === 0) {
          g.circle(28, 28, 3);
          g.fill(0xe0d0b0);
          g.circle(27, 27, 1);
          g.fill(0xf0e0c0);
        }
        break;
        
      case TILES.PATH:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.path[variant % 2]);
        // Cobblestone pattern
        const stoneOffsets = [[4, 4, 12, 10], [18, 6, 14, 12], [6, 20, 10, 14], [22, 22, 12, 12]];
        stoneOffsets.forEach(([sx, sy, sw, sh], i) => {
          g.roundRect(sx + (variant * 2) % 4, sy + (variant * 3) % 4, sw, sh, 3);
          g.fill(PALETTE.path[(i + variant) % 4]);
        });
        // Highlight
        g.rect(6, 6, 4, 2);
        g.fill({ color: 0xffffff, alpha: 0.1 });
        break;
        
      case TILES.FLOWERS:
        // Base grass
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Draw 2-3 flowers
        const flowerColors = [0xff6b8a, 0xffd93d, 0xff8fab, 0xc9b1ff, 0x87ceeb, 0xffb347];
        for (let i = 0; i < 2 + variant % 2; i++) {
          const fx = 8 + i * 14 + ((seed + i) % 5);
          const fy = 12 + ((seed + i * 3) % 10);
          // Stem
          g.moveTo(fx, fy + 6);
          g.lineTo(fx, fy + 18);
          g.stroke({ width: 2, color: 0x4a8030 });
          // Petals (pixel style)
          const petalColor = flowerColors[(seed + i) % flowerColors.length];
          g.circle(fx - 4, fy, 3);
          g.circle(fx + 4, fy, 3);
          g.circle(fx, fy - 4, 3);
          g.circle(fx, fy + 4, 3);
          g.fill(petalColor);
          // Center
          g.circle(fx, fy, 3);
          g.fill(0xfff59d);
        }
        break;
        
      case TILES.DOCK:
        // Water underneath
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.water[0]);
        // Wood planks with gaps
        for (let i = 0; i < 4; i++) {
          g.rect(i * 10 + 1, 0, 8, TILE_SIZE);
          g.fill(i % 2 === 0 ? PALETTE.wood[0] : PALETTE.wood[2]);
          // Wood grain
          g.rect(i * 10 + 3, 8, 2, 12);
          g.rect(i * 10 + 5, 22, 2, 10);
          g.fill(PALETTE.woodDark[1]);
        }
        // Top edge shadow
        g.rect(0, 0, TILE_SIZE, 2);
        g.fill(PALETTE.woodDark[3]);
        // Nail details
        g.circle(5, 5, 1);
        g.circle(15, 35, 1);
        g.circle(25, 8, 1);
        g.circle(35, 30, 1);
        g.fill(0x404040);
        break;
        
      case TILES.TALL_GRASS:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Multiple tall grass blades
        for (let i = 0; i < 6; i++) {
          const gx = 3 + i * 6 + ((seed + i) % 3);
          const height = 18 + ((seed + i * 7) % 8);
          const sway = ((seed + i) % 3) - 1;
          // Blade shape
          g.moveTo(gx, TILE_SIZE);
          g.lineTo(gx + sway - 2, TILE_SIZE - height);
          g.lineTo(gx + sway + 2, TILE_SIZE - height + 4);
          g.lineTo(gx + 2, TILE_SIZE);
          g.fill(i % 2 === 0 ? 0x7cb342 : 0x8bc34a);
        }
        break;
        
      case TILES.CABIN:
        // Base - wooden floor visible
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[0]);
        // Cabin wall
        g.rect(2, 8, TILE_SIZE - 4, TILE_SIZE - 8);
        g.fill(PALETTE.wood[0]);
        // Log texture
        for (let i = 0; i < 4; i++) {
          g.rect(2, 10 + i * 8, TILE_SIZE - 4, 6);
          g.fill(i % 2 === 0 ? PALETTE.wood[1] : PALETTE.wood[2]);
          // Log end circles on edges
          g.circle(4, 13 + i * 8, 2);
          g.circle(36, 13 + i * 8, 2);
          g.fill(PALETTE.woodDark[0]);
        }
        // Window (if specific position)
        if (x === 7 && y === 0) {
          g.rect(12, 16, 16, 16);
          g.fill(0x3a5068);
          g.rect(14, 18, 5, 5);
          g.rect(21, 18, 5, 5);
          g.rect(14, 25, 5, 5);
          g.rect(21, 25, 5, 5);
          g.fill({ color: 0xfff8dc, alpha: 0.8 });
          // Window frame
          g.rect(12, 16, 16, 2);
          g.rect(12, 30, 16, 2);
          g.rect(12, 16, 2, 16);
          g.rect(26, 16, 2, 16);
          g.rect(19, 16, 2, 16);
          g.rect(12, 23, 16, 2);
          g.fill(PALETTE.woodDark[2]);
        }
        // Door
        if (x === 7 && y === 1) {
          g.rect(10, 4, 20, TILE_SIZE - 4);
          g.fill(PALETTE.woodDark[0]);
          // Door panels
          g.rect(13, 8, 14, 10);
          g.rect(13, 22, 14, 12);
          g.fill(PALETTE.woodDark[2]);
          // Handle
          g.circle(24, 22, 2);
          g.fill(0xffd700);
        }
        // Roof peak tiles
        if (y === 0) {
          g.moveTo(0, 8);
          g.lineTo(TILE_SIZE / 2, -8);
          g.lineTo(TILE_SIZE, 8);
          g.fill(PALETTE.roof[0]);
          // Roof texture
          for (let i = 0; i < 3; i++) {
            g.moveTo(8 + i * 10, 4 - i);
            g.lineTo(TILE_SIZE / 2, -4);
            g.lineTo(32 - i * 10, 4 - i);
            g.stroke({ width: 2, color: PALETTE.roof[i % 2 + 1] });
          }
          // Chimney
          if (x === 8) {
            g.rect(24, -12, 12, 20);
            g.fill(PALETTE.stone[0]);
            g.rect(24, -12, 12, 3);
            g.fill(PALETTE.stone[2]);
            // Brick lines
            g.rect(24, -6, 12, 1);
            g.rect(24, 0, 12, 1);
            g.fill(PALETTE.stone[3]);
          }
        }
        break;
        
      case TILES.CAMPFIRE:
        // Base grass
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[2]);
        // Stone ring
        const stonePositions = [
          [8, 28], [16, 32], [24, 32], [32, 28],
          [8, 20], [32, 20], [12, 14], [28, 14]
        ];
        stonePositions.forEach(([sx, sy], i) => {
          g.ellipse(sx, sy, 5, 4);
          g.fill(PALETTE.stone[i % 4]);
        });
        // Logs in fire
        g.roundRect(12, 20, 16, 5, 2);
        g.fill(PALETTE.woodDark[1]);
        g.roundRect(10, 24, 5, 12, 2);
        g.fill(PALETTE.woodDark[0]);
        g.roundRect(25, 24, 5, 12, 2);
        g.fill(PALETTE.woodDark[2]);
        // Ash/embers (base, animated flames added separately)
        g.ellipse(20, 26, 8, 4);
        g.fill(0x2a2020);
        break;
        
      case TILES.LANTERN:
        // Sand base (same as SAND tile but with lantern)
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.sand[variant % 2]);
        // Lantern post
        g.rect(18, 10, 4, 28);
        g.fill(PALETTE.woodDark[0]);
        // Lantern housing
        g.rect(12, 0, 16, 14);
        g.fill(PALETTE.woodDark[1]);
        g.rect(14, 2, 12, 10);
        g.fill(0x1a1a10);
        // Lantern hook
        g.rect(16, 12, 8, 2);
        g.fill(PALETTE.woodDark[3]);
        break;
        
      case TILES.FENCE:
        // Grass base
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Fence posts
        g.rect(2, 8, 6, 32);
        g.rect(32, 8, 6, 32);
        g.fill(PALETTE.wood[1]);
        // Top caps
        g.rect(0, 6, 10, 4);
        g.rect(30, 6, 10, 4);
        g.fill(PALETTE.wood[0]);
        // Horizontal rails
        g.rect(0, 14, TILE_SIZE, 4);
        g.rect(0, 28, TILE_SIZE, 4);
        g.fill(PALETTE.wood[2]);
        break;
        
      case TILES.LOG:
        // Grass base
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Log
        g.roundRect(4, 18, 32, 18, 6);
        g.fill(PALETTE.wood[1]);
        // Log rings on end
        g.ellipse(6, 27, 4, 8);
        g.fill(PALETTE.wood[0]);
        g.ellipse(6, 27, 2, 5);
        g.fill(PALETTE.woodDark[0]);
        // Bark texture
        g.rect(14, 20, 2, 14);
        g.rect(24, 22, 2, 10);
        g.fill(PALETTE.woodDark[1]);
        break;
        
      default:
        if (tile !== TILES.WATER && tile !== TILES.LILY) {
          g.rect(0, 0, TILE_SIZE, TILE_SIZE);
          g.fill(PALETTE.grass[0]);
        }
    }
  };
  
  // Create animated water layer
  const createWaterLayer = (container) => {
    const waterContainer = new PIXI.Container();
    waterContainer.label = 'water';
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = MAP_DATA[y][x];
        if (tile === TILES.WATER || tile === TILES.LILY) {
          const water = new PIXI.Graphics();
          water.tileX = x;
          water.tileY = y;
          water.isLily = tile === TILES.LILY;
          water.x = x * TILE_SIZE;
          water.y = y * TILE_SIZE;
          water.phaseOffset = (x + y) * 0.5;
          waterContainer.addChild(water);
        }
      }
    }
    
    container.addChild(waterContainer);
  };
  
  // Create decoration layer (trees, rocks, bushes)
  const createDecorationLayer = (container) => {
    const decoContainer = new PIXI.Container();
    decoContainer.label = 'decorations';
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = MAP_DATA[y][x];
        if ([TILES.TREE, TILES.ROCK, TILES.BUSH].includes(tile)) {
          const deco = new PIXI.Graphics();
          drawDecoration(deco, tile, x, y);
          deco.x = x * TILE_SIZE;
          deco.y = y * TILE_SIZE;
          decoContainer.addChild(deco);
        }
      }
    }
    
    container.addChild(decoContainer);
  };
  
  const drawDecoration = (g, tile, x, y) => {
    const variant = (x * y) % 3;
    const seed = x * 100 + y;
    
    if (tile === TILES.TREE) {
      // Tree shadow
      g.ellipse(20, 38, 14, 6);
      g.fill({ color: 0x000000, alpha: 0.2 });
      
      // Tree trunk with bark texture
      g.rect(15, 20, 10, 20);
      g.fill(0x5d4037);
      g.rect(17, 22, 2, 16);
      g.rect(21, 25, 2, 12);
      g.fill(0x4e342e);
      
      // Foliage layers (pixel art style - circles with highlights)
      const foliageColors = [0x2e7d32, 0x388e3c, 0x43a047, 0x4caf50];
      
      // Back foliage
      g.circle(20, 10, 18);
      g.fill(foliageColors[0]);
      
      // Middle layer
      g.circle(12, 16, 12);
      g.circle(28, 14, 10);
      g.fill(foliageColors[1]);
      
      // Front highlights
      g.circle(16, 8, 8);
      g.circle(26, 12, 6);
      g.fill(foliageColors[2]);
      
      // Highlight dots
      g.circle(14, 6, 3);
      g.circle(24, 10, 2);
      g.fill(foliageColors[3]);
      
      // Apples or berries on some trees
      if (variant === 1) {
        g.circle(10, 18, 3);
        g.circle(28, 16, 3);
        g.fill(0xff5252);
        g.circle(9, 17, 1);
        g.circle(27, 15, 1);
        g.fill(0xff8a80);
      }
    } else if (tile === TILES.ROCK) {
      // Shadow
      g.ellipse(22, 36, 12, 5);
      g.fill({ color: 0x000000, alpha: 0.15 });
      
      // Main rock body
      g.moveTo(6, 35);
      g.lineTo(10, 18);
      g.lineTo(20, 12);
      g.lineTo(32, 16);
      g.lineTo(36, 32);
      g.lineTo(28, 38);
      g.lineTo(10, 38);
      g.fill(PALETTE.stone[1]);
      
      // Highlights
      g.moveTo(12, 20);
      g.lineTo(18, 15);
      g.lineTo(24, 18);
      g.lineTo(16, 24);
      g.fill(PALETTE.stone[2]);
      
      // Moss
      if (variant === 0) {
        g.ellipse(8, 32, 4, 3);
        g.ellipse(30, 34, 3, 2);
        g.fill(0x558b2f);
      }
    } else if (tile === TILES.BUSH) {
      // Shadow
      g.ellipse(20, 38, 14, 5);
      g.fill({ color: 0x000000, alpha: 0.15 });
      
      // Bush layers
      g.ellipse(20, 28, 18, 14);
      g.fill(0x2e7d32);
      g.ellipse(14, 24, 10, 10);
      g.ellipse(26, 26, 10, 8);
      g.fill(0x388e3c);
      g.ellipse(20, 22, 8, 6);
      g.fill(0x43a047);
      
      // Berries
      const berryColors = [0x7b1fa2, 0xe91e63, 0x2196f3];
      const berryColor = berryColors[variant];
      g.circle(10, 26, 3);
      g.circle(18, 30, 3);
      g.circle(28, 28, 3);
      g.circle(32, 32, 2);
      g.fill(berryColor);
      // Berry highlights
      g.circle(9, 25, 1);
      g.circle(17, 29, 1);
      g.circle(27, 27, 1);
      g.fill({ color: 0xffffff, alpha: 0.4 });
    }
  };
  
  // Create campfire animation layer
  const createCampfireLayer = (container) => {
    const fireContainer = new PIXI.Container();
    fireContainer.label = 'campfire';
    fireContainer.zIndex = 80;
    
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
          const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
          for (let i = 0; i < 5; i++) {
            const smoke = new Particle('smoke', bounds, { x: x * TILE_SIZE + 20, y: y * TILE_SIZE + 10 });
            smoke.startX = x * TILE_SIZE + 20;
            smoke.startY = y * TILE_SIZE + 10;
            particlesRef.current.push(smoke);
          }
          
          // Add ember particles
          for (let i = 0; i < 8; i++) {
            const ember = new Particle('ember', bounds, { x: x * TILE_SIZE + 20, y: y * TILE_SIZE + 20 });
            ember.startX = x * TILE_SIZE + 20;
            ember.startY = y * TILE_SIZE + 20;
            ember.maxLife = 1 + Math.random();
            particlesRef.current.push(ember);
          }
        }
        
        // Add lantern glow particles
        if (MAP_DATA[y][x] === TILES.LANTERN) {
          const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
          for (let i = 0; i < 2; i++) {
            const ember = new Particle('ember', bounds, { x: x * TILE_SIZE + 20, y: y * TILE_SIZE + 6 });
            ember.startX = x * TILE_SIZE + 20;
            ember.startY = y * TILE_SIZE + 6;
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
  
  // Create player sprite
  const createPlayer = (container) => {
    const playerContainer = new PIXI.Container();
    playerContainer.label = 'player';
    playerContainer.zIndex = 100;
    
    const player = new PIXI.Graphics();
    drawPlayer(player, 'down', false, 0);
    playerContainer.addChild(player);
    
    playerRef.current = playerContainer;
    container.addChild(playerContainer);
    container.sortableChildren = true;
  };
  
  const drawPlayer = (g, dir, isFishing, animFrame) => {
    g.clear();
    
    const bobOffset = Math.sin(animFrame * 3) * (isFishing ? 0.5 : 1.5);
    const breathe = Math.sin(animFrame * 2) * 0.5;
    
    // Shadow
    g.ellipse(20, 39, 10, 4);
    g.fill({ color: 0x000000, alpha: 0.25 });
    
    // Legs (pixel art style)
    g.rect(12, 32 + bobOffset, 7, 8);
    g.rect(21, 32 + bobOffset, 7, 8);
    g.fill(0x5d4037);
    
    // Boots
    g.rect(11, 37 + bobOffset, 9, 4);
    g.rect(20, 37 + bobOffset, 9, 4);
    g.fill(0x3e2723);
    // Boot highlights
    g.rect(12, 37 + bobOffset, 3, 1);
    g.rect(21, 37 + bobOffset, 3, 1);
    g.fill(0x5d4037);
    
    // Body - cozy sweater/jacket
    const bodyColor = isFishing ? 0x1565c0 : 0x558b2f;
    const bodyHighlight = isFishing ? 0x1976d2 : 0x689f38;
    g.roundRect(10, 18 + bobOffset, 20, 16 + breathe, 3);
    g.fill(bodyColor);
    // Sweater pattern
    g.rect(12, 22 + bobOffset, 16, 2);
    g.rect(12, 26 + bobOffset, 16, 2);
    g.fill(bodyHighlight);
    
    // Arms
    g.roundRect(5, 20 + bobOffset, 7, 12, 3);
    g.roundRect(28, 20 + bobOffset, 7, 12, 3);
    g.fill(bodyColor);
    
    // Hands
    g.circle(8, 31 + bobOffset, 4);
    g.circle(32, 31 + bobOffset, 4);
    g.fill(0xffccaa);
    
    // Head
    g.roundRect(11, 4 + bobOffset, 18, 16, 4);
    g.fill(0xffccaa);
    
    // Hair (fluffy pixel style)
    g.roundRect(9, 0 + bobOffset, 22, 12, 6);
    g.fill(0x5d4037);
    // Hair highlights
    g.roundRect(12, 2 + bobOffset, 6, 4, 2);
    g.roundRect(22, 3 + bobOffset, 4, 3, 2);
    g.fill(0x795548);
    
    // Face details based on direction
    if (dir === 'up') {
      // Back of head - just hair
    } else {
      const eyeOffset = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
      
      // Eyes (pixel style)
      g.rect(14 + eyeOffset, 10 + bobOffset, 4, 4);
      g.rect(22 + eyeOffset, 10 + bobOffset, 4, 4);
      g.fill(0xffffff);
      
      // Pupils
      const pupilOffset = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      g.rect(15 + eyeOffset + pupilOffset, 11 + bobOffset, 2, 2);
      g.rect(23 + eyeOffset + pupilOffset, 11 + bobOffset, 2, 2);
      g.fill(0x3e2723);
      
      // Blush
      g.ellipse(12, 16 + bobOffset, 3, 2);
      g.ellipse(28, 16 + bobOffset, 3, 2);
      g.fill({ color: 0xffab91, alpha: 0.6 });
      
      // Happy mouth
      if (!isFishing) {
        g.moveTo(18, 17 + bobOffset);
        g.lineTo(20, 18 + bobOffset);
        g.lineTo(22, 17 + bobOffset);
        g.stroke({ width: 1, color: 0x795548 });
      }
    }
    
    // Hat (cute farmer/fishing hat)
    g.ellipse(20, 5 + bobOffset, 14, 4);
    g.fill(0x8d6e63);
    g.roundRect(12, 0 + bobOffset, 16, 6, 2);
    g.fill(0xa1887f);
    // Hat band
    g.rect(12, 4 + bobOffset, 16, 2);
    g.fill(0xffab91);
    
    // Fishing rod if fishing
    if (isFishing) {
      g.moveTo(32, 26 + bobOffset);
      const rodEnd = { x: 45, y: 0 };
      if (dir === 'down') { rodEnd.x = 35; rodEnd.y = 55; }
      else if (dir === 'up') { rodEnd.x = 35; rodEnd.y = -15; }
      else if (dir === 'left') { rodEnd.x = -15; rodEnd.y = 20; }
      else { rodEnd.x = 55; rodEnd.y = 20; }
      g.lineTo(rodEnd.x, rodEnd.y + bobOffset);
      g.stroke({ width: 3, color: 0x8d6e63 });
      g.stroke({ width: 2, color: 0xa1887f });
      
      // Rod handle
      g.roundRect(30, 24 + bobOffset, 6, 10, 2);
      g.fill(0x6d4c41);
    }
  };
  
  // Create particle system
  const createParticleLayer = (container) => {
    const particleContainer = new PIXI.Container();
    particleContainer.label = 'particles';
    particleContainer.zIndex = 150;
    
    const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
    
    // Create fireflies
    for (let i = 0; i < 12; i++) {
      particlesRef.current.push(new Particle('firefly', bounds));
    }
    
    // Create butterflies
    for (let i = 0; i < 6; i++) {
      particlesRef.current.push(new Particle('butterfly', bounds));
    }
    
    // Create leaves
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push(new Particle('leaf', bounds));
    }
    
    // Create stars (only visible at night)
    for (let i = 0; i < 30; i++) {
      const star = new Particle('star', bounds);
      star.x = Math.random() * bounds.width;
      star.y = Math.random() * bounds.height * 0.5;
      star.size = 1 + Math.random() * 2;
      particlesRef.current.push(star);
    }
    
    container.addChild(particleContainer);
  };
  
  // Create lighting overlay
  const createLightingLayer = (container) => {
    const lighting = new PIXI.Graphics();
    lighting.label = 'lighting';
    lighting.zIndex = 200;
    container.addChild(lighting);
  };
  
  // Create fishing elements (line, bobber)
  const createFishingElements = (container) => {
    const fishingContainer = new PIXI.Container();
    fishingContainer.label = 'fishing';
    fishingContainer.zIndex = 90;
    fishingContainer.visible = false;
    
    const line = new PIXI.Graphics();
    line.label = 'line';
    fishingContainer.addChild(line);
    fishingLineRef.current = line;
    
    const bobber = new PIXI.Graphics();
    bobber.label = 'bobber';
    fishingContainer.addChild(bobber);
    bobberRef.current = bobber;
    
    container.addChild(fishingContainer);
  };
  
  // Update game state each frame
  const updateGame = useCallback((dt) => {
    if (!containerObjRef.current) return;
    
    waterTimeRef.current += dt;
    fishJumpTimerRef.current += dt;
    
    const isNight = timeOfDay === 'night';
    const isDusk = timeOfDay === 'dusk';
    const isDawn = timeOfDay === 'dawn';
    
    // Update sky
    const sky = containerObjRef.current.getChildByLabel('sky');
    if (sky) {
      sky.clear();
      const w = MAP_WIDTH * TILE_SIZE;
      const h = MAP_HEIGHT * TILE_SIZE;
      
      let skyColors;
      if (isNight) {
        skyColors = [0x0a1628, 0x1a2a48];
      } else if (isDusk) {
        skyColors = [0xff7043, 0x5c6bc0];
      } else if (isDawn) {
        skyColors = [0xffcc80, 0x81d4fa];
      } else {
        skyColors = [0x87ceeb, 0x98d8c8];
      }
      
      sky.rect(0, 0, w, h);
      sky.fill(skyColors[0]);
    }
    
    // Update water tiles with enhanced animation
    const waterLayer = containerObjRef.current.getChildByLabel('water');
    if (waterLayer) {
      waterLayer.children.forEach(water => {
        water.clear();
        const phase = waterTimeRef.current * 2 + water.phaseOffset;
        const waveOffset = Math.sin(phase) * 2;
        
        // Deeper water color at night
        const baseColor = isNight ? PALETTE.waterDeep[0] : PALETTE.water[0];
        const highlightColor = isNight ? PALETTE.waterDeep[2] : PALETTE.water[2];
        
        water.rect(0, 0, TILE_SIZE, TILE_SIZE);
        water.fill(baseColor);
        
        // Animated wave highlights
        const shimmerAlpha = 0.15 + Math.sin(phase * 1.5) * 0.1;
        
        // Horizontal wave lines
        for (let i = 0; i < 3; i++) {
          const yPos = 10 + i * 12 + waveOffset * (i % 2 === 0 ? 1 : -0.5);
          water.moveTo(0, yPos);
          water.lineTo(TILE_SIZE, yPos + waveOffset * 0.3);
          water.stroke({ width: 2, color: highlightColor, alpha: shimmerAlpha });
        }
        
        // Sparkle effect
        if (Math.sin(phase * 3 + water.phaseOffset * 2) > 0.7) {
          const sparkleX = 10 + ((water.tileX * 17 + Math.floor(waterTimeRef.current)) % 20);
          const sparkleY = 10 + ((water.tileY * 13 + Math.floor(waterTimeRef.current * 0.7)) % 20);
          water.circle(sparkleX, sparkleY, 2);
          water.fill({ color: 0xffffff, alpha: 0.6 });
        }
        
        // Lily pad with animation
        if (water.isLily) {
          const lilyWave = Math.sin(phase * 0.5) * 2;
          const lilyRotate = Math.sin(phase * 0.3) * 0.1;
          
          // Lily pad
          water.ellipse(20, 20 + lilyWave, 14, 9);
          water.fill(0x388e3c);
          water.ellipse(18, 18 + lilyWave, 10, 6);
          water.fill(0x4caf50);
          
          // Lily pad notch
          water.moveTo(20, 20 + lilyWave);
          water.lineTo(14, 12 + lilyWave);
          water.lineTo(26, 12 + lilyWave);
          water.fill(baseColor);
          
          // Flower on some lily pads
          if ((water.tileX + water.tileY) % 3 === 0) {
            const flowerY = 14 + lilyWave;
            water.circle(22, flowerY, 4);
            water.circle(18, flowerY + 2, 4);
            water.circle(24, flowerY + 2, 4);
            water.fill(0xffb7c5);
            water.circle(21, flowerY + 1, 2);
            water.fill(0xfff59d);
          }
        }
      });
    }
    
    // Random fish jumping
    if (fishJumpTimerRef.current > 3 + Math.random() * 5) {
      fishJumpTimerRef.current = 0;
      const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
      // Find a random water tile
      const waterTiles = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (MAP_DATA[y][x] === TILES.WATER) {
            waterTiles.push({ x, y });
          }
        }
      }
      if (waterTiles.length > 0) {
        const tile = waterTiles[Math.floor(Math.random() * waterTiles.length)];
        // Create splash particles
        for (let i = 0; i < 5; i++) {
          const splash = new Particle('fish_splash', bounds);
          splash.x = tile.x * TILE_SIZE + 20 + (Math.random() - 0.5) * 10;
          splash.y = tile.y * TILE_SIZE + 20;
          splash.vy = -3 - Math.random() * 2;
          splash.vx = (Math.random() - 0.5) * 2;
          splash.size = 2 + Math.random() * 2;
          splash.maxLife = 1;
          particlesRef.current.push(splash);
        }
      }
    }
    
    // Update campfire animation
    const fireLayer = containerObjRef.current.getChildByLabel('campfire');
    if (fireLayer) {
      fireLayer.children.forEach(fire => {
        fire.clear();
        const t = waterTimeRef.current * 8;
        
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
    }
    
    // Update lanterns glow
    const tileLayer = containerObjRef.current.getChildByLabel('tiles');
    // Lantern glow handled in lighting layer
    
    // Interpolate player position
    const targetX = playerPos.x * TILE_SIZE;
    const targetY = playerPos.y * TILE_SIZE;
    visualPosRef.current.x += (targetX - visualPosRef.current.x) * 0.2;
    visualPosRef.current.y += (targetY - visualPosRef.current.y) * 0.2;
    
    if (playerRef.current) {
      playerRef.current.x = visualPosRef.current.x;
      playerRef.current.y = visualPosRef.current.y;
      
      // Update player animation
      const playerGfx = playerRef.current.children[0];
      if (playerGfx) {
        const isFishing = gameState !== 'walking';
        drawPlayer(playerGfx, playerDir, isFishing, animFrameRef.current);
      }
    }
    
    // Update particles
    const particleLayer = containerObjRef.current.getChildByLabel('particles');
    if (particleLayer) {
      particleLayer.removeChildren();
      
      // Filter out dead particles
      particlesRef.current = particlesRef.current.filter(particle => {
        const alive = particle.update(dt);
        return alive;
      });
      
      particlesRef.current.forEach(particle => {
        // Only show appropriate particles for time of day
        if (particle.type === 'firefly' && !isNight && !isDusk) return;
        if (particle.type === 'butterfly' && (isNight || isDusk)) return;
        if (particle.type === 'star' && !isNight) return;
        
        const g = new PIXI.Graphics();
        const alpha = particle.getAlpha();
        
        if (particle.type === 'firefly') {
          // Glowing firefly
          g.circle(particle.x, particle.y, particle.size * 2);
          g.fill({ color: 0xffff66, alpha: alpha * 0.2 });
          g.circle(particle.x, particle.y, particle.size);
          g.fill({ color: 0xffffaa, alpha });
          g.circle(particle.x, particle.y, particle.size * 0.5);
          g.fill({ color: 0xffffff, alpha });
        } else if (particle.type === 'butterfly') {
          const wingFlap = Math.sin(particle.phase * 10) * 0.6 + 0.4;
          const wingColors = [0xffab91, 0x81d4fa, 0xce93d8, 0xa5d6a7];
          const wingColor = wingColors[Math.floor(particle.phase) % wingColors.length];
          
          // Wings
          g.ellipse(particle.x - 5 * wingFlap, particle.y, 5, 4);
          g.ellipse(particle.x + 5 * wingFlap, particle.y, 5, 4);
          g.fill({ color: wingColor, alpha });
          // Wing patterns
          g.circle(particle.x - 4 * wingFlap, particle.y, 2);
          g.circle(particle.x + 4 * wingFlap, particle.y, 2);
          g.fill({ color: 0xffffff, alpha: alpha * 0.5 });
          // Body
          g.ellipse(particle.x, particle.y, 2, 5);
          g.fill({ color: 0x5d4037, alpha });
        } else if (particle.type === 'leaf') {
          const rotation = particle.phase * 2;
          const leafWidth = 5 * Math.cos(rotation);
          g.ellipse(particle.x, particle.y, Math.abs(leafWidth) + 1, 3);
          g.fill({ color: 0x8bc34a, alpha });
          // Leaf vein
          g.moveTo(particle.x - 3, particle.y);
          g.lineTo(particle.x + 3, particle.y);
          g.stroke({ width: 1, color: 0x689f38, alpha: alpha * 0.5 });
        } else if (particle.type === 'smoke') {
          g.circle(particle.x, particle.y, particle.size);
          g.fill({ color: 0x9e9e9e, alpha });
        } else if (particle.type === 'ember') {
          g.circle(particle.x, particle.y, particle.size);
          g.fill({ color: 0xff8c00, alpha });
          g.circle(particle.x, particle.y, particle.size * 0.6);
          g.fill({ color: 0xffcc00, alpha });
        } else if (particle.type === 'star') {
          // Twinkling star
          const twinkle = 0.5 + Math.sin(particle.phase + particle.x * 0.1) * 0.5;
          g.circle(particle.x, particle.y, particle.size * twinkle);
          g.fill({ color: 0xffffff, alpha: alpha * twinkle });
          // Star rays
          if (particle.size > 2 && twinkle > 0.7) {
            const rayLen = particle.size * 2;
            g.moveTo(particle.x - rayLen, particle.y);
            g.lineTo(particle.x + rayLen, particle.y);
            g.moveTo(particle.x, particle.y - rayLen);
            g.lineTo(particle.x, particle.y + rayLen);
            g.stroke({ width: 1, color: 0xffffff, alpha: alpha * 0.3 });
          }
        } else if (particle.type === 'fish_splash') {
          g.circle(particle.x, particle.y, particle.size);
          g.fill({ color: 0xb3e5fc, alpha: alpha * 0.8 });
        }
        
        particleLayer.addChild(g);
      });
    }
    
    // Update lighting overlay with warm glow effects
    const lighting = containerObjRef.current.getChildByLabel('lighting');
    if (lighting) {
      lighting.clear();
      const w = MAP_WIDTH * TILE_SIZE;
      const h = MAP_HEIGHT * TILE_SIZE;
      
      let overlayColor = 0x000000;
      let overlayAlpha = 0;
      
      switch (timeOfDay) {
        case 'dawn':
          overlayColor = 0xffcc80;
          overlayAlpha = 0.12;
          break;
        case 'dusk':
          overlayColor = 0xff7043;
          overlayAlpha = 0.2;
          break;
        case 'night':
          overlayColor = 0x0a1628;
          overlayAlpha = 0.5;
          break;
        default:
          overlayAlpha = 0;
      }
      
      if (overlayAlpha > 0) {
        lighting.rect(0, 0, w, h);
        lighting.fill({ color: overlayColor, alpha: overlayAlpha });
      }
      
      // Warm light sources at night/dusk
      if (isNight || isDusk) {
        // Campfire glow
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (MAP_DATA[y][x] === TILES.CAMPFIRE) {
              const cx = x * TILE_SIZE + 20;
              const cy = y * TILE_SIZE + 20;
              const glowRadius = 100 + Math.sin(waterTimeRef.current * 3) * 10;
              
              // Multiple glow layers
              for (let i = 3; i >= 0; i--) {
                const radius = glowRadius * (1 - i * 0.2);
                const alpha = 0.15 - i * 0.03;
                lighting.circle(cx, cy, radius);
                lighting.fill({ color: 0xff6600, alpha });
              }
            }
            
            // Lantern glow
            if (MAP_DATA[y][x] === TILES.LANTERN) {
              const cx = x * TILE_SIZE + 20;
              const cy = y * TILE_SIZE + 6;
              const glowRadius = 50 + Math.sin(waterTimeRef.current * 2 + x) * 5;
              
              for (let i = 2; i >= 0; i--) {
                const radius = glowRadius * (1 - i * 0.25);
                lighting.circle(cx, cy, radius);
                lighting.fill({ color: 0xffcc66, alpha: 0.12 - i * 0.03 });
              }
            }
            
            // Cabin window glow
            if (MAP_DATA[y][x] === TILES.CABIN && x === 7 && y === 0) {
              const cx = x * TILE_SIZE + 20;
              const cy = y * TILE_SIZE + 24;
              lighting.circle(cx, cy, 40);
              lighting.fill({ color: 0xfff8dc, alpha: 0.1 });
            }
          }
        }
      }
      
      // Subtle vignette
      const vignetteAlpha = isNight ? 0.25 : 0.1;
      lighting.rect(0, 0, w, h * 0.1);
      lighting.fill({ color: 0x000000, alpha: vignetteAlpha });
      lighting.rect(0, h * 0.9, w, h * 0.1);
      lighting.fill({ color: 0x000000, alpha: vignetteAlpha });
    }
  }, [playerPos, playerDir, gameState, timeOfDay]);
  
  // Keep updateGame ref current
  useEffect(() => {
    updateGameRef.current = updateGame;
  }, [updateGame]);
  
  // Update fishing elements
  useEffect(() => {
    if (!containerObjRef.current) return;
    
    const fishingContainer = containerObjRef.current.getChildByLabel('fishing');
    if (!fishingContainer) return;
    
    const isFishing = gameState !== 'walking';
    fishingContainer.visible = isFishing;
    
    if (isFishing && bobberRef.current && fishingLineRef.current) {
      const px = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = playerPos.y * TILE_SIZE + TILE_SIZE / 2;
      
      let bobberX = px, bobberY = py;
      const dist = gameState === 'casting' ? 30 : 70;
      
      if (playerDir === 'down') bobberY += dist;
      else if (playerDir === 'up') bobberY -= dist;
      else if (playerDir === 'left') bobberX -= dist;
      else bobberX += dist;
      
      // Line
      fishingLineRef.current.clear();
      fishingLineRef.current.moveTo(px + 12, py);
      fishingLineRef.current.lineTo(bobberX, bobberY);
      fishingLineRef.current.stroke({ width: 1, color: 0xeeeeee, alpha: 0.8 });
      
      // Bobber
      bobberRef.current.clear();
      const bobberWave = gameState === 'fish_appeared' 
        ? Math.sin(Date.now() / 80) * 6 
        : Math.sin(Date.now() / 400) * 2;
      
      // Bobber body
      bobberRef.current.ellipse(bobberX, bobberY + bobberWave, 7, 9);
      bobberRef.current.fill(0xff4444);
      bobberRef.current.rect(bobberX - 3, bobberY + bobberWave - 3, 6, 3);
      bobberRef.current.fill(0xffffff);
      // Bobber highlight
      bobberRef.current.circle(bobberX - 2, bobberY + bobberWave - 5, 2);
      bobberRef.current.fill({ color: 0xffffff, alpha: 0.5 });
      
      // Ripples in water
      const rippleAlpha = 0.3 + Math.sin(Date.now() / 300) * 0.1;
      bobberRef.current.circle(bobberX, bobberY + bobberWave + 5, 10 + Math.sin(Date.now() / 200) * 3);
      bobberRef.current.stroke({ width: 1, color: 0xffffff, alpha: rippleAlpha * 0.5 });
      bobberRef.current.circle(bobberX, bobberY + bobberWave + 5, 16 + Math.sin(Date.now() / 250) * 3);
      bobberRef.current.stroke({ width: 1, color: 0xffffff, alpha: rippleAlpha * 0.3 });
      
      // Exclamation mark when fish appears
      if (gameState === 'fish_appeared') {
        // Urgent bobbing
        const urgentBob = Math.sin(Date.now() / 60) * 3;
        
        // Big exclamation
        bobberRef.current.roundRect(bobberX - 4, bobberY - 45 + urgentBob, 8, 25, 4);
        bobberRef.current.fill(0xff3333);
        bobberRef.current.circle(bobberX, bobberY - 14 + urgentBob, 4);
        bobberRef.current.fill(0xff3333);
        
        // White inner
        bobberRef.current.roundRect(bobberX - 2, bobberY - 42 + urgentBob, 4, 18, 2);
        bobberRef.current.fill(0xffffff);
        bobberRef.current.circle(bobberX, bobberY - 14 + urgentBob, 2);
        bobberRef.current.fill(0xffffff);
        
        // Splash effect
        for (let i = 0; i < 4; i++) {
          const angle = (Date.now() / 100 + i * Math.PI / 2) % (Math.PI * 2);
          const splashX = bobberX + Math.cos(angle) * 20;
          const splashY = bobberY + bobberWave + 5 + Math.sin(angle) * 8;
          bobberRef.current.circle(splashX, splashY, 3);
          bobberRef.current.fill({ color: 0xb3e5fc, alpha: 0.6 });
        }
      }
    }
  }, [gameState, playerPos, playerDir]);
  
  // Check if can fish
  useEffect(() => {
    const canFish = isWaterAdjacent(playerPos.x, playerPos.y, playerDir);
    onCanFishChange?.(canFish);
  }, [playerPos, playerDir, onCanFishChange]);
  
  // Movement function
  const movePlayer = useCallback((dx, dy, newDir) => {
    if (gameState !== 'walking') return;
    
    setPlayerDir(newDir);
    setPlayerPos(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      
      if (isWalkable(newX, newY)) {
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [gameState, setPlayerDir, setPlayerPos]);
  
  return { movePlayer };
};

export { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT };
