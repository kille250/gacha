/**
 * CurrencyDisplay - Consistent essence/currency display component
 *
 * Provides consistent formatting and styling for essence values across
 * all EssenceTap components.
 */

import React from 'react';
import { formatNumber } from '../../../utils/essenceTap';

/**
 * Display a formatted currency/essence value
 * @param {Object} props
 * @param {number} props.value - The value to display
 * @param {string} props.type - Type of currency ('essence', 'shards', 'fatePoints')
 * @param {boolean} props.showSign - Whether to show +/- sign
 * @param {boolean} props.animate - Whether to animate value changes
 * @param {string} props.size - Size variant ('sm', 'md', 'lg')
 * @param {string} props.className - Additional CSS classes
 */
export function CurrencyDisplay({
  value,
  type = 'essence',
  showSign = false,
  animate = false,
  size = 'md',
  className = ''
}) {
  const formattedValue = formatNumber(value);
  const sign = showSign && value > 0 ? '+' : '';

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-bold'
  };

  const typeClasses = {
    essence: 'text-purple-300',
    shards: 'text-amber-400',
    fatePoints: 'text-cyan-400'
  };

  return (
    <span
      className={`${sizeClasses[size]} ${typeClasses[type]} ${className} ${animate ? 'transition-all duration-200' : ''}`}
    >
      {sign}{formattedValue}
    </span>
  );
}

/**
 * Display essence with per-second rate
 * @param {Object} props
 * @param {number} props.current - Current essence
 * @param {number} props.perSecond - Production per second
 * @param {string} props.className - Additional CSS classes
 */
export function EssenceWithRate({ current, perSecond, className = '' }) {
  return (
    <div className={`flex flex-col items-end ${className}`}>
      <CurrencyDisplay value={current} size="lg" />
      {perSecond > 0 && (
        <span className="text-xs text-purple-400">
          +{formatNumber(perSecond)}/sec
        </span>
      )}
    </div>
  );
}

/**
 * Display a cost that may be affordable or not
 * @param {Object} props
 * @param {number} props.cost - The cost to display
 * @param {boolean} props.canAfford - Whether the player can afford it
 * @param {string} props.type - Type of currency
 */
export function CostDisplay({ cost, canAfford, type: _type = 'essence' }) {
  return (
    <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
      {formatNumber(cost)}
    </span>
  );
}

export default CurrencyDisplay;
