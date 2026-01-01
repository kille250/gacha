/**
 * ProfileDropdown - User profile menu component
 *
 * Displays user info, points, and quick settings.
 * Includes R18 toggle and language selector.
 * Desktop only - mobile users access profile via ProfilePage.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MdPerson,
  MdKeyboardArrowDown,
  MdSettings,
  MdExitToApp
} from 'react-icons/md';
import { theme } from '../../design-system';
import { useAnimatedCounter } from '../../hooks';
import LanguageSelector from './LanguageSelector';
import api from '../../utils/api';
import { IconPoints, IconAdultContent } from '../../constants/icons';

/**
 * ProfileDropdown Component
 *
 * @param {Object} props
 * @param {Object} props.user - User object with username, points, allowR18, showR18
 * @param {Function} props.setUser - Function to update user state
 * @param {Function} props.onLogout - Callback when logout is clicked
 */
const ProfileDropdown = ({
  user,
  setUser,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const cleanupRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [isTogglingR18, setIsTogglingR18] = useState(false);

  // Animate points counter for a premium feel
  const animatedPoints = useAnimatedCounter(user?.points || 0, { duration: 500 });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (event) => {
        const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(event.target);
        const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);

        if (isOutsideTrigger && isOutsideDropdown) {
          setIsOpen(false);
          setShowLanguageSubmenu(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);

      cleanupRef.current = () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      cleanupRef.current?.();
    };
  }, [isOpen]);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Close dropdown on navigation
  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const handleToggleR18 = useCallback(async () => {
    if (isTogglingR18 || !user?.allowR18) return;

    setIsTogglingR18(true);
    try {
      const newValue = !user.showR18;
      await api.post('/auth/toggle-r18', { showR18: newValue });
      setUser(prev => ({ ...prev, showR18: newValue }));
    } catch (error) {
      console.error('Failed to toggle R18:', error);
    } finally {
      setIsTogglingR18(false);
    }
  }, [isTogglingR18, user, setUser]);

  return (
    <Container>
      <TriggerButton
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        $isOpen={isOpen}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        type="button"
      >
        <PointsBadge>
          <IconPoints />
          <span>{animatedPoints}</span>
        </PointsBadge>
        <Avatar>
          <MdPerson />
        </Avatar>
        <Arrow $isOpen={isOpen}>
          <MdKeyboardArrowDown />
        </Arrow>
      </TriggerButton>

      {isOpen && createPortal(
        <DropdownPortal
          ref={dropdownRef}
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
          }}
          role="menu"
        >
            {/* User Info Header */}
            <Header>
              <Username>{user?.username || 'User'}</Username>
              <Points>
                <IconPoints />
                <span>{user?.points || 0} {t('common.points')}</span>
              </Points>
            </Header>

            <Divider />

            {/* R18 Toggle */}
            {user?.allowR18 && (
              <MenuItem
                onClick={handleToggleR18}
                disabled={isTogglingR18}
                role="menuitem"
              >
                <MenuIcon $active={user?.showR18}><IconAdultContent /></MenuIcon>
                <span>{user?.showR18 ? t('nav.r18Enabled') : t('nav.r18Disabled')}</span>
                <ToggleSwitch $active={user?.showR18} aria-hidden="true" />
              </MenuItem>
            )}

            {/* Language Selector */}
            <LanguageSelector
              isOpen={showLanguageSubmenu}
              onToggle={() => setShowLanguageSubmenu(!showLanguageSubmenu)}
              onSelect={() => setShowLanguageSubmenu(false)}
              variant="dropdown"
            />

            <Divider />

            {/* Settings */}
            <MenuItem
              onClick={() => handleNavigate('/settings')}
              role="menuitem"
            >
              <MenuIcon><MdSettings /></MenuIcon>
              <span>{t('nav.settings')}</span>
            </MenuItem>

            {/* Logout */}
            <MenuItem
              onClick={handleLogout}
              $danger
              role="menuitem"
            >
              <MenuIcon><MdExitToApp /></MenuIcon>
              <span>{t('nav.logout')}</span>
            </MenuItem>
        </DropdownPortal>,
        document.body
      )}
    </Container>
  );
};

// ==================== STYLED COMPONENTS ====================

const Container = styled.div`
  position: relative;
  display: none;

  @media (min-width: ${theme.breakpoints.md}) {
    display: block;
  }
`;

const TriggerButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$isOpen ? theme.colors.surfaceHover : theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const PointsBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${theme.colors.backgroundTertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textSecondary};
  font-size: 16px;
`;

const Arrow = styled.div`
  display: flex;
  align-items: center;
  color: ${theme.colors.textSecondary};
  font-size: 18px;
  transition: transform ${theme.transitions.fast};
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const DropdownPortal = styled.div`
  position: fixed;
  /* Respect viewport bounds - don't overflow on narrow screens */
  width: min(260px, calc(100vw - 32px));
  /* Prevent vertical overflow on short viewports */
  max-height: calc(100vh - var(--nav-top-height, 56px) - 24px);
  overflow-y: auto;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  /* Use stickyDropdown to appear above banner and other elements */
  z-index: ${theme.zIndex.stickyDropdown};

  /* Very short viewports - more compact */
  @media (max-height: 500px) {
    max-height: calc(100vh - var(--nav-top-height, 56px) - 16px);
  }
`;

const Header = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
`;

const Username = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

const Points = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const Divider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.text};
  text-align: left;
  transition: all ${theme.transitions.fast};
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    background: ${props => props.$danger
      ? 'rgba(255, 59, 48, 0.1)'
      : theme.colors.glass};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  }
`;

const MenuIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 16px;
  color: ${props => props.$active ? theme.colors.error : theme.colors.textSecondary};
`;

const ToggleSwitch = styled.div`
  margin-left: auto;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: ${props => props.$active
    ? theme.colors.primary
    : theme.colors.backgroundTertiary};
  position: relative;
  transition: all ${theme.transitions.fast};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '18px' : '2px'};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: all ${theme.transitions.fast};
  }
`;

export default ProfileDropdown;
