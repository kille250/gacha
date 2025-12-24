/**
 * Navigation - Main navigation component
 *
 * REFACTORED: This component now orchestrates extracted sub-components:
 * - HourlyReward: Reward button with timer
 * - ProfileDropdown: User profile menu
 * - MobileMenu: Slide-in mobile navigation
 * - RewardPopup: Celebration popup for claimed rewards
 * - LanguageSelector: Language switching UI
 *
 * Hooks:
 * - useNavigation: Shared navigation state and logic
 * - useHourlyReward: Hourly reward state management
 */

import React, { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MdMenu, MdAdminPanelSettings } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useHourlyReward } from '../../hooks';
import { NAV_GROUPS } from '../../constants/navigation';

// Extracted sub-components
import HourlyReward from './HourlyReward';
import ProfileDropdown from './ProfileDropdown';
import MobileMenu from './MobileMenu';
import RewardPopup from './RewardPopup';
import useNavigation from './useNavigation';

const Navigation = () => {
  const { t } = useTranslation();
  const location = useLocation();

  // Navigation state and handlers
  const {
    user,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
    isTogglingR18,
    toggleR18,
    handleLogout,
  } = useNavigation();

  // Hourly reward state
  const hourlyReward = useHourlyReward();

  // Close mobile menu on navigation
  useEffect(() => {
    closeMobileMenu();
  }, [location, closeMobileMenu]);

  // Navigation groups from centralized config
  const navGroups = useMemo(() => NAV_GROUPS.map(group => ({
    id: group.id,
    label: t(group.labelKey),
    items: group.items.map(item => ({
      path: item.path,
      label: t(item.labelKey),
      icon: <item.icon />,
    })),
  })), [t]);

  return (
    <>
      <NavContainer>
        {/* Logo */}
        <LogoSection>
          <Logo to="/gacha">
            <LogoIcon>🎰</LogoIcon>
            <LogoTextWrapper>
              <LogoText>Gacha<LogoAccent>Master</LogoAccent></LogoText>
            </LogoTextWrapper>
          </Logo>
        </LogoSection>

        {/* Desktop Navigation */}
        <DesktopNav>
          {navGroups.map((group, groupIndex) => (
            <NavGroup key={group.id}>
              {group.items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    $isActive={isActive}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <NavIcon>{item.icon}</NavIcon>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              {groupIndex < navGroups.length - 1 && <NavDivider />}
            </NavGroup>
          ))}

          {/* Admin Link */}
          {user?.isAdmin && (
            <>
              <NavDivider />
              <NavLink
                to="/admin"
                $isActive={location.pathname === '/admin'}
                $isAdmin
                aria-current={location.pathname === '/admin' ? 'page' : undefined}
              >
                <NavIcon><MdAdminPanelSettings /></NavIcon>
                <span>{t('nav.admin')}</span>
              </NavLink>
            </>
          )}
        </DesktopNav>

        {/* User Controls */}
        <UserControls>
          {/* Hourly Reward Button - Desktop */}
          {user && (
            <HourlyReward
              available={hourlyReward.available}
              loading={hourlyReward.loading}
              canClaim={hourlyReward.canClaim}
              timeRemaining={hourlyReward.timeRemaining}
              onClaim={hourlyReward.claim}
              variant="desktop"
            />
          )}

          {/* Profile Dropdown - Desktop */}
          <ProfileDropdown
            user={user}
            onLogout={handleLogout}
            onToggleR18={toggleR18}
            isTogglingR18={isTogglingR18}
          />

          {/* Mobile Hamburger */}
          <HamburgerButton
            onClick={openMobileMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Open menu"
            type="button"
          >
            <MdMenu />
          </HamburgerButton>
        </UserControls>
      </NavContainer>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        user={user}
        navGroups={navGroups}
        hourlyReward={hourlyReward}
        onLogout={handleLogout}
        onToggleR18={toggleR18}
        isTogglingR18={isTogglingR18}
      />

      {/* Reward Popup */}
      <RewardPopup
        show={hourlyReward.showPopup}
        amount={hourlyReward.popupAmount}
      />
    </>
  );
};

// ==================== STYLED COMPONENTS ====================

const NavContainer = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.sticky};
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  text-decoration: none;

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
    border-radius: ${theme.radius.md};
  }
`;

const LogoIcon = styled.span`
  font-size: 24px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 20px;
  }
`;

const LogoTextWrapper = styled.div`
  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const LogoText = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  letter-spacing: -0.02em;
`;

const LogoAccent = styled.span`
  color: ${theme.colors.primary};
`;

const DesktopNav = styled.div`
  display: none;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex: 1;
  justify-content: center;

  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }
`;

const NavGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const NavDivider = styled.div`
  width: 1px;
  height: 24px;
  background: ${theme.colors.surfaceBorder};
  margin: 0 ${theme.spacing.sm};
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$isActive ? theme.colors.text : theme.colors.textSecondary};
  text-decoration: none;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.$isActive ? theme.fontWeights.semibold : theme.fontWeights.medium};
  background: ${props => props.$isActive ? 'rgba(0, 113, 227, 0.12)' : 'transparent'};
  transition: all ${theme.transitions.fast};
  position: relative;

  ${props => props.$isActive && `
    color: ${theme.colors.primary};
  `}

  ${props => props.$isAdmin && `
    color: ${props.$isActive ? theme.colors.accent : theme.colors.accentSecondary};
    background: ${props.$isActive ? 'rgba(88, 86, 214, 0.12)' : 'transparent'};
  `}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${theme.colors.text};
      background: ${theme.colors.glass};
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const HamburgerButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  /* Ensure minimum touch target size (44x44) */
  width: 44px;
  height: 44px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 22px;

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default Navigation;
