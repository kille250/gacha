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
    <GameContainer>
      <CanvasFrame>
        <CanvasWrapper ref={ref} />
        <CanvasCorner $position="tl" />
        <CanvasCorner $position="tr" />
        <CanvasCorner $position="bl" />
        <CanvasCorner $position="br" />
      </CanvasFrame>
    </GameContainer>
  );
});

FishingGameCanvas.displayName = 'FishingGameCanvas';

export default FishingGameCanvas;

