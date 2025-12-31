/**
 * useCollectionMilestones - Track and celebrate collection progress
 *
 * Monitors collection completion percentage and triggers celebrations
 * when users reach milestones (25%, 50%, 75%, 100%).
 *
 * Features:
 * - Persistent milestone tracking (localStorage)
 * - Automatic celebration triggers
 * - Toast notifications
 * - Achievement badges
 */

import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { IconStarFilled, IconSparkleSymbol, IconStarOutline, IconCrownSymbol } from '../constants/icons';

// Milestone thresholds - icons are React Icon components
export const MILESTONES = [
  { threshold: 25, title: 'Getting Started', description: 'Collected 25% of all characters!', icon: <IconStarFilled size={16} /> },
  { threshold: 50, title: 'Halfway There', description: 'Collected 50% of all characters!', icon: <IconSparkleSymbol size={16} /> },
  { threshold: 75, title: 'Almost Complete', description: 'Collected 75% of all characters!', icon: <IconStarOutline size={16} /> },
  { threshold: 100, title: 'Master Collector', description: 'Collected ALL characters!', icon: <IconCrownSymbol size={16} /> },
];

const STORAGE_KEY = 'gacha_collection_milestones';

/**
 * Get achieved milestones from localStorage
 */
const getAchievedMilestones = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Save achieved milestones to localStorage
 */
const saveAchievedMilestones = (milestones) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Hook to track collection milestones and trigger celebrations
 *
 * @param {number} completionPercentage - Current collection completion (0-100)
 * @param {Object} options - Configuration options
 * @param {Function} options.onMilestone - Callback when milestone is reached
 * @param {Function} options.triggerConfetti - Function to trigger confetti effect
 * @param {Function} options.triggerFlash - Function to trigger screen flash
 *
 * @returns {Object} { achievedMilestones, nextMilestone, checkMilestones }
 */
export const useCollectionMilestones = (completionPercentage, options = {}) => {
  const { onMilestone, triggerConfetti, triggerFlash } = options;
  const toast = useToast();
  const previousPercentage = useRef(null);
  const achievedMilestones = useRef(getAchievedMilestones());

  /**
   * Check and trigger new milestones
   */
  const checkMilestones = useCallback((currentPercentage) => {
    const achieved = achievedMilestones.current;

    for (const milestone of MILESTONES) {
      // Check if milestone is newly reached and not already achieved
      if (
        currentPercentage >= milestone.threshold &&
        !achieved.includes(milestone.threshold)
      ) {
        // Mark as achieved
        achieved.push(milestone.threshold);
        achievedMilestones.current = achieved;
        saveAchievedMilestones(achieved);

        // Trigger celebration effects
        if (triggerConfetti) {
          triggerConfetti({
            count: milestone.threshold === 100 ? 150 : 80,
          });
        }

        if (triggerFlash) {
          triggerFlash({
            color: milestone.threshold === 100
              ? 'rgba(255, 215, 0, 0.4)'
              : 'rgba(0, 200, 150, 0.3)',
            duration: 500,
          });
        }

        // Show toast notification
        if (toast?.showToast) {
          toast.showToast({
            type: 'success',
            title: milestone.title,
            icon: milestone.icon,
            message: milestone.description,
            duration: 5000,
          });
        }

        // Callback for custom handling
        if (onMilestone) {
          onMilestone(milestone);
        }
      }
    }
  }, [triggerConfetti, triggerFlash, toast, onMilestone]);

  /**
   * Find the next unachieved milestone
   */
  const getNextMilestone = useCallback(() => {
    const achieved = achievedMilestones.current;
    return MILESTONES.find(m => !achieved.includes(m.threshold)) || null;
  }, []);

  /**
   * Calculate progress to next milestone
   */
  const getProgressToNext = useCallback((currentPercentage) => {
    const next = getNextMilestone();
    if (!next) return { milestone: null, progress: 100 };

    const previousThreshold = MILESTONES
      .filter(m => achievedMilestones.current.includes(m.threshold))
      .sort((a, b) => b.threshold - a.threshold)[0]?.threshold || 0;

    const range = next.threshold - previousThreshold;
    const progress = ((currentPercentage - previousThreshold) / range) * 100;

    return {
      milestone: next,
      progress: Math.max(0, Math.min(100, progress)),
    };
  }, [getNextMilestone]);

  // Check milestones when percentage changes
  useEffect(() => {
    // Skip initial mount
    if (previousPercentage.current === null) {
      previousPercentage.current = completionPercentage;
      return;
    }

    // Only check if percentage increased
    if (completionPercentage > previousPercentage.current) {
      checkMilestones(completionPercentage);
    }

    previousPercentage.current = completionPercentage;
  }, [completionPercentage, checkMilestones]);

  return {
    achievedMilestones: achievedMilestones.current,
    nextMilestone: getNextMilestone(),
    progressToNext: getProgressToNext(completionPercentage),
    checkMilestones,
    getNextMilestone,
    getProgressToNext,
    MILESTONES,
  };
};

/**
 * Display component for milestone progress
 * Shows next milestone and progress bar
 */
export const MilestoneProgress = ({
  completionPercentage,
  className,
}) => {
  const { nextMilestone, progressToNext } = useCollectionMilestones(completionPercentage);

  if (!nextMilestone) {
    return null; // All milestones achieved
  }

  return (
    <div className={className}>
      <div className="milestone-info">
        <span className="milestone-icon">{nextMilestone.icon}</span>
        <span className="milestone-title">{nextMilestone.title}</span>
        <span className="milestone-target">at {nextMilestone.threshold}%</span>
      </div>
      <div className="milestone-progress-bar">
        <div
          className="milestone-progress-fill"
          style={{ width: `${progressToNext.progress}%` }}
        />
      </div>
    </div>
  );
};

export default useCollectionMilestones;
