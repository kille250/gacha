/**
 * Navigation - Main navigation component
 *
 * Desktop: Full navigation bar with links and dropdowns
 * Mobile: Minimal top bar with logo and hourly reward button
 *        (Navigation handled by BottomNav component)
 *
 * Sub-components:
 * - HourlyReward: Reward button with timer (visible on both desktop & mobile)
 * - ProfileDropdown: User profile menu (desktop only)
 * - RewardPopup: Celebration popup for claimed rewards
 * - GamesDropdown: Games hub dropdown (desktop only)
 *
 * Hooks:
 * - useHourlyReward: Hourly reward state management
 */

import React, { useMemo, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
// motion/AnimatePresence available if needed for future animations
import { MdAdminPanelSettings, MdExpandMore } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useHourlyReward } from '../../hooks';
import { useAccountLevel } from '../../hooks/useGameEnhancements';
import { DESKTOP_NAV_ITEMS, GAMES_ITEMS, ADMIN_NAV_ITEM, isAnyRouteActive } from '../../constants/navigation';
import { AuthContext } from '../../context/AuthContext';
import { AccountLevelBadge } from '../AccountLevel';

// Extracted sub-components
import HourlyReward from './HourlyReward';
import ProfileDropdown from './ProfileDropdown';
import RewardPopup from './RewardPopup';

const Navigation = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);

  // Dropdown state
  const [gamesDropdownOpen, setGamesDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Hourly reward state
  const hourlyReward = useHourlyReward();

  // Account level state
  const { accountLevel } = useAccountLevel();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setGamesDropdownOpen(false);
      }
    };

    if (gamesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [gamesDropdownOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setGamesDropdownOpen(false);
  }, [location.pathname]);

  // Toggle games dropdown
  const toggleGamesDropdown = useCallback(() => {
    setGamesDropdownOpen(prev => !prev);
  }, []);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setGamesDropdownOpen(false);
    }
  }, []);

  // Check if games tab is active
  const isGamesActive = useMemo(() => {
    const gamesPaths = GAMES_ITEMS.map(item => item.path);
    return isAnyRouteActive(gamesPaths, location.pathname);
  }, [location.pathname]);

  // Build nav items from config
  const navItems = useMemo(() =>
    DESKTOP_NAV_ITEMS.map(item => ({
      ...item,
      label: t(item.labelKey),
      icon: item.icon ? <item.icon /> : null,
      items: item.items?.map(subItem => ({
        ...subItem,
        label: t(subItem.labelKey),
        icon: <subItem.icon />,
      })),
    })),
  [t]);

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
          {navItems.map((item) => {
            // Dropdown item (Games)
            if (item.isDropdown) {
              return (
                <DropdownWrapper key={item.id} ref={dropdownRef}>
                  <DropdownTrigger
                    onClick={toggleGamesDropdown}
                    onKeyDown={handleKeyDown}
                    $isActive={isGamesActive || gamesDropdownOpen}
                    aria-expanded={gamesDropdownOpen}
                    aria-haspopup="menu"
                  >
                    <NavIcon>{item.icon}</NavIcon>
                    <span>{item.label}</span>
                    <DropdownArrow $isOpen={gamesDropdownOpen}>
                      <MdExpandMore />
                    </DropdownArrow>
                  </DropdownTrigger>

                  {gamesDropdownOpen && (
                    <DropdownMenuContainer>
                      <DropdownMenuInner role="menu">
                        {item.items.map((subItem) => {
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <DropdownItem
                              key={subItem.path}
                              to={subItem.path}
                              role="menuitem"
                              $isActive={isSubActive}
                              aria-current={isSubActive ? 'page' : undefined}
                            >
                              <DropdownItemIcon $isActive={isSubActive}>
                                {subItem.icon}
                              </DropdownItemIcon>
                              <span>{subItem.label}</span>
                              {subItem.isNew && <NewBadge>{t('common.new')}</NewBadge>}
                            </DropdownItem>
                          );
                        })}
                      </DropdownMenuInner>
                    </DropdownMenuContainer>
                  )}
                </DropdownWrapper>
              );
            }

            // Regular nav link
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
                <span>{t(ADMIN_NAV_ITEM.labelKey)}</span>
              </NavLink>
            </>
          )}
        </DesktopNav>

        {/* User Controls */}
        <UserControls>
          {/* Account Level Badge - Desktop only */}
          {user && accountLevel && (
            <AccountLevelBadgeWrapper>
              <AccountLevelBadge
                level={accountLevel.level || 1}
                progress={accountLevel.progress || 0}
                onClick={() => navigate('/profile')}
              />
            </AccountLevelBadgeWrapper>
          )}

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
        onDismiss={hourlyReward.dismissPopup}
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
  /* Use CSS variable for height synchronization with dependent components */
  min-height: var(--nav-top-height, ${theme.navHeights.top.default});

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }

  /* Landscape mode on mobile/tablet - more compact */
  @media (max-width: ${theme.breakpoints.md}) and (orientation: landscape) {
    min-height: var(--nav-top-height, ${theme.navHeights.top.landscape});
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    gap: ${theme.spacing.md};
  }

  /* Very short viewports - ultra compact */
  @media (max-height: 400px) {
    min-height: var(--nav-top-height, ${theme.navHeights.top.compact});
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    gap: ${theme.spacing.sm};
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

  /* Very short viewports - smaller logo */
  @media (max-height: 400px) {
    width: 22px;
    height: 22px;
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
  /* Prevent horizontal overflow - allow shrinking and scrolling if needed */
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }

  /* At narrower desktop widths, reduce spacing */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    gap: 2px;
  }
`;

const NavDivider = styled.div`
  width: 1px;
  height: 24px;
  background: ${theme.colors.surfaceBorder};
  margin: 0 ${theme.spacing.sm};
  flex-shrink: 0;

  /* Compact mode for narrower desktop screens */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    height: 20px;
    margin: 0 ${theme.spacing.xs};
  }
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
  /* Prevent text wrapping and ensure links don't shrink */
  white-space: nowrap;
  flex-shrink: 0;

  ${props => props.$isActive && `
    color: ${theme.colors.primary};
  `}

  ${props => props.$isAdmin && `
    color: ${props.$isActive ? theme.colors.accent : theme.colors.accentSecondary};
    background: ${props.$isActive ? 'rgba(88, 86, 214, 0.10)' : 'transparent'};
  `}

  /* Compact mode for narrower desktop screens */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    gap: ${theme.spacing.xs};
    font-size: ${theme.fontSizes.xs};
  }

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

  /* Compact mode for narrower desktop screens */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    font-size: 16px;
  }
`;

// ==================== DROPDOWN COMPONENTS ====================

const DropdownWrapper = styled.div`
  position: relative;
`;

const DropdownTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textSecondary};
  background: ${props => props.$isActive ? theme.colors.primarySubtle : 'transparent'};
  border: none;
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.$isActive ? theme.fontWeights.medium : theme.fontWeights.regular};
  font-family: inherit;
  white-space: nowrap;
  transition:
    color ${theme.timing.fast} ${theme.easing.easeOut},
    background ${theme.timing.fast} ${theme.easing.easeOut};

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

  /* Compact mode for narrower desktop screens */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    gap: ${theme.spacing.xs};
    font-size: ${theme.fontSizes.xs};
  }
`;

const DropdownArrow = styled.span`
  display: flex;
  align-items: center;
  font-size: 18px;
  transition: transform ${theme.timing.fast} ${theme.easing.easeOut};

  ${props => props.$isOpen && `
    transform: rotate(180deg);
  `}
`;

const DropdownMenuContainer = styled.div`
  position: absolute;
  top: calc(100% + ${theme.spacing.xs});
  left: 50%;
  transform: translateX(-50%);
  z-index: ${theme.zIndex.stickyDropdown};
`;

const DropdownMenuInner = styled.div`
  min-width: 200px;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  padding: ${theme.spacing.xs};
`;

const DropdownItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.text};
  background: ${props => props.$isActive ? theme.colors.primarySubtle : 'transparent'};
  text-decoration: none;
  font-size: ${theme.fontSizes.sm};
  transition:
    color ${theme.timing.fast} ${theme.easing.easeOut},
    background ${theme.timing.fast} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.glass};
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${theme.colors.focusRing};
  }
`;

const DropdownItemIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$isActive ? theme.colors.primary : theme.colors.backgroundSecondary};
  color: ${props => props.$isActive ? 'white' : theme.colors.textSecondary};
  font-size: 16px;
`;

const NewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  background: linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.successHover});
  border-radius: ${theme.radius.full};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: auto;
`;

// ==================== USER CONTROLS ====================

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  /* Prevent user controls from shrinking */
  flex-shrink: 0;

  /* Compact mode for narrower desktop screens */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    gap: ${theme.spacing.xs};
  }
`;

const AccountLevelBadgeWrapper = styled.div`
  display: none;

  /* Only show on desktop */
  @media (min-width: ${theme.breakpoints.md}) {
    display: block;
  }
`;

export default Navigation;
