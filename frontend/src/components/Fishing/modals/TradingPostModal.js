import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose, MdStorefront } from 'react-icons/md';
import { FaFish } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useRarity } from '../../../context/RarityContext';
import { ModalOverlay, motionVariants } from '../../../design-system';
import {
  IconFishCommon, IconFishUncommon, IconFishRare, IconFishEpic, IconFishLegendary,
  IconFishing, IconPoints, IconTicket, IconPremiumTicket, IconGift,
  IconCheckmark, IconSparkleSymbol, IconClock, IconLocked, IconWarningTriangle
} from '../../../constants/icons';
import {
  TradingPostModal as TradingPostModalStyled, ShopHeader, ShopTitleRow, ShopIcon, ShopTitle, ShopBody,
  CloseButton, WalletStrip, WalletItem, WalletDivider, WalletValue,
  DailyLimitsStrip, DailyLimitItem, DailyLimitDivider, DailyLimitText, LimitReachedBadge,
  FishBar, FishChip, FishChipEmoji, FishChipCount,
  TradeSection, TradeSectionHeader, TradeSectionBadge, TradeSectionTitle, TradeSectionCount,
  TradeGrid, QuickTradeCard, TradeCardTop,
  TradeGiveSection, TradeLabel, TradeGiveContent, TradeGiveEmoji, TradeGiveAmount,
  TradeArrow, TradeGetSection, TradeGetContent, TradeGetEmoji, TradeGetAmount,
  QuickTradeButton, SoftCapWarning, NearLimitWarning, BottleneckInfo,
  LimitReachedNote, LockedTradesList, LockedTradeRow, LockedTradeInfo,
  LockedTradeEmoji, LockedTradeText, LockedTradeName, LockedTradeReward,
  EmptyTradeState, TradeSuccessOverlay, TradeSuccessIcon, TradeSuccessText,
  TradingLoadingState, ProgressBarContainer, ProgressBarFill,
} from '../Fishing.styles';

const getRarityIcon = (rarity) => {
  switch (rarity) {
    case 'common': return IconFishCommon;
    case 'uncommon': return IconFishUncommon;
    case 'rare': return IconFishRare;
    case 'epic': return IconFishEpic;
    case 'legendary': return IconFishLegendary;
    case 'special': return IconFishing;
    case 'collection': return IconGift;
    default: return IconFishCommon;
  }
};

const getRewardIcon = (rewardType) => {
  switch (rewardType) {
    case 'premiumTickets': return IconPremiumTicket;
    case 'rollTickets': return IconTicket;
    case 'mixed': return IconGift;
    default: return IconPoints;
  }
};

/**
 * Trading Post Modal - Fish trading interface
 */
export const TradingPostModal = ({ 
  show, 
  onClose, 
  tradingOptions, 
  tradingLoading, 
  tradeResult, 
  onTrade 
}) => {
  const { t } = useTranslation();
  const { getRarityColor } = useRarity();

  if (!show) return null;

  const availableTrades = tradingOptions?.options?.filter(o => o.canTrade) || [];
  const limitReachedTrades = tradingOptions?.options?.filter(o => !o.canTrade && o.limitReached) || [];
  const needMoreFishTrades = tradingOptions?.options?.filter(o => !o.canTrade && !o.limitReached) || [];

  return (
    <AnimatePresence>
      {show && (
        <ModalOverlay
          variants={motionVariants.overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <TradingPostModalStyled variants={motionVariants.modal}>
            <ShopHeader>
              <ShopTitleRow>
                <ShopIcon><MdStorefront /></ShopIcon>
                <ShopTitle>{t('fishing.tradingPost')}</ShopTitle>
                <CloseButton onClick={onClose}><MdClose /></CloseButton>
              </ShopTitleRow>
              
              {/* Compact Wallet Display */}
              {tradingOptions && (
                <WalletStrip>
                  <WalletItem>
                    <IconTicket />
                    <WalletValue>{tradingOptions.tickets?.rollTickets || 0}</WalletValue>
                  </WalletItem>
                  <WalletDivider />
                  <WalletItem $highlight>
                    <IconPremiumTicket />
                    <WalletValue $highlight>{tradingOptions.tickets?.premiumTickets || 0}</WalletValue>
                  </WalletItem>
                </WalletStrip>
              )}
              
              {/* Daily Limits Display */}
              {tradingOptions?.dailyLimits && (
                <DailyLimitsStrip>
                  <DailyLimitItem
                    $atLimit={tradingOptions.dailyLimits.rollTickets.remaining === 0}
                    title={t('fishing.dailyLimitInfo', { used: tradingOptions.dailyLimits.rollTickets.used, limit: tradingOptions.dailyLimits.rollTickets.limit }) || `Daily: ${tradingOptions.dailyLimits.rollTickets.used}/${tradingOptions.dailyLimits.rollTickets.limit}`}
                  >
                    <IconTicket />
                    <DailyLimitText $atLimit={tradingOptions.dailyLimits.rollTickets.remaining === 0}>
                      {tradingOptions.dailyLimits.rollTickets.used}/{tradingOptions.dailyLimits.rollTickets.limit}
                    </DailyLimitText>
                    {tradingOptions.dailyLimits.rollTickets.remaining === 0 && <LimitReachedBadge>MAX</LimitReachedBadge>}
                  </DailyLimitItem>
                  <DailyLimitDivider />
                  <DailyLimitItem
                    $atLimit={tradingOptions.dailyLimits.premiumTickets.remaining === 0}
                    title={t('fishing.dailyLimitInfo', { used: tradingOptions.dailyLimits.premiumTickets.used, limit: tradingOptions.dailyLimits.premiumTickets.limit }) || `Daily: ${tradingOptions.dailyLimits.premiumTickets.used}/${tradingOptions.dailyLimits.premiumTickets.limit}`}
                  >
                    <IconPremiumTicket />
                    <DailyLimitText $atLimit={tradingOptions.dailyLimits.premiumTickets.remaining === 0}>
                      {tradingOptions.dailyLimits.premiumTickets.used}/{tradingOptions.dailyLimits.premiumTickets.limit}
                    </DailyLimitText>
                    {tradingOptions.dailyLimits.premiumTickets.remaining === 0 && <LimitReachedBadge>MAX</LimitReachedBadge>}
                  </DailyLimitItem>
                </DailyLimitsStrip>
              )}
            </ShopHeader>
            
            <ShopBody>
              {tradingLoading && !tradingOptions ? (
                <TradingLoadingState>
                  <FaFish className="loading-fish" />
                  <span>{t('common.loading')}</span>
                </TradingLoadingState>
              ) : tradingOptions ? (
                <>
                  {/* Trade Success Animation */}
                  <AnimatePresence>
                    {tradeResult && (
                      <TradeSuccessOverlay
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <TradeSuccessIcon><IconSparkleSymbol /></TradeSuccessIcon>
                        <TradeSuccessText>
                          {tradeResult.reward?.points && <span>+{tradeResult.reward.points} <IconPoints /></span>}
                          {tradeResult.reward?.rollTickets && <span>+{tradeResult.reward.rollTickets} <IconTicket /></span>}
                          {tradeResult.reward?.premiumTickets && <span> +{tradeResult.reward.premiumTickets} <IconPremiumTicket /></span>}
                        </TradeSuccessText>
                      </TradeSuccessOverlay>
                    )}
                  </AnimatePresence>
                  
                  {/* Fish Inventory - Compact Horizontal Bar */}
                  <FishBar>
                    {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => {
                      const RarityIcon = getRarityIcon(rarity);
                      return (
                        <FishChip key={rarity} $color={getRarityColor(rarity)} $hasAny={(tradingOptions.totals[rarity] || 0) > 0}>
                          <FishChipEmoji><RarityIcon /></FishChipEmoji>
                          <FishChipCount $color={getRarityColor(rarity)}>{tradingOptions.totals[rarity] || 0}</FishChipCount>
                        </FishChip>
                      );
                    })}
                  </FishBar>
                  
                  {/* Available Now */}
                  {availableTrades.length > 0 && (
                    <TradeSection>
                      <TradeSectionHeader $available>
                        <TradeSectionBadge $available><IconCheckmark /></TradeSectionBadge>
                        <TradeSectionTitle>{t('fishing.availableNow') || 'Available Now'}</TradeSectionTitle>
                        <TradeSectionCount>{availableTrades.length}</TradeSectionCount>
                      </TradeSectionHeader>
                      <TradeGrid>
                        {availableTrades.map(option => {
                          const GiveIcon = getRarityIcon(option.requiredRarity);
                          const GetIcon = getRewardIcon(option.rewardType);
                          return (
                            <QuickTradeCard
                              key={option.id}
                              $color={getRarityColor(option.requiredRarity)}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <TradeCardTop>
                                <TradeGiveSection>
                                  <TradeLabel>{t('fishing.give') || 'Give'}</TradeLabel>
                                  <TradeGiveContent>
                                    <TradeGiveEmoji><GiveIcon /></TradeGiveEmoji>
                                    <TradeGiveAmount>×{option.requiredQuantity}</TradeGiveAmount>
                                  </TradeGiveContent>
                                </TradeGiveSection>
                                <TradeArrow>→</TradeArrow>
                                <TradeGetSection>
                                  <TradeLabel>{t('fishing.get') || 'Get'}</TradeLabel>
                                  <TradeGetContent $type={option.rewardType}>
                                    <TradeGetEmoji><GetIcon /></TradeGetEmoji>
                                    <TradeGetAmount>
                                      {option.rewardType === 'mixed'
                                        ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                        : `+${option.rewardAmount}`}
                                    </TradeGetAmount>
                                  </TradeGetContent>
                                </TradeGetSection>
                              </TradeCardTop>
                              {/* Soft cap warning for points trades */}
                              {option.rewardType === 'points' &&
                               tradingOptions.dailyLimits?.pointsFromTrades?.used >= 10000 && (
                                <SoftCapWarning title={t('fishing.softCapTooltip') || 'Daily soft cap reached - rewards reduced by 50%'}>
                                  <IconWarningTriangle /> {t('fishing.reducedRewards') || '-50% rewards'}
                                </SoftCapWarning>
                              )}
                              {/* Near limit warning for ticket trades */}
                              {option.rewardType === 'rollTickets' &&
                               tradingOptions.dailyLimits?.rollTickets?.remaining > 0 &&
                               tradingOptions.dailyLimits?.rollTickets?.remaining <= option.rewardAmount && (
                                <NearLimitWarning>
                                  <IconTicket /> {t('fishing.lastTradeToday') || 'Last one today!'}
                                </NearLimitWarning>
                              )}
                              {option.rewardType === 'premiumTickets' &&
                               tradingOptions.dailyLimits?.premiumTickets?.remaining > 0 &&
                               tradingOptions.dailyLimits?.premiumTickets?.remaining <= option.rewardAmount && (
                                <NearLimitWarning>
                                  <IconPremiumTicket /> {t('fishing.lastTradeToday') || 'Last one today!'}
                                </NearLimitWarning>
                              )}
                            {/* Collection trade bottleneck indicator */}
                            {option.requiredRarity === 'collection' && option.bottleneck && (
                              <BottleneckInfo $color={getRarityColor(option.bottleneck.rarity)}>
                                {t('fishing.bottleneck') || 'Limiting:'} {option.bottleneck.quantity} {t(`fishing.${option.bottleneck.rarity}`)}
                              </BottleneckInfo>
                            )}
                              <QuickTradeButton
                                onClick={() => onTrade(option.id)}
                                disabled={tradingLoading}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {tradingLoading ? '...' : t('fishing.trade')}
                              </QuickTradeButton>
                            </QuickTradeCard>
                          );
                        })}
                      </TradeGrid>
                    </TradeSection>
                  )}
                  
                  {/* Daily Limit Reached */}
                  {limitReachedTrades.length > 0 && (
                    <TradeSection $limitReached>
                      <TradeSectionHeader $limitReached>
                        <TradeSectionBadge $limitReached><IconClock /></TradeSectionBadge>
                        <TradeSectionTitle>{t('fishing.dailyLimitReachedTitle') || 'Daily Limit Reached'}</TradeSectionTitle>
                        <TradeSectionCount>{limitReachedTrades.length}</TradeSectionCount>
                      </TradeSectionHeader>
                      <LimitReachedNote>{t('fishing.limitResetsAtMidnight') || 'Resets at midnight UTC'}</LimitReachedNote>
                      <LockedTradesList>
                        {limitReachedTrades.map(option => {
                          const GiveIcon = getRarityIcon(option.requiredRarity);
                          const GetIcon = getRewardIcon(option.rewardType);
                          return (
                            <LockedTradeRow key={option.id} $limitReached>
                              <LockedTradeInfo>
                                <LockedTradeEmoji><GiveIcon /></LockedTradeEmoji>
                                <LockedTradeText>
                                  <LockedTradeName>×{option.requiredQuantity} {t(`fishing.${option.requiredRarity}`)}</LockedTradeName>
                                </LockedTradeText>
                              </LockedTradeInfo>
                              <LockedTradeReward $limitReached>
                                <span><GetIcon /></span>
                                <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>
                                  {option.rewardType === 'mixed'
                                    ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                    : `+${option.rewardAmount}`}
                                </span>
                              </LockedTradeReward>
                            </LockedTradeRow>
                          );
                        })}
                      </LockedTradesList>
                    </TradeSection>
                  )}
                  
                  {/* Locked Trades - Progress Section */}
                  {needMoreFishTrades.length > 0 && (
                    <TradeSection $locked>
                      <TradeSectionHeader>
                        <TradeSectionBadge><IconLocked /></TradeSectionBadge>
                        <TradeSectionTitle>{t('fishing.needMoreFish') || 'Need More Fish'}</TradeSectionTitle>
                        <TradeSectionCount>{needMoreFishTrades.length}</TradeSectionCount>
                      </TradeSectionHeader>
                      <LockedTradesList>
                        {needMoreFishTrades.map(option => {
                          const progress = Math.min((option.currentQuantity / option.requiredQuantity) * 100, 100);
                          const GiveIcon = getRarityIcon(option.requiredRarity);
                          const GetIcon = getRewardIcon(option.rewardType);
                          return (
                            <LockedTradeRow key={option.id}>
                              <LockedTradeInfo>
                                <LockedTradeEmoji><GiveIcon /></LockedTradeEmoji>
                                <LockedTradeText>
                                  <LockedTradeName>{option.currentQuantity}/{option.requiredQuantity} {t(`fishing.${option.requiredRarity}`)}</LockedTradeName>
                                  <ProgressBarContainer>
                                    <ProgressBarFill $progress={progress} $color={getRarityColor(option.requiredRarity)} />
                                  </ProgressBarContainer>
                                </LockedTradeText>
                              </LockedTradeInfo>
                              <LockedTradeReward>
                                <span><GetIcon /></span>
                                <span>
                                  {option.rewardType === 'mixed'
                                    ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                    : `+${option.rewardAmount}`}
                                </span>
                              </LockedTradeReward>
                            </LockedTradeRow>
                          );
                        })}
                      </LockedTradesList>
                    </TradeSection>
                  )}
                  
                  {/* Empty State */}
                  {availableTrades.length === 0 && limitReachedTrades.length === 0 && needMoreFishTrades.length === 0 && (
                    <EmptyTradeState>
                      <IconFishing />
                      <p>{t('fishing.catchFishToTrade')}</p>
                    </EmptyTradeState>
                  )}
                </>
              ) : (
                <TradingLoadingState>
                  <span>{t('fishing.noFish')}</span>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>{t('fishing.catchFishToTrade')}</span>
                </TradingLoadingState>
              )}
            </ShopBody>
          </TradingPostModalStyled>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default TradingPostModal;

