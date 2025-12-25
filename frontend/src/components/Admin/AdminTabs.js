/**
 * AdminTabs - Tab navigation for the admin interface
 *
 * Features:
 * - Responsive: Full labels on desktop, icons-only on mobile with tooltip-style labels
 * - Keyboard accessible with arrow key navigation
 * - ARIA tablist pattern for screen readers
 * - Smooth animated active indicator
 * - Scroll indicators for overflow on mobile
 * - Haptic feedback on mobile devices
 *
 * @accessibility
 * - Uses role="tablist" and role="tab" patterns
 * - Arrow key navigation (left/right to switch tabs)
 * - Home/End key support for first/last tab
 * - Visible focus indicators
 * - Screen reader announcements for tab changes
 * - Reduced motion support
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChartBar, FaUsers, FaImage, FaFlag, FaTicketAlt, FaStar, FaShieldAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, useReducedMotion, AriaLiveRegion } from '../../design-system';

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
  const tabListRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Scroll state for indicators
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // Check scroll position for indicators
  const updateScrollIndicators = useCallback(() => {
    const container = tabListRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  // Update scroll indicators on mount and resize
  useEffect(() => {
    updateScrollIndicators();

    const container = tabListRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', updateScrollIndicators);
      }
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  // Scroll active tab into view when it changes
  useEffect(() => {
    const activeIndex = TAB_CONFIG.findIndex(tab => tab.id === activeTab);
    const activeTabEl = tabRefs.current[activeIndex];

    if (activeTabEl && tabListRef.current) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // Haptic feedback for mobile
  const triggerHaptic = useCallback(() => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // Handle tab change with announcement
  const handleTabSelect = useCallback((tabId) => {
    triggerHaptic();
    onTabChange(tabId);

    const tab = TAB_CONFIG.find(t => t.id === tabId);
    if (tab) {
      const label = t(tab.labelKey);
      setAnnouncement(`${label} ${t('common.selected', 'selected')}`);
    }
  }, [onTabChange, triggerHaptic, t]);

  // Scroll buttons for accessibility
  const scrollTabs = useCallback((direction) => {
    const container = tabListRef.current;
    if (container) {
      const scrollAmount = direction * 150;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

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
    handleTabSelect(TAB_CONFIG[nextIndex].id);
  }, [handleTabSelect]);

  return (
    <TabsContainer>
      {/* Screen reader announcements */}
      <AriaLiveRegion politeness="polite">
        {announcement}
      </AriaLiveRegion>

      {/* Left scroll button - visible when scrollable */}
      <AnimatePresence>
        {canScrollLeft && (
          <ScrollButton
            key="scroll-left"
            $direction="left"
            onClick={() => scrollTabs(-1)}
            aria-label={t('common.scrollLeft', 'Scroll left')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FaChevronLeft aria-hidden="true" />
          </ScrollButton>
        )}
      </AnimatePresence>

      <TabsList
        ref={tabListRef}
        role="tablist"
        aria-label={t('admin.navigation', 'Admin sections')}
      >
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
              onClick={() => handleTabSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <TabIconWrapper $isActive={isActive}>
                <Icon aria-hidden="true" />
              </TabIconWrapper>
              <TabLabel>{label}</TabLabel>
              {/* Mobile tooltip label */}
              <MobileTooltip aria-hidden="true">{label}</MobileTooltip>
              {isActive && !prefersReducedMotion && (
                <ActiveIndicator
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              {isActive && prefersReducedMotion && (
                <ActiveIndicatorStatic />
              )}
            </TabButton>
          );
        })}
      </TabsList>

      {/* Right scroll button - visible when scrollable */}
      <AnimatePresence>
        {canScrollRight && (
          <ScrollButton
            key="scroll-right"
            $direction="right"
            onClick={() => scrollTabs(1)}
            aria-label={t('common.scrollRight', 'Scroll right')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FaChevronRight aria-hidden="true" />
          </ScrollButton>
        )}
      </AnimatePresence>
    </TabsContainer>
  );
};

const TabsContainer = styled.nav`
  position: sticky;
  top: 56px; /* Match navigation height */
  z-index: ${theme.zIndex?.sticky || 50};
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} 0;
  margin-bottom: ${theme.spacing.lg};
  display: flex;
  align-items: center;
  /* Subtle top shadow for depth separation */
  box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.03) inset;

  /* Safe area for notched devices */
  @supports (padding: max(0px)) {
    padding-left: max(${theme.spacing.sm}, env(safe-area-inset-left));
    padding-right: max(${theme.spacing.sm}, env(safe-area-inset-right));
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    top: 56px;
    padding: ${theme.spacing.xs} 0;
  }
`;

const ScrollButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  flex-shrink: 0;
  margin: 0 ${theme.spacing.xs};
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${theme.colors.hoverOverlay};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    font-size: 14px;
  }

  /* Hidden on desktop when not needed */
  @media (min-width: ${theme.breakpoints.lg}) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
      transform: none;
    }
  }
`;

const TabsList = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  overflow-x: auto;
  padding: 0 ${theme.spacing.sm};
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  flex: 1;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    justify-content: center;
    gap: ${theme.spacing.sm};
    padding: 0 ${theme.spacing.md};
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
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$isActive
    ? 'linear-gradient(135deg, rgba(0, 113, 227, 0.12) 0%, rgba(88, 86, 214, 0.08) 100%)'
    : 'transparent'};
  border: 1px solid ${props => props.$isActive ? 'rgba(0, 113, 227, 0.3)' : 'transparent'};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;

  svg {
    font-size: 16px;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  /* Subtle glow on active tab */
  ${props => props.$isActive && `
    box-shadow: 0 0 20px -4px rgba(0, 113, 227, 0.25);
  `}

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      color: ${theme.colors.text};
      background: ${props => props.$isActive
        ? 'linear-gradient(135deg, rgba(0, 113, 227, 0.15) 0%, rgba(88, 86, 214, 0.10) 100%)'
        : theme.colors.hoverOverlay};

      svg {
        transform: scale(1.05);
      }
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  /* Focus ring for keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  /* Mobile styles */
  @media (max-width: ${theme.breakpoints.md}) {
    min-width: 52px;
    min-height: 52px;
    padding: ${theme.spacing.sm};
    justify-content: center;

    svg {
      font-size: 22px;
    }

    /* Show tooltip on focus (for touch devices holding press) */
    &:focus ${MobileTooltip},
    &:hover ${MobileTooltip} {
      display: block;
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: color 0.1s, background 0.1s;
    &:active:not(:disabled) {
      transform: none;
    }
    svg {
      transition: none;
    }
  }
`;

const TabIconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$isActive ? `${theme.colors.primary}20` : 'transparent'};
  transition: background ${theme.transitions.fast};

  @media (max-width: ${theme.breakpoints.md}) {
    width: 32px;
    height: 32px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
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

// Static version for reduced motion preference
const ActiveIndicatorStatic = styled.div`
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