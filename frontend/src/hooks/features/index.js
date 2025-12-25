/**
 * Feature Hooks
 *
 * Domain-specific hooks for major application features.
 */

// ==================== GACHA ====================

export { useGachaRoll } from '../useGachaRoll';
export { useBannerPage } from '../useBannerPage';
export { useRollPage } from '../useRollPage';
export { useSkipAnimations } from '../useSkipAnimations';
export { useDuplicateCheck } from '../useDuplicateCheck';

// ==================== ADMIN ====================

export { useAltMediaSearch } from '../useAltMediaSearch';

// ==================== DOJO ====================

export { useDojoPage } from '../useDojoPage';

// ==================== COLLECTION ====================

export { useCollection } from '../useCollection';
export { useCollectionPage } from '../useCollectionPage';

// ==================== FISHING ====================

// Core game logic
export { useFishingTimers, TIMER_IDS } from '../useFishingTimers';
export { useFishingState, FISHING_ACTIONS } from '../useFishingState';
export { useFishingSession } from '../useFishingSession';
export { useFishingAutofish } from '../useFishingAutofish';
export { useFishingMultiplayer } from '../useFishingMultiplayer';

// UI & Modals
export { useFishingNotifications, formatChallengeReward } from '../useFishingNotifications';
export { useFishingModals, MODAL_TYPES } from '../useFishingModals';

// Modal-specific logic
export { useFishingTrade } from '../useFishingTrade';
export { useFishingChallengesModal } from '../useFishingChallengesModal';
export { useFishingEquipment } from '../useFishingEquipment';
export { useFishingPrestige } from '../useFishingPrestige';

// Helpers
export { useSessionStats } from '../useSessionStats';
export { useFishingKeyboard } from '../useFishingKeyboard';

// ==================== REWARDS ====================

export { useHourlyReward } from '../useHourlyReward';

// ==================== UPLOAD ====================

export { useUploadState, FILE_STATUS, UPLOAD_FLOW_STATES } from '../useUploadState';
export { useUploadController } from '../useUploadController';
