import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdDashboard, MdCollections, MdExitToApp, MdSettings, MdCelebration, MdAccessTimeFilled } from 'react-icons/md';
import { FaGift } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const Navigation = () => {
  const location = useLocation();
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [rewardStatus, setRewardStatus] = useState({
    available: false,
    loading: false,
    timeRemaining: null,
    nextRewardTime: null
  });
  const [rewardPopup, setRewardPopup] = useState({
    show: false,
    amount: 0
  });

  // Check if daily reward is available - improved version
  const checkRewardAvailability = useCallback(async () => {
    if (!user) return; // Don't check if user isn't logged in
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(
        'https://gachaapi.solidbooru.online/api/auth/me', 
        { headers: { 'x-auth-token': token } }
      );
      
      const lastReward = response.data.lastDailyReward ? new Date(response.data.lastDailyReward) : null;
      const now = new Date();
      
      if (!lastReward || now - lastReward > 24 * 60 * 60 * 1000) {
        setRewardStatus({
          available: true,
          loading: false,
          timeRemaining: null,
          nextRewardTime: null
        });
      } else {
        const remainingTime = 24 * 60 * 60 * 1000 - (now - lastReward);
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        
        const nextTime = new Date(lastReward.getTime() + 24 * 60 * 60 * 1000);
        
        setRewardStatus({
          available: false,
          loading: false,
          timeRemaining: `${hours}h ${minutes}m`,
          nextRewardTime: nextTime
        });
      }
    } catch (err) {
      console.error('Error checking reward:', err);
      setRewardStatus(prev => ({
        ...prev,
        loading: false
      }));
    }
  }, [user]);

  // Update timer periodically
  useEffect(() => {
    // Update the timer every minute
    const updateTimer = () => {
      if (!rewardStatus.nextRewardTime) return;
      
      const now = new Date();
      const nextReward = new Date(rewardStatus.nextRewardTime);
      
      if (now >= nextReward) {
        // Time's up - reward is now available
        setRewardStatus(prev => ({
          ...prev,
          available: true,
          timeRemaining: null,
          nextRewardTime: null
        }));
      } else {
        // Still counting down
        const remainingTime = nextReward - now;
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        
        setRewardStatus(prev => ({
          ...prev,
          timeRemaining: `${hours}h ${minutes}m`
        }));
      }
    };

    const timerInterval = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(timerInterval);
  }, [rewardStatus.nextRewardTime]);

  // Initial check and periodic refresh
  useEffect(() => {
    checkRewardAvailability();
    
    // Full refresh every 5 minutes to ensure sync with server
    const refreshInterval = setInterval(() => {
      checkRewardAvailability();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [checkRewardAvailability]);

  // Claim the daily reward
  const claimDailyReward = async () => {
    // Prevent multiple clicks
    if (rewardStatus.loading) return;
    
    setRewardStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.post(
        'https://gachaapi.solidbooru.online/api/auth/daily-reward',
        {},
        { headers: { 'x-auth-token': token } }
      );
      
      // Show success popup
      setRewardPopup({
        show: true,
        amount: response.data.rewardAmount
      });
      
      // Update reward status
      const now = new Date();
      const nextRewardTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: '23h 59m',
        nextRewardTime: nextRewardTime
      });
      
      // Update user data with new points
      refreshUser();
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setRewardPopup({ show: false, amount: 0 });
      }, 3000);
      
    } catch (err) {
      console.error('Error claiming reward:', err);
      
      if (err.response?.data?.nextRewardTime) {
        // Server returned time info
        setRewardStatus({
          available: false,
          loading: false,
          timeRemaining: `${err.response.data.nextRewardTime.hours}h ${err.response.data.nextRewardTime.minutes}m`,
          nextRewardTime: new Date(err.response.data.nextRewardTime.timestamp)
        });
      } else {
        // Generic error handling
        setRewardStatus(prev => ({
          ...prev,
          loading: false,
          available: false
        }));
        
        setTimeout(() => {
          checkRewardAvailability(); // Re-check availability after error
        }, 3000);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <NavContainer>
      <NavLinks>
        <NavItem
          isActive={location.pathname === '/gacha'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <StyledLink to="/gacha">
            <MdDashboard />
            <span>Gacha</span>
          </StyledLink>
        </NavItem>
        
        <NavItem
          isActive={location.pathname === '/collection'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <StyledLink to="/collection">
            <MdCollections />
            <span>Collection</span>
          </StyledLink>
        </NavItem>
        
        {user?.isAdmin && (
          <NavItem
            isActive={location.pathname === '/admin'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <StyledLink to="/admin">
              <MdSettings />
              <span>Admin</span>
            </StyledLink>
          </NavItem>
        )}
      </NavLinks>
      
      <UserControls>
        {/* Daily Reward Button - Improved version */}
        {user && (
          <RewardButton
            available={rewardStatus.available}
            whileHover={rewardStatus.available ? { scale: 1.1 } : {}}
            whileTap={rewardStatus.available ? { scale: 0.95 } : {}}
            onClick={rewardStatus.available ? claimDailyReward : undefined}
            disabled={!rewardStatus.available || rewardStatus.loading}
          >
            {rewardStatus.loading ? (
              <LoadingSpinner />
            ) : rewardStatus.available ? (
              <>
                <FaGift className="pulse-icon" />
                <span>Claim Daily</span>
              </>
            ) : (
              <>
                <MdAccessTimeFilled />
                <TimeRemaining>{rewardStatus.timeRemaining || "Wait..."}</TimeRemaining>
              </>
            )}
          </RewardButton>
        )}
        
        <Username>{user?.username || 'User'}</Username>
        
        <LogoutButton 
          onClick={handleLogout}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <MdExitToApp />
          <span>Logout</span>
        </LogoutButton>
      </UserControls>
      
      {/* Success Popup */}
      <AnimatePresence>
        {rewardPopup.show && (
          <RewardPopup
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <MdCelebration className="celebration-icon" />
            <div>
              <p>Daily Reward Claimed!</p>
              <h3>+{rewardPopup.amount} coins</h3>
            </div>
          </RewardPopup>
        )}
      </AnimatePresence>
    </NavContainer>
  );
};

// Existing styled components...

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  box-sizing: border-box;
  max-width: 100vw;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 12px 15px;
    flex-wrap: wrap;
  }
`;

const NavLinks = styled.ul`
  display: flex;
  list-style: none;
  gap: 20px;
  margin: 0;
  padding: 0;
  
  @media (max-width: 480px) {
    gap: 10px;
  }
`;

const NavItem = styled(motion.li)`
  padding: 8px 15px;
  border-radius: 20px;
  background: ${props => props.isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  
  @media (max-width: 480px) {
    padding: 6px 10px;
  }
`;

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  
  svg {
    font-size: 20px;
  }
  
  @media (max-width: 480px) {
    font-size: 14px;
    
    span {
      @media (max-width: 360px) {
        display: none;
      }
    }
    
    svg {
      font-size: 18px;
    }
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  
  @media (max-width: 480px) {
    gap: 10px;
  }
`;

const Username = styled.span`
  font-weight: 500;
  opacity: 0.8;
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const LogoutButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    
    span {
      @media (max-width: 360px) {
        display: none;
      }
    }
  }
`;

const RewardButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.available 
    ? 'linear-gradient(135deg, #ffb347, #ffcc33)' 
    : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: ${props => props.available ? 'pointer' : 'default'};
  font-size: 14px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  ${props => props.available && `
    &::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: rgba(255, 255, 255, 0.1);
      transform: rotate(30deg);
      animation: shine 3s infinite;
    }
    
    @keyframes shine {
      0% { transform: rotate(30deg) translateX(-300%); }
      100% { transform: rotate(30deg) translateX(300%); }
    }
    
    .pulse-icon {
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `}
  
  svg {
    font-size: 18px;
    color: ${props => props.available ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  }
  
  &:disabled {
    opacity: ${props => props.available ? 0.7 : 1};
    cursor: not-allowed;
  }
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    
    span {
      @media (max-width: 440px) {
        display: none;
      }
    }
  }
`;

const TimeRemaining = styled.span`
  font-size: 13px;
  opacity: 0.8;
  white-space: nowrap;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const RewardPopup = styled(motion.div)`
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  color: white;
  padding: 15px 25px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 1000;
  
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }
  
  h3 {
    margin: 5px 0 0;
    font-size: 20px;
    color: #ffcc33;
  }
  
  .celebration-icon {
    font-size: 28px;
    color: #ffcc33;
    animation: bounce 1s infinite alternate;
  }
  
  @keyframes bounce {
    from { transform: scale(1); }
    to { transform: scale(1.2); }
  }
  
  @media (max-width: 480px) {
    padding: 12px 20px;
    max-width: 85%;
    
    h3 {
      font-size: 18px;
    }
    
    p {
      font-size: 13px;
    }
    
    .celebration-icon {
      font-size: 24px;
    }
  }
`;

// Tooltip that appears when hovering over the timer
const RewardTooltip = styled.div`
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
  
  ${RewardButton}:hover & {
    opacity: 1;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid rgba(0, 0, 0, 0.8);
  }
`;

export default Navigation;