/**
 * useAchievementNotifications - First-time achievement notification hook
 *
 * Displays celebratory notifications when players earn first-time achievement XP.
 * Works with the backend's firstTimeAchievements system.
 *
 * First-time achievements (v6.0):
 * - firstLegendaryFish: 200 XP
 * - firstEpicCharacter: 100 XP
 * - firstLegendaryCharacter: 300 XP
 * - firstPrestige: 500 XP
 * - firstMaxCharacter: 150 XP
 * - firstAreaUnlock: 50 XP
 * - firstPerfectStreak10: 75 XP
 * - firstWeeklyBonus: 100 XP
 *
 * @example
 * const { notifyAchievement, checkAndNotify } = useAchievementNotifications();
 *
 * // When backend returns achievement data
 * if (response.achievement) {
 *   notifyAchievement(response.achievement.type, response.achievement.xp);
 * }
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';

// Achievement metadata for display
// Note: Emojis here are intentional for toast notification display
/* eslint-disable no-restricted-syntax */
const ACHIEVEMENT_META = {
  firstLegendaryFish: {
    icon: '\u{1F41F}', // fish emoji
    titleKey: 'achievements.firstLegendaryFish.title',
    titleDefault: 'Legendary Catch!',
    descKey: 'achievements.firstLegendaryFish.desc',
    descDefault: 'You caught your first legendary fish!'
  },
  firstEpicCharacter: {
    icon: '\u2B50', // star emoji
    titleKey: 'achievements.firstEpicCharacter.title',
    titleDefault: 'Epic Summon!',
    descKey: 'achievements.firstEpicCharacter.desc',
    descDefault: 'You summoned your first epic character!'
  },
  firstLegendaryCharacter: {
    icon: '\u{1F451}', // crown emoji
    titleKey: 'achievements.firstLegendaryCharacter.title',
    titleDefault: 'Legendary Summon!',
    descKey: 'achievements.firstLegendaryCharacter.desc',
    descDefault: 'You summoned your first legendary character!'
  },
  firstPrestige: {
    icon: '\u{1F3C6}', // trophy emoji
    titleKey: 'achievements.firstPrestige.title',
    titleDefault: 'First Prestige!',
    descKey: 'achievements.firstPrestige.desc',
    descDefault: 'You reached your first prestige level!'
  },
  firstMaxCharacter: {
    icon: '\u{1F4AA}', // muscle emoji
    titleKey: 'achievements.firstMaxCharacter.title',
    titleDefault: 'Max Level Character!',
    descKey: 'achievements.firstMaxCharacter.desc',
    descDefault: 'You maxed out your first character!'
  },
  firstAreaUnlock: {
    icon: '\u{1F5FA}', // map emoji
    titleKey: 'achievements.firstAreaUnlock.title',
    titleDefault: 'New Territory!',
    descKey: 'achievements.firstAreaUnlock.desc',
    descDefault: 'You unlocked a new fishing area!'
  },
  firstPerfectStreak10: {
    icon: '\u{1F3AF}', // target emoji
    titleKey: 'achievements.firstPerfectStreak10.title',
    titleDefault: 'Perfect Streak!',
    descKey: 'achievements.firstPerfectStreak10.desc',
    descDefault: 'You achieved 10 perfect catches in a row!'
  },
  firstWeeklyBonus: {
    icon: '\u{1F4C5}', // calendar emoji
    titleKey: 'achievements.firstWeeklyBonus.title',
    titleDefault: 'Weekly Warrior!',
    descKey: 'achievements.firstWeeklyBonus.desc',
    descDefault: 'You completed all weekly mode requirements!'
  }
};
/* eslint-enable no-restricted-syntax */

export function useAchievementNotifications() {
  const { t } = useTranslation();
  const toast = useToast();

  /**
   * Show a notification for a first-time achievement
   * @param {string} achievementType - The achievement type from backend
   * @param {number} xpAwarded - XP awarded for this achievement
   */
  const notifyAchievement = useCallback((achievementType, xpAwarded) => {
    const meta = ACHIEVEMENT_META[achievementType];

    if (!meta) {
      // Unknown achievement type - show generic notification
      toast?.success?.(
        t('achievements.generic.title', 'Achievement Unlocked!'),
        t('achievements.generic.desc', '+{{xp}} XP bonus!', { xp: xpAwarded })
      );
      return;
    }

    const title = `${meta.icon} ${t(meta.titleKey, meta.titleDefault)}`;
    const description = `${t(meta.descKey, meta.descDefault)} +${xpAwarded} XP`;

    toast?.showToast?.({
      variant: 'success',
      title,
      description,
      duration: 6000, // Longer duration for achievements
      dismissible: true
    });
  }, [t, toast]);

  /**
   * Check API response for achievement data and notify if present
   * @param {Object} response - API response object
   * @returns {boolean} - Whether an achievement was notified
   */
  const checkAndNotify = useCallback((response) => {
    if (!response) return false;

    // Check for achievement in various response formats
    const achievement = response.achievement ||
                       response.firstTimeAchievement ||
                       response.data?.achievement;

    if (achievement && achievement.type && achievement.xp) {
      notifyAchievement(achievement.type, achievement.xp);
      return true;
    }

    // Check for multiple achievements
    const achievements = response.achievements ||
                        response.firstTimeAchievements ||
                        response.data?.achievements;

    if (Array.isArray(achievements) && achievements.length > 0) {
      achievements.forEach(ach => {
        if (ach.type && ach.xp) {
          notifyAchievement(ach.type, ach.xp);
        }
      });
      return true;
    }

    return false;
  }, [notifyAchievement]);

  /**
   * Get achievement metadata for display
   * @param {string} achievementType - The achievement type
   * @returns {Object|null} - Achievement metadata or null
   */
  const getAchievementMeta = useCallback((achievementType) => {
    return ACHIEVEMENT_META[achievementType] || null;
  }, []);

  return {
    notifyAchievement,
    checkAndNotify,
    getAchievementMeta,
    ACHIEVEMENT_META
  };
}

export default useAchievementNotifications;
