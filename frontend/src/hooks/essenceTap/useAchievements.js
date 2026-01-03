/**
 * useAchievements - Manages achievement tracking and notifications
 *
 * Tracks player statistics and checks for achievement unlocks.
 * Prevents duplicate achievement notifications by tracking shown achievements.
 */

import { useState, useRef, useCallback } from 'react';

// Achievement thresholds defined internally
const ACHIEVEMENT_THRESHOLDS = {
  firstClick: { totalClicks: 1 },
  thousandClicks: { totalClicks: 1000 },
  tenThousandClicks: { totalClicks: 10000 },
  firstGolden: { totalGolden: 1 },
  hundredGolden: { totalGolden: 100 },
  comboMaster: { maxCombo: 100 },
  critStreak: { maxCritStreak: 10 },
  firstGenerator: { totalGenerators: 1 },
  firstPrestige: { prestigeLevel: 1 },
};

const ACHIEVEMENT_DETAILS = {
  firstClick: {
    id: 'first_click',
    name: 'First Steps',
    description: 'Click for the first time',
    icon: 'tap',
    category: 'basics'
  },
  thousandClicks: {
    id: 'thousand_clicks',
    name: 'Dedicated Tapper',
    description: 'Click 1,000 times',
    icon: 'tap',
    category: 'clicks'
  },
  tenThousandClicks: {
    id: 'ten_thousand_clicks',
    name: 'Tireless Tapper',
    description: 'Click 10,000 times',
    icon: 'tap',
    category: 'clicks'
  },
  firstGolden: {
    id: 'first_golden',
    name: 'Golden Touch',
    description: 'Get a golden essence click',
    icon: 'golden',
    category: 'luck'
  },
  hundredGolden: {
    id: 'hundred_golden',
    name: 'Midas',
    description: 'Get 100 golden essence clicks',
    icon: 'golden',
    category: 'luck'
  },
  comboMaster: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Reach 100 click combo',
    icon: 'combo',
    category: 'skill'
  },
  critStreak: {
    id: 'crit_streak',
    name: 'Lucky Streak',
    description: '10 critical hits in a row',
    icon: 'crit',
    category: 'luck'
  },
  firstGenerator: {
    id: 'first_generator',
    name: 'Automation Begins',
    description: 'Purchase your first generator',
    icon: 'generator',
    category: 'generators'
  },
  firstPrestige: {
    id: 'first_prestige',
    name: 'Awakened',
    description: 'Prestige for the first time',
    icon: 'prestige',
    category: 'prestige'
  },
};

export const useAchievements = (playSoundEffect) => {
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);

  // Track achievement stats and shown achievements
  const achievementTrackingRef = useRef({
    totalClicks: 0,
    totalCrits: 0,
    totalGolden: 0,
    maxCombo: 0,
    critStreak: 0,
    maxCritStreak: 0,
    totalGenerators: 0,
    prestigeLevel: 0,
    assignedCharacters: 0,
    bossesDefeated: [],
    shownAchievements: new Set()
  });

  /**
   * Check for and trigger achievements based on stats
   * @param {Object} stats - Player stats to check
   */
  const checkAchievements = useCallback((stats) => {
    const tracking = achievementTrackingRef.current;
    const shown = tracking.shownAchievements;

    // Helper to unlock achievement - only shows if not already shown
    const unlock = (achievementId) => {
      if (!shown.has(achievementId) && ACHIEVEMENT_DETAILS[achievementId]) {
        shown.add(achievementId);
        setUnlockedAchievement({
          id: achievementId,
          ...ACHIEVEMENT_DETAILS[achievementId],
          timestamp: Date.now()
        });
        // Play sound effect if available
        if (playSoundEffect) {
          playSoundEffect();
        }
        return true;
      }
      return false;
    };

    // Check click-based achievements
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

    // Check generator achievements
    if (stats.totalGenerators >= 1) unlock('firstGenerator');

    // Check prestige achievements
    if (stats.prestigeLevel >= 1) unlock('firstPrestige');

    // Update tracking stats (shownAchievements is already updated via reference)
    achievementTrackingRef.current = { ...tracking, ...stats, shownAchievements: shown };
  }, [playSoundEffect]);

  /**
   * Dismiss the current achievement notification
   */
  const dismissAchievement = useCallback(() => {
    setUnlockedAchievement(null);
  }, []);

  /**
   * Initialize achievement tracking from game state
   * Prevents re-showing achievements that were already earned
   */
  const initializeTracking = useCallback((gameState) => {
    if (!gameState) return;

    const totalClicks = gameState.totalClicks || 0;
    const totalGolden = gameState.stats?.goldenEssenceClicks || 0;
    const totalGenerators = Object.values(gameState.generators || {}).reduce((a, b) => a + b, 0);
    const prestigeLevel = gameState.prestige?.level || 0;

    // Pre-populate shownAchievements based on current stats
    const shownAchievements = new Set();
    if (totalClicks >= 1) shownAchievements.add('firstClick');
    if (totalClicks >= 1000) shownAchievements.add('thousandClicks');
    if (totalClicks >= 10000) shownAchievements.add('tenThousandClicks');
    if (totalGolden >= 1) shownAchievements.add('firstGolden');
    if (totalGolden >= 100) shownAchievements.add('hundredGolden');
    if (totalGenerators >= 1) shownAchievements.add('firstGenerator');
    if (prestigeLevel >= 1) shownAchievements.add('firstPrestige');

    achievementTrackingRef.current = {
      totalClicks,
      totalCrits: gameState.totalCrits || 0,
      totalGolden,
      maxCombo: achievementTrackingRef.current.maxCombo || 0,
      critStreak: 0,
      maxCritStreak: achievementTrackingRef.current.maxCritStreak || 0,
      totalGenerators,
      prestigeLevel,
      assignedCharacters: gameState.assignedCharacters?.length || 0,
      bossesDefeated: gameState.bossEncounter?.totalDefeated || 0,
      shownAchievements
    };
  }, []);

  return {
    unlockedAchievement,
    achievementTrackingRef,
    checkAchievements,
    dismissAchievement,
    initializeTracking,
  };
};

export default useAchievements;
