/**
 * BottomNav - Mobile bottom navigation bar
 *
 * Provides thumb-friendly navigation for mobile users.
 * Shows on mobile devices only (< 768px).
 * Highlights the active route.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MdCasino, MdCollections } from 'react-icons/md';
import { GiFishingPole, GiDoubleDragon } from 'react-icons/gi';
import { FaDice } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/DesignSystem';

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/gacha', label: t('nav.banners'), icon: <MdCasino /> },
    { path: '/roll', label: t('nav.roll'), icon: <FaDice /> },
    { path: '/fishing', label: t('nav.fishing'), icon: <GiFishingPole /> },
    { path: '/dojo', label: t('nav.dojo'), icon: <GiDoubleDragon /> },
    { path: '/collection', label: t('nav.collection'), icon: <MdCollections /> },
  ];

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
            <NavIcon $isActive={isActive}>
              {item.icon}
              {isActive && (
                <ActiveIndicator
                  layoutId="bottomNavIndicator"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
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
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-top: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  padding-bottom: env(safe-area-inset-bottom, ${theme.spacing.xs});
  z-index: ${theme.zIndex.sticky};

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
  transition: all ${theme.transitions.fast};
  position: relative;

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textSecondary};
  position: relative;
  transition: color ${theme.transitions.fast};
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: ${theme.colors.primary};
  border-radius: 50%;
`;

const NavLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${props => props.$isActive ? theme.fontWeights.semibold : theme.fontWeights.medium};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textTertiary};
  margin-top: 2px;
  transition: color ${theme.transitions.fast};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 72px;
`;

export default BottomNav;
