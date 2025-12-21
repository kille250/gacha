import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  MdArrowBack, 
  MdAdd, 
  MdLock, 
  MdClose,
  MdTrendingUp,
  MdAccessTime,
  MdAutorenew,
  MdSearch
} from 'react-icons/md';
import { FaDumbbell, FaCoins, FaTicketAlt, FaStar, FaTimes } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import {
  getDojoStatus,
  getDojoAvailableCharacters,
  assignCharacterToDojo,
  unassignCharacterFromDojo,
  claimDojoRewards,
  purchaseDojoUpgrade,
  getAssetUrl
} from '../utils/api';
import { theme, Spinner } from '../styles/DesignSystem';
import { PLACEHOLDER_IMAGE, isVideo, getVideoMimeType } from '../utils/mediaUtils';

// ===========================================
// ANIMATIONS
// ===========================================

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(255, 200, 0, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 200, 0, 0.6); }
`;

// ===========================================
// COMPONENT
// ===========================================

const DojoPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();
  
  // State
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [claimResult, setClaimResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Auto-refresh interval for accumulated time
  const refreshIntervalRef = useRef(null);

  // Fetch dojo status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await getDojoStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dojo status:', err);
      setError(t('dojo.failedLoadStatus'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStatus();
    
    // Refresh every 30 seconds to update accumulated time
    refreshIntervalRef.current = setInterval(fetchStatus, 30000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchStatus]);

  // Open character picker for a slot
  const openCharacterPicker = async (slotIndex) => {
    setSelectedSlot(slotIndex);
    setShowCharacterPicker(true);
    setCharactersLoading(true);
    setSearchQuery('');
    
    try {
      const data = await getDojoAvailableCharacters();
      setAvailableCharacters(data.characters || []);
    } catch (err) {
      console.error('Failed to fetch available characters:', err);
      setAvailableCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  };

  // Assign character to slot
  const handleAssign = async (characterId) => {
    if (selectedSlot === null) return;
    
    try {
      await assignCharacterToDojo(characterId, selectedSlot);
      setShowCharacterPicker(false);
      setSelectedSlot(null);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to assign character:', err);
      setError(err.response?.data?.error || t('dojo.failedAssign'));
    }
  };

  // Remove character from slot
  const handleUnassign = async (slotIndex) => {
    try {
      await unassignCharacterFromDojo(slotIndex);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to unassign character:', err);
      setError(err.response?.data?.error || t('dojo.failedUnassign'));
    }
  };

  // Claim rewards
  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    
    try {
      const result = await claimDojoRewards();
      setClaimResult(result);
      await fetchStatus();
      await refreshUser();
      
      // Auto-hide after 5 seconds
      setTimeout(() => setClaimResult(null), 5000);
    } catch (err) {
      console.error('Failed to claim rewards:', err);
      setError(err.response?.data?.error || t('dojo.failedClaim'));
    } finally {
      setClaiming(false);
    }
  };

  // Purchase upgrade
  const handleUpgrade = async (upgradeType, rarity = null) => {
    if (upgrading) return;
    setUpgrading(upgradeType + (rarity || ''));
    
    try {
      await purchaseDojoUpgrade(upgradeType, rarity);
      await fetchStatus();
      await refreshUser();
    } catch (err) {
      console.error('Failed to purchase upgrade:', err);
      setError(err.response?.data?.error || t('dojo.failedUpgrade'));
    } finally {
      setUpgrading(null);
    }
  };

  // Filter characters by search
  const filteredCharacters = availableCharacters.filter(char => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return char.name.toLowerCase().includes(query) || 
           char.series?.toLowerCase().includes(query);
  });

  // Group by series for display
  const charactersBySeries = filteredCharacters.reduce((acc, char) => {
    const series = char.series || 'Unknown';
    if (!acc[series]) acc[series] = [];
    acc[series].push(char);
    return acc;
  }, {});

  // Calculate if can claim
  const canClaim = status?.accumulated?.rewards?.points > 0 || 
                   status?.accumulated?.rewards?.rollTickets > 0 ||
                   status?.accumulated?.rewards?.premiumTickets > 0;

  // Get progress percentage
  const progressPercent = status?.accumulated ? 
    Math.min((status.accumulated.hours / status.accumulated.capHours) * 100, 100) : 0;

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Spinner />
          <LoadingText>{t('dojo.loading')}</LoadingText>
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <HeaderInner>
          <BackButton onClick={() => navigate(-1)}>
            <MdArrowBack />
          </BackButton>
          <HeaderContent>
            <HeaderIcon>🏯</HeaderIcon>
            <HeaderTitle>{t('dojo.title')}</HeaderTitle>
          </HeaderContent>
          <HeaderStats>
            <StatBadge>
              <FaCoins />
              <span>{user?.points?.toLocaleString() || 0}</span>
            </StatBadge>
          </HeaderStats>
        </HeaderInner>
      </Header>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <ErrorBanner
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ErrorBannerInner>
              <span>{error}</span>
              <CloseErrorBtn onClick={() => setError(null)}>
                <MdClose />
              </CloseErrorBtn>
            </ErrorBannerInner>
          </ErrorBanner>
        )}
      </AnimatePresence>

      {/* Claim Result Popup */}
      <AnimatePresence>
        {claimResult && (
          <ClaimPopup
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClaimPopupContent>
              <ClaimPopupIcon>🎉</ClaimPopupIcon>
              <ClaimPopupTitle>{t('dojo.trainingComplete')}</ClaimPopupTitle>
              <ClaimPopupRewards>
                {claimResult.rewards.points > 0 && (
                  <RewardItem>
                    <FaCoins color="#FFD700" />
                    <span>{t('dojo.points', { count: claimResult.rewards.points.toLocaleString() })}</span>
                  </RewardItem>
                )}
                {claimResult.rewards.rollTickets > 0 && (
                  <RewardItem>
                    <FaTicketAlt color="#0a84ff" />
                    <span>{t('dojo.rollTickets', { count: claimResult.rewards.rollTickets })}</span>
                  </RewardItem>
                )}
                {claimResult.rewards.premiumTickets > 0 && (
                  <RewardItem>
                    <FaStar color="#bf5af2" />
                    <span>{t('dojo.premiumTickets', { count: claimResult.rewards.premiumTickets })}</span>
                  </RewardItem>
                )}
              </ClaimPopupRewards>
              {claimResult.activeBonus && (
                <ActiveBonusTag>{t('dojo.activeBonusApplied')}</ActiveBonusTag>
              )}
              {claimResult.catchUpBonus?.isActive && (
                <CatchUpBonusTag>
                  🚀 {t('dojo.catchUpBonusApplied', { 
                    bonus: Math.round((claimResult.catchUpBonus.multiplier - 1) * 100) 
                  })}
                </CatchUpBonusTag>
              )}
            </ClaimPopupContent>
          </ClaimPopup>
        )}
      </AnimatePresence>

      <MainContent>
        {/* Accumulated Rewards Card */}
        <AccumulatedCard $isCapped={status?.accumulated?.isCapped}>
          <AccumulatedHeader>
            <AccumulatedTitle>
              <MdAccessTime />
              <span>{t('dojo.accumulatedRewards')}</span>
            </AccumulatedTitle>
            <AccumulatedTime>
              {status?.accumulated?.hours?.toFixed(1) || 0}h / {status?.accumulated?.capHours || 8}h
            </AccumulatedTime>
          </AccumulatedHeader>
          
          <ProgressBar>
            <ProgressFill style={{ width: `${progressPercent}%` }} $isCapped={status?.accumulated?.isCapped} />
          </ProgressBar>
          
          <AccumulatedRewards>
            <AccumulatedReward>
              <FaCoins />
              <span>{status?.accumulated?.rewards?.points?.toLocaleString() || 0}</span>
            </AccumulatedReward>
            <AccumulatedReward>
              <FaTicketAlt />
              <span>{status?.accumulated?.rewards?.rollTickets || 0}</span>
            </AccumulatedReward>
            <AccumulatedReward $premium>
              <FaStar />
              <span>{status?.accumulated?.rewards?.premiumTickets || 0}</span>
            </AccumulatedReward>
          </AccumulatedRewards>
          
          <ClaimButton 
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            $canClaim={canClaim}
            whileHover={canClaim ? { scale: 1.02 } : {}}
            whileTap={canClaim ? { scale: 0.98 } : {}}
          >
            {claiming ? (
              <><MdAutorenew className="spin" /> {t('dojo.claiming')}</>
            ) : canClaim ? (
              <>{t('dojo.claimRewards')}</>
            ) : (
              <>{t('dojo.noRewardsYet')}</>
            )}
          </ClaimButton>
        </AccumulatedCard>

        {/* Daily Caps Display */}
        {status?.dailyCaps && (
          <DailyCapsCard $isCapped={status.dailyCaps.isPointsCapped}>
            <DailyCapsHeader>
              <DailyCapsTitle>
                📊 {t('dojo.dailyProgress')}
              </DailyCapsTitle>
              <DailyCapsReset>
                {t('dojo.resetsAtMidnight')}
              </DailyCapsReset>
            </DailyCapsHeader>
            <DailyCapsGrid>
              <DailyCapItem $isCapped={status.dailyCaps.remaining.points <= 0}>
                <DailyCapIcon><FaCoins /></DailyCapIcon>
                <DailyCapProgress>
                  <DailyCapLabel>{t('dojo.points')}</DailyCapLabel>
                  <DailyCapBar>
                    <DailyCapFill 
                      style={{ 
                        width: `${Math.min(100, (status.dailyCaps.todayClaimed.points / status.dailyCaps.limits.points) * 100)}%` 
                      }} 
                      $isCapped={status.dailyCaps.remaining.points <= 0}
                    />
                  </DailyCapBar>
                  <DailyCapNumbers>
                    {status.dailyCaps.todayClaimed.points.toLocaleString()} / {status.dailyCaps.limits.points.toLocaleString()}
                  </DailyCapNumbers>
                </DailyCapProgress>
              </DailyCapItem>
              <DailyCapItem $isCapped={status.dailyCaps.remaining.rollTickets <= 0}>
                <DailyCapIcon><FaTicketAlt /></DailyCapIcon>
                <DailyCapProgress>
                  <DailyCapLabel>{t('dojo.rollTicketsLabel')}</DailyCapLabel>
                  <DailyCapBar>
                    <DailyCapFill 
                      style={{ 
                        width: `${Math.min(100, (status.dailyCaps.todayClaimed.rollTickets / status.dailyCaps.limits.rollTickets) * 100)}%` 
                      }}
                      $isCapped={status.dailyCaps.remaining.rollTickets <= 0}
                    />
                  </DailyCapBar>
                  <DailyCapNumbers>
                    {status.dailyCaps.todayClaimed.rollTickets} / {status.dailyCaps.limits.rollTickets}
                  </DailyCapNumbers>
                </DailyCapProgress>
              </DailyCapItem>
              <DailyCapItem $isCapped={status.dailyCaps.remaining.premiumTickets <= 0}>
                <DailyCapIcon $premium><FaStar /></DailyCapIcon>
                <DailyCapProgress>
                  <DailyCapLabel>{t('dojo.premiumTicketsLabel')}</DailyCapLabel>
                  <DailyCapBar>
                    <DailyCapFill 
                      style={{ 
                        width: `${Math.min(100, (status.dailyCaps.todayClaimed.premiumTickets / status.dailyCaps.limits.premiumTickets) * 100)}%` 
                      }}
                      $premium
                      $isCapped={status.dailyCaps.remaining.premiumTickets <= 0}
                    />
                  </DailyCapBar>
                  <DailyCapNumbers>
                    {status.dailyCaps.todayClaimed.premiumTickets} / {status.dailyCaps.limits.premiumTickets}
                  </DailyCapNumbers>
                </DailyCapProgress>
              </DailyCapItem>
            </DailyCapsGrid>
            {/* Ticket Progress (Pity System) */}
            {status.ticketProgress && (status.ticketProgress.roll > 0 || status.ticketProgress.premium > 0) && (
              <TicketProgressSection>
                <TicketProgressLabel>🎫 {t('dojo.ticketProgress')}</TicketProgressLabel>
                <TicketProgressBars>
                  {status.ticketProgress.roll > 0 && (
                    <TicketProgressItem>
                      <FaTicketAlt />
                      <TicketProgressBar>
                        <TicketProgressFill style={{ width: `${status.ticketProgress.roll * 100}%` }} />
                      </TicketProgressBar>
                      <span>{Math.round(status.ticketProgress.roll * 100)}%</span>
                    </TicketProgressItem>
                  )}
                  {status.ticketProgress.premium > 0 && (
                    <TicketProgressItem $premium>
                      <FaStar />
                      <TicketProgressBar>
                        <TicketProgressFill $premium style={{ width: `${status.ticketProgress.premium * 100}%` }} />
                      </TicketProgressBar>
                      <span>{Math.round(status.ticketProgress.premium * 100)}%</span>
                    </TicketProgressItem>
                  )}
                </TicketProgressBars>
              </TicketProgressSection>
            )}
          </DailyCapsCard>
        )}

        {/* Hourly Rate Display */}
        <HourlyRateCard>
          <HourlyRateHeader>
            <MdTrendingUp />
            <span>{t('dojo.hourlyRate')}</span>
          </HourlyRateHeader>
          <HourlyRateStats>
            <HourlyStat>
              <FaCoins />
              <span>{status?.hourlyRate?.points || 0}/h</span>
            </HourlyStat>
            <HourlyStat>
              <FaTicketAlt />
              <span>~{((status?.hourlyRate?.rollTickets || 0)).toFixed(2)}/h</span>
            </HourlyStat>
            <HourlyStat $premium>
              <FaStar />
              <span>~{((status?.hourlyRate?.premiumTickets || 0)).toFixed(2)}/h</span>
            </HourlyStat>
          </HourlyRateStats>
          {/* Level Bonuses */}
          {status?.slots?.filter(s => s?.character?.level > 1).length > 0 && (
            <LevelBonusSection>
              <LevelBonusLabel>⚔️ Level Bonuses:</LevelBonusLabel>
              <LevelBonusBadges>
                {status.slots
                  .filter(s => s?.character?.level > 1)
                  .map((slot, idx) => {
                    const char = slot.character;
                    const bonus = Math.round((char.levelMultiplier - 1) * 100);
                    return (
                      <LevelBonusBadge key={idx}>
                        {char.name} Lv.{char.level} (+{bonus}%)
                      </LevelBonusBadge>
                    );
                  })}
              </LevelBonusBadges>
            </LevelBonusSection>
          )}
          {/* Catch-Up Bonus for new players */}
          {status?.hourlyRate?.catchUpBonus?.isActive && (
            <CatchUpBonusBadge>
              🚀 {t('dojo.catchUpBonus', { 
                bonus: Math.round((status.hourlyRate.catchUpBonus.multiplier - 1) * 100) 
              })}
            </CatchUpBonusBadge>
          )}
          {/* Synergies */}
          {status?.hourlyRate?.synergies?.length > 0 && (
            <SynergyBadges>
              {status.hourlyRate.synergies.map((syn, idx) => (
                <SynergyBadge key={idx}>
                  {syn.series} ×{syn.count} (+{Math.round((syn.bonus - 1) * 100)}%)
                </SynergyBadge>
              ))}
            </SynergyBadges>
          )}
          {/* Diminishing Returns Indicator */}
          {status?.hourlyRate?.diminishingReturnsApplied && (
            <EfficiencyIndicator>
              ⚖️ {t('dojo.efficiency', { percent: status.hourlyRate.efficiency || 100 })}
            </EfficiencyIndicator>
          )}
        </HourlyRateCard>

        {/* Training Slots */}
        <SlotsSection>
          <SlotsHeader>
            <SlotsTitle>
              <FaDumbbell />
              <span>{t('dojo.trainingSlots')}</span>
            </SlotsTitle>
            <SlotsCount>{status?.usedSlots || 0} / {status?.maxSlots || 3}</SlotsCount>
          </SlotsHeader>
          
          <SlotsGrid>
            {Array.from({ length: status?.maxSlots || 3 }).map((_, idx) => {
              const slot = status?.slots?.[idx];
              const char = slot?.character;
              
              return char ? (
                <FilledSlot
                  key={idx}
                  $rarity={char.rarity}
                  $color={getRarityColor(char.rarity)}
                  $glow={getRarityGlow(char.rarity)}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Show video for filled slots (limited count), images otherwise */}
                  {isVideo(char.image) ? (
                    <SlotVideo autoPlay loop muted playsInline>
                      <source src={getAssetUrl(char.image)} type={getVideoMimeType(char.image)} />
                    </SlotVideo>
                  ) : (
                    <SlotImage 
                      src={getAssetUrl(char.image) || PLACEHOLDER_IMAGE} 
                      alt={char.name}
                      onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                    />
                  )}
                  <SlotOverlay>
                    <SlotCharName>{char.name}</SlotCharName>
                    <SlotCharSeries>{char.series}</SlotCharSeries>
                    <SlotBadgeRow>
                      <SlotRarityBadge $color={getRarityColor(char.rarity)}>
                        {char.rarity}
                      </SlotRarityBadge>
                      {char.level && (
                        <SlotLevelBadge $isMaxLevel={char.level >= 5}>
                          Lv.{char.level} {char.levelMultiplier > 1 && `(${Math.round(char.levelMultiplier * 100)}%)`}
                        </SlotLevelBadge>
                      )}
                    </SlotBadgeRow>
                  </SlotOverlay>
                  <RemoveButton onClick={() => handleUnassign(idx)}>
                    <FaTimes />
                  </RemoveButton>
                </FilledSlot>
              ) : (
                <EmptySlot
                  key={idx}
                  onClick={() => openCharacterPicker(idx)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MdAdd />
                  <span>{t('dojo.addCharacter')}</span>
                </EmptySlot>
              );
            })}
            
            {/* Locked slots preview */}
            {Array.from({ length: Math.min(2, 10 - (status?.maxSlots || 3)) }).map((_, idx) => (
              <LockedSlot key={`locked-${idx}`}>
                <MdLock />
                <span>{t('dojo.locked')}</span>
              </LockedSlot>
            ))}
          </SlotsGrid>
        </SlotsSection>

        {/* Upgrades Section */}
        <UpgradesSection>
          <UpgradesTitle>{t('dojo.upgrades')}</UpgradesTitle>
          <UpgradesGrid>
            {status?.availableUpgrades?.map((upgrade, idx) => {
              const isUpgrading = upgrading === (upgrade.type + (upgrade.rarity || ''));
              const canAfford = (user?.points || 0) >= upgrade.cost;
              
              return (
                <UpgradeCard
                  key={idx}
                  $canAfford={canAfford}
                  onClick={() => canAfford && !isUpgrading && handleUpgrade(upgrade.type, upgrade.rarity)}
                  whileHover={canAfford ? { scale: 1.02 } : {}}
                  whileTap={canAfford ? { scale: 0.98 } : {}}
                >
                  <UpgradeIcon>{upgrade.icon}</UpgradeIcon>
                  <UpgradeInfo>
                    <UpgradeName>{upgrade.name}</UpgradeName>
                    <UpgradeDesc>{upgrade.description}</UpgradeDesc>
                  </UpgradeInfo>
                  <UpgradeCost $canAfford={canAfford}>
                    {isUpgrading ? (
                      <MdAutorenew className="spin" />
                    ) : (
                      <>
                        <FaCoins />
                        <span>{upgrade.cost.toLocaleString()}</span>
                      </>
                    )}
                  </UpgradeCost>
                </UpgradeCard>
              );
            })}
            
            {(!status?.availableUpgrades || status.availableUpgrades.length === 0) && (
              <NoUpgrades>{t('dojo.allUpgradesPurchased')}</NoUpgrades>
            )}
          </UpgradesGrid>
        </UpgradesSection>
      </MainContent>

      {/* Character Picker Modal */}
      <AnimatePresence>
        {showCharacterPicker && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCharacterPicker(false)}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>{t('dojo.selectCharacter')}</ModalTitle>
                <ModalCloseBtn onClick={() => setShowCharacterPicker(false)}>
                  <MdClose />
                </ModalCloseBtn>
              </ModalHeader>
              
              <SearchContainer>
                <MdSearch />
                <SearchInput
                  type="text"
                  placeholder={t('dojo.searchCharacters')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </SearchContainer>
              
              <ModalBody>
                {charactersLoading ? (
                  <ModalLoading>
                    <Spinner />
                    <span>{t('dojo.loadingCharacters')}</span>
                  </ModalLoading>
                ) : filteredCharacters.length === 0 ? (
                  <NoCharacters>
                    {searchQuery ? t('dojo.noMatchingCharacters') : t('dojo.noAvailableCharacters')}
                  </NoCharacters>
                ) : (
                  <CharacterList>
                    {Object.entries(charactersBySeries).map(([series, chars]) => (
                      <React.Fragment key={series}>
                        <SeriesTitle>{series} ({chars.length})</SeriesTitle>
                        <CharacterGrid>
                          {chars.map(char => (
                          <CharacterCard
                            key={char.id}
                            $color={getRarityColor(char.rarity)}
                            onClick={() => handleAssign(char.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {isVideo(char.image) ? (
                              <CharVideo autoPlay loop muted playsInline>
                                <source src={getAssetUrl(char.image)} type={getVideoMimeType(char.image)} />
                              </CharVideo>
                            ) : (
                              <CharImage 
                                src={getAssetUrl(char.image) || PLACEHOLDER_IMAGE}
                                alt={char.name}
                                loading="lazy"
                                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                              />
                            )}
                            <CharOverlay>
                              <CharName>{char.name}</CharName>
                              <CharBadges>
                                <CharRarity $color={getRarityColor(char.rarity)}>
                                  {char.rarity}
                                </CharRarity>
                                {char.level && (
                                  <CharLevel $isMaxLevel={char.level >= 5} $multiplier={char.levelMultiplier}>
                                    Lv.{char.level}
                                  </CharLevel>
                                )}
                              </CharBadges>
                              {char.levelMultiplier > 1 && (
                                <CharPowerBonus>⚡ {Math.round(char.levelMultiplier * 100)}% power</CharPowerBonus>
                              )}
                            </CharOverlay>
                          </CharacterCard>
                          ))}
                        </CharacterGrid>
                      </React.Fragment>
                    ))}
                  </CharacterList>
                )}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

// ===========================================
// STYLED COMPONENTS
// ===========================================

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, 
    ${theme.colors.background} 0%, 
    ${theme.colors.backgroundSecondary} 50%,
    ${theme.colors.background} 100%
  );
  padding-bottom: env(safe-area-inset-bottom, 20px);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: ${theme.spacing.lg};
`;

const LoadingText = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.lg};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  position: sticky;
  top: 49px; /* Account for main navigation bar height */
  z-index: 100;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.sm};
  }
`;

const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  width: 100%;
  max-width: 900px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: ${theme.radius.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 20px;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex: 1;
  min-width: 0;
`;

const HeaderIcon = styled.span`
  font-size: 28px;
  flex-shrink: 0;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 24px;
  }
`;

const HeaderTitle = styled.h1`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  white-space: nowrap;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const HeaderStats = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
`;

const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.1));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #FFD700;
  
  svg {
    font-size: 14px;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
    
    svg {
      font-size: 12px;
    }
  }
`;

const ErrorBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(255, 59, 48, 0.15);
  border-bottom: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
`;

const ErrorBannerInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  gap: ${theme.spacing.md};
`;

const CloseErrorBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.error};
  cursor: pointer;
  padding: ${theme.spacing.xs};
  display: flex;
  font-size: 18px;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
`;

const ClaimPopup = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const ClaimPopupContent = styled.div`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  text-align: center;
  box-shadow: ${theme.shadows.xl};
  animation: ${glow} 2s ease-in-out infinite;
  width: calc(100% - 32px);
  max-width: 320px;
  pointer-events: auto;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

const ClaimPopupIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
  animation: ${float} 2s ease-in-out infinite;
`;

const ClaimPopupTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg} 0;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const ClaimPopupRewards = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const RewardItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

const ActiveBonusTag = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(48, 209, 88, 0.2), rgba(52, 199, 89, 0.1));
  border: 1px solid rgba(48, 209, 88, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #30d158;
  display: inline-block;
`;

const CatchUpBonusTag = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 204, 0, 0.1));
  border: 1px solid rgba(255, 159, 10, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #ff9f0a;
  display: inline-block;
`;

const MainContent = styled.main`
  max-width: 900px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.lg};
  }
`;

const AccumulatedCard = styled.div`
  background: ${props => props.$isCapped 
    ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.1), rgba(255, 69, 0, 0.05))'
    : theme.colors.surface};
  border: 1px solid ${props => props.$isCapped 
    ? 'rgba(255, 159, 10, 0.4)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  ${props => props.$isCapped && css`animation: ${pulse} 2s ease-in-out infinite;`}
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

const AccumulatedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const AccumulatedTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  
  svg {
    color: ${theme.colors.primary};
    flex-shrink: 0;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

const AccumulatedTime = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  background: ${theme.colors.glass};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
`;

const ProgressBar = styled.div`
  height: 10px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  margin-bottom: ${theme.spacing.lg};
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$isCapped 
    ? 'linear-gradient(90deg, #ff9f0a, #ff6b00)'
    : `linear-gradient(90deg, ${theme.colors.primary}, #00b4d8)`};
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
    border-radius: ${theme.radius.full} ${theme.radius.full} 0 0;
  }
`;

const AccumulatedRewards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

const AccumulatedReward = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${props => props.$premium ? 'rgba(191, 90, 242, 0.3)' : 'rgba(255, 215, 0, 0.2)'};
  
  span {
    font-size: ${theme.fontSizes.xl};
    font-weight: ${theme.fontWeights.bold};
    color: ${props => props.$premium ? '#bf5af2' : theme.colors.text};
  }
  
  svg {
    font-size: 20px;
    color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm};
    
    span {
      font-size: ${theme.fontSizes.lg};
    }
    
    svg {
      font-size: 16px;
    }
  }
`;

const ClaimButton = styled(motion.button)`
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  min-height: 52px;
  background: ${props => props.$canClaim 
    ? 'linear-gradient(135deg, #FFD700, #FFA500)'
    : theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canClaim ? '#1c1c1e' : theme.colors.textTertiary};
  cursor: ${props => props.$canClaim ? 'pointer' : 'default'};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

// Daily Caps Card Styles
const DailyCapsCard = styled.div`
  background: ${props => props.$isCapped 
    ? 'linear-gradient(135deg, rgba(255, 59, 48, 0.08), rgba(255, 149, 0, 0.05))'
    : theme.colors.surface};
  border: 1px solid ${props => props.$isCapped 
    ? 'rgba(255, 149, 0, 0.3)'
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const DailyCapsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const DailyCapsTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const DailyCapsReset = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  background: ${theme.colors.glass};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
`;

const DailyCapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const DailyCapItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${props => props.$isCapped 
    ? 'rgba(255, 149, 0, 0.1)' 
    : theme.colors.glass};
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => props.$isCapped 
    ? 'rgba(255, 149, 0, 0.2)' 
    : 'transparent'};
`;

const DailyCapIcon = styled.div`
  width: 32px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
  font-size: 14px;
`;

const DailyCapProgress = styled.div`
  flex: 1;
  min-width: 0;
`;

const DailyCapLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const DailyCapBar = styled.div`
  height: 6px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  margin-bottom: 4px;
`;

const DailyCapFill = styled.div`
  height: 100%;
  background: ${props => props.$isCapped 
    ? 'linear-gradient(90deg, #ff9500, #ff3b30)'
    : props.$premium 
      ? 'linear-gradient(90deg, #bf5af2, #af52de)'
      : 'linear-gradient(90deg, #30d158, #34c759)'};
  border-radius: ${theme.radius.full};
  transition: width 0.3s ease;
`;

const DailyCapNumbers = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
`;

const TicketProgressSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const TicketProgressLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

const TicketProgressBars = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const TicketProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex: 1;
  min-width: 120px;
  
  svg {
    color: ${props => props.$premium ? '#bf5af2' : '#0a84ff'};
    font-size: 12px;
  }
  
  span {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.textSecondary};
    min-width: 36px;
    text-align: right;
  }
`;

const TicketProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const TicketProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$premium 
    ? 'linear-gradient(90deg, #bf5af2, #af52de)'
    : 'linear-gradient(90deg, #0a84ff, #5ac8fa)'};
  border-radius: ${theme.radius.full};
  transition: width 0.3s ease;
`;

const HourlyRateCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const HourlyRateHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  
  svg {
    color: #30d158;
    font-size: 20px;
  }
`;

const HourlyRateStats = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.md};
  }
`;

const HourlyStat = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.base};
  color: ${props => props.$premium ? '#bf5af2' : theme.colors.textSecondary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.md};
  
  svg {
    color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
    font-size: 14px;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

const LevelBonusSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const LevelBonusLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
  text-align: center;
`;

const LevelBonusBadges = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  justify-content: center;
`;

const LevelBonusBadge = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: linear-gradient(135deg, rgba(88, 86, 214, 0.15), rgba(175, 82, 222, 0.15));
  border: 1px solid rgba(88, 86, 214, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: #BF5AF2;
  white-space: nowrap;
`;

const SynergyBadges = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
  justify-content: center;
`;

const SynergyBadge = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(48, 209, 88, 0.15);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: #30d158;
  white-space: nowrap;
`;

const CatchUpBonusBadge = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 204, 0, 0.15));
  border: 1px solid rgba(255, 159, 10, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #ff9f0a;
  text-align: center;
  font-weight: ${theme.fontWeights.semibold};
`;

const EfficiencyIndicator = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(142, 142, 147, 0.1);
  border: 1px solid rgba(142, 142, 147, 0.2);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

const SlotsSection = styled.section`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

const SlotsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const SlotsTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg {
    color: ${theme.colors.primary};
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

const SlotsCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.glass};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
`;

const SlotsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing.sm};
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FilledSlot = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  box-shadow: 0 0 20px ${props => props.$glow || 'transparent'};
  cursor: default;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.lg};
  }
`;

const SlotImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const SlotVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const SlotOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.sm};
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs};
  }
`;

const SlotCharName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const SlotCharSeries = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 10px;
  }
`;

const SlotBadgeRow = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const SlotRarityBadge = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  text-transform: uppercase;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 1px 4px;
    font-size: 9px;
  }
`;

const SlotLevelBadge = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.$isMaxLevel 
    ? 'linear-gradient(135deg, #ffd700, #ff8c00)' 
    : 'rgba(88, 86, 214, 0.9)'};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  
  ${props => props.$isMaxLevel && `
    animation: ${pulse} 2s ease-in-out infinite;
  `}
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 1px 4px;
    font-size: 9px;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: all ${theme.transitions.fast};
  font-size: 14px;
  
  /* Always visible on touch devices */
  @media (hover: none) {
    opacity: 1;
  }
  
  /* Hover behavior on desktop */
  @media (hover: hover) {
    opacity: 0;
    
    ${FilledSlot}:hover & {
      opacity: 1;
    }
  }
  
  &:hover, &:active {
    background: ${theme.colors.error};
    border-color: ${theme.colors.error};
    transform: scale(1.1);
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    font-size: 12px;
  }
`;

const EmptySlot = styled(motion.div)`
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  border: 2px dashed ${theme.colors.surfaceBorder};
  background: ${theme.colors.glass};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  cursor: pointer;
  color: ${theme.colors.textSecondary};
  transition: all ${theme.transitions.fast};
  min-height: 120px;
  
  svg {
    font-size: 28px;
  }
  
  span {
    font-size: ${theme.fontSizes.xs};
    text-align: center;
  }
  
  &:hover, &:active {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
    background: rgba(0, 113, 227, 0.08);
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.lg};
    
    svg {
      font-size: 24px;
    }
  }
`;

const LockedSlot = styled.div`
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  border: 1px dashed ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.textTertiary};
  opacity: 0.5;
  min-height: 120px;
  
  svg {
    font-size: 20px;
  }
  
  span {
    font-size: ${theme.fontSizes.xs};
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.lg};
    
    svg {
      font-size: 16px;
    }
  }
`;

const UpgradesSection = styled.section`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg};
  }
`;

const UpgradesTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg} 0;
  
  &::before {
    content: '⬆️';
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

const UpgradesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const UpgradeCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${props => props.$canAfford 
    ? 'rgba(255, 215, 0, 0.2)' 
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  cursor: ${props => props.$canAfford ? 'pointer' : 'default'};
  opacity: ${props => props.$canAfford ? 1 : 0.6};
  transition: all ${theme.transitions.fast};
  min-height: 60px;
  
  &:hover, &:active {
    ${props => props.$canAfford && `
      background: ${theme.colors.surfaceHover};
      border-color: rgba(255, 215, 0, 0.4);
      transform: translateY(-1px);
    `}
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    flex-wrap: wrap;
  }
`;

const UpgradeIcon = styled.div`
  font-size: 24px;
  width: 48px;
  height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${theme.colors.surfaceBorder};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    width: 40px;
    height: 40px;
    min-width: 40px;
    font-size: 20px;
  }
`;

const UpgradeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

const UpgradeDesc = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const UpgradeCost = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$canAfford 
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.15))' 
    : theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$canAfford 
    ? 'rgba(255, 215, 0, 0.3)' 
    : 'transparent'};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canAfford ? '#FFD700' : theme.colors.textTertiary};
  white-space: nowrap;
  flex-shrink: 0;
  
  svg {
    font-size: 12px;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
  }
`;

const NoUpgrades = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
  border: 1px dashed ${theme.colors.surfaceBorder};
`;

// Modal styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  
  @media (min-width: ${theme.breakpoints.sm}) {
    align-items: center;
    padding: ${theme.spacing.md};
  }
`;

const ModalContent = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  height: 85vh;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (min-width: ${theme.breakpoints.sm}) {
    height: auto;
    max-height: 80vh;
    border-radius: ${theme.radius.xl};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
  position: relative;
  
  /* Drag handle indicator on mobile */
  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    background: ${theme.colors.surfaceBorder};
    border-radius: 2px;
    
    @media (min-width: ${theme.breakpoints.sm}) {
      display: none;
    }
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    padding-top: ${theme.spacing.lg};
  }
`;

const ModalTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const ModalCloseBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: ${theme.radius.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all ${theme.transitions.fast};
  
  &:hover, &:active {
    background: ${theme.colors.surfaceHover};
    border-color: ${theme.colors.primary};
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.glass};
  flex-shrink: 0;
  
  svg {
    color: ${theme.colors.textSecondary};
    font-size: 20px;
    flex-shrink: 0;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  min-width: 0;
  height: 44px;
  
  &::placeholder {
    color: ${theme.colors.textTertiary};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${theme.spacing.md} ${theme.spacing.md};
  -webkit-overflow-scrolling: touch;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceBorder};
    border-radius: 3px;
  }
`;

const ModalLoading = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
  min-height: 200px;
`;

const NoCharacters = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CharacterList = styled.div`
  padding-top: ${theme.spacing.sm};
`;

const SeriesTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundSecondary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  position: sticky;
  top: 0;
  z-index: 10;
  margin-left: -${theme.spacing.md};
  margin-right: -${theme.spacing.md};
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.sm};
  position: relative;
  z-index: 1;
  margin-bottom: ${theme.spacing.lg};
  
  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const CharacterCard = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover, &:active {
    box-shadow: 0 0 20px ${props => props.$color || theme.colors.primary};
    transform: scale(1.02);
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.md};
  }
`;

const CharImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CharVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CharOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.xs};
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
`;

const CharName = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 10px;
  }
`;

const CharRarity = styled.div`
  display: inline-block;
  padding: 1px 4px;
  background: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  text-transform: uppercase;
`;

const CharBadges = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
`;

const CharLevel = styled.div`
  display: inline-block;
  padding: 1px 4px;
  background: ${props => props.$isMaxLevel 
    ? 'linear-gradient(135deg, #ffd700, #ff8c00)' 
    : 'rgba(88, 86, 214, 0.9)'};
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
`;

const CharPowerBonus = styled.div`
  font-size: 8px;
  color: #4ade80;
  font-weight: ${theme.fontWeights.bold};
  margin-top: 2px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
`;

export default DojoPage;

