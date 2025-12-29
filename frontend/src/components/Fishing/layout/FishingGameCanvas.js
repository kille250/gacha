/**
 * FishingGameCanvas Component
 * 
 * Extracted from FishingPage.js - Canvas wrapper with decorative frame.
 */

import React, { forwardRef } from 'react';

import {
  GameContainer,
  CanvasFrame,
  CanvasWrapper,
  CanvasCorner,
} from '../Fishing.styles';

/**
 * FishingGameCanvas component
 * Wraps the PIXI.js canvas with decorative frame corners.
 */
export const FishingGameCanvas = forwardRef((props, ref) => {
  return (
    <GameContainer
      role="application"
      aria-label="Interactive fishing game - Use arrow keys or touch to move your character and catch fish"
      tabIndex={0}
    >
      <CanvasFrame>
        <CanvasWrapper ref={ref} aria-hidden="true" />
        <CanvasCorner $position="tl" aria-hidden="true" />
        <CanvasCorner $position="tr" aria-hidden="true" />
        <CanvasCorner $position="bl" aria-hidden="true" />
        <CanvasCorner $position="br" aria-hidden="true" />
      </CanvasFrame>
    </GameContainer>
  );
});

FishingGameCanvas.displayName = 'FishingGameCanvas';

export default FishingGameCanvas;

