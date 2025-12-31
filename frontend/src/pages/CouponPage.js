/**
 * CouponPage - User coupon redemption page
 *
 * Supports displaying rewards for all coupon types:
 * - coins: Currency reward display
 * - character: Character card with rarity badge
 * - ticket: Regular gacha ticket reward display
 * - premium_ticket: Premium gacha ticket reward display
 */
import React, { useState, useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTicketAlt, FaCoins, FaGift, FaDice, FaGem, FaTrophy, FaStar } from 'react-icons/fa';
import { getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useToast } from '../context/ToastContext';
import { redeemCoupon as redeemCouponAction } from '../actions/couponActions';
import { Container, Heading2, PageTransition } from '../design-system';

// Icon Constants
import { IconPoints, IconGift, IconCoupon } from '../constants/icons';

// Styled Components
import {
  StyledPageWrapper,
  Header,
  HeaderContent,
  PageTitle,
  TitleAccent,
  PageSubtitle,
  PointsDisplay,
  ContentGrid,
  CouponSection,
  RewardSection,
  SectionHeader,
  SectionIcon,
  CouponCard,
  CouponForm,
  CouponInput,
  RedeemButton,
  Instructions,
  InstructionTitle,
  InstructionList,
  InstructionItem,
  Bullet,
  RewardDisplay,
  RewardCard,
  RewardHeader,
  RewardContent,
  CoinReward,
  CoinIcon,
  TicketReward,
  TicketIcon,
  TicketBadge,
  RewardDetails,
  RewardAmount,
  RewardDesc,
  CharacterReward,
  CharacterImage,
  CharacterDetails,
  CharacterName,
  CharacterSeries,
  RarityBadge,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  EmptyText,
} from './CouponPage.styles';

const CouponPage = () => {
  const { t } = useTranslation();
  const { user, setUser } = useContext(AuthContext);
  const { getRarityColor } = useRarity();
  const toast = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [rewardInfo, setRewardInfo] = useState(null);

  const handleInputChange = (e) => {
    setCouponCode(e.target.value.trim().toUpperCase());
  };

  const redeemCoupon = async (e) => {
    e.preventDefault();

    if (!couponCode) {
      toast.error(t('coupon.pleaseEnterCode'));
      return;
    }

    setLoading(true);
    setRewardInfo(null);

    try {
      // Use centralized action helper for consistent cache invalidation and state updates
      const result = await redeemCouponAction(couponCode, setUser);

      toast.success(result.message);
      setRewardInfo(result);
      setCouponCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || t('coupon.failedRedeem'));
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
    <PageTransition>
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
            <span><IconPoints /></span>
            <span>{user?.points || 0}</span>
          </PointsDisplay>
        </Header>

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
              <SectionIcon><IconGift /></SectionIcon>
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
                      ) : rewardInfo.type === 'ticket' ? (
                        <TicketReward>
                          <TicketIcon $premium={false}>
                            <FaTicketAlt />
                          </TicketIcon>
                          <RewardDetails>
                            <RewardAmount>
                              {rewardInfo.reward.tickets} {t('coupon.tickets', 'Tickets')}
                            </RewardAmount>
                            <RewardDesc>{t('coupon.ticketsAddedToAccount', 'Gacha tickets added to your account')}</RewardDesc>
                            <TicketBadge $premium={false}>{t('coupon.regularTicket', 'Regular')}</TicketBadge>
                          </RewardDetails>
                        </TicketReward>
                      ) : rewardInfo.type === 'premium_ticket' ? (
                        <TicketReward>
                          <TicketIcon $premium={true}>
                            <FaGem />
                          </TicketIcon>
                          <RewardDetails>
                            <RewardAmount>
                              {rewardInfo.reward.tickets} {t('coupon.premiumTickets', 'Premium Tickets')}
                            </RewardAmount>
                            <RewardDesc>{t('coupon.premiumTicketsAddedToAccount', 'Premium gacha tickets added to your account')}</RewardDesc>
                            <TicketBadge $premium={true}>{t('coupon.premiumTicket', 'Premium')}</TicketBadge>
                          </RewardDetails>
                        </TicketReward>
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
                    <EmptyIcon><IconCoupon /></EmptyIcon>
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
    </PageTransition>
  );
};

export default CouponPage;
