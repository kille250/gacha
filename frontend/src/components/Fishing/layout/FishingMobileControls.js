/**
 * FishingMobileControls Component
 * 
 * Extracted from FishingPage.js - D-pad and action button for mobile.
 */

import React from 'react';
import { MdKeyboardArrowUp, MdKeyboardArrowDown, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import { FaFish } from 'react-icons/fa';

import { GAME_STATES, DIRECTIONS } from '../../../constants/fishingConstants';

import {
  MobileControls,
  DPad,
  DPadCenter,
  DPadButton,
  ActionButton,
} from '../Fishing.styles';

/**
 * FishingMobileControls component
 * @param {Object} props
 * @param {string} props.gameState - Current game state
 * @param {boolean} props.canFish - Whether player can fish at current position
 * @param {boolean} props.isAutofishing - Whether autofish is active
 * @param {Object} props.lastResult - Last fishing result
 * @param {Function} props.onMove - Movement handler (dx, dy, direction)
 * @param {Function} props.onAction - Action button handler
 */
export const FishingMobileControls = ({
  gameState,
  canFish,
  isAutofishing,
  lastResult,
  onMove,
  onAction,
}) => {
  const handleMove = (dx, dy, dir) => {
    if (gameState === GAME_STATES.WALKING && !isAutofishing) {
      onMove(dx, dy, dir);
    }
  };

  const getActionButtonContent = () => {
    if (gameState === GAME_STATES.WALKING) {
      return canFish ? <FaFish /> : '•';
    }
    if (gameState === GAME_STATES.CASTING) {
      return '...';
    }
    if (gameState === GAME_STATES.WAITING) {
      return <FaFish />;
    }
    if (gameState === GAME_STATES.FISH_APPEARED) {
      return '!';
    }
    if (gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) {
      return lastResult?.success ? '✓' : '✗';
    }
    return '•';
  };

  return (
    <MobileControls>
      <DPad>
        <DPadCenter />
        <DPadButton onClick={() => handleMove(0, -1, DIRECTIONS.UP)} $position="up">
          <MdKeyboardArrowUp />
        </DPadButton>
        <DPadButton onClick={() => handleMove(-1, 0, DIRECTIONS.LEFT)} $position="left">
          <MdKeyboardArrowLeft />
        </DPadButton>
        <DPadButton onClick={() => handleMove(1, 0, DIRECTIONS.RIGHT)} $position="right">
          <MdKeyboardArrowRight />
        </DPadButton>
        <DPadButton onClick={() => handleMove(0, 1, DIRECTIONS.DOWN)} $position="down">
          <MdKeyboardArrowDown />
        </DPadButton>
      </DPad>
      
      <ActionButton
        onClick={onAction}
        disabled={!canFish && gameState === GAME_STATES.WALKING}
        $state={gameState}
        $canFish={canFish}
        whileTap={{ scale: 0.9 }}
      >
        {getActionButtonContent()}
      </ActionButton>
    </MobileControls>
  );
};

export default FishingMobileControls;

