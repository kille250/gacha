/**
 * Fishing Notifications Hook
 * 
 * Centralizes notification logic for the fishing minigame.
 * Provides unified formatting for challenge completions and other notifications.
 * 
 * USAGE:
 * const { showNotification, notification, formatChallengeReward } = useFishingNotifications();
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../design-system';

/**
 * Format challenge reward for display
 * @param {Object} challenge - Challenge with reward object
 * @returns {string} Formatted reward string
 */
export function formatChallengeReward(challenge) {
  const rewardParts = [];
  if (challenge.reward?.points) rewardParts.push(`${challenge.reward.points} points`);
  if (challenge.reward?.rollTickets) rewardParts.push(`${challenge.reward.rollTickets} 🎟️`);
  if (challenge.reward?.premiumTickets) rewardParts.push(`${challenge.reward.premiumTickets} 🌟`);
  return rewardParts.length > 0 ? ` +${rewardParts.join(', ')}` : '';
}

/**
 * Hook for managing fishing notifications
 * @returns {Object} Notification state and controls
 */
export function useFishingNotifications() {
  const { t } = useTranslation();
  const [notification, setNotification] = useState(null);
  
  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} type - Notification type ('info', 'success', 'error')
   */
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), theme.timing.notificationDismiss);
  }, []);
  
  /**
   * Show notifications for completed challenges
   * @param {Array} challenges - Array of completed challenge objects
   */
  const notifyChallengesCompleted = useCallback((challenges) => {
    if (!challenges?.length) return;
    
    challenges.forEach(ch => {
      const rewardStr = formatChallengeReward(ch);
      const challengeName = t(`fishing.challengeNames.${ch.id}`) || ch.id;
      showNotification(`🏆 ${t('fishing.challengeComplete')}: ${challengeName}${rewardStr}`, 'success');
    });
  }, [t, showNotification]);
  
  /**
   * Clear current notification
   */
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);
  
  return {
    notification,
    showNotification,
    notifyChallengesCompleted,
    clearNotification,
    formatChallengeReward,
  };
}

export default useFishingNotifications;

