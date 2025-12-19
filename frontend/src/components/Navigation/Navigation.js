import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdDashboard, MdCollections, MdExitToApp, MdSettings, MdCelebration, MdAccessTimeFilled, MdAdminPanelSettings, MdMenu, MdClose, MdLanguage } from 'react-icons/md';
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
  
  // Language dropdown state
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  // R18 toggle state
  const [isTogglingR18, setIsTogglingR18] = useState(false);
  
  // Change language handler
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageDropdown(false);
  };
  
  // Toggle R18 content preference
  const toggleR18 = async () => {
    if (isTogglingR18) return;
    setIsTogglingR18(true);
    try {
      await api.post('/auth/toggle-r18');
      // Clear all cached data since R18 filter affects everything
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
  }, [location]);

  // Check if hourly reward is available - optimized to use user data from context
  const checkRewardAvailability = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }
    
    // Use user's lastDailyReward from context if available (no API call needed)
    const lastRewardData = user.lastDailyReward;
    
    // Only fetch from API if we don't have the data or forcing refresh
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
  }, [user]);
  
  // Process reward data (extracted to avoid duplication)
  const processRewardData = useCallback((lastRewardData) => {
    const lastReward = lastRewardData ? new Date(lastRewardData) : null;
    const now = new Date();
    const rewardInterval = 60 * 60 * 1000; // 1 hour
    
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
  }, []);
  
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
  
  // Initial check - no more polling needed since we use context data
  // The timer useEffect above handles countdown updates locally
  useEffect(() => {
    checkRewardAvailability();
  }, [user?.lastDailyReward, checkRewardAvailability]);
  
  // Claim the hourly reward
  const claimHourlyReward = async () => {
    if (rewardStatus.loading || !rewardStatus.available) return;
    
    setRewardStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
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
      
      refreshUser();
      
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
  
  // Navigation items
  const navItems = [
    { path: '/gacha', label: t('nav.banners'), icon: <MdDashboard />, adminOnly: false },
    { path: '/roll', label: t('nav.roll'), icon: <FaDice />, adminOnly: false },
    { path: '/fishing', label: t('nav.fishing'), icon: <FaFish />, adminOnly: false },
    { path: '/collection', label: t('nav.collection'), icon: <MdCollections />, adminOnly: false },
    { path: '/coupons', label: t('nav.coupons'), icon: <FaTicketAlt />, adminOnly: false },
    { path: '/admin', label: t('nav.admin'), icon: <MdSettings />, adminOnly: true },
  ];

  return (
    <>
      <NavContainer>
        {/* Logo */}
        <LogoSection>
          <Logo to="/gacha">
            G<LogoAccent>M</LogoAccent>
          </Logo>
        </LogoSection>

        {/* Desktop Navigation */}
        <DesktopNav>
          {navItems.map(item => (
            (!item.adminOnly || (item.adminOnly && user?.isAdmin)) && (
              <NavLink
                key={item.path}
                to={item.path}
                $isActive={location.pathname === item.path}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            )
          ))}
        </DesktopNav>
        
        <UserControls>
          {user && (
            <RewardButton
              available={rewardStatus.checked && rewardStatus.available}
              onClick={rewardStatus.available && rewardStatus.checked ? claimHourlyReward : undefined}
              disabled={!rewardStatus.available || rewardStatus.loading || !rewardStatus.checked}
              whileHover={rewardStatus.available && rewardStatus.checked ? { scale: 1.02 } : {}}
              whileTap={rewardStatus.available && rewardStatus.checked ? { scale: 0.98 } : {}}
            >
              {rewardStatus.loading ? (
                <LoadingSpinner />
              ) : rewardStatus.available && rewardStatus.checked ? (
                <>
                  <FaGift />
                  <span>{t('nav.claim')}</span>
                </>
              ) : (
                <>
                  <MdAccessTimeFilled />
                  <TimeRemaining>{rewardStatus.timeRemaining || t('nav.wait')}</TimeRemaining>
                </>
              )}
            </RewardButton>
          )}
          
          <PointsDisplay>
            <span>🪙</span>
            <span>{user?.points || 0}</span>
          </PointsDisplay>
          
          <R18Toggle
            active={user?.allowR18}
            onClick={toggleR18}
            disabled={isTogglingR18}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={user?.allowR18 ? t('nav.r18ContentEnabled') : t('nav.r18ContentDisabled')}
          >
            🔞
          </R18Toggle>
          
          {/* Language Selector */}
          <LanguageSelector>
            <LanguageButton
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MdLanguage />
              <span>{languages[i18n.language]?.flag || '🌐'}</span>
            </LanguageButton>
            <AnimatePresence>
              {showLanguageDropdown && (
                <LanguageDropdown
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {Object.entries(languages).map(([code, lang]) => (
                    <LanguageOption
                      key={code}
                      $active={i18n.language === code}
                      onClick={() => changeLanguage(code)}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                    </LanguageOption>
                  ))}
                </LanguageDropdown>
              )}
            </AnimatePresence>
          </LanguageSelector>
          
          <LogoutButton 
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MdExitToApp />
            <span>{t('nav.logout')}</span>
          </LogoutButton>
          
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
            <MobileMenuHeader>
              <h3>{t('nav.menu')}</h3>
              <CloseButton 
                onClick={() => setMobileMenuOpen(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <MdClose />
              </CloseButton>
            </MobileMenuHeader>
              
              <MobileNavItems>
                {navItems.map(item => (
                  (!item.adminOnly || (item.adminOnly && user?.isAdmin)) && (
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
                  )
                ))}
                
                <Divider />
                
                <MobileR18Toggle
                  active={user?.allowR18}
                  onClick={toggleR18}
                  disabled={isTogglingR18}
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                >
                  <span>🔞</span>
                  <span>{user?.allowR18 ? t('nav.r18Enabled') : t('nav.r18Disabled')}</span>
                </MobileR18Toggle>
                
                {/* Mobile Language Selector */}
                <MobileLanguageSection>
                  <span>🌐</span>
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
      
      {/* Admin Floating Button (Mobile) */}
      {user?.isAdmin && (
        <AdminFloatingButton
          onClick={() => navigate('/admin')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MdAdminPanelSettings />
        </AdminFloatingButton>
      )}
      
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
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  text-decoration: none;
  letter-spacing: -0.02em;
`;

const LogoAccent = styled.span`
  color: ${theme.colors.primary};
`;

const DesktopNav = styled.div`
  display: none;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }
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
  
  svg {
    font-size: 18px;
  }
  
  &:hover {
    color: ${theme.colors.text};
    background: ${theme.colors.glass};
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
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
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    
    span:not(:first-child) {
      display: none;
    }
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

const R18Toggle = styled(motion.button)`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.active 
    ? 'rgba(255, 59, 48, 0.2)' 
    : theme.colors.glass};
  border: 1px solid ${props => props.active 
    ? theme.colors.error 
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  cursor: pointer;
  font-size: 16px;
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${props => props.active 
      ? 'rgba(255, 59, 48, 0.3)' 
      : theme.colors.surfaceHover};
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const LogoutButton = styled(motion.button)`
  display: none;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  svg {
    font-size: 16px;
  }
  
  &:hover {
    color: ${theme.colors.error};
    border-color: ${theme.colors.error};
    background: rgba(255, 59, 48, 0.1);
  }
  
  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }
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
  width: 80%;
  max-width: 320px;
  background: ${theme.colors.backgroundSecondary};
  border-left: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadows.xl};
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  
  h3 {
    margin: 0;
    font-size: ${theme.fontSizes.lg};
    font-weight: ${theme.fontWeights.semibold};
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

const MobileNavItems = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
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
  
  svg {
    font-size: 20px;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
  margin: ${theme.spacing.md} 0;
`;

const MobileR18Toggle = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  color: ${props => props.active ? theme.colors.error : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  span:first-child {
    font-size: 20px;
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

// Admin Floating Button
const AdminFloatingButton = styled(motion.button)`
  position: fixed;
  bottom: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.full};
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: ${theme.shadows.lg};
  z-index: ${theme.zIndex.sticky};
  
  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
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

// Language Selector
const LanguageSelector = styled.div`
  position: relative;
  display: none;
  
  @media (min-width: ${theme.breakpoints.md}) {
    display: block;
  }
`;

const LanguageButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 16px;
  
  svg {
    font-size: 18px;
  }
`;

const LanguageDropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  overflow: hidden;
  z-index: ${theme.zIndex.dropdown};
  min-width: 150px;
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.1)' : 'transparent'};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.glass};
  }
`;

// Mobile Language Section
const MobileLanguageSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  
  > span:first-child {
    font-size: 20px;
  }
`;

const MobileLanguageOptions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

const MobileLanguageOption = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.2)' : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-size: 18px;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

export default Navigation;
