/**
 * FishingAutofishBubbles Component
 * 
 * Extracted from FishingPage.js - Floating bubbles showing autofish results.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import {
  AutofishBubblesContainer,
  AutofishBubble,
  BubbleEmoji,
  BubbleContent,
  BubbleFishName,
  BubbleReward,
} from '../FishingStyles';

/**
 * FishingAutofishBubbles component
 * @param {Object} props
 * @param {Array} props.autofishLog - Array of autofish results
 */
export const FishingAutofishBubbles = ({ autofishLog }) => {
  const { t } = useTranslation();

  return (
    <AutofishBubblesContainer>
      <AnimatePresence>
        {autofishLog.map((entry) => (
          <AutofishBubble
            key={entry.timestamp}
            $success={entry.success}
            $rarity={entry.fish?.rarity}
            initial={{ opacity: 0, x: 80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <BubbleEmoji>{entry.fish?.emoji}</BubbleEmoji>
            <BubbleContent>
              <BubbleFishName>{entry.fish?.name}</BubbleFishName>
              <BubbleReward $success={entry.success}>
                {entry.success ? '+1 🐟' : t('fishing.escaped')}
              </BubbleReward>
            </BubbleContent>
          </AutofishBubble>
        ))}
      </AnimatePresence>
    </AutofishBubblesContainer>
  );
};

export default FishingAutofishBubbles;

