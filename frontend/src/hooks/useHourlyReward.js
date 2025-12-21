/**
 * useHourlyReward - Extracted hourly reward timer logic from Navigation
 * 
 * Manages:
 * - Timer countdown to next reward
 * - Reward availability state
 * - Claiming rewards
 * - Popup state for celebration
 */
import { useState, useCallback, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { hasToken } from '../utils/authStorage';
import { theme } from '../styles/DesignSystem';

// ==================== CONSTANTS ====================

const REWARD_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds
// Use theme timing constants for consistent behavior across the app
const CLAIM_COOLDOWN_MS = theme.timing.claimCooldown;
const POPUP_DURATION_MS = theme.timing.notificationDismiss;
const RETRY_DELAY_MS = theme.timing.retryDelay;

// ==================== HOOK ====================

/**
 * Custom hook for managing hourly reward state and claiming
 * @param {Object} options - Hook configuration
 * @param {Function} options.onClaimSuccess - Callback when reward is successfully claimed
 * @returns {Object} Reward state and handlers
 */
export const useHourlyReward = ({ onClaimSuccess } = {}) => {
  const { user, refreshUser } = useContext(AuthContext);

  // ==================== STATE ====================

  const [rewardStatus, setRewardStatus] = useState({
    available: false,
    loading: true,
    timeRemaining: 'Checking...',
    nextRewardTime: null,
    checked: false
  });

  const [popup, setPopup] = useState({
    show: false,
    amount: 0
  });

  // Prevent race conditions on claim
  const [justClaimed, setJustClaimed] = useState(false);

  // ==================== HELPERS ====================

  /**
   * Format remaining time as "Xm Ys"
   */
  const formatTimeRemaining = useCallback((remainingMs) => {
    const minutes = Math.floor(remainingMs / (60 * 1000));
    const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    return `${minutes}m ${seconds}s`;
  }, []);

  /**
   * Process reward timing data and update state
   */
  const processRewardData = useCallback((lastRewardDate) => {
    if (justClaimed) return;

    const lastReward = lastRewardDate ? new Date(lastRewardDate) : null;
    const now = new Date();

    if (!lastReward || now - lastReward > REWARD_INTERVAL_MS) {
      // Reward is available
      setRewardStatus({
        available: true,
        loading: false,
        timeRemaining: null,
        nextRewardTime: null,
        checked: true
      });
    } else {
      // Calculate time until next reward
      const remainingTime = REWARD_INTERVAL_MS - (now - lastReward);
      const nextTime = new Date(lastReward.getTime() + REWARD_INTERVAL_MS);

      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: formatTimeRemaining(remainingTime),
        nextRewardTime: nextTime,
        checked: true
      });
    }
  }, [justClaimed, formatTimeRemaining]);

  // ==================== EFFECTS ====================

  /**
   * Check reward availability when user data changes
   */
  useEffect(() => {
    if (justClaimed) return;

    if (!user) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }

    if (!hasToken()) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }

    processRewardData(user.lastDailyReward);
  }, [user, user?.lastDailyReward, justClaimed, processRewardData]);

  /**
   * Update countdown timer every second
   */
  useEffect(() => {
    if (!rewardStatus.nextRewardTime) return;

    const updateTimer = () => {
      const now = new Date();
      const nextReward = new Date(rewardStatus.nextRewardTime);

      if (now >= nextReward) {
        // Timer finished - reward is now available
        setRewardStatus(prev => ({
          ...prev,
          available: true,
          timeRemaining: null,
          nextRewardTime: null
        }));
      } else {
        // Update remaining time display
        const remainingTime = nextReward - now;
        setRewardStatus(prev => ({
          ...prev,
          timeRemaining: formatTimeRemaining(remainingTime)
        }));
      }
    };

    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [rewardStatus.nextRewardTime, formatTimeRemaining]);

  // ==================== ACTIONS ====================

  /**
   * Force check reward availability (useful after errors)
   */
  const checkAvailability = useCallback(async () => {
    if (justClaimed || !user) return;

    if (!hasToken()) return;

    try {
      const response = await api.get('/auth/me');
      processRewardData(response.data.lastDailyReward);
    } catch (err) {
      console.error('Error checking reward availability:', err);
      setRewardStatus(prev => ({
        ...prev,
        loading: false,
        available: false,
        checked: true,
        timeRemaining: 'Check failed'
      }));
    }
  }, [user, justClaimed, processRewardData]);

  /**
   * Claim the hourly reward
   */
  const claim = useCallback(async () => {
    if (rewardStatus.loading || !rewardStatus.available || justClaimed) {
      return { success: false, error: 'Cannot claim now' };
    }

    setJustClaimed(true);
    setRewardStatus(prev => ({ ...prev, loading: true, available: false }));

    if (!hasToken()) {
      setJustClaimed(false);
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await api.post('/auth/daily-reward');
      const rewardAmount = response.data.rewardAmount;

      // Show success popup
      setPopup({ show: true, amount: rewardAmount });

      // Set next reward time
      const now = new Date();
      const nextRewardTime = new Date(now.getTime() + REWARD_INTERVAL_MS);

      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: '59m 59s',
        nextRewardTime,
        checked: true
      });

      // Refresh user data to sync points
      await refreshUser();

      // Clear claim lock after cooldown
      setTimeout(() => {
        setJustClaimed(false);
      }, CLAIM_COOLDOWN_MS);

      // Hide popup after duration
      setTimeout(() => {
        setPopup({ show: false, amount: 0 });
      }, POPUP_DURATION_MS);

      // Call success callback
      onClaimSuccess?.(rewardAmount);

      return { success: true, amount: rewardAmount };

    } catch (err) {
      console.error('Error claiming reward:', err);

      // Handle server-provided next reward time
      if (err.response?.data?.nextRewardTime) {
        const serverTime = err.response.data.nextRewardTime;
        setRewardStatus({
          available: false,
          loading: false,
          timeRemaining: `${serverTime.minutes}m ${serverTime.seconds}s`,
          nextRewardTime: new Date(serverTime.timestamp),
          checked: true
        });
      } else {
        setRewardStatus(prev => ({
          ...prev,
          loading: false,
          available: false
        }));

        // Retry availability check after delay
        setTimeout(checkAvailability, RETRY_DELAY_MS);
      }

      setJustClaimed(false);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to claim reward' 
      };
    }
  }, [rewardStatus.loading, rewardStatus.available, justClaimed, refreshUser, onClaimSuccess, checkAvailability]);

  /**
   * Dismiss the popup manually
   */
  const dismissPopup = useCallback(() => {
    setPopup({ show: false, amount: 0 });
  }, []);

  // ==================== RETURN ====================

  return {
    // Status
    available: rewardStatus.available && rewardStatus.checked,
    loading: rewardStatus.loading,
    checked: rewardStatus.checked,
    timeRemaining: rewardStatus.timeRemaining,

    // Popup
    showPopup: popup.show,
    popupAmount: popup.amount,
    dismissPopup,

    // Actions
    claim,
    checkAvailability,

    // Computed
    canClaim: rewardStatus.available && rewardStatus.checked && !rewardStatus.loading && !justClaimed
  };
};

export default useHourlyReward;

