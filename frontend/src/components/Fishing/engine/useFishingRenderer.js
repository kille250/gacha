/**
 * Fishing Renderer Hook
 * 
 * Manages rendering layers and visual updates for the fishing game.
 * Handles player position interpolation and fishing element visibility.
 */

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';

import {
  TILE_SIZE,
  createSkyLayer,
  createTileLayer,
  createWaterLayer,
  createDecorationLayer,
  updateWater,
  updateSky,
} from './FishingMap';

import {
  drawPlayerSprite,
  createPlayer,
  createOtherPlayersLayer,
  updateOtherPlayers,
} from './FishingPlayer';

import {
  createCampfireLayer,
  createParticleLayer,
  createLightingLayer,
  updateCampfire,
  updateParticles,
  updateLighting,
  createFishSplash,
  getWaterTiles,
} from './FishingEffects';

/**
 * Manage rendering layers and updates
 * @param {Object} options - Renderer configuration
 * @param {Function} options.getApp - Getter for PIXI app
 * @param {Function} options.getContainer - Getter for main container
 * @param {boolean} options.isReady - Whether PIXI is initialized
 * @param {Object} options.playerPos - Player position { x, y }
 * @param {string} options.playerDir - Player direction
 * @param {boolean} options.isFishing - Whether player is fishing
 * @param {boolean} options.showBiteAlert - Whether fish has appeared
 * @param {string} options.timeOfDay - Current time period
 * @param {Array} options.otherPlayers - Multiplayer other players
 */
export function useFishingRenderer({
  getApp,
  getContainer,
  isReady,
  playerPos,
  playerDir,
  isFishing,
  showBiteAlert,
  timeOfDay,
  otherPlayers,
}) {
  // Refs for rendering state
  const playerRef = useRef(null);
  const particlesRef = useRef([]);
  const waterTimeRef = useRef(0);
  const bobberRef = useRef(null);
  const fishingLineRef = useRef(null);
  const animFrameRef = useRef(0);
  const fishJumpTimerRef = useRef(0);
  const visualPosRef = useRef({ x: playerPos.x, y: playerPos.y });
  const otherPlayersRef = useRef(new Map());
  const otherPlayersContainerRef = useRef(null);
  const waterTilesRef = useRef(null);
  const updateGameRef = useRef(null);
  const layersInitializedRef = useRef(false);
  
  // ===========================================
  // CREATE FISHING ELEMENTS (bobber, line)
  // ===========================================
  
  const createFishingElements = useCallback((container) => {
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
  }, []);
  
  // ===========================================
  // INITIALIZE LAYERS (triggered by isReady state)
  // ===========================================
  
  useEffect(() => {
    if (!isReady || layersInitializedRef.current) return;
    
    const container = getContainer();
    if (!container) return;
    
    // Create layers in order (back to front)
    createSkyLayer(container);
    createTileLayer(container);
    createWaterLayer(container);
    createDecorationLayer(container);
    createCampfireLayer(container, particlesRef);
    createOtherPlayersLayer(container, otherPlayersContainerRef);
    createPlayer(container, playerRef);
    createParticleLayer(container, particlesRef);
    createLightingLayer(container);
    createFishingElements(container);
    
    // Cache water tiles for fish splashes
    waterTilesRef.current = getWaterTiles();
    layersInitializedRef.current = true;
  }, [isReady, getContainer, createFishingElements]);
  
  // ===========================================
  // GAME LOOP UPDATE
  // ===========================================
  
  const updateGame = useCallback((dt) => {
    const container = getContainer();
    if (!container) return;
    
    waterTimeRef.current += dt;
    fishJumpTimerRef.current += dt;
    
    const isNight = timeOfDay === 'night';
    
    // Update visual layers
    updateSky(container, timeOfDay);
    updateWater(container, waterTimeRef.current, isNight);
    
    // Random fish jumping
    if (fishJumpTimerRef.current > 3 + Math.random() * 5) {
      fishJumpTimerRef.current = 0;
      if (waterTilesRef.current) {
        createFishSplash(particlesRef, waterTilesRef.current);
      }
    }
    
    // Update campfire animation
    updateCampfire(container, waterTimeRef.current);
    
    // Interpolate player position for smooth movement
    const targetX = playerPos.x * TILE_SIZE;
    const targetY = playerPos.y * TILE_SIZE;
    visualPosRef.current.x += (targetX - visualPosRef.current.x) * 0.2;
    visualPosRef.current.y += (targetY - visualPosRef.current.y) * 0.2;
    
    // Update player sprite
    if (playerRef.current) {
      playerRef.current.x = visualPosRef.current.x;
      playerRef.current.y = visualPosRef.current.y;
      
      const playerGfx = playerRef.current.children[0];
      if (playerGfx) {
        drawPlayerSprite(playerGfx, playerDir, isFishing, animFrameRef.current);
      }
    }
    
    // Update other players (multiplayer)
    updateOtherPlayers(
      otherPlayersContainerRef,
      otherPlayersRef,
      otherPlayers,
      animFrameRef.current,
      TILE_SIZE
    );
    
    // Update particles
    updateParticles(container, particlesRef, dt, timeOfDay);
    
    // Update lighting overlay
    updateLighting(container, timeOfDay, waterTimeRef.current);
  }, [getContainer, playerPos, playerDir, isFishing, timeOfDay, otherPlayers]);
  
  // Keep updateGame ref current
  useEffect(() => {
    updateGameRef.current = updateGame;
  }, [updateGame]);
  
  // ===========================================
  // CONNECT TO GAME LOOP (triggered by isReady state)
  // ===========================================
  
  useEffect(() => {
    if (!isReady) return;
    
    const app = getApp();
    if (!app) return;
    
    const onTick = (tickerObj) => {
      const dt = tickerObj.deltaTime / 60;
      animFrameRef.current += dt;
      updateGameRef.current?.(dt);
    };
    
    app.ticker.add(onTick);
    
    return () => {
      if (app?.ticker) {
        app.ticker.remove(onTick);
      }
    };
  }, [isReady, getApp]);
  
  // ===========================================
  // UPDATE FISHING ELEMENTS (bobber, line)
  // ===========================================
  
  useEffect(() => {
    if (!isReady) return;
    
    const container = getContainer();
    if (!container) return;
    
    const fishingContainer = container.getChildByLabel('fishing');
    if (!fishingContainer) return;
    
    fishingContainer.visible = isFishing;
    
    if (isFishing && bobberRef.current && fishingLineRef.current) {
      const px = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
      const py = playerPos.y * TILE_SIZE + TILE_SIZE / 2;
      
      let bobberX = px, bobberY = py;
      const dist = !showBiteAlert && isFishing ? 70 : 30;
      
      if (playerDir === 'down') bobberY += dist;
      else if (playerDir === 'up') bobberY -= dist;
      else if (playerDir === 'left') bobberX -= dist;
      else bobberX += dist;
      
      // Draw fishing line
      fishingLineRef.current.clear();
      fishingLineRef.current.moveTo(px + 12, py);
      fishingLineRef.current.lineTo(bobberX, bobberY);
      fishingLineRef.current.stroke({ width: 1, color: 0xeeeeee, alpha: 0.8 });
      
      // Draw bobber
      drawBobber(bobberRef.current, bobberX, bobberY, showBiteAlert);
    }
  }, [isReady, getContainer, isFishing, showBiteAlert, playerPos, playerDir]);
  
  return { playerRef, particlesRef };
}

/**
 * Draw the fishing bobber with ripples and alerts
 */
function drawBobber(bobber, bobberX, bobberY, showBiteAlert) {
  bobber.clear();
  
  const bobberWave = showBiteAlert 
    ? Math.sin(Date.now() / 80) * 6 
    : Math.sin(Date.now() / 400) * 2;
  
  // Bobber body
  bobber.ellipse(bobberX, bobberY + bobberWave, 7, 9);
  bobber.fill(0xff4444);
  bobber.rect(bobberX - 3, bobberY + bobberWave - 3, 6, 3);
  bobber.fill(0xffffff);
  
  // Bobber highlight
  bobber.circle(bobberX - 2, bobberY + bobberWave - 5, 2);
  bobber.fill({ color: 0xffffff, alpha: 0.5 });
  
  // Ripples in water
  const rippleAlpha = 0.3 + Math.sin(Date.now() / 300) * 0.1;
  bobber.circle(bobberX, bobberY + bobberWave + 5, 10 + Math.sin(Date.now() / 200) * 3);
  bobber.stroke({ width: 1, color: 0xffffff, alpha: rippleAlpha * 0.5 });
  bobber.circle(bobberX, bobberY + bobberWave + 5, 16 + Math.sin(Date.now() / 250) * 3);
  bobber.stroke({ width: 1, color: 0xffffff, alpha: rippleAlpha * 0.3 });
  
  // Exclamation mark when fish appears
  if (showBiteAlert) {
    const urgentBob = Math.sin(Date.now() / 60) * 3;
    
    // Big exclamation
    bobber.roundRect(bobberX - 4, bobberY - 45 + urgentBob, 8, 25, 4);
    bobber.fill(0xff3333);
    bobber.circle(bobberX, bobberY - 14 + urgentBob, 4);
    bobber.fill(0xff3333);
    
    // White inner
    bobber.roundRect(bobberX - 2, bobberY - 42 + urgentBob, 4, 18, 2);
    bobber.fill(0xffffff);
    bobber.circle(bobberX, bobberY - 14 + urgentBob, 2);
    bobber.fill(0xffffff);
    
    // Splash effect
    for (let i = 0; i < 4; i++) {
      const angle = (Date.now() / 100 + i * Math.PI / 2) % (Math.PI * 2);
      const splashX = bobberX + Math.cos(angle) * 20;
      const splashY = bobberY + bobberWave + 5 + Math.sin(angle) * 8;
      bobber.circle(splashX, splashY, 3);
      bobber.fill({ color: 0xb3e5fc, alpha: 0.6 });
    }
  }
}

export default useFishingRenderer;
