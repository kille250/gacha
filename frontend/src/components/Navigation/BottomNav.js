/**
 * BottomNav - Mobile bottom navigation bar
 *
 * Provides thumb-friendly navigation for mobile users.
 * Shows on mobile devices only (< 768px).
 * Highlights the active route with smooth animation.
 *
 * Features:
 * - 48px+ touch targets for accessibility
 * - Safe area handling for notched devices
 * - Smooth active state animations
 * - Landscape mode optimizations
 * - Reduced motion support
 *
 * Uses centralized navigation config from constants/navigation.js
 */

import React, { useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, springs, useReducedMotion } from '../../design-system';
import { getBottomNavItems } from '../../constants/navigation';

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Get items from centralized config that are marked for bottom nav
  const navItems = useMemo(() =>
    getBottomNavItems().map(item => ({
      path: item.path,
      label: t(item.labelKey),
      icon: <item.icon />,
    })),
  [t]);

  // Haptic feedback on tap (if available)
  const handleTap = useCallback(() => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10); // Light haptic
    }
  }, []);

  return (
    <NavContainer role="navigation" aria-label={t('nav.mainNavigation') || 'Main navigation'}>
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <NavItem
            key={item.path}
            to={item.path}
            $isActive={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={handleTap}
          >
            {isActive && !prefersReducedMotion && (
              <ActiveBackground
                layoutId="bottomNavActive"
                initial={false}
                transition={springs.snappy}
              />
            )}
            {isActive && prefersReducedMotion && (
              <ActiveBackgroundStatic />
            )}
            <NavIcon $isActive={isActive}>
              {item.icon}
            </NavIcon>
            <NavLabel $isActive={isActive}>{item.label}</NavLabel>
          </NavItem>
        );
      })}
    </NavContainer>
  );
};

const NavContainer = styled.nav`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border-top: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} ${theme.spacing.sm};
  /* Safe area padding for notched devices (iPhone X+) */
  padding-bottom: max(${theme.spacing.sm}, env(safe-area-inset-bottom, ${theme.spacing.sm}));
  z-index: ${theme.zIndex.sticky};
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.08);
  /* Use CSS variable for height synchronization */
  min-height: var(--nav-bottom-height, ${theme.navHeights.bottom.default});

  @media (max-width: ${theme.breakpoints.md}) {
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: ${theme.spacing.xs};
  }

  /* Landscape mode adjustments - more compact */
  @media (max-width: ${theme.breakpoints.md}) and (orientation: landscape) {
    padding: ${theme.spacing.xs} ${theme.spacing.lg};
    padding-bottom: max(${theme.spacing.xs}, env(safe-area-inset-bottom, ${theme.spacing.xs}));
    /* Account for side notches in landscape */
    padding-left: max(${theme.spacing.lg}, env(safe-area-inset-left, ${theme.spacing.lg}));
    padding-right: max(${theme.spacing.lg}, env(safe-area-inset-right, ${theme.spacing.lg}));
    /* Constrain height in landscape */
    min-height: var(--nav-bottom-height, ${theme.navHeights.bottom.landscape});
    max-height: 60px;
  }

  /* Very short viewports (landscape on small phones) - ultra compact */
  @media (max-height: 400px) {
    padding: ${theme.spacing.xs};
    padding-bottom: max(${theme.spacing.xs}, env(safe-area-inset-bottom, 0px));
    padding-left: max(${theme.spacing.sm}, env(safe-area-inset-left, ${theme.spacing.sm}));
    padding-right: max(${theme.spacing.sm}, env(safe-area-inset-right, ${theme.spacing.sm}));
    min-height: var(--nav-bottom-height, ${theme.navHeights.bottom.compact});
    max-height: 52px;
  }
`;

const NavItem = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  /* Minimum 48x48 touch target for accessibility */
  min-width: 64px;
  min-height: 56px;
  border-radius: ${theme.radius.lg};
  transition: transform ${theme.timing.fast} ${theme.easing.easeOut};
  position: relative;
  -webkit-tap-highlight-color: transparent;
  /* Improve touch responsiveness */
  touch-action: manipulation;

  &:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 0 2px ${theme.colors.focusRing};
  }

  /* Touch feedback */
  &:active {
    transform: scale(0.92);
  }

  /* Landscape mode - horizontal layout */
  @media (max-width: ${theme.breakpoints.md}) and (orientation: landscape) {
    flex-direction: row;
    gap: ${theme.spacing.xs};
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    min-height: 44px;
  }

  /* Very short viewports - ultra compact */
  @media (max-height: 400px) {
    flex-direction: row;
    gap: ${theme.spacing.xs};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    min-height: 36px;
    min-width: 48px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
      transform: none;
      background: ${theme.colors.primarySubtle};
    }
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textSecondary};
  position: relative;
  z-index: 1;
  transition:
    color ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};

  ${props => props.$isActive && `
    transform: scale(1.08);
  `}

  /* Landscape mode */
  @media (max-width: ${theme.breakpoints.md}) and (orientation: landscape) {
    font-size: 20px;
    ${props => props.$isActive && `
      transform: scale(1.05);
    `}
  }

  /* Very short viewports - smaller icons */
  @media (max-height: 400px) {
    font-size: 18px;
    ${props => props.$isActive && `
      transform: scale(1.03);
    `}
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: color ${theme.timing.fast} ${theme.easing.easeOut};
    transform: none !important;
  }
`;

const ActiveBackground = styled(motion.div)`
  position: absolute;
  inset: 4px;
  background: ${theme.colors.primarySubtle};
  border-radius: ${theme.radius.lg};
  z-index: 0;
`;

// Static version for reduced motion preference
const ActiveBackgroundStatic = styled.div`
  position: absolute;
  inset: 4px;
  background: ${theme.colors.primarySubtle};
  border-radius: ${theme.radius.lg};
  z-index: 0;
`;

const NavLabel = styled.span`
  font-size: 11px;
  font-weight: ${props => props.$isActive ? theme.fontWeights.semibold : theme.fontWeights.medium};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textTertiary};
  margin-top: 3px;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Use percentage-based width for better responsiveness across screen sizes */
  max-width: min(72px, 18vw);
  position: relative;
  z-index: 1;
  letter-spacing: ${theme.letterSpacing.wide};

  /* Landscape mode - labels have more horizontal room */
  @media (max-width: ${theme.breakpoints.md}) and (orientation: landscape) {
    font-size: 12px;
    margin-top: 0;
    max-width: none;
  }

  /* Very short viewports - hide labels to maximize space */
  @media (max-height: 350px) {
    display: none;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export default BottomNav;
