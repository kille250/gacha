/**
 * useCountdown - Hook for countdown timer display
 *
 * @param {Date|null} targetDate - Target date for countdown
 * @returns {string|null} Formatted countdown string or null if no target
 *
 * @example
 * const countdown = useCountdown(new Date('2024-12-31T23:59:59'));
 * // Returns: "2d 5h 30m" or "45m 30s" or null
 */

import { useState, useEffect, useCallback } from 'react';

const useCountdown = (targetDate) => {
  const calculateTimeLeft = useCallback(() => {
    if (!targetDate) return null;

    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) return null;

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Format based on remaining time
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null);
      return;
    }

    // Update immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Stop timer when countdown reaches zero
      if (newTimeLeft === null) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, calculateTimeLeft]);

  return timeLeft;
};

export { useCountdown };
export default useCountdown;
