/**
 * ProfilePage - Unified user profile hub
 *
 * Consolidates user-related actions into a single destination:
 * - User info and stats
 * - Quick access to Collection, Coupons, Settings
 * - R18 toggle (if enabled)
 * - Language selector
 * - Logout
 *
 * This replaces the need for a hamburger menu on mobile.
 */

import React, { useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MdPerson,
  MdCollections,
  MdLocalActivity,
  MdSettings,
  MdExitToApp,
  MdAdminPanelSettings,
  MdChevronRight,
  MdLanguage
} from 'react-icons/md';
import { AuthContext } from '../context/AuthContext';
import { springs, Container } from '../design-system';
import { LanguageSelector } from '../components/Navigation';
import { SelectorInventory } from '../components/GameEnhancements';
import api from '../utils/api';

// Styled Components
import {
  PageWrapper,
  ProfileHeader,
  AvatarSection,
  Avatar,
  UserInfo,
  Username,
  PointsBadge,
  StatsGrid,
  StatCard,
  StatIcon,
  StatContent,
  StatLabel,
  StatHint,
  ChevronIcon,
  SectionTitle,
  SettingsCard,
  SettingsRow,
  SettingsIcon,
  SettingsLabel,
  SettingsHint,
  ToggleSwitch,
  LanguageFlag,
  LanguageSelectorWrapper,
  LogoutButton,
  VersionText,
} from './ProfilePage.styles';
import { theme } from '../design-system';

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);

  const [isTogglingR18, setIsTogglingR18] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  }, [logout, navigate]);

  const toggleR18 = useCallback(async () => {
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

  const getLanguageDisplay = () => {
    const langMap = {
      en: { flag: '🇺🇸', name: 'English' },
      ja: { flag: '🇯🇵', name: '日本語' },
      zh: { flag: '🇨🇳', name: '中文' },
      ko: { flag: '🇰🇷', name: '한국어' },
    };
    return langMap[i18n.language] || langMap.en;
  };

  return (
    <PageWrapper>
      <Container>
        {/* Profile Header */}
        <ProfileHeader>
          <AvatarSection>
            <Avatar>
              <MdPerson />
            </Avatar>
            <UserInfo>
              <Username>{user?.username || 'User'}</Username>
              <PointsBadge>
                <span>🪙</span>
                <span>{user?.points?.toLocaleString() || 0}</span>
              </PointsBadge>
            </UserInfo>
          </AvatarSection>
        </ProfileHeader>

        {/* Quick Stats */}
        <StatsGrid>
          <StatCard
            onClick={() => navigate('/collection')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
          >
            <StatIcon $color={theme.colors.primary}>
              <MdCollections />
            </StatIcon>
            <StatContent>
              <StatLabel>{t('nav.collection')}</StatLabel>
              <StatHint>{t('profile.viewCards')}</StatHint>
            </StatContent>
            <ChevronIcon><MdChevronRight /></ChevronIcon>
          </StatCard>

          <StatCard
            onClick={() => navigate('/coupons')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
          >
            <StatIcon $color="#ff9500">
              <MdLocalActivity />
            </StatIcon>
            <StatContent>
              <StatLabel>{t('nav.coupons')}</StatLabel>
              <StatHint>{t('profile.redeemCodes')}</StatHint>
            </StatContent>
            <ChevronIcon><MdChevronRight /></ChevronIcon>
          </StatCard>
        </StatsGrid>

        {/* Character Selectors */}
        <SelectorInventory />

        {/* Settings Section */}
        <SectionTitle>{t('nav.settings')}</SectionTitle>
        <SettingsCard>
          {/* R18 Toggle */}
          {user?.allowR18 && (
            <SettingsRow
              as="button"
              onClick={toggleR18}
              disabled={isTogglingR18}
              type="button"
            >
              <SettingsIcon>🔞</SettingsIcon>
              <SettingsLabel>
                <span>{t('profile.r18Content')}</span>
                <SettingsHint>
                  {user?.showR18 ? t('nav.r18Enabled') : t('nav.r18Disabled')}
                </SettingsHint>
              </SettingsLabel>
              <ToggleSwitch $active={user?.showR18} aria-hidden="true" />
            </SettingsRow>
          )}

          {/* Language */}
          <SettingsRow
            as="button"
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            type="button"
          >
            <SettingsIcon><MdLanguage /></SettingsIcon>
            <SettingsLabel>
              <span>{t('profile.language')}</span>
              <SettingsHint>{getLanguageDisplay().name}</SettingsHint>
            </SettingsLabel>
            <LanguageFlag>{getLanguageDisplay().flag}</LanguageFlag>
          </SettingsRow>

          {showLanguageSelector && (
            <LanguageSelectorWrapper>
              <LanguageSelector variant="inline" />
            </LanguageSelectorWrapper>
          )}

          {/* Account Settings */}
          <SettingsRow
            as="button"
            onClick={() => navigate('/settings')}
            type="button"
          >
            <SettingsIcon><MdSettings /></SettingsIcon>
            <SettingsLabel>
              <span>{t('profile.accountSettings')}</span>
              <SettingsHint>{t('profile.manageAccount')}</SettingsHint>
            </SettingsLabel>
            <ChevronIcon><MdChevronRight /></ChevronIcon>
          </SettingsRow>

          {/* Admin Panel */}
          {user?.isAdmin && (
            <SettingsRow
              as="button"
              onClick={() => navigate('/admin')}
              $admin
              type="button"
            >
              <SettingsIcon $admin><MdAdminPanelSettings /></SettingsIcon>
              <SettingsLabel>
                <span>{t('nav.admin')}</span>
                <SettingsHint>{t('profile.adminPanel')}</SettingsHint>
              </SettingsLabel>
              <ChevronIcon><MdChevronRight /></ChevronIcon>
            </SettingsRow>
          )}
        </SettingsCard>

        {/* Logout */}
        <LogoutButton
          onClick={handleLogout}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={springs.snappy}
        >
          <MdExitToApp />
          <span>{t('nav.logout')}</span>
        </LogoutButton>

        {/* App Version */}
        <VersionText>{t('profile.version', { version: '1.0' })}</VersionText>
      </Container>
    </PageWrapper>
  );
};

export default ProfilePage;
