/**
 * Fishing Challenges Modal Hook
 * 
 * Handles challenge data fetching and claim operations.
 * Extracted from useFishingModals for better separation of concerns.
 * 
 * USAGE:
 * const challenges = useFishingChallengesModal({ setUser, showNotification });
 * challenges.claim(challengeId);
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { claimChallenge } from '../actions/fishingActions';
import { getFishingChallenges } from '../utils/api';

/**
 * Hook for managing fishing challenges modal operations
 * @param {Object} options - Configuration options
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.showNotification - Notification display function
 * @param {Function} options.onUpdate - Callback when challenges are updated
 * @returns {Object} Challenges state and controls
 */
export function useFishingChallengesModal({
  setUser,
  showNotification,
  onUpdate,
}) {
  const { t } = useTranslation();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState({});
  
  /**
   * Fetch challenges from server
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const challengesData = await getFishingChallenges();
      setData(challengesData);
      onUpdate?.(challengesData);
    } catch {
      // Silent fail - UI will show empty state
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);
  
  /**
   * Claim a challenge reward
   * @param {string} challengeId - ID of the challenge to claim
   */
  const claim = useCallback(async (challengeId) => {
    if (claiming[challengeId]) return;
    
    setClaiming(prev => ({ ...prev, [challengeId]: true }));
    
    try {
      const result = await claimChallenge(challengeId, setUser);
      showNotification(result.message, 'success');
      
      // Refresh challenges after claim
      const updatedChallenges = await getFishingChallenges();
      setData(updatedChallenges);
      onUpdate?.(updatedChallenges);
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.errors.claimFailed'), 'error');
    } finally {
      setClaiming(prev => ({ ...prev, [challengeId]: false }));
    }
  }, [claiming, setUser, showNotification, t, onUpdate]);
  
  return {
    data,
    setData,
    loading,
    claiming,
    fetchData,
    claim,
  };
}

export default useFishingChallengesModal;


