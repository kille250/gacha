/**
 * PixiOverlayProvider
 *
 * Provides a Pixi.js canvas overlay for particle effects and game graphics.
 * The overlay sits on top of the DOM and can be used for visual effects
 * without interfering with normal UI interactions.
 */

import React, { createContext, useContext, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Application, Container } from 'pixi.js';

const PixiOverlayContext = createContext(null);

// Configuration
const CONFIG = {
  CANVAS_ID: 'pixi-effects-overlay',
  Z_INDEX: 99997, // Below flash overlay (99998) and summon animation (99999)
  BACKGROUND_ALPHA: 0, // Transparent
  RESOLUTION: window.devicePixelRatio || 1
};

export const PixiOverlayProvider = ({ children }) => {
  const appRef = useRef(null);
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const effectsContainerRef = useRef(null);
  const activeEffectsRef = useRef(new Set());

  // Check for reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Initialize Pixi application
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let canvas = document.getElementById(CONFIG.CANVAS_ID);

    // Create canvas if it doesn't exist
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = CONFIG.CANVAS_ID;
      canvas.style.cssText = `
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: ${CONFIG.Z_INDEX};
      `;
      document.body.appendChild(canvas);
    }

    canvasRef.current = canvas;

    // Initialize Pixi Application
    const initApp = async () => {
      try {
        const app = new Application();

        await app.init({
          canvas,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundAlpha: CONFIG.BACKGROUND_ALPHA,
          resolution: CONFIG.RESOLUTION,
          autoDensity: true,
          antialias: false, // Better performance
          powerPreference: 'high-performance'
        });

        appRef.current = app;

        // Create main effects container
        const effectsContainer = new Container();
        effectsContainer.label = 'effects';
        app.stage.addChild(effectsContainer);
        effectsContainerRef.current = effectsContainer;

        setIsReady(true);

        // Handle resize
        const handleResize = () => {
          if (appRef.current) {
            appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.warn('PixiOverlay: Failed to initialize', error);
      }
    };

    initApp();

    return () => {
      // Cleanup
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }

      // Don't remove canvas - might be reused
    };
  }, []);

  /**
   * Get the Pixi application instance
   */
  const getApp = useCallback(() => appRef.current, []);

  /**
   * Get the main effects container
   */
  const getEffectsContainer = useCallback(() => effectsContainerRef.current, []);

  /**
   * Add a display object to the effects layer
   */
  const addToEffects = useCallback((displayObject) => {
    if (effectsContainerRef.current && displayObject) {
      effectsContainerRef.current.addChild(displayObject);
      activeEffectsRef.current.add(displayObject);
      return displayObject;
    }
    return null;
  }, []);

  /**
   * Remove a display object from the effects layer
   */
  const removeFromEffects = useCallback((displayObject) => {
    if (effectsContainerRef.current && displayObject) {
      effectsContainerRef.current.removeChild(displayObject);
      activeEffectsRef.current.delete(displayObject);

      // Destroy if it has a destroy method
      if (displayObject.destroy) {
        displayObject.destroy({ children: true });
      }
    }
  }, []);

  /**
   * Clear all effects
   */
  const clearEffects = useCallback(() => {
    if (effectsContainerRef.current) {
      // Destroy all children
      while (effectsContainerRef.current.children.length > 0) {
        const child = effectsContainerRef.current.children[0];
        effectsContainerRef.current.removeChild(child);
        if (child.destroy) {
          child.destroy({ children: true });
        }
      }
      activeEffectsRef.current.clear();
    }
  }, []);

  /**
   * Get canvas dimensions
   */
  const getDimensions = useCallback(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2
    };
  }, []);

  /**
   * Show the overlay canvas
   */
  const show = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.style.display = 'block';
    }
  }, []);

  /**
   * Hide the overlay canvas
   */
  const hide = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.style.display = 'none';
    }
  }, []);

  /**
   * Set overlay visibility
   */
  const setVisible = useCallback((visible) => {
    if (visible) {
      show();
    } else {
      hide();
    }
  }, [show, hide]);

  const value = useMemo(() => ({
    isReady,
    prefersReducedMotion,
    getApp,
    getEffectsContainer,
    addToEffects,
    removeFromEffects,
    clearEffects,
    getDimensions,
    show,
    hide,
    setVisible
  }), [
    isReady,
    prefersReducedMotion,
    getApp,
    getEffectsContainer,
    addToEffects,
    removeFromEffects,
    clearEffects,
    getDimensions,
    show,
    hide,
    setVisible
  ]);

  return (
    <PixiOverlayContext.Provider value={value}>
      {children}
    </PixiOverlayContext.Provider>
  );
};

export const usePixiOverlay = () => {
  const context = useContext(PixiOverlayContext);

  if (!context) {
    // Return no-op functions if provider not available
    return {
      isReady: false,
      prefersReducedMotion: false,
      getApp: () => null,
      getEffectsContainer: () => null,
      addToEffects: () => null,
      removeFromEffects: () => {},
      clearEffects: () => {},
      getDimensions: () => ({ width: 0, height: 0, centerX: 0, centerY: 0 }),
      show: () => {},
      hide: () => {},
      setVisible: () => {}
    };
  }

  return context;
};

export default PixiOverlayProvider;
