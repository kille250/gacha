/**
 * Navigation - Main navigation component
 *
 * Desktop: Full navigation bar with links and profile dropdown
 * Mobile: Minimal top bar with logo and hourly reward button
 *        (Navigation handled by BottomNav component)
 *
 * Sub-components:
 * - HourlyReward: Reward button with timer (visible on both desktop & mobile)
 * - ProfileDropdown: User profile menu (desktop only)
 * - RewardPopup: Celebration popup for claimed rewards
 *
 * Hooks:
 * - useNavigation: Shared navigation state and logic
 * - useHourlyReward: Hourly reward state management
 */

import React, { useMemo, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { MdAdminPanelSettings } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useHourlyReward } from '../../hooks';
import { NAV_GROUPS } from '../../constants/navigation';
import { AuthContext } from '../../context/AuthContext';

// Extracted sub-components
import HourlyReward from './HourlyReward';
import ProfileDropdown from './ProfileDropdown';
import RewardPopup from './RewardPopup';

const Navigation = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, setUser, logout } = useContext(AuthContext);

  // Hourly reward state
  const hourlyReward = useHourlyReward();

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
            <LogoIconWrapper>
              <LogoSvg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="url(#logoGradient)" />
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="logoGradient" x1="2" y1="2" x2="22" y2="22">
                    <stop stopColor="#0071e3" />
                    <stop offset="1" stopColor="#5856d6" />
                  </linearGradient>
                </defs>
              </LogoSvg>
            </LogoIconWrapper>
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
          {/* Hourly Reward Button - Always visible */}
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

          {/* Profile Dropdown - Desktop only */}
          <ProfileDropdown
            user={user}
            setUser={setUser}
            onLogout={logout}
          />
        </UserControls>
      </NavContainer>

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
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.sticky};
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  /* Consistent height across all screen sizes */
  min-height: 56px;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
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
  border-radius: ${theme.radius.md};
  transition: opacity ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    opacity: 0.85;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

const LogoIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoSvg = styled.svg`
  width: 28px;
  height: 28px;
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 24px;
    height: 24px;
  }
`;

const LogoTextWrapper = styled.div`
  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const LogoText = styled.span`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  letter-spacing: -0.01em;
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
  border-radius: ${theme.radius.md};
  color: ${props => props.$isActive ? theme.colors.text : theme.colors.textSecondary};
  text-decoration: none;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.$isActive ? theme.fontWeights.medium : theme.fontWeights.regular};
  background: ${props => props.$isActive ? theme.colors.primarySubtle : 'transparent'};
  transition:
    color ${theme.timing.fast} ${theme.easing.easeOut},
    background ${theme.timing.fast} ${theme.easing.easeOut};
  position: relative;

  ${props => props.$isActive && `
    color: ${theme.colors.primary};
  `}

  ${props => props.$isAdmin && `
    color: ${props.$isActive ? theme.colors.accent : theme.colors.accentSecondary};
    background: ${props.$isActive ? 'rgba(88, 86, 214, 0.10)' : 'transparent'};
  `}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${theme.colors.text};
      background: ${theme.colors.glass};
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
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

export default Navigation;
