/**
 * AdminMobileControls - Mobile-optimized controls for admin pages
 *
 * Provides touch-friendly, ergonomic admin controls for mobile users:
 * - Bottom action sheet for quick actions
 * - Floating action button (FAB) for primary actions
 * - Swipe gestures for common operations
 * - Haptic feedback on interactions
 *
 * @accessibility
 * - Large touch targets (min 48x48)
 * - Clear visual feedback
 * - Screen reader support
 * - Reduced motion support
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus,
  FaTimes,
  FaFlag,
  FaTicketAlt,
  FaUpload,
  FaDownload,
  FaSync,
  FaSearch,
  FaFilter
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, useReducedMotion, haptic } from '../../design-system';

// Quick action definitions by tab
const QUICK_ACTIONS = {
  dashboard: [
    { id: 'refresh', icon: FaSync, labelKey: 'admin.refresh', color: theme.colors.primary },
    { id: 'newBanner', icon: FaFlag, labelKey: 'admin.newBanner', color: '#ff9f0a' },
    { id: 'newCoupon', icon: FaTicketAlt, labelKey: 'admin.newCoupon', color: '#ff2d55' }
  ],
  users: [
    { id: 'search', icon: FaSearch, labelKey: 'common.search', color: theme.colors.primary },
    { id: 'addCoins', icon: FaDownload, labelKey: 'admin.addCoins', color: '#30d158' },
    { id: 'filter', icon: FaFilter, labelKey: 'common.filters', color: theme.colors.accent }
  ],
  characters: [
    { id: 'add', icon: FaPlus, labelKey: 'admin.addCharacter', color: '#bf5af2' },
    { id: 'upload', icon: FaUpload, labelKey: 'admin.multiUpload', color: '#5856d6' },
    { id: 'import', icon: FaDownload, labelKey: 'admin.animeImport', color: '#ff6b9d' }
  ],
  banners: [
    { id: 'add', icon: FaPlus, labelKey: 'admin.addBanner', color: '#ff9f0a' }
  ],
  coupons: [
    { id: 'add', icon: FaPlus, labelKey: 'admin.createCoupon', color: '#ff2d55' }
  ],
  security: [
    { id: 'refresh', icon: FaSync, labelKey: 'admin.refresh', color: theme.colors.primary },
    { id: 'export', icon: FaDownload, labelKey: 'admin.security.export', color: theme.colors.accent }
  ]
};

const AdminMobileControls = ({
  activeTab = 'dashboard',
  onAction,
  isOpen: _isOpen = false,
  onOpenChange,
  primaryAction,
  className
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Get actions for current tab
  const actions = useMemo(() => {
    return QUICK_ACTIONS[activeTab] || QUICK_ACTIONS.dashboard;
  }, [activeTab]);

  // Get primary action (first action or custom)
  const mainAction = useMemo(() => {
    if (primaryAction) return primaryAction;
    return actions[0];
  }, [primaryAction, actions]);

  // Handle FAB click
  const handleFabClick = useCallback(() => {
    haptic.light();

    if (actions.length === 1) {
      // Single action - execute directly
      onAction?.(mainAction.id);
    } else {
      // Multiple actions - show action sheet
      setIsActionSheetOpen(true);
      onOpenChange?.(true);
    }
  }, [actions, mainAction, onAction, onOpenChange]);

  // Handle action sheet close
  const handleClose = useCallback(() => {
    haptic.light();
    setIsActionSheetOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  // Handle action selection
  const handleActionSelect = useCallback((actionId) => {
    haptic.medium();
    onAction?.(actionId);
    handleClose();
  }, [onAction, handleClose]);

  // Animation variants
  const fabVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: prefersReducedMotion
        ? { duration: 0.1 }
        : { type: 'spring', stiffness: 400, damping: 25 }
    },
    tap: prefersReducedMotion ? {} : { scale: 0.9 }
  };

  const sheetVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: prefersReducedMotion
        ? { duration: 0.1 }
        : { type: 'spring', stiffness: 400, damping: 35 }
    },
    exit: {
      y: '100%',
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const MainIcon = mainAction?.icon || FaPlus;

  return (
    <>
      {/* Floating Action Button */}
      <FAB
        className={className}
        onClick={handleFabClick}
        aria-label={t(mainAction?.labelKey || 'common.actions')}
        aria-expanded={isActionSheetOpen}
        aria-haspopup="menu"
        $color={mainAction?.color}
        variants={fabVariants}
        initial="hidden"
        animate="visible"
        whileTap="tap"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isActionSheetOpen ? 'close' : 'main'}
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {isActionSheetOpen ? <FaTimes /> : <MainIcon />}
          </motion.span>
        </AnimatePresence>
      </FAB>

      {/* Action Sheet */}
      <AnimatePresence>
        {isActionSheetOpen && (
          <>
            {/* Backdrop */}
            <Backdrop
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              aria-hidden="true"
            />

            {/* Sheet */}
            <ActionSheet
              role="menu"
              aria-label={t('common.actions', 'Actions')}
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Handle */}
              <SheetHandle />

              {/* Title */}
              <SheetTitle>{t('common.actions', 'Quick Actions')}</SheetTitle>

              {/* Actions Grid */}
              <ActionsGrid>
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <ActionButton
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleActionSelect(action.id)}
                      $color={action.color}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ActionIconWrapper $color={action.color}>
                        <Icon aria-hidden="true" />
                      </ActionIconWrapper>
                      <ActionLabel>{t(action.labelKey)}</ActionLabel>
                    </ActionButton>
                  );
                })}
              </ActionsGrid>

              {/* Cancel Button */}
              <CancelButton onClick={handleClose}>
                {t('common.cancel', 'Cancel')}
              </CancelButton>
            </ActionSheet>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const FAB = styled(motion.button)`
  /* Position - above bottom nav on mobile */
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: ${theme.spacing.lg};
  z-index: ${theme.zIndex.modal - 1};

  /* Size and shape */
  width: 56px;
  height: 56px;
  border-radius: 50%;

  /* Style */
  background: ${props => props.$color || theme.colors.primary};
  border: none;
  color: white;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.15);

  /* Content */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;

  /* Interaction */
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px ${theme.colors.background},
      0 0 0 5px ${props => props.$color || theme.colors.primary},
      0 4px 12px rgba(0, 0, 0, 0.25);
  }

  /* Hide on desktop */
  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: ${theme.zIndex.modal};

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const ActionSheet = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${theme.colors.surfaceSolid};
  border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  padding-bottom: calc(${theme.spacing.xl} + env(safe-area-inset-bottom, 0px));
  z-index: ${theme.zIndex.modal + 1};
  max-height: 70vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const SheetHandle = styled.div`
  width: 36px;
  height: 4px;
  background: ${theme.colors.surfaceBorder};
  border-radius: 2px;
  margin: 0 auto ${theme.spacing.lg};
`;

const SheetTitle = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg};
  text-align: center;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const ActionButton = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;
  min-height: 88px;

  &:active {
    transform: scale(0.96);
    background: ${props => props.$color ? `${props.$color}15` : theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const ActionIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: ${props => props.$color ? `${props.$color}20` : theme.colors.primarySubtle};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color || theme.colors.primary};
  font-size: 20px;
`;

const ActionLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  text-align: center;
  line-height: 1.3;
`;

const CancelButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: ${theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

// PropTypes
AdminMobileControls.propTypes = {
  /** Currently active admin tab */
  activeTab: PropTypes.oneOf(['dashboard', 'users', 'characters', 'banners', 'coupons', 'rarities', 'security']),
  /** Callback when an action is selected */
  onAction: PropTypes.func,
  /** Whether the action sheet is open (controlled) */
  isOpen: PropTypes.bool,
  /** Callback when open state changes */
  onOpenChange: PropTypes.func,
  /** Custom primary action for the FAB */
  primaryAction: PropTypes.shape({
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    labelKey: PropTypes.string.isRequired,
    color: PropTypes.string
  }),
  /** Additional CSS class */
  className: PropTypes.string
};

export default AdminMobileControls;
