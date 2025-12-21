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
  useTranslation(); // For future i18n support
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
      setError('Failed to load dojo status');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError(err.response?.data?.error || 'Failed to assign character');
    }
  };

  // Remove character from slot
  const handleUnassign = async (slotIndex) => {
    try {
      await unassignCharacterFromDojo(slotIndex);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to unassign character:', err);
      setError(err.response?.data?.error || 'Failed to remove character');
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
      setError(err.response?.data?.error || 'Failed to claim rewards');
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
      setError(err.response?.data?.error || 'Failed to purchase upgrade');
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

  // Limit visible characters for performance (show first 50, rest on scroll/search)
  const MAX_VISIBLE = 50;
  const visibleCharacters = filteredCharacters.slice(0, MAX_VISIBLE);
  const hasMoreCharacters = filteredCharacters.length > MAX_VISIBLE;

  // Group by series for display
  const charactersBySeries = visibleCharacters.reduce((acc, char) => {
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
          <LoadingText>Loading Dojo...</LoadingText>
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <MdArrowBack />
        </BackButton>
        <HeaderContent>
          <HeaderIcon>🏯</HeaderIcon>
          <HeaderTitle>Character Dojo</HeaderTitle>
        </HeaderContent>
        <HeaderStats>
          <StatBadge>
            <FaCoins />
            <span>{user?.points?.toLocaleString() || 0}</span>
          </StatBadge>
        </HeaderStats>
      </Header>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <ErrorBanner
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span>{error}</span>
            <CloseErrorBtn onClick={() => setError(null)}>
              <MdClose />
            </CloseErrorBtn>
          </ErrorBanner>
        )}
      </AnimatePresence>

      {/* Claim Result Popup */}
      <AnimatePresence>
        {claimResult && (
          <ClaimPopup
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <ClaimPopupIcon>🎉</ClaimPopupIcon>
            <ClaimPopupTitle>Training Complete!</ClaimPopupTitle>
            <ClaimPopupRewards>
              {claimResult.rewards.points > 0 && (
                <RewardItem>
                  <FaCoins color="#FFD700" />
                  <span>+{claimResult.rewards.points.toLocaleString()} Points</span>
                </RewardItem>
              )}
              {claimResult.rewards.rollTickets > 0 && (
                <RewardItem>
                  <FaTicketAlt color="#0a84ff" />
                  <span>+{claimResult.rewards.rollTickets} Roll Tickets</span>
                </RewardItem>
              )}
              {claimResult.rewards.premiumTickets > 0 && (
                <RewardItem>
                  <FaStar color="#bf5af2" />
                  <span>+{claimResult.rewards.premiumTickets} Premium Tickets</span>
                </RewardItem>
              )}
            </ClaimPopupRewards>
            {claimResult.activeBonus && (
              <ActiveBonusTag>1.5× Active Bonus Applied!</ActiveBonusTag>
            )}
          </ClaimPopup>
        )}
      </AnimatePresence>

      <MainContent>
        {/* Accumulated Rewards Card */}
        <AccumulatedCard $isCapped={status?.accumulated?.isCapped}>
          <AccumulatedHeader>
            <AccumulatedTitle>
              <MdAccessTime />
              <span>Accumulated Rewards</span>
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
              <><MdAutorenew className="spin" /> Claiming...</>
            ) : canClaim ? (
              <>Claim Rewards (1.5× Active Bonus)</>
            ) : (
              <>No Rewards Yet</>
            )}
          </ClaimButton>
        </AccumulatedCard>

        {/* Hourly Rate Display */}
        <HourlyRateCard>
          <HourlyRateHeader>
            <MdTrendingUp />
            <span>Hourly Rate</span>
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
          {status?.hourlyRate?.synergies?.length > 0 && (
            <SynergyBadges>
              {status.hourlyRate.synergies.map((syn, idx) => (
                <SynergyBadge key={idx}>
                  {syn.series} ×{syn.count} (+{Math.round((syn.bonus - 1) * 100)}%)
                </SynergyBadge>
              ))}
            </SynergyBadges>
          )}
        </HourlyRateCard>

        {/* Training Slots */}
        <SlotsSection>
          <SlotsHeader>
            <SlotsTitle>
              <FaDumbbell />
              <span>Training Slots</span>
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
                    <SlotRarityBadge $color={getRarityColor(char.rarity)}>
                      {char.rarity}
                    </SlotRarityBadge>
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
                  <span>Add Character</span>
                </EmptySlot>
              );
            })}
            
            {/* Locked slots preview */}
            {Array.from({ length: Math.min(2, 10 - (status?.maxSlots || 3)) }).map((_, idx) => (
              <LockedSlot key={`locked-${idx}`}>
                <MdLock />
                <span>Locked</span>
              </LockedSlot>
            ))}
          </SlotsGrid>
        </SlotsSection>

        {/* Upgrades Section */}
        <UpgradesSection>
          <UpgradesTitle>Upgrades</UpgradesTitle>
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
              <NoUpgrades>All upgrades purchased! 🎉</NoUpgrades>
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
                <ModalTitle>Select Character</ModalTitle>
                <ModalCloseBtn onClick={() => setShowCharacterPicker(false)}>
                  <MdClose />
                </ModalCloseBtn>
              </ModalHeader>
              
              <SearchContainer>
                <MdSearch />
                <SearchInput
                  type="text"
                  placeholder="Search characters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </SearchContainer>
              
              <ModalBody>
                {charactersLoading ? (
                  <ModalLoading>
                    <Spinner />
                    <span>Loading characters...</span>
                  </ModalLoading>
                ) : filteredCharacters.length === 0 ? (
                  <NoCharacters>
                    {searchQuery ? 'No matching characters found' : 'No available characters. Roll some in the gacha!'}
                  </NoCharacters>
                ) : (
                  <>
                    {hasMoreCharacters && !searchQuery && (
                      <SearchHint>
                        Showing {MAX_VISIBLE} of {filteredCharacters.length} characters. Use search to find more.
                      </SearchHint>
                    )}
                    {Object.entries(charactersBySeries).map(([series, chars]) => (
                      <SeriesGroup key={series}>
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
                              <CharRarity $color={getRarityColor(char.rarity)}>
                                {char.rarity}
                              </CharRarity>
                            </CharOverlay>
                          </CharacterCard>
                          ))}
                        </CharacterGrid>
                      </SeriesGroup>
                    ))}
                  </>
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
    ${theme.colors.backgroundSecondary} 100%
  );
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
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  position: sticky;
  top: 60px;
  z-index: 100;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
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
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex: 1;
`;

const HeaderIcon = styled.span`
  font-size: 28px;
`;

const HeaderTitle = styled.h1`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const HeaderStats = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
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
`;

const ErrorBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(255, 59, 48, 0.15);
  border-bottom: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
`;

const CloseErrorBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.error};
  cursor: pointer;
  padding: ${theme.spacing.xs};
  display: flex;
  font-size: 18px;
`;

const ClaimPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  text-align: center;
  box-shadow: ${theme.shadows.xl};
  animation: ${glow} 2s ease-in-out infinite;
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
`;

const ActiveBonusTag = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(48, 209, 88, 0.2), rgba(52, 199, 89, 0.1));
  border: 1px solid rgba(48, 209, 88, 0.4);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: #30d158;
`;

const MainContent = styled.main`
  max-width: 900px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
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
  ${props => props.$isCapped && css`animation: ${pulse} 2s ease-in-out infinite;`}
`;

const AccumulatedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
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
  }
`;

const AccumulatedTime = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ProgressBar = styled.div`
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  margin-bottom: ${theme.spacing.lg};
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$isCapped 
    ? 'linear-gradient(90deg, #ff9f0a, #ff6b00)'
    : `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`};
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
`;

const AccumulatedRewards = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const AccumulatedReward = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$premium ? '#bf5af2' : theme.colors.text};
  
  svg {
    color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
  }
`;

const ClaimButton = styled(motion.button)`
  width: 100%;
  padding: ${theme.spacing.md};
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
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const HourlyRateCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
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
  }
`;

const HourlyRateStats = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
`;

const HourlyStat = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.base};
  color: ${props => props.$premium ? '#bf5af2' : theme.colors.textSecondary};
  
  svg {
    color: ${props => props.$premium ? '#bf5af2' : '#FFD700'};
  }
`;

const SynergyBadges = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
`;

const SynergyBadge = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(48, 209, 88, 0.15);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: #30d158;
`;

const SlotsSection = styled.section``;

const SlotsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
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
`;

const SlotsCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const SlotsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${theme.spacing.md};
`;

const FilledSlot = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  box-shadow: 0 0 20px ${props => props.$glow || 'transparent'};
  cursor: default;
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
`;

const SlotCharName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SlotCharSeries = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SlotRarityBadge = styled.div`
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  background: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  text-transform: uppercase;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  
  ${FilledSlot}:hover & {
    opacity: 1;
  }
  
  &:hover {
    background: ${theme.colors.error};
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
  
  svg {
    font-size: 24px;
  }
  
  span {
    font-size: ${theme.fontSizes.xs};
  }
  
  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
    background: rgba(0, 113, 227, 0.05);
  }
`;

const LockedSlot = styled.div`
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.textTertiary};
  opacity: 0.5;
  
  svg {
    font-size: 20px;
  }
  
  span {
    font-size: ${theme.fontSizes.xs};
  }
`;

const UpgradesSection = styled.section``;

const UpgradesTitle = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg} 0;
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
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  cursor: ${props => props.$canAfford ? 'pointer' : 'default'};
  opacity: ${props => props.$canAfford ? 1 : 0.6};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    ${props => props.$canAfford && `
      background: ${theme.colors.surfaceHover};
      border-color: ${theme.colors.primary};
    `}
  }
`;

const UpgradeIcon = styled.div`
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
`;

const UpgradeInfo = styled.div`
  flex: 1;
`;

const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const UpgradeDesc = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const UpgradeCost = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.$canAfford 
    ? 'rgba(255, 215, 0, 0.15)' 
    : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canAfford ? '#FFD700' : theme.colors.textTertiary};
  
  svg {
    font-size: 12px;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

const NoUpgrades = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
`;

// Modal styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(${theme.blur.sm});
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
`;

const ModalContent = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const ModalTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const ModalCloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.lg};
  background: ${theme.colors.glass};
  border: none;
  color: ${theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  
  svg {
    color: ${theme.colors.textSecondary};
    font-size: 18px;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  
  &::placeholder {
    color: ${theme.colors.textTertiary};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
`;

const ModalLoading = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
`;

const NoCharacters = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const SeriesGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SeriesTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} 0;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: ${theme.spacing.sm};
`;

const CharacterCard = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};
  cursor: pointer;
  
  &:hover {
    box-shadow: 0 0 15px ${props => props.$color || theme.colors.primary};
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

const SearchHint = styled.div`
  text-align: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  background: rgba(0, 113, 227, 0.1);
  border: 1px solid rgba(0, 113, 227, 0.2);
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.primary};
`;

export default DojoPage;

