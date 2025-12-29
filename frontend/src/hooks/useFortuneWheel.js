/**
 * useFortuneWheel - Custom hook for fortune wheel page state and logic
 *
 * Manages wheel status, spinning state, animations, and rewards.
 *
 * @returns {Object} Fortune wheel state and handlers
 */

import { useState, useEffect, useContext, useCallback, useRef } from 'react';

import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAutoDismissError } from '../hooks';
import {
  getFortuneWheelStatus,
  spinFortuneWheel
} from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';

// Spin animation duration (matches backend config)
const SPIN_DURATION_MS = 4000;

// Minimum wait before allowing another spin (prevent spam)
const SPIN_COOLDOWN_MS = 1000;

export const useFortuneWheel = () => {
  const { setUser } = useContext(AuthContext);
  const toast = useToast();

  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();

  // Unmount guard for async operations
  const isMountedRef = useRef(true);

  // Core state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Spinning state
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [showPrizePopup, setShowPrizePopup] = useState(false);

  // Animation state
  const [targetRotation, setTargetRotation] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);

  // Cooldown between spins
  const spinCooldownRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch wheel status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFortuneWheelStatus();

      if (!isMountedRef.current) return;

      setStatus(data);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch wheel status:', err);
      setError(err.response?.data?.error || 'Failed to load fortune wheel');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [setError]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Calculate target rotation for landing on specific segment
  const calculateTargetRotation = useCallback((segmentIndex, totalSegments, rotations = 5) => {
    // Each segment's angle
    const segmentAngle = 360 / totalSegments;

    // Calculate the angle to land in the middle of the target segment
    // Wheel spins clockwise, so we need to calculate from the pointer position (top)
    const targetAngle = segmentIndex * segmentAngle + (segmentAngle / 2);

    // Add multiple full rotations + the final angle
    // Subtract from 360 because we want to land AT the segment, not spin past it
    const finalRotation = (rotations * 360) + (360 - targetAngle);

    return finalRotation;
  }, []);

  // Handle spin action
  const handleSpin = useCallback(async () => {
    if (spinning || spinCooldownRef.current || !status?.canSpin) {
      return;
    }

    try {
      setSpinning(true);
      spinCooldownRef.current = true;
      setSpinResult(null);

      // Call API to get spin result
      const result = await spinFortuneWheel();

      if (!isMountedRef.current) return;

      if (!result.success) {
        setError(result.error || 'Spin failed');
        setSpinning(false);
        return;
      }

      // Calculate animation target
      const { animation } = result;
      const rotation = calculateTargetRotation(
        animation.targetIndex,
        animation.totalSegments,
        animation.rotations
      );

      // Store current rotation as base for new spin
      setCurrentRotation(prev => prev % 360);
      setTargetRotation(rotation);

      // Store result for display after animation
      setSpinResult(result);

      // Update user state with new currency values
      if (result.user) {
        setUser(prev => ({
          ...prev,
          points: result.user.points,
          rollTickets: result.user.rollTickets,
          premiumTickets: result.user.premiumTickets
        }));
      }

      // Invalidate currency-dependent caches
      invalidateFor(CACHE_ACTIONS.POINTS_CHANGED);
      invalidateFor(CACHE_ACTIONS.TICKETS_CHANGED);

      // Wait for animation to complete, then show prize popup
      setTimeout(() => {
        if (!isMountedRef.current) return;

        setSpinning(false);
        setShowPrizePopup(true);
        setCurrentRotation(rotation);

        // Update status with new state
        if (result.newState) {
          setStatus(prev => ({
            ...prev,
            ...result.newState
          }));
        }

        // Toast notification for rewards
        if (result.rewards?.isJackpot) {
          toast.success(`JACKPOT! +${result.rewards.points} points!`);
        } else if (result.rewards?.points > 0) {
          toast.success(`+${result.rewards.points} points`);
        } else if (result.rewards?.tickets > 0) {
          toast.success(`+${result.rewards.tickets} ticket(s)`);
        } else if (result.rewards?.premium > 0) {
          toast.success(`+${result.rewards.premium} premium ticket(s)`);
        } else if (result.rewards?.multiplier) {
          toast.success(`2x XP active for ${result.rewards.multiplier.duration} minutes!`);
        }

        // Cooldown before allowing next spin
        setTimeout(() => {
          spinCooldownRef.current = false;
        }, SPIN_COOLDOWN_MS);

      }, SPIN_DURATION_MS);

    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Spin error:', err);
      setError(err.response?.data?.error || 'Failed to spin wheel');
      setSpinning(false);
      spinCooldownRef.current = false;
    }
  }, [spinning, status?.canSpin, calculateTargetRotation, setUser, setError, toast]);

  // Close prize popup
  const closePrizePopup = useCallback(() => {
    setShowPrizePopup(false);
  }, []);

  // Calculate time until next spin
  const getTimeUntilNextSpin = useCallback(() => {
    if (!status?.nextSpinAt) return null;

    const nextSpin = new Date(status.nextSpinAt);
    const now = new Date();
    const diff = nextSpin - now;

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, total: diff };
  }, [status?.nextSpinAt]);

  // Format countdown display
  const formatCountdown = useCallback((time) => {
    if (!time) return null;
    return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;
  }, []);

  return {
    // Status
    status,
    loading,
    error,

    // Wheel config
    wheel: status?.wheel || null,
    segments: status?.wheel?.segments || [],

    // Spin state
    canSpin: status?.canSpin && !spinning,
    spinning,
    spinResult,

    // Animation
    currentRotation,
    targetRotation,
    spinDuration: SPIN_DURATION_MS,

    // Prize popup
    showPrizePopup,
    closePrizePopup,

    // Spin info
    freeSpins: status?.freeSpins || 0,
    bonusSpins: status?.bonusSpins || 0,
    remaining: status?.remaining || 0,
    currentStreak: status?.currentStreak || 0,
    totalSpins: status?.totalSpins || 0,
    jackpotsWon: status?.jackpotsWon || 0,

    // Time helpers
    nextSpinAt: status?.nextSpinAt,
    getTimeUntilNextSpin,
    formatCountdown,

    // Active multiplier
    activeMultiplier: status?.activeMultiplier,

    // History
    recentHistory: status?.recentHistory || [],

    // Actions
    handleSpin,
    refresh: fetchStatus
  };
};

export default useFortuneWheel;
