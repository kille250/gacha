/**
 * PIXI Application Hook
 * 
 * Handles PIXI.js application initialization and cleanup.
 * Separated from game logic for cleaner architecture.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from './FishingMap';

/**
 * Initialize and manage a PIXI.js application
 * @param {React.RefObject} containerRef - Container DOM element ref
 * @returns {{ app: PIXI.Application|null, container: PIXI.Container|null, isReady: boolean }}
 */
export function usePixiApp(containerRef) {
  const appRef = useRef(null);
  const containerObjRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  
  // Stable getter for current app (avoids stale closures)
  const getApp = useCallback(() => appRef.current, []);
  const getContainer = useCallback(() => containerObjRef.current, []);
  
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;
    
    let mounted = true;
    
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
      
      if (!mounted) {
        app.destroy(true);
        return;
      }
      
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;
      
      // Create main container
      const mainContainer = new PIXI.Container();
      mainContainer.sortableChildren = true;
      app.stage.addChild(mainContainer);
      containerObjRef.current = mainContainer;
      
      // Signal that PIXI is ready
      setIsReady(true);
    };
    
    initApp();
    
    return () => {
      mounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        containerObjRef.current = null;
        setIsReady(false);
      }
    };
  }, [containerRef]);
  
  return { 
    getApp, 
    getContainer, 
    isReady,
  };
}

export default usePixiApp;
