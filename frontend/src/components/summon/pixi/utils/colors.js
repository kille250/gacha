/**
 * Color Utilities
 *
 * Helper functions for color manipulation in Pixi.js.
 */

import { RARITY_COLORS } from '../constants';

/**
 * Get colors for a rarity level
 * @param {string} rarity - Rarity name
 * @returns {Object} Color palette
 */
export const getColorsForRarity = (rarity) => {
  const normalized = rarity?.toLowerCase() || 'common';
  return RARITY_COLORS[normalized] || RARITY_COLORS.common;
};

/**
 * Convert hex number to RGB object
 * @param {number} hex - Hex color number
 * @returns {Object} RGB object
 */
export const hexToRgb = (hex) => ({
  r: (hex >> 16) & 0xff,
  g: (hex >> 8) & 0xff,
  b: hex & 0xff,
});

/**
 * Convert RGB to hex number
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Hex color number
 */
export const rgbToHex = (r, g, b) => ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);

/**
 * Interpolate between two colors
 * @param {number} color1 - Start color (hex)
 * @param {number} color2 - End color (hex)
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated color
 */
export const lerpColor = (color1, color2, t) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  return rgbToHex(r, g, b);
};

/**
 * Lighten a color
 * @param {number} color - Hex color
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {number} Lightened color
 */
export const lighten = (color, amount) => {
  return lerpColor(color, 0xffffff, amount);
};

/**
 * Darken a color
 * @param {number} color - Hex color
 * @param {number} amount - Amount to darken (0-1)
 * @returns {number} Darkened color
 */
export const darken = (color, amount) => {
  return lerpColor(color, 0x000000, amount);
};

/**
 * Add alpha to a color (returns CSS string)
 * @param {number} color - Hex color
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA CSS string
 */
export const colorWithAlpha = (color, alpha) => {
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

/**
 * Get a gradient array between two colors
 * @param {number} color1 - Start color
 * @param {number} color2 - End color
 * @param {number} steps - Number of gradient steps
 * @returns {number[]} Array of gradient colors
 */
export const createGradient = (color1, color2, steps) => {
  const gradient = [];
  for (let i = 0; i < steps; i++) {
    gradient.push(lerpColor(color1, color2, i / (steps - 1)));
  }
  return gradient;
};

/**
 * Convert hex number to CSS hex string
 * @param {number} color - Hex color number
 * @returns {string} CSS hex string
 */
export const toHexString = (color) => {
  return '#' + color.toString(16).padStart(6, '0');
};

/**
 * Parse CSS hex string to number
 * @param {string} hexString - CSS hex string
 * @returns {number} Hex color number
 */
export const parseHexString = (hexString) => {
  return parseInt(hexString.replace('#', ''), 16);
};

/**
 * Get contrasting text color (black or white)
 * @param {number} bgColor - Background color
 * @returns {number} Contrasting color (black or white)
 */
export const getContrastColor = (bgColor) => {
  const rgb = hexToRgb(bgColor);
  // Using luminance formula
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? 0x000000 : 0xffffff;
};

/**
 * Saturate/desaturate a color
 * @param {number} color - Hex color
 * @param {number} amount - Amount (-1 to 1, negative = desaturate)
 * @returns {number} Modified color
 */
export const saturate = (color, amount) => {
  const rgb = hexToRgb(color);
  const gray = 0.2989 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;

  const r = Math.min(255, Math.max(0, Math.round(rgb.r + amount * (rgb.r - gray))));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g + amount * (rgb.g - gray))));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b + amount * (rgb.b - gray))));

  return rgbToHex(r, g, b);
};

const colorUtils = {
  getColorsForRarity,
  hexToRgb,
  rgbToHex,
  lerpColor,
  lighten,
  darken,
  colorWithAlpha,
  createGradient,
  toHexString,
  parseHexString,
  getContrastColor,
  saturate,
};

export default colorUtils;
