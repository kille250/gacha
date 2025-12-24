import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { FaFish } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useRarity } from '../../../context/RarityContext';
import { ModalOverlay, motionVariants } from '../../../design-system';
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
} from '../FishingStyles';

const getRarityEmoji = (rarity) => {
  switch (rarity) {
    case 'common': return '🐟';
    case 'uncommon': return '🐠';
    case 'rare': return '🐡';
    case 'epic': return '🦈';
    case 'legendary': return '🐋';
    case 'special': return '🎣';
    case 'collection': return '📦';
    default: return '🐟';
  }
};

const getRewardEmoji = (rewardType) => {
  switch (rewardType) {
    case 'premiumTickets': return '🌟';
    case 'rollTickets': return '🎟️';
    case 'mixed': return '🎁';
    default: return '🪙';
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
                <ShopIcon>🏪</ShopIcon>
                <ShopTitle>{t('fishing.tradingPost')}</ShopTitle>
                <CloseButton onClick={onClose}><MdClose /></CloseButton>
              </ShopTitleRow>
              
              {/* Compact Wallet Display */}
              {tradingOptions && (
                <WalletStrip>
                  <WalletItem>
                    <span>🎟️</span>
                    <WalletValue>{tradingOptions.tickets?.rollTickets || 0}</WalletValue>
                  </WalletItem>
                  <WalletDivider />
                  <WalletItem $highlight>
                    <span>🌟</span>
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
                    <span>🎟️</span>
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
                    <span>🌟</span>
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
                        <TradeSuccessIcon>✨</TradeSuccessIcon>
                        <TradeSuccessText>
                          {tradeResult.reward?.points && `+${tradeResult.reward.points} 🪙`}
                          {tradeResult.reward?.rollTickets && `+${tradeResult.reward.rollTickets} 🎟️`}
                          {tradeResult.reward?.premiumTickets && ` +${tradeResult.reward.premiumTickets} 🌟`}
                        </TradeSuccessText>
                      </TradeSuccessOverlay>
                    )}
                  </AnimatePresence>
                  
                  {/* Fish Inventory - Compact Horizontal Bar */}
                  <FishBar>
                    {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => (
                      <FishChip key={rarity} $color={getRarityColor(rarity)} $hasAny={(tradingOptions.totals[rarity] || 0) > 0}>
                        <FishChipEmoji>{getRarityEmoji(rarity)}</FishChipEmoji>
                        <FishChipCount $color={getRarityColor(rarity)}>{tradingOptions.totals[rarity] || 0}</FishChipCount>
                      </FishChip>
                    ))}
                  </FishBar>
                  
                  {/* Available Now */}
                  {availableTrades.length > 0 && (
                    <TradeSection>
                      <TradeSectionHeader $available>
                        <TradeSectionBadge $available>✓</TradeSectionBadge>
                        <TradeSectionTitle>{t('fishing.availableNow') || 'Available Now'}</TradeSectionTitle>
                        <TradeSectionCount>{availableTrades.length}</TradeSectionCount>
                      </TradeSectionHeader>
                      <TradeGrid>
                        {availableTrades.map(option => (
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
                                  <TradeGiveEmoji>{getRarityEmoji(option.requiredRarity)}</TradeGiveEmoji>
                                  <TradeGiveAmount>×{option.requiredQuantity}</TradeGiveAmount>
                                </TradeGiveContent>
                              </TradeGiveSection>
                              <TradeArrow>→</TradeArrow>
                              <TradeGetSection>
                                <TradeLabel>{t('fishing.get') || 'Get'}</TradeLabel>
                                <TradeGetContent $type={option.rewardType}>
                                  <TradeGetEmoji>{getRewardEmoji(option.rewardType)}</TradeGetEmoji>
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
                                ⚠️ {t('fishing.reducedRewards') || '-50% rewards'}
                              </SoftCapWarning>
                            )}
                            {/* Near limit warning for ticket trades */}
                            {option.rewardType === 'rollTickets' && 
                             tradingOptions.dailyLimits?.rollTickets?.remaining > 0 &&
                             tradingOptions.dailyLimits?.rollTickets?.remaining <= option.rewardAmount && (
                              <NearLimitWarning>
                                🎫 {t('fishing.lastTradeToday') || 'Last one today!'}
                              </NearLimitWarning>
                            )}
                            {option.rewardType === 'premiumTickets' && 
                             tradingOptions.dailyLimits?.premiumTickets?.remaining > 0 &&
                             tradingOptions.dailyLimits?.premiumTickets?.remaining <= option.rewardAmount && (
                              <NearLimitWarning>
                                🌟 {t('fishing.lastTradeToday') || 'Last one today!'}
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
                        ))}
                      </TradeGrid>
                    </TradeSection>
                  )}
                  
                  {/* Daily Limit Reached */}
                  {limitReachedTrades.length > 0 && (
                    <TradeSection $limitReached>
                      <TradeSectionHeader $limitReached>
                        <TradeSectionBadge $limitReached>⏰</TradeSectionBadge>
                        <TradeSectionTitle>{t('fishing.dailyLimitReachedTitle') || 'Daily Limit Reached'}</TradeSectionTitle>
                        <TradeSectionCount>{limitReachedTrades.length}</TradeSectionCount>
                      </TradeSectionHeader>
                      <LimitReachedNote>{t('fishing.limitResetsAtMidnight') || 'Resets at midnight UTC'}</LimitReachedNote>
                      <LockedTradesList>
                        {limitReachedTrades.map(option => (
                          <LockedTradeRow key={option.id} $limitReached>
                            <LockedTradeInfo>
                              <LockedTradeEmoji>{getRarityEmoji(option.requiredRarity)}</LockedTradeEmoji>
                              <LockedTradeText>
                                <LockedTradeName>×{option.requiredQuantity} {t(`fishing.${option.requiredRarity}`)}</LockedTradeName>
                              </LockedTradeText>
                            </LockedTradeInfo>
                            <LockedTradeReward $limitReached>
                              <span>{getRewardEmoji(option.rewardType)}</span>
                              <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>
                                {option.rewardType === 'mixed' 
                                  ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                  : `+${option.rewardAmount}`}
                              </span>
                            </LockedTradeReward>
                          </LockedTradeRow>
                        ))}
                      </LockedTradesList>
                    </TradeSection>
                  )}
                  
                  {/* Locked Trades - Progress Section */}
                  {needMoreFishTrades.length > 0 && (
                    <TradeSection $locked>
                      <TradeSectionHeader>
                        <TradeSectionBadge>🔒</TradeSectionBadge>
                        <TradeSectionTitle>{t('fishing.needMoreFish') || 'Need More Fish'}</TradeSectionTitle>
                        <TradeSectionCount>{needMoreFishTrades.length}</TradeSectionCount>
                      </TradeSectionHeader>
                      <LockedTradesList>
                        {needMoreFishTrades.map(option => {
                          const progress = Math.min((option.currentQuantity / option.requiredQuantity) * 100, 100);
                          return (
                            <LockedTradeRow key={option.id}>
                              <LockedTradeInfo>
                                <LockedTradeEmoji>{getRarityEmoji(option.requiredRarity)}</LockedTradeEmoji>
                                <LockedTradeText>
                                  <LockedTradeName>{option.currentQuantity}/{option.requiredQuantity} {t(`fishing.${option.requiredRarity}`)}</LockedTradeName>
                                  <ProgressBarContainer>
                                    <ProgressBarFill $progress={progress} $color={getRarityColor(option.requiredRarity)} />
                                  </ProgressBarContainer>
                                </LockedTradeText>
                              </LockedTradeInfo>
                              <LockedTradeReward>
                                <span>{getRewardEmoji(option.rewardType)}</span>
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
                      <span>🎣</span>
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

