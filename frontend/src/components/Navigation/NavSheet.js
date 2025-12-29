/**
 * NavSheet - Bottom sheet navigation menu for mobile
 *
 * Opens a list of navigation items in a bottom sheet.
 * Used for "Games" and "More" tabs in the mobile bottom nav.
 *
 * Features:
 * - Drag to dismiss
 * - "New" badges for feature discoverability
 * - Haptic feedback on tap
 * - Accessibility labels
 * - Smooth spring animations
 */

import React, { useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdChevronRight } from 'react-icons/md';
import { theme, springs, useReducedMotion } from '../../design-system';
import { AuthContext } from '../../context/AuthContext';
import { ADMIN_NAV_ITEM } from '../../constants/navigation';

/**
 * NavSheet Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether sheet is visible
 * @param {Function} props.onClose - Called when sheet should close
 * @param {string} props.title - Sheet title (i18n key)
 * @param {Array} props.items - Navigation items to display
 * @param {boolean} props.showAdmin - Whether to show admin link (for "More" sheet)
 */
const NavSheet = ({
  isOpen,
  onClose,
  title,
  items = [],
  showAdmin = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { user } = useContext(AuthContext);

  // Handle navigation and close sheet
  const handleNavigate = useCallback((path) => {
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
    onClose();
    navigate(path);
  }, [navigate, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Build items list with admin if needed
  const displayItems = showAdmin && user?.isAdmin
    ? [...items, ADMIN_NAV_ITEM]
    : items;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />
          <SheetContainer
            initial={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={prefersReducedMotion ? { duration: 0.15 } : springs.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-sheet-title"
          >
            <DragHandle aria-hidden="true" />

            {title && (
              <SheetHeader>
                <SheetTitle id="nav-sheet-title">{t(title)}</SheetTitle>
              </SheetHeader>
            )}

            <SheetBody>
              {displayItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <NavItem
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    $isActive={isActive}
                    $isAdmin={item.adminOnly}
                    as={motion.button}
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <NavItemIcon $isActive={isActive} $isAdmin={item.adminOnly}>
                      <Icon />
                    </NavItemIcon>
                    <NavItemLabel>
                      {t(item.labelKey)}
                      {item.isNew && <NewBadge>{t('common.new')}</NewBadge>}
                    </NavItemLabel>
                    <NavItemChevron>
                      <MdChevronRight />
                    </NavItemChevron>
                  </NavItem>
                );
              })}
            </SheetBody>
          </SheetContainer>
        </>
      )}
    </AnimatePresence>
  );
};

// ==================== STYLED COMPONENTS ====================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(${theme.blur.sm});
  -webkit-backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
`;

const SheetContainer = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${theme.colors.backgroundSecondary};
  border-top-left-radius: ${theme.radius.xl};
  border-top-right-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadows.xl};
  z-index: ${theme.zIndex.modal + 1};
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  /* Safe area for notched devices */
  padding-bottom: env(safe-area-inset-bottom, ${theme.spacing.md});
`;

const DragHandle = styled.div`
  display: flex;
  justify-content: center;
  padding: ${theme.spacing.sm} 0;

  &::after {
    content: '';
    width: 36px;
    height: 4px;
    background: ${theme.colors.textMuted};
    border-radius: 2px;
    opacity: 0.4;
  }
`;

const SheetHeader = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.md};
`;

const SheetTitle = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const SheetBody = styled.div`
  padding: 0 ${theme.spacing.md} ${theme.spacing.lg};
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xs};
  border: none;
  border-radius: ${theme.radius.lg};
  background: ${props => props.$isActive ? theme.colors.primarySubtle : 'transparent'};
  cursor: pointer;
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${theme.colors.focusRing};
  }

  ${props => props.$isAdmin && `
    border: 1px solid ${theme.colors.accentSubtle};
  `}
`;

const NavItemIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$isActive ? theme.colors.primary : theme.colors.surface};
  color: ${props => {
    if (props.$isAdmin) return theme.colors.accent;
    return props.$isActive ? 'white' : theme.colors.textSecondary;
  }};
  font-size: 20px;
  margin-right: ${theme.spacing.md};
  flex-shrink: 0;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut};

  ${props => props.$isAdmin && `
    background: ${theme.colors.accentSubtle};
  `}
`;

const NavItemLabel = styled.span`
  flex: 1;
  text-align: left;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const NewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  background: linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.successHover});
  border-radius: ${theme.radius.full};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NavItemChevron = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.textMuted};
  font-size: 20px;
  margin-left: ${theme.spacing.sm};
`;

export default NavSheet;
