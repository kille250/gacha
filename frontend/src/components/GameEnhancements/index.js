/**
 * GameEnhancements Components
 *
 * UI components for game enhancement features including
 * pity display, milestones, double-or-nothing,
 * return bonuses, specializations, fate points, and selectors.
 */

export { PityDisplay } from './PityDisplay';
export { MilestoneRewards } from './MilestoneRewards';
export { DoubleOrNothingModal } from './DoubleOrNothingModal';
export { ReturnBonusModal } from './ReturnBonusModal';
export { SpecializationPicker } from './SpecializationPicker';
export { FatePointsDisplay } from './FatePointsDisplay';
export { SelectorInventory } from './SelectorInventory';

// All components object
const GameEnhancementsComponents = {
  PityDisplay: require('./PityDisplay').PityDisplay,
  MilestoneRewards: require('./MilestoneRewards').MilestoneRewards,
  DoubleOrNothingModal: require('./DoubleOrNothingModal').DoubleOrNothingModal,
  ReturnBonusModal: require('./ReturnBonusModal').ReturnBonusModal,
  SpecializationPicker: require('./SpecializationPicker').SpecializationPicker,
  FatePointsDisplay: require('./FatePointsDisplay').FatePointsDisplay,
  SelectorInventory: require('./SelectorInventory').SelectorInventory
};

export default GameEnhancementsComponents;
