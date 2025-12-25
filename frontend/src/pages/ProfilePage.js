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
import styled from 'styled-components';
import { motion } from 'framer-motion';
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
import { theme, springs, Container } from '../design-system';
import { LanguageSelector } from '../components/Navigation';
import api from '../utils/api';

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
        <VersionText>GachaMaster v1.0</VersionText>
      </Container>
    </PageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const PageWrapper = styled.div`
  min-height: 100%;
  padding: ${theme.spacing.lg} 0;
  padding-bottom: calc(${theme.spacing.xl} + 80px);
`;

const ProfileHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const Avatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  box-shadow: 0 4px 20px rgba(0, 113, 227, 0.3);
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Username = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
`;

const PointsBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  width: fit-content;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${theme.radius.lg};
  background: ${props => props.$color ? `${props.$color}20` : theme.colors.glass};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color || theme.colors.primary};
  font-size: 22px;
  flex-shrink: 0;
`;

const StatContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const StatHint = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const ChevronIcon = styled.div`
  color: ${theme.colors.textMuted};
  font-size: 20px;
  display: flex;
  align-items: center;
`;

const SectionTitle = styled.h2`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.md};
  padding-left: ${theme.spacing.xs};
`;

const SettingsCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  margin-bottom: ${theme.spacing.xl};
`;

const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};
  font-family: inherit;
  color: inherit;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: none;
    background: ${theme.colors.glass};
    box-shadow: inset 0 0 0 2px ${theme.colors.focusRing};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${props => props.$admin && `
    background: rgba(88, 86, 214, 0.05);

    &:hover {
      background: rgba(88, 86, 214, 0.1);
    }
  `}
`;

const SettingsIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$admin ? 'rgba(88, 86, 214, 0.15)' : theme.colors.glass};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$admin ? theme.colors.accent : theme.colors.textSecondary};
  font-size: 18px;
  flex-shrink: 0;
`;

const SettingsLabel = styled.div`
  flex: 1;
  min-width: 0;

  > span:first-child {
    display: block;
    font-size: ${theme.fontSizes.base};
    font-weight: ${theme.fontWeights.medium};
    color: ${theme.colors.text};
  }
`;

const SettingsHint = styled.span`
  display: block;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const ToggleSwitch = styled.div`
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: ${props => props.$active
    ? theme.colors.primary
    : theme.colors.backgroundTertiary};
  position: relative;
  transition: all ${theme.timing.fast} ${theme.easing.easeOut};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$active ? '21px' : '3px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all ${theme.timing.fast} ${theme.easing.easeOut};
  }
`;

const LanguageFlag = styled.span`
  font-size: 20px;
`;

const LanguageSelectorWrapper = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const LogoutButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.lg};
  background: transparent;
  border: 1px solid ${theme.colors.error};
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: rgba(255, 59, 48, 0.1);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.error};
  }

  svg {
    font-size: 20px;
  }
`;

const VersionText = styled.div`
  text-align: center;
  margin-top: ${theme.spacing.xl};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

export default ProfilePage;
