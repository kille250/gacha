import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdDashboard, 
  MdCollections, 
  MdExitToApp, 
  MdCelebration, 
  MdAccessTimeFilled, 
  MdAdminPanelSettings, 
  MdMenu, 
  MdClose, 
  MdLanguage,
  MdPerson,
  MdKeyboardArrowDown,
  MdSettings
} from 'react-icons/md';
import { FaGift, FaTicketAlt, FaDice, FaFish } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import api, { invalidateCache } from '../../utils/api';
import { theme } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';
import { languages } from '../../i18n';

const Navigation = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const profileDropdownRef = useRef(null);
  
  const [rewardStatus, setRewardStatus] = useState({
    available: false,       
    loading: true,         
    timeRemaining: t('nav.checking'),
    nextRewardTime: null,
    checked: false          
  });
  const [rewardPopup, setRewardPopup] = useState({
    show: false,
    amount: 0
  });
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Language dropdown in profile
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  
  // R18 toggle state
  const [isTogglingR18, setIsTogglingR18] = useState(false);
  
  // Track if we just claimed to prevent race conditions
  const [justClaimed, setJustClaimed] = useState(false);
  
  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
        setShowLanguageSubmenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Change language handler
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageSubmenu(false);
  };
  
  // Toggle R18 content preference
  const toggleR18 = async () => {
    if (isTogglingR18) return;
    setIsTogglingR18(true);
    try {
      await api.post('/auth/toggle-r18');
      invalidateCache();
      await refreshUser();
    } catch (err) {
      console.error('Failed to toggle R18 preference:', err);
    } finally {
      setIsTogglingR18(false);
    }
  };

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowProfileDropdown(false);
  }, [location]);

  // Check if hourly reward is available
  const checkRewardAvailability = useCallback(async (forceRefresh = false) => {
    if (justClaimed) return;
    
    if (!user) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }
    
    const lastRewardData = user.lastDailyReward;
    
    if (!lastRewardData && forceRefresh) {
      try {
        if (!rewardStatus.checked) {
          setRewardStatus(prev => ({ 
            ...prev, 
            timeRemaining: "Checking...",
            available: false
          }));
        }
        
        const response = await api.get('/auth/me');
        processRewardData(response.data.lastDailyReward);
      } catch (err) {
        console.error('Error checking reward:', err);
        setRewardStatus(prev => ({
          ...prev,
          loading: false,
          available: false,
          checked: true,
          timeRemaining: "Check failed"
        }));
      }
    } else {
      processRewardData(lastRewardData);
    }
  }, [user, justClaimed]);
  
  const processRewardData = useCallback((lastRewardData) => {
    if (justClaimed) return;
    
    const lastReward = lastRewardData ? new Date(lastRewardData) : null;
    const now = new Date();
    const rewardInterval = 60 * 60 * 1000;
    
    if (!lastReward || now - lastReward > rewardInterval) {
      setRewardStatus({
        available: true,
        loading: false,
        timeRemaining: null,
        nextRewardTime: null,
        checked: true
      });
    } else {
      const remainingTime = rewardInterval - (now - lastReward);
      const minutes = Math.floor(remainingTime / (60 * 1000));
      const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
      const nextTime = new Date(lastReward.getTime() + rewardInterval);
      
      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: `${minutes}m ${seconds}s`,
        nextRewardTime: nextTime,
        checked: true
      });
    }
  }, [justClaimed]);
  
  // Update timer periodically
  useEffect(() => {
    const updateTimer = () => {
      if (!rewardStatus.nextRewardTime) return;
      
      const now = new Date();
      const nextReward = new Date(rewardStatus.nextRewardTime);
      
      if (now >= nextReward) {
        setRewardStatus(prev => ({
          ...prev,
          available: true,
          timeRemaining: null,
          nextRewardTime: null
        }));
      } else {
        const remainingTime = nextReward - now;
        const minutes = Math.floor(remainingTime / (60 * 1000));
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
        
        setRewardStatus(prev => ({
          ...prev,
          timeRemaining: `${minutes}m ${seconds}s`
        }));
      }
    };
    
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [rewardStatus.nextRewardTime]);
  
  useEffect(() => {
    checkRewardAvailability();
  }, [user?.lastDailyReward, checkRewardAvailability]);
  
  // Claim the hourly reward
  const claimHourlyReward = async () => {
    if (rewardStatus.loading || !rewardStatus.available || justClaimed) return;
    
    setJustClaimed(true);
    setRewardStatus(prev => ({ ...prev, loading: true, available: false }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setJustClaimed(false);
        return;
      }
      
      const response = await api.post('/auth/daily-reward');
      
      setRewardPopup({
        show: true,
        amount: response.data.rewardAmount
      });
      
      const now = new Date();
      const rewardInterval = 60 * 60 * 1000;
      const nextRewardTime = new Date(now.getTime() + rewardInterval);
      
      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: '59m 59s',
        nextRewardTime: nextRewardTime,
        checked: true
      });
      
      await refreshUser();
      
      setTimeout(() => {
        setJustClaimed(false);
      }, 2000);
      
      setTimeout(() => {
        setRewardPopup({ show: false, amount: 0 });
      }, 3000);
      
    } catch (err) {
      console.error('Error claiming reward:', err);
      
      if (err.response?.data?.nextRewardTime) {
        setRewardStatus({
          available: false,
          loading: false,
          timeRemaining: `${err.response.data.nextRewardTime.minutes}m ${err.response.data.nextRewardTime.seconds}s`,
          nextRewardTime: new Date(err.response.data.nextRewardTime.timestamp),
          checked: true
        });
      } else {
        setRewardStatus(prev => ({
          ...prev,
          loading: false,
          available: false
        }));
        
        setTimeout(checkRewardAvailability, 3000);
      }
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Navigation items - grouped logically
  const navGroups = [
    {
      id: 'play',
      label: t('nav.play') || 'Play',
      items: [
        { path: '/gacha', label: t('nav.banners'), icon: <MdDashboard /> },
        { path: '/roll', label: t('nav.roll'), icon: <FaDice /> },
      ]
    },
    {
      id: 'activities',
      label: t('nav.activities') || 'Activities',
      items: [
        { path: '/fishing', label: t('nav.fishing'), icon: <FaFish /> },
      ]
    },
    {
      id: 'profile',
      label: t('nav.profile') || 'Profile',
      items: [
        { path: '/collection', label: t('nav.collection'), icon: <MdCollections /> },
        { path: '/coupons', label: t('nav.coupons'), icon: <FaTicketAlt /> },
      ]
    }
  ];

  // Flat nav items for quick reference
  const allNavItems = navGroups.flatMap(g => g.items);

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

        {/* Desktop Navigation - Grouped */}
        <DesktopNav>
          {navGroups.map((group, groupIndex) => (
            <NavGroup key={group.id}>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  $isActive={location.pathname === item.path}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  <span>{item.label}</span>
                </NavLink>
              ))}
              {groupIndex < navGroups.length - 1 && <NavDivider />}
            </NavGroup>
          ))}
          
          {/* Admin Link - Separate */}
          {user?.isAdmin && (
            <>
              <NavDivider />
              <NavLink
                to="/admin"
                $isActive={location.pathname === '/admin'}
                $isAdmin
              >
                <NavIcon><MdAdminPanelSettings /></NavIcon>
                <span>{t('nav.admin')}</span>
              </NavLink>
            </>
          )}
        </DesktopNav>
        
        <UserControls>
          {/* Hourly Reward Button */}
          {user && (
            <RewardButton
              available={rewardStatus.checked && rewardStatus.available}
              onClick={rewardStatus.available && rewardStatus.checked ? claimHourlyReward : undefined}
              disabled={!rewardStatus.available || rewardStatus.loading || !rewardStatus.checked}
              whileHover={rewardStatus.available && rewardStatus.checked ? { scale: 1.02 } : {}}
              whileTap={rewardStatus.available && rewardStatus.checked ? { scale: 0.98 } : {}}
              title={rewardStatus.available ? t('nav.claim') : rewardStatus.timeRemaining}
            >
              {rewardStatus.loading ? (
                <LoadingSpinner />
              ) : rewardStatus.available && rewardStatus.checked ? (
                <>
                  <FaGift />
                  <RewardText>{t('nav.claim')}</RewardText>
                </>
              ) : (
                <>
                  <MdAccessTimeFilled />
                  <TimeRemaining>{rewardStatus.timeRemaining || t('nav.wait')}</TimeRemaining>
                </>
              )}
            </RewardButton>
          )}
          
          {/* Profile Dropdown */}
          <ProfileDropdownContainer ref={profileDropdownRef}>
            <ProfileButton
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              $isOpen={showProfileDropdown}
            >
              <PointsBadge>
                <span>🪙</span>
                <span>{user?.points || 0}</span>
              </PointsBadge>
              <ProfileAvatar>
                <MdPerson />
              </ProfileAvatar>
              <ProfileArrow $isOpen={showProfileDropdown}>
                <MdKeyboardArrowDown />
              </ProfileArrow>
            </ProfileButton>
            
            <AnimatePresence>
              {showProfileDropdown && (
                <ProfileDropdown
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <ProfileHeader>
                    <ProfileName>{user?.username || 'User'}</ProfileName>
                    <ProfilePoints>
                      <span>🪙</span>
                      <span>{user?.points || 0} {t('common.points')}</span>
                    </ProfilePoints>
                  </ProfileHeader>
                  
                  <ProfileDivider />
                  
                  {/* R18 Toggle */}
                  {user?.allowR18 && (
                    <ProfileMenuItem
                      onClick={toggleR18}
                      disabled={isTogglingR18}
                    >
                      <ProfileMenuIcon $active={user?.showR18}>🔞</ProfileMenuIcon>
                      <span>{user?.showR18 ? t('nav.r18Enabled') : t('nav.r18Disabled')}</span>
                      <ToggleSwitch $active={user?.showR18} />
                    </ProfileMenuItem>
                  )}
                  
                  {/* Language Selector */}
                  <ProfileMenuItem
                    onClick={() => setShowLanguageSubmenu(!showLanguageSubmenu)}
                  >
                    <ProfileMenuIcon><MdLanguage /></ProfileMenuIcon>
                    <span>{languages[i18n.language]?.nativeName || 'Language'}</span>
                    <LanguageFlag>{languages[i18n.language]?.flag || '🌐'}</LanguageFlag>
                  </ProfileMenuItem>
                  
                  <AnimatePresence>
                    {showLanguageSubmenu && (
                      <LanguageSubmenu
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {Object.entries(languages).map(([code, lang]) => (
                          <LanguageOption
                            key={code}
                            $active={i18n.language === code}
                            onClick={() => changeLanguage(code)}
                          >
                            <span>{lang.flag}</span>
                            <span>{lang.nativeName}</span>
                            {i18n.language === code && <CheckMark>✓</CheckMark>}
                          </LanguageOption>
                        ))}
                      </LanguageSubmenu>
                    )}
                  </AnimatePresence>
                  
                  <ProfileDivider />
                  
                  <ProfileMenuItem onClick={handleLogout} $danger>
                    <ProfileMenuIcon><MdExitToApp /></ProfileMenuIcon>
                    <span>{t('nav.logout')}</span>
                  </ProfileMenuItem>
                </ProfileDropdown>
              )}
            </AnimatePresence>
          </ProfileDropdownContainer>
          
          {/* Mobile Hamburger */}
          <HamburgerButton 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {mobileMenuOpen ? <MdClose /> : <MdMenu />}
          </HamburgerButton>
        </UserControls>
      </NavContainer>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenuOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <MobileMenu
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Profile Header */}
              <MobileProfileHeader>
                <MobileProfileAvatar>
                  <MdPerson />
                </MobileProfileAvatar>
                <MobileProfileInfo>
                  <MobileProfileName>{user?.username || 'User'}</MobileProfileName>
                  <MobileProfilePoints>
                    <span>🪙</span>
                    <span>{user?.points || 0}</span>
                  </MobileProfilePoints>
                </MobileProfileInfo>
                <CloseButton 
                  onClick={() => setMobileMenuOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MdClose />
                </CloseButton>
              </MobileProfileHeader>
              
              {/* Hourly Reward - Mobile */}
              {user && (
                <MobileRewardButton
                  available={rewardStatus.checked && rewardStatus.available}
                  onClick={rewardStatus.available && rewardStatus.checked ? claimHourlyReward : undefined}
                  disabled={!rewardStatus.available || rewardStatus.loading || !rewardStatus.checked}
                >
                  {rewardStatus.loading ? (
                    <LoadingSpinner />
                  ) : rewardStatus.available && rewardStatus.checked ? (
                    <>
                      <FaGift />
                      <span>{t('nav.claim')} {t('nav.hourlyReward')}</span>
                    </>
                  ) : (
                    <>
                      <MdAccessTimeFilled />
                      <span>{t('nav.hourlyReward')}: {rewardStatus.timeRemaining || t('nav.wait')}</span>
                    </>
                  )}
                </MobileRewardButton>
              )}
              
              <MobileNavItems>
                {/* Grouped Navigation */}
                {navGroups.map((group, groupIndex) => (
                  <MobileNavGroup key={group.id}>
                    <MobileNavGroupLabel>{group.label}</MobileNavGroupLabel>
                    {group.items.map(item => (
                      <MobileNavItem
                        key={item.path}
                        $isActive={location.pathname === item.path}
                        onClick={() => {
                          navigate(item.path);
                          setMobileMenuOpen(false);
                        }}
                        whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </MobileNavItem>
                    ))}
                    {groupIndex < navGroups.length - 1 && <MobileDivider />}
                  </MobileNavGroup>
                ))}
                
                {/* Admin Link */}
                {user?.isAdmin && (
                  <>
                    <MobileDivider />
                    <MobileNavItem
                      $isActive={location.pathname === '/admin'}
                      $isAdmin
                      onClick={() => {
                        navigate('/admin');
                        setMobileMenuOpen(false);
                      }}
                      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    >
                      <MdAdminPanelSettings />
                      <span>{t('nav.admin')}</span>
                    </MobileNavItem>
                  </>
                )}
                
                <MobileDivider />
                
                {/* Settings Section */}
                <MobileNavGroupLabel>{t('nav.settings') || 'Settings'}</MobileNavGroupLabel>
                
                {user?.allowR18 && (
                  <MobileSettingsItem
                    onClick={toggleR18}
                    disabled={isTogglingR18}
                  >
                    <span>🔞</span>
                    <span>{user?.showR18 ? t('nav.r18Enabled') : t('nav.r18Disabled')}</span>
                    <ToggleSwitch $active={user?.showR18} />
                  </MobileSettingsItem>
                )}
                
                {/* Mobile Language Selector */}
                <MobileLanguageSection>
                  <MobileLanguageLabel>
                    <MdLanguage />
                    <span>{t('nav.language') || 'Language'}</span>
                  </MobileLanguageLabel>
                  <MobileLanguageOptions>
                    {Object.entries(languages).map(([code, lang]) => (
                      <MobileLanguageOption
                        key={code}
                        $active={i18n.language === code}
                        onClick={() => changeLanguage(code)}
                      >
                        {lang.flag}
                      </MobileLanguageOption>
                    ))}
                  </MobileLanguageOptions>
                </MobileLanguageSection>
                
                <MobileDivider />
                
                <MobileLogout
                  onClick={handleLogout}
                  whileHover={{ backgroundColor: "rgba(255, 59, 48, 0.15)" }}
                >
                  <MdExitToApp />
                  <span>{t('nav.logout')}</span>
                </MobileLogout>
              </MobileNavItems>
            </MobileMenu>
          </MobileMenuOverlay>
        )}
      </AnimatePresence>
      
      {/* Reward Popup */}
      <AnimatePresence>
        {rewardPopup.show && (
          <PopupContainer>
            <RewardPopup
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <MdCelebration className="celebration-icon" />
              <PopupContent>
                <PopupTitle>{t('nav.hourlyReward')}</PopupTitle>
                <PopupAmount>+{rewardPopup.amount} 🪙</PopupAmount>
              </PopupContent>
            </RewardPopup>
          </PopupContainer>
        )}
      </AnimatePresence>
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
  font-weight: ${theme.fontWeights.medium};
  background: ${props => props.$isActive ? theme.colors.glass : 'transparent'};
  transition: all ${theme.transitions.fast};
  position: relative;
  
  ${props => props.$isActive && `
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background: ${theme.colors.primary};
      border-radius: 1px;
    }
  `}
  
  ${props => props.$isAdmin && `
    color: ${props.$isActive ? theme.colors.accent : theme.colors.accentSecondary};
  `}
  
  &:hover {
    color: ${theme.colors.text};
    background: ${theme.colors.glass};
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

const RewardButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.available 
    ? `linear-gradient(135deg, ${theme.colors.warning}, #ff6b00)`
    : theme.colors.glass};
  border: 1px solid ${props => props.available ? 'transparent' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: ${props => props.available ? 'pointer' : 'default'};
  transition: all ${theme.transitions.fast};
  
  svg {
    font-size: 14px;
  }
  
  &:disabled {
    opacity: ${props => props.available ? 0.7 : 1};
    cursor: ${props => props.available ? 'not-allowed' : 'default'};
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const RewardText = styled.span`
  @media (max-width: ${theme.breakpoints.lg}) {
    display: none;
  }
`;

const TimeRemaining = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
`;

const LoadingSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Profile Dropdown
const ProfileDropdownContainer = styled.div`
  position: relative;
  display: none;
  
  @media (min-width: ${theme.breakpoints.md}) {
    display: block;
  }
`;

const ProfileButton = styled(motion.button)`
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

const ProfileAvatar = styled.div`
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

const ProfileArrow = styled.div`
  display: flex;
  align-items: center;
  color: ${theme.colors.textSecondary};
  font-size: 18px;
  transition: transform ${theme.transitions.fast};
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const ProfileDropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 260px;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  overflow: hidden;
  z-index: ${theme.zIndex.dropdown};
`;

const ProfileHeader = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
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
  color: ${theme.colors.textSecondary};
`;

const ProfileDivider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
`;

const ProfileMenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.text};
  transition: all ${theme.transitions.fast};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    background: ${props => props.$danger 
      ? 'rgba(255, 59, 48, 0.1)' 
      : theme.colors.glass};
  }
`;

const ProfileMenuIcon = styled.span`
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

const LanguageFlag = styled.span`
  margin-left: auto;
  font-size: 16px;
`;

const LanguageSubmenu = styled(motion.div)`
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  padding-left: 48px;
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.1)' : 'transparent'};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.glass};
  }
`;

const CheckMark = styled.span`
  margin-left: auto;
  color: ${theme.colors.primary};
  font-weight: ${theme.fontWeights.bold};
`;

const HamburgerButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 22px;
  
  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

// Mobile Menu
const MobileMenuOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(${theme.blur.sm});
  z-index: ${theme.zIndex.modal};
`;

const MobileMenu = styled(motion.div)`
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

const MobileProfileHeader = styled.div`
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

const MobileProfileAvatar = styled.div`
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

const MobileProfileInfo = styled.div`
  flex: 1;
`;

const MobileProfileName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

const MobileProfilePoints = styled.div`
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
`;

const MobileRewardButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.available 
    ? `linear-gradient(135deg, ${theme.colors.warning}, #ff6b00)`
    : theme.colors.glass};
  border: 1px solid ${props => props.available ? 'transparent' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.available ? 'white' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: ${props => props.available ? 'pointer' : 'default'};
  transition: all ${theme.transitions.fast};
  
  svg {
    font-size: 18px;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const MobileNavItems = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
`;

const MobileNavGroup = styled.div`
  margin-bottom: ${theme.spacing.sm};
`;

const MobileNavGroupLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xs};
`;

const MobileNavItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${props => props.$isActive ? theme.colors.text : theme.colors.textSecondary};
  background: ${props => props.$isActive ? theme.colors.glass : 'transparent'};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  
  ${props => props.$isAdmin && `
    color: ${props.$isActive ? theme.colors.accent : theme.colors.accentSecondary};
  `}
  
  svg {
    font-size: 20px;
  }
`;

const MobileDivider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
  margin: ${theme.spacing.md} 0;
`;

const MobileSettingsItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  transition: all ${theme.transitions.fast};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  span:first-child {
    font-size: 20px;
  }
  
  &:hover {
    background: ${theme.colors.glass};
  }
`;

const MobileLanguageSection = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
`;

const MobileLanguageLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.sm};
  
  svg {
    font-size: 18px;
  }
`;

const MobileLanguageOptions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

const MobileLanguageOption = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.2)' : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-size: 20px;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

const MobileLogout = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  
  svg {
    font-size: 20px;
  }
`;

// Reward Popup
const PopupContainer = styled.div`
  position: fixed;
  top: 100px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: ${theme.zIndex.toast};
  pointer-events: none;
`;

const RewardPopup = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadows.lg};
  pointer-events: auto;
  
  .celebration-icon {
    font-size: 28px;
    color: ${theme.colors.warning};
    animation: bounce 1s infinite alternate;
    
    @keyframes bounce {
      from { transform: scale(1); }
      to { transform: scale(1.2); }
    }
  }
`;

const PopupContent = styled.div``;

const PopupTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: 2px;
`;

const PopupAmount = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.warning};
`;

export default Navigation;
