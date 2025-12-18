// pages/CouponPage.js
import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaCoins, FaGift, FaCheck, FaTimes, FaDice, FaGem, FaTrophy } from 'react-icons/fa';
import api, { getAssetUrl } from '../utils/api';
import { MdHelp } from 'react-icons/md';
import { AuthContext } from '../context/AuthContext';

const CouponPage = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rewardInfo, setRewardInfo] = useState(null);
  
  useEffect(() => {
    // Clear messages when component mounts
    setError(null);
    setSuccess(null);
    setRewardInfo(null);
  }, []);
  
  const handleInputChange = (e) => {
    setCouponCode(e.target.value.trim().toUpperCase());
  };
  
  const redeemCoupon = async (e) => {
    e.preventDefault();
    
    if (!couponCode) {
      setError('Please enter a coupon code');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRewardInfo(null);
    
    try {
      const response = await api.post('/coupons/redeem', { code: couponCode });
      
      setSuccess(response.data.message);
      setRewardInfo(response.data);
      setCouponCode('');
      
      // Refresh user data to update coins
      if (response.data.type === 'coins') {
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to redeem coupon');
    } finally {
      setLoading(false);
    }
  };

  const rarityIcons = {
    common: <FaDice />,
    uncommon: <MdHelp />,
    rare: <FaGem />,
    epic: <MdHelp />,
    legendary: <FaTrophy />
  };
  
  return (
    <MainContainer>
      <Dashboard>
        {/* Header bar with points and title */}
        <Header>
          <Logo>
            <span>Coupon</span>
            <GlowingText>Redemption</GlowingText>
          </Logo>
          <UserStats>
            <PointsDisplay>
              <CoinIcon>🪙</CoinIcon>
              <PointsAmount>{user?.points || 0}</PointsAmount>
            </PointsDisplay>
          </UserStats>
        </Header>
      
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <ErrorAlert
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FaTimes /> {error}
              <ErrorCloseBtn onClick={() => setError(null)}>×</ErrorCloseBtn>
            </ErrorAlert>
          )}
        </AnimatePresence>
        
        {/* Success message */}
        <AnimatePresence>
          {success && (
            <SuccessAlert
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FaCheck /> {success}
              <ErrorCloseBtn onClick={() => setSuccess(null)}>×</ErrorCloseBtn>
            </SuccessAlert>
          )}
        </AnimatePresence>

        <ContentArea>
          <CouponColumn>
            <SectionHeading>
              <SectionIcon><FaTicketAlt /></SectionIcon>
              <span>Redeem Coupon Code</span>
            </SectionHeading>
            
            <CouponCardContainer>
              <CouponForm onSubmit={redeemCoupon}>
                <CouponInputWrapper>
                  <CouponInput 
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponCode}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </CouponInputWrapper>
                
                <RedeemButton 
                  type="submit" 
                  disabled={loading || !couponCode}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? 'Redeeming...' : 'Redeem Coupon'}
                </RedeemButton>
              </CouponForm>
              
              {/* Instructions */}
              <CouponInstructions>
                <InstructionTitle>How to use coupons:</InstructionTitle>
                <InstructionList>
                  <InstructionItem>
                    <BulletPoint>✦</BulletPoint>
                    <span>Coupons can be redeemed for various rewards like coins or characters</span>
                  </InstructionItem>
                  <InstructionItem>
                    <BulletPoint>✦</BulletPoint>
                    <span>Each coupon can only be redeemed once per account</span>
                  </InstructionItem>
                  <InstructionItem>
                    <BulletPoint>✦</BulletPoint>
                    <span>You can find coupons on our social media, in events, or from friends</span>
                  </InstructionItem>
                  <InstructionItem>
                    <BulletPoint>✦</BulletPoint>
                    <span>Coupon codes are case-insensitive</span>
                  </InstructionItem>
                </InstructionList>
              </CouponInstructions>
            </CouponCardContainer>
          </CouponColumn>
          
          {/* Results / Reward Info Column */}
          <RewardColumn>
            <SectionHeading>
              <SectionIcon>🎁</SectionIcon>
              <span>Reward Details</span>
            </SectionHeading>
            
            <ResultsDisplay>
              <AnimatePresence mode="wait">
                {rewardInfo ? (
                  <RewardCard
                    key="reward"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <RewardHeader>
                      <FaGift /> You've received a reward!
                    </RewardHeader>
                    
                    <RewardContent>
                      {rewardInfo.type === 'coins' ? (
                        <CoinReward>
                          <CoinRewardIcon>
                            <FaCoins />
                          </CoinRewardIcon>
                          <RewardDetails>
                            <RewardAmount>{rewardInfo.reward.coins} Coins</RewardAmount>
                            <RewardDescription>Added to your account</RewardDescription>
                          </RewardDetails>
                        </CoinReward>
                      ) : rewardInfo.type === 'character' ? (
                        <CharacterReward>
                          <CharacterImageWrapper>
                            <CharacterImage 
                              src={getCharacterImage(rewardInfo.reward.character.image)}
                              alt={rewardInfo.reward.character.name}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/150?text=Character';
                              }}
                            />
                          </CharacterImageWrapper>
                          <CharacterDetails>
                            <RewardCharName>{rewardInfo.reward.character.name}</RewardCharName>
                            <RewardCharSeries>{rewardInfo.reward.character.series}</RewardCharSeries>
                            <RarityBadge rarity={rewardInfo.reward.character.rarity}>
                              {rarityIcons[rewardInfo.reward.character.rarity]} {rewardInfo.reward.character.rarity}
                            </RarityBadge>
                          </CharacterDetails>
                        </CharacterReward>
                      ) : (
                        <div>Unknown reward type: {rewardInfo.type}</div>
                      )}
                    </RewardContent>
                  </RewardCard>
                ) : (
                  <EmptyRewardState
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <EmptyStateIcon>🎫</EmptyStateIcon>
                    <h3>No Reward to Display</h3>
                    <p>Redeem a coupon to see your reward here</p>
                  </EmptyRewardState>
                )}
              </AnimatePresence>
            </ResultsDisplay>
          </RewardColumn>
        </ContentArea>
      </Dashboard>
    </MainContainer>
  );
};

// Helper to get character image URL
const getCharacterImage = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/150?text=Character';
  return getAssetUrl(imagePath);
};

// Styled Components
const MainContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
  color: white;
  display: flex;
  justify-content: center;
  &::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/images/backgrounds/gacha-bg.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.15;
    z-index: -1;
    pointer-events: none;
  }
`;

const Dashboard = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  @media (max-width: 768px) {
    padding: 15px 10px;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const Logo = styled.div`
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const GlowingText = styled.span`
  background: linear-gradient(90deg, #6e48aa, #9e5594);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  &::after {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6e48aa, #9e5594);
    border-radius: 3px;
  }
`;

const UserStats = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 16px;
`;

const CoinIcon = styled.span`
  font-size: 18px;
`;

const PointsAmount = styled.span`
  color: white;
`;

const ContentArea = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SectionHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px 0;
  font-size: 22px;
  position: relative;
  padding-bottom: 10px;
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #6e48aa, #9e5594);
    border-radius: 3px;
  }
  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const SectionIcon = styled.span`
  font-size: 22px;
`;

const CouponColumn = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 25px;
  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const CouponCardContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 25px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const CouponForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
`;

const CouponInputWrapper = styled.div`
  position: relative;
`;

const CouponInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 15px 20px;
  border-radius: 10px;
  font-size: 18px;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: #6e48aa;
    box-shadow: 0 0 0 1px rgba(110, 72, 170, 0.5);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const RedeemButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(110, 72, 170, 0.4);
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.7;
  }
`;

const ErrorAlert = styled(motion.div)`
  background: rgba(211, 47, 47, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
`;

const SuccessAlert = styled(motion.div)`
  background: rgba(46, 125, 50, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
`;

const ErrorCloseBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  margin-left: auto;
`;

const CouponInstructions = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  border-left: 3px solid #6e48aa;
`;

const InstructionTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  color: #9e5594;
`;

const InstructionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const InstructionItem = styled.div`
  display: flex;
  gap: 10px;
`;

const BulletPoint = styled.span`
  color: #9e5594;
`;

// Reward Column
const RewardColumn = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 25px;
  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const ResultsDisplay = styled.div`
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RewardCard = styled(motion.div)`
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const RewardHeader = styled.div`
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  color: white;
  padding: 15px 20px;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const RewardContent = styled.div`
  padding: 25px;
`;

const CoinReward = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const CoinRewardIcon = styled.div`
  width: 60px;
  height: 60px;
  background: rgba(243, 156, 18, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  color: #f39c12;
`;

const RewardDetails = styled.div``;

const RewardAmount = styled.h3`
  font-size: 24px;
  margin: 0 0 5px 0;
`;

const RewardDescription = styled.p`
  margin: 0;
  opacity: 0.7;
`;

const CharacterReward = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const CharacterImageWrapper = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
`;

const CharacterImage = styled.img`
  width: 120px;
  height: 120px;
  object-fit: cover;
  display: block;
`;

const CharacterDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RewardCharName = styled.h3`
  margin: 0;
  font-size: 20px;
`;

const RewardCharSeries = styled.p`
  margin: 0;
  opacity: 0.7;
`;

const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};

const RarityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  text-transform: capitalize;
`;

const EmptyRewardState = styled(motion.div)`
  text-align: center;
  padding: 30px;
  
  h3 {
    margin: 10px 0 5px 0;
  }
  
  p {
    margin: 0;
    opacity: 0.7;
  }
`;

const EmptyStateIcon = styled.div`
  font-size: 40px;
  margin-bottom: 10px;
`;

export default CouponPage;