/**
 * useEssenceTapAchievements - Achievement tracking hook
 *
 * Manages achievement tracking, checking, and notifications for Essence Tap.
 *
 * Features:
 * - Tracks achievement progress (clicks, golden essence, combos, crits, etc.)
 * - Checks for newly unlocked achievements
 * - Displays achievement notifications
 * - Prevents duplicate achievement notifications
 * - Initializes from server state to avoid re-triggering
 *
 * @param {Object} options - Hook options
 * @param {function} options.playSound - Sound effect callback for achievements
 * @returns {Object} Achievement state and handlers
 */

import { useState, useCallback, useRef } from 'react';
import { ACHIEVEMENTS } from '../../config/essenceTapConfig';

/**
 * Achievement tracking hook for Essence Tap
 * @param {Object} options - Hook options
 * @param {function} options.playSound - Sound effect callback
 * @returns {Object} Achievement state and handlers
 */
export function useEssenceTapAchievements(options = {}) {
  const { playSound } = options;

  // Achievement notification state
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);

  // Tracking ref
  const trackingRef = useRef({
    totalClicks: 0,
    totalCrits: 0,
    totalGolden: 0,
    maxCombo: 0,
    critStreak: 0,
    maxCritStreak: 0,
    totalGenerators: 0,
    prestigeLevel: 0,
    assignedCharacters: 0,
    bossesDefeated: 0,
    shownAchievements: new Set()
  });

  /**
   * Initialize tracking from server state
   * @param {Object} serverState - Server state
   */
  const initializeFromState = useCallback((serverState) => {
    const totalClicks = serverState.totalClicks || 0;
    const totalGolden = serverState.stats?.goldenEssenceClicks || 0;
    const totalGenerators = Object.values(serverState.generators || {}).reduce((a, b) => a + b, 0);
    const prestigeLevel = serverState.prestige?.level || 0;

    // Pre-populate shown achievements based on current stats
    const shownAchievements = new Set();
    if (totalClicks >= 1) shownAchievements.add('firstClick');
    if (totalClicks >= 1000) shownAchievements.add('thousandClicks');
    if (totalClicks >= 10000) shownAchievements.add('tenThousandClicks');
    if (totalGolden >= 1) shownAchievements.add('firstGolden');
    if (totalGolden >= 100) shownAchievements.add('hundredGolden');
    if (totalGenerators >= 1) shownAchievements.add('firstGenerator');
    if (prestigeLevel >= 1) shownAchievements.add('firstPrestige');

    trackingRef.current = {
      totalClicks,
      totalCrits: serverState.totalCrits || 0,
      totalGolden,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      totalGenerators,
      prestigeLevel,
      assignedCharacters: serverState.assignedCharacters?.length || 0,
      bossesDefeated: serverState.bossEncounter?.totalDefeated || 0,
      shownAchievements
    };
  }, []);

  /**
   * Check and trigger achievements
   * @param {Object} stats - Updated stats
   */
  const checkAchievements = useCallback((stats) => {
    const tracking = trackingRef.current;
    const shown = tracking.shownAchievements;

    const unlock = (achievementId) => {
      if (!shown.has(achievementId) && ACHIEVEMENTS[achievementId]) {
        shown.add(achievementId);
        setUnlockedAchievement({
          id: achievementId,
          ...ACHIEVEMENTS[achievementId],
          timestamp: Date.now()
        });
        if (playSound) {
          playSound();
        }
        return true;
      }
      return false;
    };

    // Check click achievements
    if (stats.totalClicks >= 1) unlock('firstClick');
    if (stats.totalClicks >= 1000) unlock('thousandClicks');
    if (stats.totalClicks >= 10000) unlock('tenThousandClicks');

    // Check golden essence achievements
    if (stats.totalGolden >= 1) unlock('firstGolden');
    if (stats.totalGolden >= 100) unlock('hundredGolden');

    // Check combo achievements
    if (stats.maxCombo >= 100) unlock('comboMaster');

    // Check crit streak achievements
    if (stats.maxCritStreak >= 10) unlock('critStreak');

    // Update tracking
    trackingRef.current = { ...tracking, ...stats, shownAchievements: shown };
  }, [playSound]);

  /**
   * Dismiss achievement notification
   */
  const dismissAchievement = useCallback(() => {
    setUnlockedAchievement(null);
  }, []);

  /**
   * Get all achievements with unlock status
   */
  const getAllAchievements = useCallback(() => {
    const shown = trackingRef.current.shownAchievements;
    return Object.entries(ACHIEVEMENTS).map(([id, achievement]) => ({
      id,
      ...achievement,
      unlocked: shown.has(id)
    }));
  }, []);

  /**
   * Get unlocked achievement count
   */
  const getUnlockedCount = useCallback(() => {
    return trackingRef.current.shownAchievements.size;
  }, []);

  return {
    // State
    unlockedAchievement,

    // Handlers
    initializeFromState,
    checkAchievements,
    dismissAchievement,
    getAllAchievements,
    getUnlockedCount
  };
}

export default useEssenceTapAchievements;
