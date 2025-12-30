/**
 * Easing Functions
 *
 * Custom easing functions for smooth animations.
 */

/**
 * Linear easing (no easing)
 */
export const linear = (t) => t;

/**
 * Ease out quad - decelerating to zero velocity
 */
export const easeOutQuad = (t) => t * (2 - t);

/**
 * Ease in quad - accelerating from zero velocity
 */
export const easeInQuad = (t) => t * t;

/**
 * Ease in out quad - acceleration until halfway, then deceleration
 */
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/**
 * Ease out cubic - decelerating to zero velocity (stronger)
 */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Ease in cubic - accelerating from zero velocity (stronger)
 */
export const easeInCubic = (t) => t * t * t;

/**
 * Ease in out cubic
 */
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Ease out quart - even stronger deceleration
 */
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

/**
 * Ease out expo - exponential deceleration
 */
export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Ease in expo - exponential acceleration
 */
export const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));

/**
 * Ease out back - overshoot then settle
 */
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Ease out elastic - elastic overshoot
 */
export const easeOutElastic = (t) => {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/**
 * Ease in out elastic
 */
export const easeInOutElastic = (t) => {
  if (t === 0 || t === 1) return t;
  const c5 = (2 * Math.PI) / 4.5;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
};

/**
 * Bounce out - bouncing effect at the end
 */
export const easeOutBounce = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

/**
 * Custom spring easing
 */
export const spring = (t, damping = 0.5, stiffness = 100) => {
  const omega = Math.sqrt(stiffness);
  const zeta = damping;
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * Math.cos(omegaD * t);
  }
  return 1 - (1 + omega * t) * Math.exp(-omega * t);
};

/**
 * Anticipation easing - slight pullback before forward motion
 */
export const anticipate = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

/**
 * Create a custom bezier easing function
 */
export const bezier = (x1, y1, x2, y2) => {
  // Simplified cubic bezier - for more accuracy use a proper library
  return (t) => {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;

    // Newton-Raphson iteration to find t for given x
    let guessT = t;
    for (let i = 0; i < 4; i++) {
      const currentX = sampleX(guessT) - t;
      if (Math.abs(currentX) < 0.001) break;
      const currentSlope = (3 * ax * guessT + 2 * bx) * guessT + cx;
      if (Math.abs(currentSlope) < 0.000001) break;
      guessT -= currentX / currentSlope;
    }

    return sampleY(guessT);
  };
};

const easingFunctions = {
  linear,
  easeOutQuad,
  easeInQuad,
  easeInOutQuad,
  easeOutCubic,
  easeInCubic,
  easeInOutCubic,
  easeOutQuart,
  easeOutExpo,
  easeInExpo,
  easeOutBack,
  easeOutElastic,
  easeInOutElastic,
  easeOutBounce,
  spring,
  anticipate,
  bezier,
};

export default easingFunctions;
