/**
 * CooldownTimer - Display a countdown timer for cooldowns
 *
 * Used for abilities, prestige cooldowns, gamble cooldowns, etc.
 */

import React, { useState, useEffect } from 'react';
import { formatTimeRemaining } from '../../../utils/essenceTap';

/**
 * Display a cooldown countdown
 * @param {Object} props
 * @param {number} props.remainingMs - Remaining time in milliseconds
 * @param {function} props.onComplete - Callback when cooldown completes
 * @param {string} props.label - Label to show (e.g., "Cooldown")
 * @param {boolean} props.showLabel - Whether to show the label
 * @param {string} props.className - Additional CSS classes
 */
export function CooldownTimer({
  remainingMs,
  onComplete,
  label = 'Cooldown',
  showLabel = true,
  className = ''
}) {
  const [remaining, setRemaining] = useState(remainingMs);

  useEffect(() => {
    setRemaining(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (remaining <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setInterval(() => {
      setRemaining(prev => {
        const newValue = prev - 1000;
        if (newValue <= 0 && onComplete) {
          onComplete();
        }
        return Math.max(0, newValue);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  if (remaining <= 0) {
    return (
      <span className={`text-green-400 ${className}`}>
        Ready
      </span>
    );
  }

  return (
    <span className={`text-gray-400 ${className}`}>
      {showLabel && `${label}: `}
      {formatTimeRemaining(remaining)}
    </span>
  );
}

/**
 * Display a cooldown with progress bar
 * @param {Object} props
 * @param {number} props.remainingMs - Remaining time in milliseconds
 * @param {number} props.totalMs - Total cooldown duration
 * @param {function} props.onComplete - Callback when cooldown completes
 * @param {string} props.label - Label to show
 */
export function CooldownBar({
  remainingMs,
  totalMs,
  onComplete,
  label = 'Cooldown'
}) {
  const [remaining, setRemaining] = useState(remainingMs);
  const progress = totalMs > 0 ? Math.max(0, (totalMs - remaining) / totalMs) : 1;

  useEffect(() => {
    setRemaining(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining(prev => {
        const newValue = prev - 100;
        if (newValue <= 0 && onComplete) {
          onComplete();
        }
        return Math.max(0, newValue);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <CooldownTimer remainingMs={remaining} showLabel={false} />
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

export default CooldownTimer;
