/**
 * GameEnhancements Components
 *
 * UI components for game enhancement features including
 * voyages, pity display, daily menu, milestones, bait shop,
 * double-or-nothing, return bonuses, specializations, and fate points.
 */

export { VoyagePanel } from './VoyagePanel';
export { PityDisplay } from './PityDisplay';
export { DailyMenuPanel } from './DailyMenuPanel';
export { MilestoneRewards } from './MilestoneRewards';
export { BaitShop } from './BaitShop';
export { DoubleOrNothingModal } from './DoubleOrNothingModal';
export { ReturnBonusModal } from './ReturnBonusModal';
export { SpecializationPicker } from './SpecializationPicker';
export { FatePointsDisplay } from './FatePointsDisplay';

// All components object
const GameEnhancementsComponents = {
  VoyagePanel: require('./VoyagePanel').VoyagePanel,
  PityDisplay: require('./PityDisplay').PityDisplay,
  DailyMenuPanel: require('./DailyMenuPanel').DailyMenuPanel,
  MilestoneRewards: require('./MilestoneRewards').MilestoneRewards,
  BaitShop: require('./BaitShop').BaitShop,
  DoubleOrNothingModal: require('./DoubleOrNothingModal').DoubleOrNothingModal,
  ReturnBonusModal: require('./ReturnBonusModal').ReturnBonusModal,
  SpecializationPicker: require('./SpecializationPicker').SpecializationPicker,
  FatePointsDisplay: require('./FatePointsDisplay').FatePointsDisplay
};

export default GameEnhancementsComponents;
