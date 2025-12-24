/**
 * Rarity Utilities
 *
 * Helper functions for rarity-based styling.
 */

import { theme } from '../tokens';

export const getRarityColor = (rarity) =>
  theme.colors.rarity[rarity] || theme.colors.rarity.common;

export const getRarityGlow = (rarity) => {
  const color = getRarityColor(rarity);
  return `0 0 20px ${color}50, 0 0 40px ${color}30`;
};
