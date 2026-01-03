/**
 * Fishing Player Module
 * 
 * Handles player sprite rendering for both local and remote players.
 * Extracted from FishingEngine.js for maintainability.
 */

import * as PIXI from 'pixi.js';

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Lighten a hex color
 */
export const lightenColor = (color, amount) => {
  const r = Math.min(255, ((color >> 16) & 0xFF) + 255 * amount);
  const g = Math.min(255, ((color >> 8) & 0xFF) + 255 * amount);
  const b = Math.min(255, (color & 0xFF) + 255 * amount);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
};

// ===========================================
// PLAYER SPRITE DRAWING
// ===========================================

/**
 * Draw a player sprite (for local and other players)
 * @param {PIXI.Graphics} g - Graphics object to draw to
 * @param {string} dir - Direction ('up', 'down', 'left', 'right')
 * @param {boolean} isFishing - Whether the player is fishing
 * @param {number} animFrame - Animation frame for bobbing
 * @param {Object} options - Additional options
 */
export const drawPlayerSprite = (g, dir, isFishing, animFrame, options = {}) => {
  g.clear();
  
  const { color, isOtherPlayer = false } = options;
  const bobOffset = Math.sin(animFrame * 3) * (isFishing ? 0.5 : 1.5);
  const breathe = Math.sin(animFrame * 2) * 0.5;
  
  // Shadow
  g.ellipse(20, 39, 10, 4);
  g.fill({ color: 0x000000, alpha: 0.25 });
  
  // Legs
  g.rect(12, 32 + bobOffset, 7, 8);
  g.rect(21, 32 + bobOffset, 7, 8);
  g.fill(0x5d4037);
  
  // Boots
  g.rect(11, 37 + bobOffset, 9, 4);
  g.rect(20, 37 + bobOffset, 9, 4);
  g.fill(0x3e2723);
  if (!isOtherPlayer) {
    // Boot highlights for local player
    g.rect(12, 37 + bobOffset, 3, 1);
    g.rect(21, 37 + bobOffset, 3, 1);
    g.fill(0x5d4037);
  }
  
  // Body - use custom color or fishing-based color
  const bodyColor = color || (isFishing ? 0x1565c0 : 0x558b2f);
  const bodyHighlight = color ? lightenColor(color, 0.15) : (isFishing ? 0x1976d2 : 0x689f38);
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
  
  // Hair
  g.roundRect(9, 0 + bobOffset, 22, 12, 6);
  g.fill(0x5d4037);
  g.roundRect(12, 2 + bobOffset, 6, 4, 2);
  g.roundRect(22, 3 + bobOffset, 4, 3, 2);
  g.fill(0x795548);
  
  // Face
  if (dir !== 'up') {
    const eyeOffset = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    
    // Eyes
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
    
    // Happy mouth (local player only, when not fishing)
    if (!isOtherPlayer && !isFishing) {
      g.moveTo(18, 17 + bobOffset);
      g.lineTo(20, 18 + bobOffset);
      g.lineTo(22, 17 + bobOffset);
      g.stroke({ width: 1, color: 0x795548 });
    }
  }
  
  // Hat
  g.ellipse(20, 5 + bobOffset, 14, 4);
  g.fill(0x8d6e63);
  g.roundRect(12, 0 + bobOffset, 16, 6, 2);
  g.fill(0xa1887f);
  // Hat band - use color for other players, default for local
  g.rect(12, 4 + bobOffset, 16, 2);
  g.fill(color || 0xffab91);
  
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

// ===========================================
// PLAYER LAYER CREATION
// ===========================================

/**
 * Create local player sprite
 */
export const createPlayer = (container, playerRef) => {
  const playerContainer = new PIXI.Container();
  playerContainer.label = 'player';
  playerContainer.zIndex = 100;
  
  const player = new PIXI.Graphics();
  drawPlayerSprite(player, 'down', false, 0);
  playerContainer.addChild(player);
  
  playerRef.current = playerContainer;
  container.addChild(playerContainer);
  container.sortableChildren = true;
};

/**
 * Create layer for other multiplayer players
 */
export const createOtherPlayersLayer = (container, otherPlayersContainerRef) => {
  const otherPlayersContainer = new PIXI.Container();
  otherPlayersContainer.label = 'otherPlayers';
  otherPlayersContainer.zIndex = 95; // Between decorations and local player
  otherPlayersContainer.sortableChildren = true;
  container.addChild(otherPlayersContainer);
  otherPlayersContainerRef.current = otherPlayersContainer;
};

/**
 * Update other players (multiplayer)
 */
export const updateOtherPlayers = (
  otherPlayersContainerRef,
  otherPlayersRef,
  otherPlayers,
  animFrame,
  TILE_SIZE
) => {
  if (!otherPlayersContainerRef.current) return;
  
  const container = otherPlayersContainerRef.current;
  const existingPlayerIds = new Set(otherPlayersRef.current.keys());
  const currentPlayerIds = new Set(otherPlayers.map(p => p.id));
  
  // Remove players who left
  existingPlayerIds.forEach(id => {
    if (!currentPlayerIds.has(id)) {
      const playerData = otherPlayersRef.current.get(id);
      if (playerData?.container) {
        container.removeChild(playerData.container);
      }
      otherPlayersRef.current.delete(id);
    }
  });
  
  // Update or create other players
  otherPlayers.forEach(playerData => {
    let playerInfo = otherPlayersRef.current.get(playerData.id);
    
    if (!playerInfo) {
      // Create new player container
      const playerContainer = new PIXI.Container();
      playerContainer.zIndex = playerData.y * 10; // Y-sorting
      
      const playerGfx = new PIXI.Graphics();
      playerContainer.addChild(playerGfx);
      
      // Create name tag
      const nameTag = new PIXI.Text({
        text: playerData.username || 'Player',
        style: {
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          fontWeight: '600',
          fill: 0xffffff,
          stroke: { color: 0x3e2723, width: 3 },
          align: 'center'
        }
      });
      nameTag.anchor.set(0.5, 1);
      nameTag.x = 20;
      nameTag.y = -5;
      playerContainer.addChild(nameTag);
      
      // Create state indicator (for fishing states)
      const stateIndicator = new PIXI.Graphics();
      stateIndicator.label = 'state';
      stateIndicator.visible = false;
      playerContainer.addChild(stateIndicator);
      
      // Create emote bubble
      const emoteBubble = new PIXI.Container();
      emoteBubble.label = 'emote';
      emoteBubble.visible = false;
      playerContainer.addChild(emoteBubble);
      
      container.addChild(playerContainer);
      
      playerInfo = {
        container: playerContainer,
        graphics: playerGfx,
        nameTag,
        stateIndicator,
        emoteBubble,
        visualPos: { x: playerData.x * TILE_SIZE, y: playerData.y * TILE_SIZE },
        color: playerData.color || 0x4ecdc4
      };
      otherPlayersRef.current.set(playerData.id, playerInfo);
    }
    
    // Update visual position (smooth interpolation)
    const targetX = playerData.x * TILE_SIZE;
    const targetY = playerData.y * TILE_SIZE;
    playerInfo.visualPos.x += (targetX - playerInfo.visualPos.x) * 0.15;
    playerInfo.visualPos.y += (targetY - playerInfo.visualPos.y) * 0.15;
    
    playerInfo.container.x = playerInfo.visualPos.x;
    playerInfo.container.y = playerInfo.visualPos.y;
    playerInfo.container.zIndex = playerData.y * 10;
    
    // Update player graphics
    const isFishing = playerData.state && playerData.state !== 'walking';
    drawPlayerSprite(
      playerInfo.graphics,
      playerData.direction || 'down',
      isFishing,
      animFrame,
      { color: playerInfo.color, isOtherPlayer: true }
    );
    
    // Update state indicator (exclamation for fish_appeared, etc.)
    const stateGfx = playerInfo.stateIndicator;
    stateGfx.clear();
    
    if (playerData.state === 'fish_appeared') {
      stateGfx.visible = true;
      const urgentBob = Math.sin(animFrame * 15) * 2;
      // Exclamation mark
      stateGfx.roundRect(16, -35 + urgentBob, 8, 18, 3);
      stateGfx.fill(0xff3333);
      stateGfx.circle(20, -12 + urgentBob, 3);
      stateGfx.fill(0xff3333);
    } else if (playerData.state === 'success' && playerData.lastFish) {
      stateGfx.visible = true;
      // Show caught fish emoji above head (using circle with color based on rarity)
      const rarityColors = {
        common: 0xa8b5a0,
        uncommon: 0x7cb342,
        rare: 0x42a5f5,
        epic: 0xab47bc,
        legendary: 0xffc107
      };
      stateGfx.circle(20, -25, 12);
      stateGfx.fill(rarityColors[playerData.lastFish.rarity] || 0x888888);
      stateGfx.circle(20, -25, 8);
      stateGfx.fill(0xffffff);
    } else if (playerData.state === 'waiting') {
      stateGfx.visible = true;
      // Dots above head
      const dotPhase = Math.floor(animFrame * 3) % 4;
      for (let i = 0; i < 3; i++) {
        const alpha = (i <= dotPhase) ? 0.8 : 0.3;
        stateGfx.circle(14 + i * 6, -20, 2);
        stateGfx.fill({ color: 0xffffff, alpha });
      }
    } else {
      stateGfx.visible = false;
    }
    
    // Handle emote display based on timestamp
    const emoteAge = playerData.emoteTime ? (Date.now() - playerData.emoteTime) / 1000 : 999;
    playerInfo.emoteBubble.visible = playerData.emote && emoteAge < 2;
  });
  
  // Sort children by zIndex for proper rendering
  container.sortChildren();
};


