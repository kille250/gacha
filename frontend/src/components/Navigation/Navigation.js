import React, { useContext, useState, useEffect } from 'react';
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
    timeRemaining: null
  });
  const [rewardPopup, setRewardPopup] = useState({
    show: false,
    amount: 0
  });

  // Check if daily reward is available
  const checkRewardAvailability = async () => {
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
          ...rewardStatus,
          available: true,
          timeRemaining: null
        });
      } else {
        const remainingTime = 24 * 60 * 60 * 1000 - (now - lastReward);
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        
        setRewardStatus({
          ...rewardStatus,
          available: false,
          timeRemaining: `${hours}h ${minutes}m`
        });
      }
    } catch (err) {
      console.error('Error checking reward:', err);
    }
  };

  // Claim the daily reward
  const claimDailyReward = async () => {
    setRewardStatus({ ...rewardStatus, loading: true });
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
      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: '23h 59m'
      });
      
      // Update user data with new points
      refreshUser();
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setRewardPopup({ show: false, amount: 0 });
      }, 3000);
      
    } catch (err) {
      console.error('Error claiming reward:', err);
      setRewardStatus({
        ...rewardStatus,
        loading: false
      });
      
      if (err.response?.data?.nextRewardTime) {
        setRewardStatus({
          available: false,
          loading: false,
          timeRemaining: `${err.response.data.nextRewardTime.hours}h ${err.response.data.nextRewardTime.minutes}m`
        });
      }
    }
  };

  // Check reward status on load and periodically
  useEffect(() => {
    checkRewardAvailability();
    
    // Refresh status every 5 minutes
    const timer = setInterval(() => {
      checkRewardAvailability();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(timer);
  }, [user]);

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
        {/* Daily Reward Button */}
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
              <FaGift />
              <span>Claim Daily</span>
            </>
          ) : (
            <>
              <MdAccessTimeFilled />
              <TimeRemaining>{rewardStatus.timeRemaining}</TimeRemaining>
            </>
          )}
        </RewardButton>
        
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
  `}
  
  svg {
    font-size: 18px;
    color: ${props => props.available ? 'white' : 'rgba(255, 255, 255, 0.7)'};
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
`;

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

export default Navigation;