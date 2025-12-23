/**
 * Fishing Map Module
 * 
 * Handles map data, tile rendering, and water animations.
 * Extracted from FishingEngine.js for maintainability.
 */

import * as PIXI from 'pixi.js';

// ===========================================
// COLOR PALETTE
// ===========================================

export const PALETTE = {
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

// ===========================================
// TILE TYPES
// ===========================================

export const TILES = {
  GRASS: 0, WATER: 1, SAND: 2, FLOWERS: 3, PATH: 4,
  TREE: 5, ROCK: 6, BUSH: 7, DOCK: 8, TALL_GRASS: 9, LILY: 10,
  CABIN: 11, CAMPFIRE: 12, LANTERN: 13, FENCE: 14, LOG: 15
};

// ===========================================
// MAP CONFIGURATION
// ===========================================

export const TILE_SIZE = 40;
export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 14;

// Enhanced map with cabin and campfire
export const MAP_DATA = [
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

// ===========================================
// MAP UTILITY FUNCTIONS
// ===========================================

/**
 * Check if a tile is walkable
 */
export const isWalkable = (x, y) => {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const tile = MAP_DATA[y]?.[x];
  return ![1, 5, 6, 10, 11, 14, 15].includes(tile);
};

/**
 * Check if position is adjacent to water in given direction
 */
export const isWaterAdjacent = (x, y, dir) => {
  let checkX = x, checkY = y;
  
  if (dir === 'down') checkY += 1;
  else if (dir === 'up') checkY -= 1;
  else if (dir === 'left') checkX -= 1;
  else if (dir === 'right') checkX += 1;
  
  if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) return false;
  const targetTile = MAP_DATA[checkY]?.[checkX];
  return [1, 10].includes(targetTile);
};

// ===========================================
// TILE DRAWING
// ===========================================

/**
 * Draw an individual tile with enhanced pixel art
 */
export const drawTile = (g, tile, x, y) => {
  const variant = (x + y) % 4;
  
  switch (tile) {
    case TILES.GRASS:
      // Base grass with subtle variation
      g.rect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fill(PALETTE.grass[variant]);
      
      // Pixel dither for texture
      for (let i = 0; i < 8; i++) {
        const gx = (((x * 1000 + y) + i * 7) % 36) + 2;
        const gy = (((x * 1000 + y) + i * 13) % 36) + 2;
        g.rect(gx, gy, 2, 2);
        g.fill(PALETTE.grassDark[variant]);
      }
      
      // Grass blades
      for (let i = 0; i < 4; i++) {
        const gx = 6 + i * 10 + (variant * 2);
        const gy = 36;
        const height = 8 + (((x * 1000 + y) + i) % 5);
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
        const tileSeed = x * 1000 + y;
        const px = (tileSeed * (i + 1)) % 35 + 2;
        const py = ((tileSeed + 50) * (i + 1)) % 35 + 2;
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
      const flowerSeed = x * 1000 + y;
      for (let i = 0; i < 2 + variant % 2; i++) {
        const fx = 8 + i * 14 + ((flowerSeed + i) % 5);
        const fy = 12 + ((flowerSeed + i * 3) % 10);
        // Stem
        g.moveTo(fx, fy + 6);
        g.lineTo(fx, fy + 18);
        g.stroke({ width: 2, color: 0x4a8030 });
        // Petals (pixel style)
        const petalColor = flowerColors[(flowerSeed + i) % flowerColors.length];
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
        const tileSeed = x * 1000 + y;
        const gx = 3 + i * 6 + ((tileSeed + i) % 3);
        const height = 18 + ((tileSeed + i * 7) % 8);
        const sway = ((tileSeed + i) % 3) - 1;
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

// ===========================================
// DECORATION DRAWING
// ===========================================

/**
 * Draw decoration (trees, rocks, bushes)
 */
export const drawDecoration = (g, tile, x, y) => {
  const variant = (x * y) % 3;
  
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

// ===========================================
// LAYER CREATION
// ===========================================

/**
 * Create sky gradient layer
 */
export const createSkyLayer = (container) => {
  const sky = new PIXI.Graphics();
  sky.label = 'sky';
  sky.zIndex = -10;
  container.addChild(sky);
};

/**
 * Create tile layer with pixel-perfect art
 */
export const createTileLayer = (container) => {
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

/**
 * Create animated water layer
 */
export const createWaterLayer = (container) => {
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

/**
 * Create decoration layer (trees, rocks, bushes)
 */
export const createDecorationLayer = (container) => {
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

/**
 * Update water animation
 */
export const updateWater = (container, waterTime, isNight) => {
  const waterLayer = container.getChildByLabel('water');
  if (!waterLayer) return;
  
  waterLayer.children.forEach(water => {
    water.clear();
    const phase = waterTime * 2 + water.phaseOffset;
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
      const sparkleX = 10 + ((water.tileX * 17 + Math.floor(waterTime)) % 20);
      const sparkleY = 10 + ((water.tileY * 13 + Math.floor(waterTime * 0.7)) % 20);
      water.circle(sparkleX, sparkleY, 2);
      water.fill({ color: 0xffffff, alpha: 0.6 });
    }
    
    // Lily pad with animation
    if (water.isLily) {
      const lilyWave = Math.sin(phase * 0.5) * 2;
      
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
};

/**
 * Update sky based on time of day
 */
export const updateSky = (container, timeOfDay) => {
  const sky = container.getChildByLabel('sky');
  if (!sky) return;
  
  sky.clear();
  const w = MAP_WIDTH * TILE_SIZE;
  const h = MAP_HEIGHT * TILE_SIZE;
  
  let skyColors;
  if (timeOfDay === 'night') {
    skyColors = [0x0a1628, 0x1a2a48];
  } else if (timeOfDay === 'dusk') {
    skyColors = [0xff7043, 0x5c6bc0];
  } else if (timeOfDay === 'dawn') {
    skyColors = [0xffcc80, 0x81d4fa];
  } else {
    skyColors = [0x87ceeb, 0x98d8c8];
  }
  
  sky.rect(0, 0, w, h);
  sky.fill(skyColors[0]);
};

