/**
 * AdminTabs - Tab navigation for the admin interface
 *
 * Features:
 * - Responsive: Full labels on desktop, icons-only on mobile with tooltip-style labels
 * - Keyboard accessible with arrow key navigation
 * - ARIA tablist pattern for screen readers
 * - Smooth animated active indicator
 *
 * @accessibility
 * - Uses role="tablist" and role="tab" patterns
 * - Arrow key navigation (left/right to switch tabs)
 * - Visible focus indicators
 * - Screen reader announcements for tab changes
 */

import React, { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaChartBar, FaUsers, FaImage, FaFlag, FaTicketAlt, FaStar, FaShieldAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';

const TAB_CONFIG = [
  { id: 'dashboard', labelKey: 'admin.tabs.dashboard', icon: FaChartBar },
  { id: 'users', labelKey: 'admin.tabs.users', icon: FaUsers },
  { id: 'characters', labelKey: 'admin.tabs.characters', icon: FaImage },
  { id: 'banners', labelKey: 'admin.tabs.banners', icon: FaFlag },
  { id: 'coupons', labelKey: 'admin.tabs.coupons', icon: FaTicketAlt },
  { id: 'rarities', labelKey: 'admin.tabs.rarities', icon: FaStar },
  { id: 'security', labelKey: 'admin.tabs.security', icon: FaShieldAlt },
];

const AdminTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const tabRefs = useRef([]);

  // Handle keyboard navigation (arrow keys to switch tabs)
  const handleKeyDown = useCallback((e, currentIndex) => {
    let nextIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % TAB_CONFIG.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + TAB_CONFIG.length) % TAB_CONFIG.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = TAB_CONFIG.length - 1;
        break;
      default:
        return;
    }

    // Focus and select the new tab
    tabRefs.current[nextIndex]?.focus();
    onTabChange(TAB_CONFIG[nextIndex].id);
  }, [onTabChange]);

  return (
    <TabsContainer>
      <TabsList role="tablist" aria-label={t('admin.navigation', 'Admin sections')}>
        {TAB_CONFIG.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const label = t(tab.labelKey);

          return (
            <TabButton
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              $isActive={isActive}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon aria-hidden="true" />
              <TabLabel>{label}</TabLabel>
              {/* Mobile tooltip label */}
              <MobileTooltip aria-hidden="true">{label}</MobileTooltip>
              {isActive && (
                <ActiveIndicator
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </TabButton>
          );
        })}
      </TabsList>
    </TabsContainer>
  );
};

const TabsContainer = styled.nav`
  position: sticky;
  top: 70px;
  z-index: ${theme.zIndex?.sticky || 50};
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} 0;
  margin-bottom: ${theme.spacing.xl};

  /* Safe area for notched devices */
  @supports (padding: max(0px)) {
    padding-left: max(${theme.spacing.md}, env(safe-area-inset-left));
    padding-right: max(${theme.spacing.md}, env(safe-area-inset-right));
  }
`;

const TabsList = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  overflow-x: auto;
  padding: 0 ${theme.spacing.md};
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    justify-content: center;
    gap: ${theme.spacing.sm};
  }
`;

// Desktop label - shown on larger screens
const TabLabel = styled.span`
  @media (max-width: ${theme.breakpoints.md}) {
    /* Visually hidden but accessible to screen readers */
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

// Mobile tooltip - appears on focus/hover on mobile
const MobileTooltip = styled.span`
  display: none;

  @media (max-width: ${theme.breakpoints.md}) {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    background: ${theme.colors.surfaceSolid};
    border: 1px solid ${theme.colors.surfaceBorder};
    border-radius: ${theme.radius.md};
    font-size: ${theme.fontSizes.xs};
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity ${theme.transitions.fast};
    z-index: 10;
    box-shadow: ${theme.shadows?.lg || '0 4px 12px rgba(0, 0, 0, 0.3)'};

    /* Arrow pointing down */
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: ${theme.colors.surfaceSolid};
    }
  }
`;

const TabButton = styled(motion.button)`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.$isActive ? theme.colors.surface : 'transparent'};
  border: 1px solid ${props => props.$isActive ? theme.colors.primary : 'transparent'};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;

  svg {
    font-size: 16px;
    flex-shrink: 0;
  }

  &:hover {
    color: ${theme.colors.text};
    background: ${props => props.$isActive ? theme.colors.surface : theme.colors.hoverOverlay};
  }

  /* Focus ring for keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  /* Mobile styles */
  @media (max-width: ${theme.breakpoints.md}) {
    min-width: 48px;
    min-height: 48px;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    justify-content: center;

    svg {
      font-size: 20px;
    }

    /* Show tooltip on focus (for touch devices holding press) */
    &:focus ${MobileTooltip},
    &:hover ${MobileTooltip} {
      display: block;
      opacity: 1;
    }
  }
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
`;

// PropTypes
AdminTabs.propTypes = {
  /** Currently active tab ID */
  activeTab: PropTypes.oneOf(['dashboard', 'users', 'characters', 'banners', 'coupons', 'rarities', 'security']).isRequired,
  /** Callback when a tab is selected */
  onTabChange: PropTypes.func.isRequired,
};

export default AdminTabs;