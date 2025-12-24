import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTicketAlt, FaCoins, FaGift, FaCheck, FaTimes, FaDice, FaGem, FaTrophy, FaStar } from 'react-icons/fa';
import { getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { redeemCoupon as redeemCouponAction } from '../actions/couponActions';
import {
  theme,
  PageWrapper,
  Container,
  Section,
  Alert,
  Heading2,
} from '../design-system';

// Icon Constants
import { ICON_POINTS, ICON_GIFT, ICON_COUPON } from '../constants/icons';

const CouponPage = () => {
  const { t } = useTranslation();
  const { user, setUser } = useContext(AuthContext);
  const { getRarityColor } = useRarity();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rewardInfo, setRewardInfo] = useState(null);
  
  useEffect(() => {
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
      setError(t('coupon.pleaseEnterCode'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRewardInfo(null);
    
    try {
      // Use centralized action helper for consistent cache invalidation and state updates
      const result = await redeemCouponAction(couponCode, setUser);
      
      setSuccess(result.message);
      setRewardInfo(result);
      setCouponCode('');
    } catch (err) {
      setError(err.response?.data?.error || t('coupon.failedRedeem'));
    } finally {
      setLoading(false);
    }
  };

  const rarityIcons = {
    common: <FaDice />,
    uncommon: <FaStar />,
    rare: <FaGem />,
    epic: <FaStar />,
    legendary: <FaTrophy />
  };

  const getCharacterImage = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=Character';
    return getAssetUrl(imagePath);
  };
  
  return (
    <StyledPageWrapper>
      <Container>
        {/* Header */}
        <Header>
          <HeaderContent>
            <PageTitle>
              {t('coupon.title')}<TitleAccent>{t('coupon.titleAccent')}</TitleAccent>
            </PageTitle>
            <PageSubtitle>{t('coupon.subtitle')}</PageSubtitle>
          </HeaderContent>
          <PointsDisplay>
            <span>{ICON_POINTS}</span>
            <span>{user?.points || 0}</span>
          </PointsDisplay>
        </Header>
      
        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <StyledAlert
              variant="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FaTimes /> {error}
              <CloseBtn onClick={() => setError(null)}>×</CloseBtn>
            </StyledAlert>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {success && (
            <StyledAlert
              variant="success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FaCheck /> {success}
              <CloseBtn onClick={() => setSuccess(null)}>×</CloseBtn>
            </StyledAlert>
          )}
        </AnimatePresence>

        <ContentGrid>
          {/* Coupon Input Section */}
          <CouponSection>
            <SectionHeader>
              <SectionIcon><FaTicketAlt /></SectionIcon>
              <Heading2>{t('coupon.redeemCode')}</Heading2>
            </SectionHeader>
            
            <CouponCard>
              <CouponForm onSubmit={redeemCoupon}>
                <CouponInput 
                  type="text"
                  placeholder={t('coupon.enterCode')}
                  value={couponCode}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                
                <RedeemButton 
                  type="submit" 
                  disabled={loading || !couponCode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? t('coupon.redeeming') : t('coupon.redeemCoupon')}
                </RedeemButton>
              </CouponForm>
              
              <Instructions>
                <InstructionTitle>{t('coupon.howToUse')}</InstructionTitle>
                <InstructionList>
                  <InstructionItem>
                    <Bullet>✦</Bullet>
                    <span>{t('coupon.instruction1')}</span>
                  </InstructionItem>
                  <InstructionItem>
                    <Bullet>✦</Bullet>
                    <span>{t('coupon.instruction2')}</span>
                  </InstructionItem>
                  <InstructionItem>
                    <Bullet>✦</Bullet>
                    <span>{t('coupon.instruction3')}</span>
                  </InstructionItem>
                  <InstructionItem>
                    <Bullet>✦</Bullet>
                    <span>{t('coupon.instruction4')}</span>
                  </InstructionItem>
                </InstructionList>
              </Instructions>
            </CouponCard>
          </CouponSection>
          
          {/* Reward Display Section */}
          <RewardSection>
            <SectionHeader>
              <SectionIcon>{ICON_GIFT}</SectionIcon>
              <Heading2>{t('coupon.rewardDetails')}</Heading2>
            </SectionHeader>
            
            <RewardDisplay>
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
                      <FaGift /> {t('coupon.receivedReward')}
                    </RewardHeader>
                    
                    <RewardContent>
                      {rewardInfo.type === 'coins' ? (
                        <CoinReward>
                          <CoinIcon>
                            <FaCoins />
                          </CoinIcon>
                          <RewardDetails>
                            <RewardAmount>{rewardInfo.reward.coins} {t('coupon.coins')}</RewardAmount>
                            <RewardDesc>{t('coupon.addedToAccount')}</RewardDesc>
                          </RewardDetails>
                        </CoinReward>
                      ) : rewardInfo.type === 'character' ? (
                        <CharacterReward>
                          <CharacterImage 
                            src={getCharacterImage(rewardInfo.reward.character.image)}
                            alt={rewardInfo.reward.character.name}
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/150?text=Character';
                            }}
                          />
                          <CharacterDetails>
                            <CharacterName>{rewardInfo.reward.character.name}</CharacterName>
                            <CharacterSeries>{rewardInfo.reward.character.series}</CharacterSeries>
                            <RarityBadge $color={getRarityColor(rewardInfo.reward.character.rarity)}>
                              {rarityIcons[rewardInfo.reward.character.rarity]} {rewardInfo.reward.character.rarity}
                            </RarityBadge>
                          </CharacterDetails>
                        </CharacterReward>
                      ) : (
                        <div>{t('coupon.unknownReward')}</div>
                      )}
                    </RewardContent>
                  </RewardCard>
                ) : (
                  <EmptyState
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <EmptyIcon>{ICON_COUPON}</EmptyIcon>
                    <EmptyTitle>{t('coupon.noRewardYet')}</EmptyTitle>
                    <EmptyText>{t('coupon.redeemToSee')}</EmptyText>
                  </EmptyState>
                )}
              </AnimatePresence>
            </RewardDisplay>
          </RewardSection>
        </ContentGrid>
      </Container>
    </StyledPageWrapper>
  );
};

// Styled Components
const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.xl} 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    text-align: center;
  }
`;

const HeaderContent = styled.div``;

const PageTitle = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  letter-spacing: -0.02em;
  
  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['2xl']};
  }
`;

const TitleAccent = styled.span`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-left: ${theme.spacing.sm};
`;

const PageSubtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.xs} 0 0;
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
`;

const StyledAlert = styled(Alert)`
  margin-bottom: ${theme.spacing.md};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  margin-left: auto;
  padding: 0;
  line-height: 1;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

const CouponSection = styled(Section)``;

const RewardSection = styled(Section)``;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const SectionIcon = styled.span`
  font-size: ${theme.fontSizes.xl};
  color: ${theme.colors.accent};
`;

const CouponCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  border: 1px solid ${theme.colors.surfaceBorder};
`;

const CouponForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

const CouponInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.lg};
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  color: ${theme.colors.text};
  text-align: center;
  transition: all ${theme.transitions.fast};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(88, 86, 214, 0.2);
  }
  
  &::placeholder {
    color: ${theme.colors.textMuted};
    letter-spacing: 1px;
  }
  
  &:disabled {
    opacity: 0.6;
  }
`;

const RedeemButton = styled(motion.button)`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(88, 86, 214, 0.4);
  transition: all ${theme.transitions.fast};
  
  &:disabled {
    background: ${theme.colors.backgroundTertiary};
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Instructions = styled.div`
  background: ${theme.colors.background};
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.lg};
  border-left: 3px solid ${theme.colors.accent};
`;

const InstructionTitle = styled.h4`
  margin: 0 0 ${theme.spacing.md};
  color: ${theme.colors.accent};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
`;

const InstructionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const InstructionItem = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const Bullet = styled.span`
  color: ${theme.colors.accent};
`;

const RewardDisplay = styled.div`
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RewardCard = styled(motion.div)`
  width: 100%;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.lg};
`;

const RewardHeader = styled.div`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: white;
`;

const RewardContent = styled.div`
  padding: ${theme.spacing.xl};
`;

const CoinReward = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const CoinIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 159, 10, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: ${theme.colors.warning};
`;

const RewardDetails = styled.div``;

const RewardAmount = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.xs};
`;

const RewardDesc = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

const CharacterReward = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: center;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    text-align: center;
  }
`;

const CharacterImage = styled.img`
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: ${theme.radius.lg};
  border: 2px solid ${theme.colors.surfaceBorder};
`;

const CharacterDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CharacterName = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
`;

const CharacterSeries = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

const RarityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  background: ${props => props.$color};
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  width: fit-content;
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
`;

const EmptyTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
`;

const EmptyText = styled.p`
  margin: 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

export default CouponPage;
