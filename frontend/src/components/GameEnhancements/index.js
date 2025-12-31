/**
 * GameEnhancements Components
 *
 * UI components for game enhancement features including
 * pity display, milestones, double-or-nothing,
 * return bonuses, specializations, fate points, streaks, and selectors.
 */

export { PityDisplay } from './PityDisplay';
export { MilestoneRewards } from './MilestoneRewards';
export { DoubleOrNothingModal } from './DoubleOrNothingModal';
export { ReturnBonusModal } from './ReturnBonusModal';
export { SpecializationPicker } from './SpecializationPicker';
export { FatePointsDisplay } from './FatePointsDisplay';
export { SelectorInventory } from './SelectorInventory';
export { StreakDisplay, StreakBadge } from './StreakDisplay';
export { DailyGoals, DailyGoalsCompact } from './DailyGoals';

// Import all components for the default export object
import { PityDisplay } from './PityDisplay';
import { MilestoneRewards } from './MilestoneRewards';
import { DoubleOrNothingModal } from './DoubleOrNothingModal';
import { ReturnBonusModal } from './ReturnBonusModal';
import { SpecializationPicker } from './SpecializationPicker';
import { FatePointsDisplay } from './FatePointsDisplay';
import { SelectorInventory } from './SelectorInventory';
import { StreakDisplay, StreakBadge } from './StreakDisplay';
import { DailyGoals, DailyGoalsCompact } from './DailyGoals';

// All components object
const GameEnhancementsComponents = {
  PityDisplay,
  MilestoneRewards,
  DoubleOrNothingModal,
  ReturnBonusModal,
  SpecializationPicker,
  FatePointsDisplay,
  SelectorInventory,
  StreakDisplay,
  StreakBadge,
  DailyGoals,
  DailyGoalsCompact
};

export default GameEnhancementsComponents;
