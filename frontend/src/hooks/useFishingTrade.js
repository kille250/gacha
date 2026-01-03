/**
 * Fishing Trade Hook
 * 
 * Handles trading post logic - trade execution, loading states, and results.
 * Extracted from useFishingModals for better separation of concerns.
 * 
 * USAGE:
 * const trade = useFishingTrade({ setUser, showNotification, refreshUser });
 * trade.execute(tradeId);
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useActionLock } from './useActionLock';
import { executeFishTrade } from '../actions/fishingActions';
import { getTradingPostOptions } from '../utils/api';
import { theme } from '../design-system';

/**
 * Trade timeout duration in milliseconds
 * Prevents UI from getting stuck if server is slow
 */
const TRADE_TIMEOUT_MS = 35000;

/**
 * Error messages for trade failures
 */
const getTradeErrorMessage = (errorCode, t) => {
  const errorMessages = {
    'TRADE_NOT_ENOUGH_FISH': t('fishing.errors.notEnoughFish') || 'Not enough fish for this trade',
    'TRADE_NOT_FOUND': t('fishing.errors.tradeNotFound') || 'Trade option not found',
    'DAILY_LIMIT_REACHED': t('fishing.errors.dailyLimitReached') || 'Daily limit reached for this reward',
    'TRADE_TIMEOUT': t('fishing.errors.tradeTimeout') || 'Trade timed out, please try again'
  };
  return errorMessages[errorCode] || t('fishing.tradeFailed');
};

/**
 * Hook for managing fishing trade operations
 * @param {Object} options - Configuration options
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.showNotification - Notification display function
 * @param {Function} options.refreshUser - Refresh user data function
 * @param {Function} options.onChallengesCompleted - Callback when challenges complete
 * @returns {Object} Trade state and controls
 */
export function useFishingTrade({
  setUser,
  showNotification,
  refreshUser,
  onChallengesCompleted,
}) {
  const { t } = useTranslation();
  const { withLock } = useActionLock(300);
  
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  /**
   * Fetch trading options from server
   */
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradingPostOptions();
      setOptions(data);
    } catch {
      // Silent fail - UI will show empty state
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Execute a trade with timeout protection
   * @param {string} tradeId - ID of the trade to execute
   */
  const execute = useCallback(async (tradeId) => {
    await withLock(async () => {
      try {
        setLoading(true);
        
        // Race against timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TRADE_TIMEOUT')), TRADE_TIMEOUT_MS)
        );
        
        const tradeResult = await Promise.race([
          executeFishTrade(tradeId, 1, setUser),
          timeoutPromise
        ]);
        
        setResult(tradeResult);
        showNotification(tradeResult.message, 'success');
        
        // Refresh options after trade
        const newOptions = await getTradingPostOptions();
        setOptions(newOptions);
        
        // Handle challenge completions
        if (tradeResult.challengesCompleted?.length > 0) {
          onChallengesCompleted?.(tradeResult.challengesCompleted);
        }
        
        // Auto-clear result after delay
        setTimeout(() => setResult(null), theme.timing.tradeResultDismiss);
        
      } catch (err) {
        const errorCode = err.response?.data?.error || err.message;
        showNotification(getTradeErrorMessage(errorCode, t), 'error');
        
        // Refresh options and user on error
        const [newOptions] = await Promise.all([
          getTradingPostOptions(),
          refreshUser()
        ]);
        setOptions(newOptions);
      } finally {
        setLoading(false);
      }
    });
  }, [setUser, showNotification, refreshUser, onChallengesCompleted, t, withLock]);
  
  /**
   * Clear trade result
   */
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);
  
  return {
    options,
    setOptions,
    loading,
    result,
    fetchOptions,
    execute,
    clearResult,
  };
}

export default useFishingTrade;


