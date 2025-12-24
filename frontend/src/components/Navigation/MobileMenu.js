/**
 * MobileMenu - Slide-in mobile navigation menu
 *
 * Full-screen slide-in menu for mobile navigation.
 * Includes profile info, nav links, settings, and logout.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MdPerson,
  MdClose,
  MdSettings,
  MdExitToApp,
  MdAdminPanelSettings
} from 'react-icons/md';
import { theme } from '../../styles/DesignSystem';
import HourlyReward from './HourlyReward';
import LanguageSelector from './LanguageSelector';

/**
 * MobileMenu Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether menu is visible
 * @param {Function} props.onClose - Called to close menu
 * @param {Object} props.user - User object
 * @param {Array} props.navGroups - Navigation groups [{id, label, items: [{path, label, icon}]}]
 * @param {Object} props.hourlyReward - Hourly reward props
 * @param {Function} props.onLogout - Logout callback
 * @param {Function} props.onToggleR18 - R18 toggle callback
 * @param {boolean} props.isTogglingR18 - R18 toggle loading state
 */
const MobileMenu = ({
  isOpen,
  onClose,
  user,
  navGroups,
  hourlyReward,
  onLogout,
  onToggleR18,
  isTogglingR18,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Menu
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Profile Header */}
            <ProfileHeader>
              <ProfileAvatar>
                <MdPerson />
              </ProfileAvatar>
              <ProfileInfo>
                <ProfileName>{user?.username || 'User'}</ProfileName>
                <ProfilePoints>
                  <span>🪙</span>
                  <span>{user?.points || 0}</span>
                </ProfilePoints>
              </ProfileInfo>
              <CloseButton
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close menu"
                type="button"
              >
                <MdClose />
              </CloseButton>
            </ProfileHeader>

            {/* Hourly Reward */}
            {user && (
              <HourlyReward
                available={hourlyReward.available}
                loading={hourlyReward.loading}
                canClaim={hourlyReward.canClaim}
                timeRemaining={hourlyReward.timeRemaining}
                onClaim={hourlyReward.claim}
                variant="mobile"
              />
            )}

            {/* Navigation Items */}
            <NavItems>
              {navGroups.map((group, groupIndex) => (
                <NavGroup key={group.id}>
                  <NavGroupLabel>{group.label}</NavGroupLabel>
                  {group.items.map(item => (
                    <NavItem
                      key={item.path}
                      $isActive={location.pathname === item.path}
                      onClick={() => handleNavigate(item.path)}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                      type="button"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavItem>
                  ))}
                  {groupIndex < navGroups.length - 1 && <NavDivider />}
                </NavGroup>
              ))}

              {/* Admin Link */}
              {user?.isAdmin && (
                <>
                  <NavDivider />
                  <NavItem
                    $isActive={location.pathname === '/admin'}
                    $isAdmin
                    onClick={() => handleNavigate('/admin')}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                    type="button"
                  >
                    <MdAdminPanelSettings />
                    <span>{t('nav.admin')}</span>
                  </NavItem>
                </>
              )}

              <NavDivider />

              {/* Settings Section */}
              <NavGroupLabel>{t('nav.settings') || 'Settings'}</NavGroupLabel>

              {/* R18 Toggle */}
              {user?.allowR18 && (
                <SettingsItem
                  onClick={onToggleR18}
                  disabled={isTogglingR18}
                  type="button"
                >
                  <span>🔞</span>
                  <span>{user?.showR18 ? t('nav.r18Enabled') : t('nav.r18Disabled')}</span>
                  <ToggleSwitch $active={user?.showR18} aria-hidden="true" />
                </SettingsItem>
              )}

              {/* Language Selector */}
              <LanguageSelector variant="inline" />

              {/* Settings Link */}
              <NavItem
                $isActive={location.pathname === '/settings'}
                onClick={() => handleNavigate('/settings')}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                type="button"
              >
                <MdSettings />
                <span>{t('nav.settings')}</span>
              </NavItem>

              <NavDivider />

              {/* Logout */}
              <LogoutButton
                onClick={handleLogout}
                whileHover={{ backgroundColor: 'rgba(255, 59, 48, 0.15)' }}
                type="button"
              >
                <MdExitToApp />
                <span>{t('nav.logout')}</span>
              </LogoutButton>
            </NavItems>
          </Menu>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

// ==================== STYLED COMPONENTS ====================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
`;

const Menu = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 85%;
  max-width: 340px;
  background: ${theme.colors.backgroundSecondary};
  border-left: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadows.xl};
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg,
    rgba(88, 86, 214, 0.15),
    rgba(175, 82, 222, 0.1)
  );
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const ProfileAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${theme.colors.glass};
  border: 2px solid ${theme.colors.surfaceBorder};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text};
  font-size: 24px;
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

const ProfilePoints = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${theme.fontSizes.sm};

  span:first-child {
    font-size: 14px;
  }

  span:last-child {
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.fontWeights.medium};
  }
`;

const CloseButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 20px;

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const NavItems = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
`;

const NavGroup = styled.div`
  margin-bottom: ${theme.spacing.sm};
`;

const NavGroupLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xs};
`;

const NavItem = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  width: 100%;
  border: none;
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${props => props.$isActive ? theme.colors.text : theme.colors.textSecondary};
  background: ${props => props.$isActive ? theme.colors.glass : 'transparent'};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  text-align: left;
  transition: all ${theme.transitions.fast};

  ${props => props.$isAdmin && `
    color: ${props.$isActive ? theme.colors.accent : theme.colors.accentSecondary};
  `}

  svg {
    font-size: 20px;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const NavDivider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
  margin: ${theme.spacing.md} 0;
`;

const SettingsItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  width: 100%;
  border: none;
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${theme.colors.text};
  background: transparent;
  font-size: ${theme.fontSizes.base};
  text-align: left;
  transition: all ${theme.transitions.fast};
  opacity: ${props => props.disabled ? 0.5 : 1};

  span:first-child {
    font-size: 20px;
  }

  &:hover:not(:disabled) {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
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

const LogoutButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  width: 100%;
  border: none;
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${theme.colors.error};
  background: transparent;
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  text-align: left;

  svg {
    font-size: 20px;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.error};
    outline-offset: 2px;
  }
`;

export default MobileMenu;
