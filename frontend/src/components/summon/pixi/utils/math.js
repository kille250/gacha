/**
 * Math Utilities
 *
 * Vector, animation, and general math helpers.
 */

/**
 * Clamp a value between min and max
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Linear interpolation
 */
export const lerp = (start, end, t) => start + (end - start) * t;

/**
 * Map a value from one range to another
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Normalize a value to 0-1 range
 */
export const normalize = (value, min, max) => (value - min) / (max - min);

/**
 * Convert degrees to radians
 */
export const degToRad = (degrees) => degrees * (Math.PI / 180);

/**
 * Convert radians to degrees
 */
export const radToDeg = (radians) => radians * (180 / Math.PI);

/**
 * Get distance between two points
 */
export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Get angle between two points (in radians)
 */
export const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

/**
 * Get random value in range
 */
export const random = (min, max) => min + Math.random() * (max - min);

/**
 * Get random integer in range (inclusive)
 */
export const randomInt = (min, max) => Math.floor(random(min, max + 1));

/**
 * Get random item from array
 */
export const randomItem = (array) => array[Math.floor(Math.random() * array.length)];

/**
 * Generate random point within a circle
 */
export const randomPointInCircle = (centerX, centerY, radius) => {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: centerX + Math.cos(angle) * r,
    y: centerY + Math.sin(angle) * r,
  };
};

/**
 * Generate random point on circle edge
 */
export const randomPointOnCircle = (centerX, centerY, radius) => {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
};

/**
 * Smooth step interpolation
 */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Smoother step interpolation (Ken Perlin's version)
 */
export const smootherstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Oscillate between 0 and 1
 */
export const oscillate = (t, frequency = 1) => {
  return (Math.sin(t * frequency * Math.PI * 2) + 1) / 2;
};

/**
 * Create a 2D vector
 */
export const vec2 = (x = 0, y = 0) => ({ x, y });

/**
 * Add two vectors
 */
export const vec2Add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

/**
 * Subtract two vectors
 */
export const vec2Sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

/**
 * Scale a vector
 */
export const vec2Scale = (v, s) => ({ x: v.x * s, y: v.y * s });

/**
 * Get vector length
 */
export const vec2Length = (v) => Math.sqrt(v.x * v.x + v.y * v.y);

/**
 * Normalize a vector
 */
export const vec2Normalize = (v) => {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

/**
 * Rotate a vector
 */
export const vec2Rotate = (v, angle) => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
  y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});

/**
 * Dot product of two vectors
 */
export const vec2Dot = (a, b) => a.x * b.x + a.y * b.y;

/**
 * Lerp between two vectors
 */
export const vec2Lerp = (a, b, t) => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

/**
 * Check if a point is inside a rectangle
 */
export const pointInRect = (px, py, rx, ry, rw, rh) => {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
};

/**
 * Check if a point is inside a circle
 */
export const pointInCircle = (px, py, cx, cy, radius) => {
  return distance(px, py, cx, cy) <= radius;
};

/**
 * Wrap a value around a range
 */
export const wrap = (value, min, max) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

/**
 * Simple noise function (for variation, not true Perlin)
 */
export const simpleNoise = (x, y, seed = 0) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
};

const mathUtils = {
  clamp,
  lerp,
  mapRange,
  normalize,
  degToRad,
  radToDeg,
  distance,
  angleBetween,
  random,
  randomInt,
  randomItem,
  randomPointInCircle,
  randomPointOnCircle,
  smoothstep,
  smootherstep,
  oscillate,
  vec2,
  vec2Add,
  vec2Sub,
  vec2Scale,
  vec2Length,
  vec2Normalize,
  vec2Rotate,
  vec2Dot,
  vec2Lerp,
  pointInRect,
  pointInCircle,
  wrap,
  simpleNoise,
};

export default mathUtils;
