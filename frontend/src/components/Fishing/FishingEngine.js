import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';

// Cozy Stardew-inspired color palette
const PALETTE = {
  grass: [0x5a8f3d, 0x4a7a32, 0x6b9e4a, 0x3d6b28],
  sand: [0xe8d4a8, 0xdec498, 0xf0e0b8, 0xd4bc8a],
  path: [0x8b7355, 0x7a6548, 0x9c8465, 0x695839],
  wood: [0x8b6914, 0x6d5410, 0xa67c20, 0x5d4410]
};

// Tile types
const TILES = {
  GRASS: 0, WATER: 1, SAND: 2, FLOWERS: 3, PATH: 4,
  TREE: 5, ROCK: 6, BUSH: 7, DOCK: 8, TALL_GRASS: 9, LILY: 10
};

// Map configuration
const TILE_SIZE = 40;
const MAP_WIDTH = 24;
const MAP_HEIGHT = 14;

// Map data
const MAP_DATA = [
  [5, 0, 0, 3, 0, 5, 0, 0, 3, 0, 0, 5, 0, 3, 0, 0, 0, 5, 0, 0, 3, 0, 0, 5],
  [0, 7, 0, 0, 0, 0, 9, 0, 0, 0, 7, 0, 0, 0, 9, 0, 0, 0, 0, 7, 0, 0, 9, 0],
  [0, 0, 6, 0, 4, 4, 4, 0, 0, 3, 0, 0, 6, 0, 0, 4, 4, 4, 0, 0, 0, 6, 0, 0],
  [3, 0, 0, 0, 4, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0, 3],
  [5, 0, 9, 0, 4, 0, 0, 0, 7, 0, 3, 0, 9, 0, 0, 4, 0, 0, 7, 0, 0, 9, 0, 5],
  [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 7, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 3, 0, 7, 0, 3, 0, 0],
  [6, 0, 0, 0, 9, 0, 0, 3, 0, 0, 4, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 8, 1, 1, 1, 10, 1, 1, 1, 1, 1, 10, 1, 1, 1],
  [1, 1, 10, 1, 1, 1, 1, 10, 1, 1, 8, 1, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 10, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1, 10, 1, 1],
  [1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1, 1],
];

const isWalkable = (x, y) => {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const tile = MAP_DATA[y]?.[x];
  return ![1, 5, 6, 10].includes(tile);
};

const isWaterAdjacent = (x, y, dir) => {
  let checkX = x, checkY = y;
  
  if (dir === 'down') checkY += 1;
  else if (dir === 'up') checkY -= 1;
  else if (dir === 'left') checkX -= 1;
  else if (dir === 'right') checkX += 1;
  
  if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) return false;
  const targetTile = MAP_DATA[checkY]?.[checkX];
  // Can only fish if facing water (1) or lily pad (10)
  return [1, 10].includes(targetTile);
};

// Particle class for ambient effects
class Particle {
  constructor(type, bounds) {
    this.type = type;
    this.bounds = bounds;
    this.reset();
  }
  
  reset() {
    this.x = Math.random() * this.bounds.width;
    this.y = Math.random() * this.bounds.height * 0.6;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.life = 1;
    this.maxLife = 3 + Math.random() * 4;
    this.size = 2 + Math.random() * 3;
    this.phase = Math.random() * Math.PI * 2;
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
    }
    
    if (this.life > this.maxLife || this.y > this.bounds.height || this.x < -20 || this.x > this.bounds.width + 20) {
      this.reset();
      if (this.type === 'leaf') this.y = -10;
    }
  }
  
  getAlpha() {
    if (this.type === 'firefly') {
      return 0.3 + Math.sin(this.phase * 2) * 0.7;
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
        backgroundColor: 0x87ceeb,
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
      
      // Create layers
      createTileLayer(mainContainer);
      createWaterLayer(mainContainer);
      createDecorationLayer(mainContainer);
      createPlayer(mainContainer);
      createParticleLayer(mainContainer);
      createLightingLayer(mainContainer);
      createFishingElements(mainContainer);
      
      // Game loop - use ref to avoid stale closure
      app.ticker.add((ticker) => {
        const dt = ticker.deltaTime / 60;
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
  
  // Create tile layer
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
  
  // Draw individual tile
  const drawTile = (g, tile, x, y) => {
    const variant = (x + y) % 4;
    
    switch (tile) {
      case TILES.GRASS:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Add grass texture
        for (let i = 0; i < 3; i++) {
          const gx = 8 + i * 12 + (variant * 3);
          const gy = 30 + (i % 2) * 5;
          g.moveTo(gx, gy);
          g.lineTo(gx - 2, gy - 8);
          g.lineTo(gx + 2, gy - 6);
          g.stroke({ width: 2, color: PALETTE.grass[(variant + 1) % 4] });
        }
        break;
        
      case TILES.SAND:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.sand[variant % 2]);
        // Add pebbles
        g.circle(12 + variant * 5, 20, 2);
        g.fill(PALETTE.sand[2]);
        break;
        
      case TILES.PATH:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.path[variant % 2]);
        g.rect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
        g.fill(PALETTE.path[(variant + 2) % 4]);
        break;
        
      case TILES.FLOWERS:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Draw flower
        const flowerColors = [0xff6b9d, 0xffd93d, 0xff8fab, 0xc9b1ff];
        g.circle(20, 18, 6);
        g.fill(flowerColors[variant]);
        g.circle(20, 18, 3);
        g.fill(0xfff9c4);
        break;
        
      case TILES.DOCK:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.sand[0]);
        // Wood planks
        for (let i = 0; i < 4; i++) {
          g.rect(i * 10, 0, 9, TILE_SIZE);
          g.fill(i % 2 === 0 ? PALETTE.wood[0] : PALETTE.wood[2]);
        }
        g.rect(0, 0, TILE_SIZE, 3);
        g.fill(PALETTE.wood[3]);
        break;
        
      case TILES.TALL_GRASS:
        g.rect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fill(PALETTE.grass[variant]);
        // Tall grass blades
        for (let i = 0; i < 5; i++) {
          const gx = 4 + i * 8;
          g.moveTo(gx, TILE_SIZE);
          g.lineTo(gx - 3, TILE_SIZE - 20 - i * 2);
          g.lineTo(gx + 3, TILE_SIZE - 18 - i * 2);
          g.lineTo(gx, TILE_SIZE);
          g.fill(0x7cb342);
        }
        break;
        
      default:
        // For water, tree, rock, bush, lily - handled separately or as basic shapes
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
    
    if (tile === TILES.TREE) {
      // Tree trunk
      g.rect(16, 24, 8, 16);
      g.fill(0x5d4037);
      // Foliage
      g.circle(20, 16, 16);
      g.fill(0x2e7d32);
      g.circle(14, 20, 10);
      g.fill(0x388e3c);
      g.circle(26, 18, 8);
      g.fill(0x43a047);
    } else if (tile === TILES.ROCK) {
      g.ellipse(20, 28, 14 + variant * 2, 10 + variant);
      g.fill(0x757575);
      // Highlight
      g.ellipse(16, 24, 4, 2);
      g.fill(0x9e9e9e);
    } else if (tile === TILES.BUSH) {
      g.ellipse(20, 30, 16, 12);
      g.fill(0x388e3c);
      g.ellipse(20, 26, 12, 8);
      g.fill(0x43a047);
      // Berries
      if (variant === 0) {
        g.circle(14, 28, 3);
        g.circle(26, 30, 3);
        g.fill(0x7b1fa2);
      }
    }
  };
  
  // Create player sprite
  const createPlayer = (container) => {
    const playerContainer = new PIXI.Container();
    playerContainer.label = 'player';
    playerContainer.zIndex = 100;
    
    const player = new PIXI.Graphics();
    drawPlayer(player, 'down', false);
    playerContainer.addChild(player);
    
    playerRef.current = playerContainer;
    container.addChild(playerContainer);
    container.sortableChildren = true;
  };
  
  const drawPlayer = (g, dir, isFishing) => {
    g.clear();
    
    // Shadow
    g.ellipse(20, 38, 10, 4);
    g.fill({ color: 0x000000, alpha: 0.2 });
    
    // Body
    g.roundRect(11, 20, 18, 14, 3);
    g.fill(isFishing ? 0x42a5f5 : 0x66bb6a);
    
    // Arms
    g.roundRect(6, 22, 6, 10, 3);
    g.roundRect(28, 22, 6, 10, 3);
    g.fill(isFishing ? 0x42a5f5 : 0x66bb6a);
    
    // Hands
    g.circle(9, 30, 4);
    g.circle(31, 30, 4);
    g.fill(0xffcc80);
    
    // Legs
    g.roundRect(13, 32, 6, 8, 2);
    g.roundRect(21, 32, 6, 8, 2);
    g.fill(0x5d4037);
    
    // Shoes
    g.roundRect(12, 37, 8, 4, 2);
    g.roundRect(20, 37, 8, 4, 2);
    g.fill(0x3e2723);
    
    // Head
    g.roundRect(12, 6, 16, 16, 4);
    g.fill(0xffcc80);
    
    // Hair
    g.roundRect(10, 2, 20, 10, 5);
    g.fill(0x5d4037);
    
    // Eyes based on direction
    if (dir === 'up') {
      // Back of head
    } else {
      const eyeOffset = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;
      g.circle(16 + eyeOffset, 12, 2);
      g.circle(24 + eyeOffset, 12, 2);
      g.fill(0x4e342e);
      
      // Blush
      g.ellipse(13, 16, 3, 2);
      g.ellipse(27, 16, 3, 2);
      g.fill({ color: 0xff8a80, alpha: 0.5 });
    }
    
    // Fishing rod if fishing
    if (isFishing) {
      g.moveTo(31, 26);
      const rodEnd = { x: 45, y: 0 };
      if (dir === 'down') { rodEnd.x = 35; rodEnd.y = 50; }
      else if (dir === 'up') { rodEnd.x = 35; rodEnd.y = -10; }
      else if (dir === 'left') { rodEnd.x = -10; rodEnd.y = 20; }
      else { rodEnd.x = 50; rodEnd.y = 20; }
      g.lineTo(rodEnd.x, rodEnd.y);
      g.stroke({ width: 3, color: 0x8d6e63 });
    }
  };
  
  // Create particle system
  const createParticleLayer = (container) => {
    const particleContainer = new PIXI.Container();
    particleContainer.label = 'particles';
    particleContainer.zIndex = 150;
    
    const bounds = { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
    
    // Create fireflies/butterflies
    for (let i = 0; i < 15; i++) {
      const type = i < 8 ? 'firefly' : 'butterfly';
      particlesRef.current.push(new Particle(type, bounds));
    }
    
    // Create leaves
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push(new Particle('leaf', bounds));
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
    
    // Update water tiles
    const waterLayer = containerObjRef.current.getChildByLabel('water');
    if (waterLayer) {
      waterLayer.children.forEach(water => {
        water.clear();
        const phase = waterTimeRef.current * 2 + water.phaseOffset;
        const waveOffset = Math.sin(phase) * 2;
        
        // Base water color with wave effect
        const baseColor = 0x4a90b8;
        water.rect(0, 0, TILE_SIZE, TILE_SIZE);
        water.fill(baseColor);
        
        // Shimmer highlights
        const shimmerAlpha = 0.2 + Math.sin(phase * 1.5) * 0.1;
        water.rect(0, 0, TILE_SIZE, TILE_SIZE);
        water.fill({ color: 0xffffff, alpha: shimmerAlpha });
        
        // Wave lines
        water.moveTo(0, 15 + waveOffset);
        water.lineTo(TILE_SIZE, 18 + waveOffset * 0.8);
        water.stroke({ width: 1, color: 0x5aa0c8, alpha: 0.5 });
        
        water.moveTo(0, 30 - waveOffset);
        water.lineTo(TILE_SIZE, 28 - waveOffset * 0.6);
        water.stroke({ width: 1, color: 0x5aa0c8, alpha: 0.5 });
        
        // Lily pad
        if (water.isLily) {
          const lilyWave = Math.sin(phase * 0.5) * 2;
          water.ellipse(20, 20 + lilyWave, 12, 8);
          water.fill(0x4caf50);
          water.ellipse(20, 18 + lilyWave, 8, 5);
          water.fill(0x66bb6a);
        }
      });
    }
    
    // Interpolate player position
    const targetX = playerPos.x * TILE_SIZE;
    const targetY = playerPos.y * TILE_SIZE;
    visualPosRef.current.x += (targetX - visualPosRef.current.x) * 0.2;
    visualPosRef.current.y += (targetY - visualPosRef.current.y) * 0.2;
    
    if (playerRef.current) {
      playerRef.current.x = visualPosRef.current.x;
      playerRef.current.y = visualPosRef.current.y;
    }
    
    // Update particles
    const particleLayer = containerObjRef.current.getChildByLabel('particles');
    if (particleLayer) {
      particleLayer.removeChildren();
      
      const isNight = timeOfDay === 'night' || timeOfDay === 'dusk';
      
      particlesRef.current.forEach(particle => {
        particle.update(dt);
        
        // Only show appropriate particles for time of day
        if ((particle.type === 'firefly' && !isNight) || 
            (particle.type === 'butterfly' && isNight)) return;
        
        const g = new PIXI.Graphics();
        const alpha = particle.getAlpha();
        
        if (particle.type === 'firefly') {
          g.circle(particle.x, particle.y, particle.size);
          g.fill({ color: 0xffff99, alpha });
          // Glow
          g.circle(particle.x, particle.y, particle.size * 2);
          g.fill({ color: 0xffff66, alpha: alpha * 0.3 });
        } else if (particle.type === 'butterfly') {
          const wingFlap = Math.sin(particle.phase * 8) * 0.5 + 0.5;
          // Wings
          g.ellipse(particle.x - 4 * wingFlap, particle.y, 4, 3);
          g.ellipse(particle.x + 4 * wingFlap, particle.y, 4, 3);
          g.fill({ color: 0xffab91, alpha });
          // Body
          g.ellipse(particle.x, particle.y, 2, 4);
          g.fill({ color: 0x5d4037, alpha });
        } else if (particle.type === 'leaf') {
          g.ellipse(particle.x, particle.y, 4, 2);
          g.fill({ color: 0x8bc34a, alpha });
        }
        
        particleLayer.addChild(g);
      });
    }
    
    // Update lighting overlay
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
          overlayAlpha = 0.15;
          break;
        case 'dusk':
          overlayColor = 0xff8a65;
          overlayAlpha = 0.25;
          break;
        case 'night':
          overlayColor = 0x1a237e;
          overlayAlpha = 0.4;
          break;
        default:
          overlayAlpha = 0;
      }
      
      if (overlayAlpha > 0) {
        lighting.rect(0, 0, w, h);
        lighting.fill({ color: overlayColor, alpha: overlayAlpha });
      }
      
      // Vignette effect
      lighting.rect(0, 0, w, h);
      lighting.fill({ color: 0x000000, alpha: 0.15 });
    }
  }, [playerPos, timeOfDay]);
  
  // Keep updateGame ref current to avoid stale closures in ticker
  useEffect(() => {
    updateGameRef.current = updateGame;
  }, [updateGame]);
  
  // Update player sprite when direction or fishing state changes
  useEffect(() => {
    if (!playerRef.current) return;
    const playerGfx = playerRef.current.children[0];
    if (playerGfx) {
      const isFishing = gameState !== 'walking';
      drawPlayer(playerGfx, playerDir, isFishing);
    }
  }, [playerDir, gameState]);
  
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
      fishingLineRef.current.moveTo(px, py);
      fishingLineRef.current.lineTo(bobberX, bobberY);
      fishingLineRef.current.stroke({ width: 1, color: 0xcccccc, alpha: 0.8 });
      
      // Bobber
      bobberRef.current.clear();
      const bobberWave = gameState === 'fish_appeared' 
        ? Math.sin(Date.now() / 100) * 5 
        : Math.sin(Date.now() / 500) * 2;
      
      bobberRef.current.ellipse(bobberX, bobberY + bobberWave, 6, 8);
      bobberRef.current.fill(0xff5252);
      bobberRef.current.rect(bobberX - 3, bobberY + bobberWave - 2, 6, 2);
      bobberRef.current.fill(0xffffff);
      
      // Exclamation mark when fish appears
      if (gameState === 'fish_appeared') {
        bobberRef.current.moveTo(bobberX, bobberY - 25);
        bobberRef.current.lineTo(bobberX, bobberY - 40);
        bobberRef.current.stroke({ width: 4, color: 0xff5252 });
        bobberRef.current.circle(bobberX, bobberY - 18, 3);
        bobberRef.current.fill(0xff5252);
      }
    }
  }, [gameState, playerPos, playerDir]);
  
  // Check if can fish
  useEffect(() => {
    const canFish = isWaterAdjacent(playerPos.x, playerPos.y, playerDir);
    onCanFishChange?.(canFish);
  }, [playerPos, playerDir, onCanFishChange]);
  
  // Movement function - use functional update to avoid stale closure
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

