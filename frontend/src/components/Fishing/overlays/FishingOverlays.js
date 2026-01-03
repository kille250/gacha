/**
 * FishingOverlays Component
 * 
 * Extracted from FishingPage.js - All overlay prompts, indicators, and result popups.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { FaFish } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useRarity } from '../../../context/RarityContext';
import { GAME_STATES } from '../../../constants/fishingConstants';
import { IconFish, IconStarFilled, IconSparkleSymbol } from '../../../constants/icons';

import {
  FishPrompt,
  KeyHint,
  DesktopOnly,
  MobileOnly,
  StateIndicator,
  WaitingBubble,
  WaitingDots,
  WaitingText,
  CatchAlert,
  AlertIcon,
  CatchText,
  ResultPopup,
  ResultGlow,
  ResultEmoji,
  ResultInfo,
  ResultTitle,
  ResultFishName,
  ResultReward,
} from '../Fishing.styles';

/**
 * FishPromptOverlay - "Press SPACE to fish" prompt
 */
const FishPromptOverlay = ({ canFish, gameState, isAutofishing }) => {
  const { t } = useTranslation();

  if (!canFish || gameState !== GAME_STATES.WALKING || isAutofishing) {
    return null;
  }

  return (
    <FishPrompt
      initial={{ opacity: 0, y: 10, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 10, x: "-50%" }}
    >
      <DesktopOnly>
        {t('fishing.pressFishPrompt', { defaultValue: 'Press' })} <KeyHint>SPACE</KeyHint> {t('fishing.toFish', { defaultValue: 'to fish' })}
      </DesktopOnly>
      <MobileOnly>
        <FaFish style={{ marginRight: '8px' }} /> {t('fishing.tapToFish')}
      </MobileOnly>
    </FishPrompt>
  );
};

/**
 * WaitingIndicator - "Waiting for bite..." indicator
 */
const WaitingIndicator = () => {
  const { t } = useTranslation();

  return (
    <StateIndicator
      initial={{ opacity: 0, x: "-50%" }}
      animate={{ opacity: 1, x: "-50%" }}
      exit={{ opacity: 0, x: "-50%" }}
    >
      <WaitingBubble>
        <WaitingDots>...</WaitingDots>
        <WaitingText>{t('fishing.waitingForBite')}</WaitingText>
      </WaitingBubble>
    </StateIndicator>
  );
};

/**
 * CatchAlertIndicator - "!" catch alert
 */
const CatchAlertIndicator = () => {
  const { t } = useTranslation();

  return (
    <StateIndicator
      initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%" }}
      exit={{ opacity: 0, x: "-50%" }}
    >
      <CatchAlert>
        <AlertIcon>!</AlertIcon>
        <CatchText>{t('fishing.catchIt')}</CatchText>
      </CatchAlert>
    </StateIndicator>
  );
};

/**
 * ResultPopupOverlay - Success/failure result popup
 */
const ResultPopupOverlay = ({ lastResult }) => {
  const { t } = useTranslation();
  const { getRarityColor, getRarityGlow } = useRarity();

  if (!lastResult) return null;

  return (
    <ResultPopup
      initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
      exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
      $success={lastResult.success}
      $color={getRarityColor(lastResult.fish?.rarity)}
      $glow={getRarityGlow(lastResult.fish?.rarity)}
    >
      <ResultGlow $glow={getRarityGlow(lastResult.fish?.rarity)} />
      <ResultEmoji>{lastResult.fish?.emoji}</ResultEmoji>
      <ResultInfo>
        <ResultTitle $success={lastResult.success}>
          {lastResult.success ? t('fishing.caught') : t('fishing.escaped')}
        </ResultTitle>
        <ResultFishName $color={getRarityColor(lastResult.fish?.rarity)}>
          {lastResult.fish?.name}
        </ResultFishName>
        {lastResult.success && (
          <ResultReward $quality={lastResult.catchQuality}>
            +{lastResult.fishQuantity || 1} <IconFish />
            {lastResult.catchQuality === 'perfect' && <> <IconStarFilled /></>}
            {lastResult.catchQuality === 'great' && <> <IconSparkleSymbol /></>}
          </ResultReward>
        )}
      </ResultInfo>
    </ResultPopup>
  );
};

/**
 * FishingOverlays component
 * Container for all overlay elements positioned on the game canvas.
 * 
 * @param {Object} props
 * @param {string} props.gameState - Current game state
 * @param {boolean} props.canFish - Whether player can fish
 * @param {boolean} props.isAutofishing - Whether autofish is active
 * @param {Object} props.lastResult - Last fishing result
 */
export const FishingOverlays = ({
  gameState,
  canFish,
  isAutofishing,
  lastResult,
}) => {
  const isShowingResult = gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE;

  return (
    <>
      {/* Fish prompt */}
      <AnimatePresence>
        {canFish && gameState === GAME_STATES.WALKING && !isAutofishing && (
          <FishPromptOverlay 
            canFish={canFish} 
            gameState={gameState} 
            isAutofishing={isAutofishing} 
          />
        )}
      </AnimatePresence>

      {/* State indicator */}
      <AnimatePresence>
        {gameState === GAME_STATES.WAITING && <WaitingIndicator />}
        {gameState === GAME_STATES.FISH_APPEARED && <CatchAlertIndicator />}
      </AnimatePresence>

      {/* Result popup */}
      <AnimatePresence>
        {isShowingResult && lastResult && (
          <ResultPopupOverlay lastResult={lastResult} />
        )}
      </AnimatePresence>
    </>
  );
};

export default FishingOverlays;


