/**
 * useNavigation - Shared navigation state and logic
 *
 * Centralizes navigation-related state management including:
 * - Mobile menu open/close state
 * - R18 toggle
 * - Navigation groups configuration
 */

import { useState, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MdCasino,
  MdCollections,
  MdLocalActivity
} from 'react-icons/md';
import { GiFishingPole, GiDoubleDragon } from 'react-icons/gi';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

/**
 * Custom hook for navigation state management
 * @returns {Object} Navigation state and handlers
 */
export const useNavigation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, logout: contextLogout } = useContext(AuthContext);

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTogglingR18, setIsTogglingR18] = useState(false);

  // Navigation groups configuration
  const navGroups = useMemo(() => [
    {
      id: 'play',
      label: t('nav.play'),
      items: [
        {
          path: '/gacha',
          label: t('nav.gacha'),
          icon: <MdCasino />,
        },
        {
          path: '/collection',
          label: t('nav.collection'),
          icon: <MdCollections />,
        },
      ],
    },
    {
      id: 'activities',
      label: t('nav.activities'),
      items: [
        {
          path: '/fishing',
          label: t('nav.fishing'),
          icon: <GiFishingPole />,
        },
        {
          path: '/dojo',
          label: t('nav.dojo'),
          icon: <GiDoubleDragon />,
        },
        {
          path: '/coupons',
          label: t('nav.coupons'),
          icon: <MdLocalActivity />,
        },
      ],
    },
  ], [t]);

  // Handlers
  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, []);

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

  const handleLogout = useCallback(async () => {
    closeMobileMenu();
    try {
      await contextLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  }, [closeMobileMenu, contextLogout, navigate]);

  return {
    // User
    user,

    // Mobile menu
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,

    // R18
    isTogglingR18,
    toggleR18,

    // Navigation config
    navGroups,

    // Actions
    handleLogout,
  };
};

export default useNavigation;
