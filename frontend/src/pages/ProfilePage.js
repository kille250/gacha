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
import { FaStar } from 'react-icons/fa';
import { IconPoints, IconAdultContent } from '../constants/icons';
import { AuthContext } from '../context/AuthContext';
import { springs, Container, Modal, PageTransition } from '../design-system';
import { LanguageSelector } from '../components/Navigation';
import { SelectorInventory } from '../components/GameEnhancements';
import { useAccountLevel } from '../hooks/useGameEnhancements';
import { AccountLevelCard } from '../components/AccountLevel';
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
  LevelSection,
  LevelCard,
  LevelCircle,
  LevelInfo,
  LevelTitle,
  LevelProgressBar,
  LevelProgressFill,
  LevelProgressText,
  BadgeRow,
} from './ProfilePage.styles';
import { theme } from '../design-system';

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);
  const { accountLevel, loading: levelLoading } = useAccountLevel();

  const [isTogglingR18, setIsTogglingR18] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);

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
      en: { flag: 'EN', name: 'English' },
      ja: { flag: 'JA', name: '日本語' },
      zh: { flag: 'ZH', name: '中文' },
      ko: { flag: 'KO', name: '한국어' },
    };
    return langMap[i18n.language] || langMap.en;
  };

  return (
    <PageTransition>
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
              <BadgeRow>
                <PointsBadge>
                  <span><IconPoints /></span>
                  <span>{user?.points?.toLocaleString() || 0}</span>
                </PointsBadge>
              </BadgeRow>
            </UserInfo>
          </AvatarSection>
        </ProfileHeader>

        {/* Account Level Section */}
        {!levelLoading && accountLevel && (
          <LevelSection aria-labelledby="level-section-title">
            <SectionTitle id="level-section-title">
              <FaStar style={{ marginRight: '6px', verticalAlign: 'middle' }} aria-hidden="true" />
              {t('accountLevel.title', 'Account Level')}
            </SectionTitle>
            <LevelCard
              onClick={() => setShowLevelModal(true)}
              aria-label={t('accountLevel.viewDetails', 'View level details')}
              type="button"
            >
              <LevelCircle aria-hidden="true">
                {accountLevel.level || 1}
              </LevelCircle>
              <LevelInfo>
                <LevelTitle>
                  {t('accountLevel.levelLabel', 'Level {{level}}', { level: accountLevel.level || 1 })}
                </LevelTitle>
                <LevelProgressBar
                  role="progressbar"
                  aria-valuenow={Math.round((accountLevel.progress || 0) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('accountLevel.progressLabel', 'Level progress')}
                >
                  <LevelProgressFill style={{ width: `${Math.round((accountLevel.progress || 0) * 100)}%` }} />
                </LevelProgressBar>
                <LevelProgressText>
                  {accountLevel.isMaxLevel
                    ? t('accountLevel.maxLevelReached', 'Maximum level reached!')
                    : t('accountLevel.xpProgress', '{{current}} / {{needed}} XP', {
                        current: accountLevel.xpInLevel?.toLocaleString() || 0,
                        needed: accountLevel.xpNeededForLevel?.toLocaleString() || 100
                      })}
                </LevelProgressText>
              </LevelInfo>
              <ChevronIcon><MdChevronRight /></ChevronIcon>
            </LevelCard>
          </LevelSection>
        )}

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
              <SettingsIcon><IconAdultContent /></SettingsIcon>
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

      {/* Account Level Modal */}
      <Modal
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        title={t('accountLevel.title', 'Account Level')}
      >
        {accountLevel && (
          <AccountLevelCard
            level={accountLevel.level}
            xp={accountLevel.xp}
            xpToNext={accountLevel.xpToNext}
            xpInLevel={accountLevel.xpInLevel}
            xpNeededForLevel={accountLevel.xpNeededForLevel}
            progress={accountLevel.progress}
            isMaxLevel={accountLevel.isMaxLevel}
          />
        )}
      </Modal>
    </PageWrapper>
    </PageTransition>
  );
};

export default ProfilePage;
