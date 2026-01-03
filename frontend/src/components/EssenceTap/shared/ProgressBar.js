/**
 * ProgressBar - Reusable progress bar components
 *
 * Used for experience bars, boss health, mastery progress, etc.
 */

import React from 'react';

/**
 * Basic progress bar
 * @param {Object} props
 * @param {number} props.value - Current value
 * @param {number} props.max - Maximum value
 * @param {string} props.color - Tailwind color class (e.g., 'purple', 'green', 'red')
 * @param {string} props.size - Size variant ('sm', 'md', 'lg')
 * @param {boolean} props.showLabel - Whether to show value label
 * @param {string} props.className - Additional CSS classes
 */
export function ProgressBar({
  value,
  max,
  color = 'purple',
  size = 'md',
  showLabel = false,
  className = ''
}) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{value.toLocaleString()}</span>
          <span className="text-gray-500">/ {max.toLocaleString()}</span>
        </div>
      )}
      <div className={`w-full ${sizeClasses[size]} bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${colorClasses[color] || color} transition-all duration-200`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Animated progress bar with glow effect
 * @param {Object} props
 * @param {number} props.value - Current value
 * @param {number} props.max - Maximum value
 * @param {string} props.color - Color theme
 * @param {boolean} props.animated - Whether to show animation
 */
export function AnimatedProgressBar({
  value,
  max,
  color = 'purple',
  animated = true,
  className = ''
}) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const colorStyles = {
    purple: {
      bar: 'bg-gradient-to-r from-purple-600 to-purple-400',
      glow: 'shadow-purple-500/50'
    },
    green: {
      bar: 'bg-gradient-to-r from-green-600 to-green-400',
      glow: 'shadow-green-500/50'
    },
    red: {
      bar: 'bg-gradient-to-r from-red-600 to-red-400',
      glow: 'shadow-red-500/50'
    },
    gold: {
      bar: 'bg-gradient-to-r from-yellow-600 to-yellow-400',
      glow: 'shadow-yellow-500/50'
    }
  };

  const style = colorStyles[color] || colorStyles.purple;

  return (
    <div className={`w-full h-2 bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${style.bar} ${animated ? 'animate-pulse' : ''} shadow-lg ${style.glow} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Segmented progress bar (for milestones, levels, etc.)
 * @param {Object} props
 * @param {number} props.current - Current segment
 * @param {number} props.total - Total segments
 * @param {string} props.color - Color theme
 */
export function SegmentedProgressBar({
  current,
  total,
  color = 'purple',
  className = ''
}) {
  const colorClasses = {
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    gold: 'bg-yellow-500'
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-2 rounded-full transition-colors duration-200 ${
            i < current ? colorClasses[color] || colorClasses.purple : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Circular progress indicator
 * @param {Object} props
 * @param {number} props.value - Current value (0-100)
 * @param {number} props.size - Size in pixels
 * @param {string} props.color - Stroke color
 */
export function CircularProgress({
  value,
  size = 40,
  color = '#a855f7',
  strokeWidth = 3,
  className = ''
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className={className}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#374151"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

export default ProgressBar;
