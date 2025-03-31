import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdDashboard, MdCollections, MdExitToApp, MdSettings, MdCelebration, MdAccessTimeFilled, MdAdminPanelSettings, MdRadio, MdVolumeUp, MdVolumeOff } from 'react-icons/md';
import { FaGift, FaTicketAlt, FaPlay, FaStop } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const Navigation = () => {
  const location = useLocation();
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [rewardStatus, setRewardStatus] = useState({
    available: false,        // Default to false
    loading: true,           // Start with loading state to prevent premature display
    timeRemaining: "Checking...",
    nextRewardTime: null,
    checked: false           // Flag to indicate if we've checked availability yet
  });
  const [rewardPopup, setRewardPopup] = useState({
    show: false,
    amount: 0
  });
  
  // Radio player state
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioVolume, setRadioVolume] = useState(0.7);
  const [showRadioControls, setShowRadioControls] = useState(false);
  const audioRef = useRef(null);
  
  // Toggle radio playback
  const toggleRadio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://radio.solidbooru.online/listen/solidbooru/radio.mp3');
      audioRef.current.volume = radioVolume;
    }
    
    if (radioPlaying) {
      audioRef.current.pause();
      setRadioPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error("Radio playback error:", error);
        // Let the user know there was an error
        alert("Couldn't play radio. Please try again or check your connection.");
      });
      setRadioPlaying(true);
    }
  };
  
  // Update radio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = radioVolume;
    }
  }, [radioVolume]);
  
  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check if hourly reward is available - updated for 1 hour interval
  const checkRewardAvailability = useCallback(async () => {
    if (!user) {
      setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRewardStatus(prev => ({ ...prev, loading: false, checked: true }));
        return;
      }
      
      // First quickly update UI to show we're checking
      if (!rewardStatus.checked) {
        setRewardStatus(prev => ({ 
          ...prev, 
          timeRemaining: "Checking...",
          available: false // Make sure we don't show as clickable while checking
        }));
      }
      
      const response = await axios.get(
        'https://gachaapi.solidbooru.online/api/auth/me', 
        { headers: { 'x-auth-token': token } }
      );
      
      const lastReward = response.data.lastDailyReward ? new Date(response.data.lastDailyReward) : null;
      const now = new Date();
      
      // Define the reward interval as 1 hour 
      const rewardInterval = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // Check if user has NEVER claimed a reward OR if 1 hour has passed
      if (!lastReward || now - lastReward > rewardInterval) {
        console.log('Hourly reward is available');
        setRewardStatus({
          available: true,
          loading: false,
          timeRemaining: null,
          nextRewardTime: null,
          checked: true
        });
      } else {
        // User has claimed within last hour, show countdown
        console.log('Hourly reward is NOT available, last claimed:', lastReward);
        const remainingTime = rewardInterval - (now - lastReward);
        const minutes = Math.floor(remainingTime / (60 * 1000));
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
        
        const nextTime = new Date(lastReward.getTime() + rewardInterval);
        
        setRewardStatus({
          available: false, // Explicitly set to false
          loading: false,
          timeRemaining: `${minutes}m ${seconds}s`,
          nextRewardTime: nextTime,
          checked: true
        });
      }
    } catch (err) {
      console.error('Error checking reward:', err);
      setRewardStatus(prev => ({
        ...prev,
        loading: false,
        available: false, // Make sure it's not clickable on error
        checked: true,
        timeRemaining: "Check failed"
      }));
    }
  }, [user]);
  
  // Update timer periodically - more frequent updates for hourly rewards
  useEffect(() => {
    // Update the timer every second for more precise countdown
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
        const minutes = Math.floor(remainingTime / (60 * 1000));
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
        
        setRewardStatus(prev => ({
          ...prev,
          timeRemaining: `${minutes}m ${seconds}s`
        }));
      }
    };
    
    const timerInterval = setInterval(updateTimer, 1000); // Update every second
    
    return () => clearInterval(timerInterval);
  }, [rewardStatus.nextRewardTime]);
  
  // Initial check and periodic refresh
  useEffect(() => {
    // We check availability immediately when user changes or component mounts
    checkRewardAvailability();
    
    // Full refresh more frequently for hourly rewards
    const refreshInterval = setInterval(() => {
      checkRewardAvailability();
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(refreshInterval);
  }, [checkRewardAvailability]);
  
  // Claim the hourly reward
  const claimHourlyReward = async () => {
    // Prevent multiple clicks or claiming when not available
    if (rewardStatus.loading || !rewardStatus.available) return;
    
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
      const rewardInterval = 60 * 60 * 1000; // 1 hour
      const nextRewardTime = new Date(now.getTime() + rewardInterval);
      
      setRewardStatus({
        available: false,
        loading: false,
        timeRemaining: '59m 59s',
        nextRewardTime: nextRewardTime,
        checked: true
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
          timeRemaining: `${err.response.data.nextRewardTime.minutes}m ${err.response.data.nextRewardTime.seconds}s`,
          nextRewardTime: new Date(err.response.data.nextRewardTime.timestamp),
          checked: true
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
    // Stop radio playback on logout
    if (radioPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    logout();
    navigate('/login');
  };
  
  return (
    <>
      <NavContainer>
        <NavLinks>
          {/* On mobile, we'll hide Admin from the top nav completely */}
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
          
          <NavItem
            isActive={location.pathname === '/coupons'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <StyledLink to="/coupons">
              <FaTicketAlt />
              <span>Coupons</span>
            </StyledLink>
          </NavItem>
          
          {/* Radio Button */}
          <NavItem
            isActive={radioPlaying}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRadioControls(!showRadioControls)}
          >
            <RadioButton playing={radioPlaying}>
              <MdRadio />
              <span>Radio</span>
            </RadioButton>
          </NavItem>

          {/* Show admin in the top nav only on desktop */}
          {user?.isAdmin && (
            <DesktopOnlyNavItem
              isActive={location.pathname === '/admin'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <StyledLink to="/admin">
                <MdSettings />
                <span>Admin</span>
              </StyledLink>
            </DesktopOnlyNavItem>
          )}
        </NavLinks>
        
        <UserControls>
          {/* Hourly Reward Button */}
          {user && (
            <RewardButton
              available={rewardStatus.checked && rewardStatus.available}
              whileHover={rewardStatus.available && rewardStatus.checked ? { scale: 1.1 } : {}}
              whileTap={rewardStatus.available && rewardStatus.checked ? { scale: 0.95 } : {}}
              onClick={rewardStatus.available && rewardStatus.checked ? claimHourlyReward : undefined}
              disabled={!rewardStatus.available || rewardStatus.loading || !rewardStatus.checked}
              data-state={rewardStatus.loading ? 'loading' : rewardStatus.available ? 'available' : 'unavailable'}
            >
              {rewardStatus.loading ? (
                <LoadingSpinner />
              ) : rewardStatus.available && rewardStatus.checked ? (
                <>
                  <FaGift className="pulse-icon" />
                  <span>Claim Hourly</span>
                </>
              ) : (
                <>
                  <MdAccessTimeFilled />
                  <TimeRemaining>{rewardStatus.timeRemaining || "Wait..."}</TimeRemaining>
                </>
              )}
            </RewardButton>
          )}
          
          <Username>{user?.username || "User"}</Username>
          
          <LogoutButton 
            onClick={handleLogout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <MdExitToApp />
            <span>Logout</span>
          </LogoutButton>
        </UserControls>
      </NavContainer>
      
      {/* Radio Controls Panel */}
      <AnimatePresence>
        {showRadioControls && (
          <RadioControls
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <RadioControlsHeader>
              <h4>SolidBooru Radio</h4>
            </RadioControlsHeader>
            
            <RadioControlsBody>
              <PlayButton 
                onClick={toggleRadio}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {radioPlaying ? <FaStop /> : <FaPlay />}
                <span>{radioPlaying ? 'Stop' : 'Play'}</span>
              </PlayButton>
              
              <VolumeControl>
                {radioVolume === 0 ? <MdVolumeOff /> : <MdVolumeUp />}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={radioVolume}
                  onChange={(e) => setRadioVolume(parseFloat(e.target.value))}
                />
              </VolumeControl>
            </RadioControlsBody>
            
          </RadioControls>
        )}
      </AnimatePresence>
      
      {/* Full Admin Floating Button - Now optimized for iPhone */}
      {user?.isAdmin && (
        <AdminFloatingButton
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/admin')}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <MdAdminPanelSettings />
          <span>Admin</span>
        </AdminFloatingButton>
      )}
      
      {/* Success Popup - Moved outside NavContainer with better positioning */}
      <AnimatePresence>
        {rewardPopup.show && (
          <PopupContainer>
            <RewardPopup
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <MdCelebration className="celebration-icon" />
              <div>
                <p>Hourly Reward Claimed!</p>
                <h3>+{rewardPopup.amount} coins</h3>
              </div>
            </RewardPopup>
          </PopupContainer>
        )}
      </AnimatePresence>
    </>
  );
};

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
  
  @media (max-width: 768px) {
    padding: 12px 15px;
  }
  
  @media (max-width: 380px) {
    padding: 8px 8px;
  }
`;

const NavLinks = styled.ul`
  display: flex;
  list-style: none;
  gap: 20px;
  margin: 0;
  padding: 0;
  
  @media (max-width: 600px) {
    gap: 12px;
  }
  
  @media (max-width: 480px) {
    gap: 8px;
  }
  
  @media (max-width: 380px) {
    gap: 3px;
  }
`;

const NavItem = styled(motion.li)`
  padding: 8px 15px;
  border-radius: 20px;
  background: ${props => props.isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  
  @media (max-width: 480px) {
    padding: 6px 8px;
  }
  
  @media (max-width: 380px) {
    padding: 5px 6px;
    border-radius: 15px;
  }
`;

// Desktop-only nav item for admin
const DesktopOnlyNavItem = styled(NavItem)`
  @media (max-width: 600px) {
    display: none; /* Hide on mobile and small tablets */
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
  
  @media (max-width: 600px) {
    font-size: 14px;
    gap: 5px;
    
    svg {
      font-size: 18px;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 13px;
    
    span {
      display: inline-block;
      max-width: 50px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    svg {
      font-size: 16px;
    }
  }
  
  @media (max-width: 360px) {
    span {
      display: none;
    }
    
    svg {
      font-size: 18px;
    }
  }
`;

// Radio button styling
const RadioButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  
  svg {
    font-size: 20px;
    color: ${props => props.playing ? '#1DB954' : 'white'};
  }
  
  @media (max-width: 600px) {
    font-size: 14px;
    gap: 5px;
    
    svg {
      font-size: 18px;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 13px;
    
    span {
      display: inline-block;
      max-width: 50px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    svg {
      font-size: 16px;
    }
  }
  
  @media (max-width: 360px) {
    span {
      display: none;
    }
    
    svg {
      font-size: 18px;
    }
  }
`;

// Radio controls panel
const RadioControls = styled(motion.div)`
  position: fixed;
  top: 80px;
  left: 20px;
  width: 300px;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  z-index: 150;
  overflow: hidden;
  
  @media (max-width: 480px) {
    width: calc(100% - 40px);
    left: 20px;
  }
`;

const RadioControlsHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h4 {
    margin: 0;
    color: white;
    font-size: 18px;
    font-weight: 500;
  }
`;

const RadioControlsBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const PlayButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 30px;
  background: #1DB954;
  color: white;
  font-weight: 600;
  border: none;
  cursor: pointer;
  
  svg {
    font-size: 18px;
  }
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 0 10px;
  
  svg {
    color: white;
    font-size: 22px;
  }
  
  input[type=range] {
    flex: 1;
    -webkit-appearance: none;
    height: 5px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    
    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1DB954;
      cursor: pointer;
    }
    
    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1DB954;
      cursor: pointer;
      border: none;
    }
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  
  @media (max-width: 600px) {
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    gap: 6px;
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
  
  @media (max-width: 600px) {
    padding: 6px 12px;
  }
  
  @media (max-width: 480px) {
    padding: 6px 8px;
    
    span {
      font-size: 12px;
    }
    
    svg {
      font-size: 16px;
    }
  }
  
  @media (max-width: 400px) {
    span {
      display: none;
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
  
  /* Shine and pulse animations... */
  
  svg {
    font-size: 18px;
    color: ${props => props.available ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  }
  
  &:disabled {
    opacity: ${props => props.available ? 0.7 : 1};
    cursor: not-allowed;
  }
  
  @media (max-width: 600px) {
    padding: 6px 12px;
  }
  
  @media (max-width: 480px) {
    padding: 6px 8px;
    
    span {
      font-size: 12px;
    }
    
    svg {
      font-size: 16px;
    }
  }
  
  @media (max-width: 400px) {
    span {
      display: none;
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

// Completely redesigned floating admin button for better iPhone visibility
const AdminFloatingButton = styled(motion.button)`
  display: none; /* Hidden on desktop */
  
  @media (max-width: 600px) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    border-radius: 30px;
    background: linear-gradient(135deg, #ff416c, #ff4b2b);
    color: white;
    font-size: 16px;
    font-weight: 500;
    border: none;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    cursor: pointer;
    
    /* Ensure visibility on iPhone */
    -webkit-tap-highlight-color: transparent;
    
    /* Add breathing effect to make it more noticeable */
    animation: breathe 3s infinite ease-in-out;
    
    svg {
      font-size: 20px;
    }
    
    /* Ensure it's definitely visible on all devices */
    @media (max-width: 360px) {
      bottom: 15px;
      right: 15px;
      padding: 8px 14px;
    }
    
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  }
`;

// New container to properly center the popup
const PopupContainer = styled.div`
  position: fixed;
  top: 100px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 1000;
  pointer-events: none; /* Allow clicking through the container */
  
  > * {
    pointer-events: auto; /* Re-enable pointer events for children */
  }
`;

// Updated popup styling to work with the container
const RewardPopup = styled(motion.div)`
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  color: white;
  padding: 15px 25px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 15px;
  max-width: 90%;
  
  /* Content structure */
  > div {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
    white-space: nowrap;
  }
  
  h3 {
    margin: 5px 0 0;
    font-size: 20px;
    color: #ffcc33;
    white-space: nowrap;
  }
  
  .celebration-icon {
    font-size: 28px;
    color: #ffcc33;
    animation: bounce 1s infinite alternate;
    flex-shrink: 0;
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

export default Navigation;