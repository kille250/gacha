/**
 * BottomNav - Mobile bottom navigation bar
 *
 * Provides thumb-friendly navigation for mobile users.
 * Shows on mobile devices only (< 768px).
 * Highlights the active route.
 *
 * Uses centralized navigation config from constants/navigation.js
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, springs } from '../../design-system';
import { getBottomNavItems } from '../../constants/navigation';

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  // Get items from centralized config that are marked for bottom nav
  const navItems = useMemo(() =>
    getBottomNavItems().map(item => ({
      path: item.path,
      label: t(item.labelKey),
      icon: <item.icon />,
    })),
  [t]);

  return (
    <NavContainer role="navigation" aria-label="Main navigation">
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <NavItem
            key={item.path}
            to={item.path}
            $isActive={isActive}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <ActiveBackground
                layoutId="bottomNavActive"
                initial={false}
                transition={springs.snappy}
              />
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
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  padding-bottom: env(safe-area-inset-bottom, ${theme.spacing.xs});
  z-index: ${theme.zIndex.sticky};
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);

  @media (max-width: ${theme.breakpoints.md}) {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
`;

const NavItem = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-width: 64px;
  min-height: 56px;
  border-radius: ${theme.radius.lg};
  transition: transform ${theme.timing.fast} ${theme.easing.easeOut};
  position: relative;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }

  &:active {
    transform: scale(0.95);
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
    transform: scale(1.1);
  `}
`;

const ActiveBackground = styled(motion.div)`
  position: absolute;
  inset: 4px;
  background: ${theme.colors.primarySubtle};
  border-radius: ${theme.radius.lg};
  z-index: 0;
`;

const NavLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${props => props.$isActive ? theme.fontWeights.semibold : theme.fontWeights.medium};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textTertiary};
  margin-top: 2px;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 72px;
  position: relative;
  z-index: 1;
`;

export default BottomNav;
