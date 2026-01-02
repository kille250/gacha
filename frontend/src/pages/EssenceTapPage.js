/**
 * EssenceTapPage - Redesigned main page for the Essence Tap clicker minigame
 *
 * Features:
 * - Premium, immersive UI with glassmorphism
 * - Floating Stats HUD with animated essence counter
 * - Hero section with enhanced tap orb
 * - Collapsible dual-panel layout for generators/upgrades
 * - Bottom navigation bar for feature access
 * - Smooth animations throughout
 */

import React, { useState, useCallback, useEffect, memo, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  theme,
  GlassCard,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  LoadingState,
  ErrorState,
  PageTransition
} from '../design-system';
import { pageEnterVariants } from '../App';
import { AuthContext } from '../context/AuthContext';
import { useEssenceTap, formatNumber } from '../hooks/useEssenceTap';
import {
  TapTarget,
  GeneratorList,
  UpgradeList,
  PrestigePanel,
  CharacterSelector,
  OnboardingOverlay,
  DailyModifierBanner,
  ActiveAbilities,
  GamblePanel,
  InfusionPanel,
  WeeklyTournament,
  CharacterMasteryDisplay,
  EssenceTypesDisplay,
  SessionStatsPanel,
  SynergyPreviewPanel,
  EssenceTapErrorBoundary,
  DailyChallengesPanel,
  BossEncounter,
  AchievementToast,
  StatsHUD,
  FeatureNav
} from '../components/EssenceTap';

// Local storage key for onboarding
const ONBOARDING_COMPLETE_KEY = 'essenceTap_onboardingComplete';

const PageContainer = styled(motion.div)`
  min-height: 100vh;
  padding: ${theme.spacing.md};
  padding-top: 140px;
  padding-bottom: 100px;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;

  @media (max-width: ${theme.breakpoints.md}) {
    padding-top: ${theme.spacing.md};
    /* Account for StatsHUD (approx 60px) + FeatureNav (approx 60px) + safe area */
    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm};
    padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px));
  }
`;

const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl} 0;
  margin-bottom: ${theme.spacing.xl};

  @media (min-width: ${theme.breakpoints.lg}) {
    padding: ${theme.spacing.xxl} 0;
  }
`;

const AbilitiesWrapper = styled.div`
  margin-top: ${theme.spacing.lg};
  width: 100%;
  max-width: 400px;
`;

const AwakeningButton = styled(Button)`
  margin-top: ${theme.spacing.lg};
  background: linear-gradient(135deg, #EC4899, #8B5CF6);
  border: none;
  padding: ${theme.spacing.sm} ${theme.spacing.xl};
  font-size: ${theme.fontSizes.base};

  &:hover {
    background: linear-gradient(135deg, #F472B6, #A78BFA);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(236, 72, 153, 0.3);
  }
`;

const MilestoneButton = styled(Button)`
  margin-top: ${theme.spacing.md};
  background: linear-gradient(135deg, #FCD34D, #F59E0B);
  border: none;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.02); }
  }

  &:hover {
    background: linear-gradient(135deg, #FDE68A, #FBBF24);
  }
`;

const DualPanelSection = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const PanelCard = styled(GlassCard)`
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: ${props => props.$collapsed ? 'auto' : '500px'};
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (min-width: ${theme.breakpoints.lg}) {
    max-height: ${props => props.$collapsed ? 'auto' : '600px'};
  }
`;

// Offline Progress Modal
const OfflineModalContent = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
`;

const OfflineTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const OfflineEssence = styled.div`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
  margin-bottom: ${theme.spacing.sm};
`;

const OfflineDetails = styled.div`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
`;

// Mobile modal panel container - used for generators/upgrades on mobile
const MobilePanelContainer = styled.div`
  max-height: 70vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  margin: -${theme.spacing.lg};
  margin-top: 0;

  /* Override internal panel styles for modal context */
  & > div {
    max-height: none;
    border: none;
    background: transparent;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    margin: -${theme.spacing.md};
    margin-top: 0;
  }
`;

const EssenceTapPage = memo(() => {
  const { t } = useTranslation();
  const { refreshUser } = useContext(AuthContext);
  const [showPrestige, setShowPrestige] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGamble, setShowGamble] = useState(false);
  const [showInfusion, setShowInfusion] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showMastery, setShowMastery] = useState(false);
  const [showEssenceTypes, setShowEssenceTypes] = useState(false);
  const [showSessionStats, setShowSessionStats] = useState(false);
  const [showSynergyPreview, setShowSynergyPreview] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showBoss, setShowBoss] = useState(false);
  const [activeAbilityEffects, setActiveAbilityEffects] = useState({});
  const [generatorsCollapsed, setGeneratorsCollapsed] = useState(false);
  const [upgradesCollapsed, setUpgradesCollapsed] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  // Mobile-specific modal states for generators/upgrades
  const [showMobileGenerators, setShowMobileGenerators] = useState(false);
  const [showMobileUpgrades, setShowMobileUpgrades] = useState(false);

  const {
    gameState,
    loading,
    error,
    essence,
    lifetimeEssence,
    totalClicks,
    comboMultiplier,
    lastClickResult,
    offlineProgress,
    dismissOfflineProgress,
    unlockedAchievement,
    dismissAchievement,
    handleClick,
    purchaseGenerator,
    purchaseUpgrade,
    performPrestige,
    purchasePrestigeUpgrade,
    claimMilestone,
    assignCharacter,
    unassignCharacter,
    performGamble,
    performInfusion,
    getGambleInfo,
    getTournamentInfo,
    claimTournamentRewards,
    getMasteryInfo,
    getEssenceTypes,
    refresh
  } = useEssenceTap();

  // Check if onboarding should be shown
  useEffect(() => {
    const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!onboardingComplete && !loading && gameState) {
      if ((gameState.lifetimeEssence || 0) < 100) {
        setShowOnboarding(true);
      }
    }
  }, [loading, gameState]);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  const handleClaimMilestones = useCallback(() => {
    if (gameState?.claimableMilestones?.length > 0) {
      gameState.claimableMilestones.forEach(milestone => {
        claimMilestone(milestone.key);
      });
    }
  }, [gameState?.claimableMilestones, claimMilestone]);

  const handleAbilityActivate = useCallback((abilityId, effects) => {
    if (effects) {
      setActiveAbilityEffects(prev => ({ ...prev, [abilityId]: effects }));
    } else {
      setActiveAbilityEffects(prev => {
        const newEffects = { ...prev };
        delete newEffects[abilityId];
        return newEffects;
      });
    }
  }, []);

  const handleCharacterAssign = useCallback(async (characterId) => {
    await assignCharacter(characterId);
  }, [assignCharacter]);

  const handleCharacterUnassign = useCallback(async (characterId) => {
    await unassignCharacter(characterId);
  }, [unassignCharacter]);

  // Handle feature nav clicks
  const handleFeatureClick = useCallback((featureId) => {
    setActiveFeature(featureId);

    switch (featureId) {
      case 'generators':
        setShowMobileGenerators(true);
        break;
      case 'upgrades':
        setShowMobileUpgrades(true);
        break;
      case 'gamble':
        setShowGamble(true);
        break;
      case 'infuse':
        setShowInfusion(true);
        break;
      case 'boss':
        setShowBoss(true);
        break;
      case 'tournament':
        setShowTournament(true);
        break;
      case 'mastery':
        setShowMastery(true);
        break;
      case 'challenges':
        setShowChallenges(true);
        break;
      case 'types':
        setShowEssenceTypes(true);
        break;
      case 'session':
        setShowSessionStats(true);
        break;
      case 'synergy':
        setShowSynergyPreview(true);
        break;
      default:
        break;
    }
  }, []);

  // Clear active feature when modals close
  const handleModalClose = useCallback((setter) => {
    return () => {
      setter(false);
      setActiveFeature(null);
    };
  }, []);

  // Handle challenge completion - refresh both game state and user data (FP/tickets)
  const handleChallengeComplete = useCallback(async (rewards) => {
    await Promise.all([refresh(), refreshUser()]);
  }, [refresh, refreshUser]);

  // Handle boss defeat - refresh both game state and user data (FP/tickets)
  const handleBossDefeat = useCallback(async (rewards) => {
    await Promise.all([refresh(), refreshUser()]);
  }, [refresh, refreshUser]);

  // Handle boss spawn - refresh game state to sync clicksAtLastSpawn
  const handleBossSpawn = useCallback(async () => {
    await refresh();
  }, [refresh]);

  if (loading) {
    return (
      <PageContainer
        variants={pageEnterVariants}
        initial="initial"
        animate="animate"
      >
        <LoadingState message={t('essenceTap.loading', { defaultValue: 'Loading Essence Tap...' })} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        variants={pageEnterVariants}
        initial="initial"
        animate="animate"
      >
        <ErrorState
          message={error}
          onRetry={refresh}
        />
      </PageContainer>
    );
  }

  return (
    <EssenceTapErrorBoundary>
      <PageTransition>
        <PageContainer
          variants={pageEnterVariants}
          initial="initial"
          animate="animate"
        >
          {/* Floating Stats HUD */}
          <StatsHUD
            essence={essence}
            productionPerSecond={gameState?.productionPerSecond || 0}
            clickPower={gameState?.clickPower || 1}
            critChance={gameState?.critChance || 0}
            assignedCharacters={gameState?.assignedCharacters || []}
            maxCharacters={gameState?.maxAssignedCharacters || 5}
            characterBonus={gameState?.characterBonus || 1}
            onCharacterClick={() => setShowCharacterSelector(true)}
          />

          {/* Daily Modifier Banner */}
          <DailyModifierBanner />

          {/* Hero Section - Tap Orb */}
          <HeroSection>
            <TapTarget
              onClick={handleClick}
              clickPower={gameState?.clickPower || 1}
              lastClickResult={lastClickResult}
              comboMultiplier={comboMultiplier}
              prestigeLevel={gameState?.prestige?.prestigeLevel || 0}
              productionRate={gameState?.productionPerSecond || 0}
            />

            {/* Active Abilities */}
            <AbilitiesWrapper>
              <ActiveAbilities
                onActivate={handleAbilityActivate}
                activeEffects={activeAbilityEffects}
                prestigeLevel={gameState?.prestige?.prestigeLevel || 0}
              />
            </AbilitiesWrapper>

            {/* Awakening Button */}
            <AwakeningButton onClick={() => setShowPrestige(true)}>
              {t('essenceTap.awakening', { defaultValue: 'Awakening' })}
              {gameState?.prestige?.prestigeLevel > 0 && ` (Level ${gameState.prestige.prestigeLevel})`}
            </AwakeningButton>

            {/* Milestone Button */}
            {gameState?.claimableMilestones?.length > 0 && (
              <MilestoneButton onClick={handleClaimMilestones}>
                {t('essenceTap.claimMilestones', {
                  count: gameState.claimableMilestones.length,
                  defaultValue: `Claim ${gameState.claimableMilestones.length} Milestone(s)!`
                })}
              </MilestoneButton>
            )}
          </HeroSection>

          {/* Dual Panel Section - Generators & Upgrades */}
          <DualPanelSection>
            <PanelCard $collapsed={generatorsCollapsed}>
              <GeneratorList
                generators={gameState?.generators || []}
                essence={essence}
                lifetimeEssence={lifetimeEssence}
                totalProduction={gameState?.productionPerSecond || 0}
                onPurchase={purchaseGenerator}
                isCollapsed={generatorsCollapsed}
                onToggleCollapse={() => setGeneratorsCollapsed(!generatorsCollapsed)}
              />
            </PanelCard>

            <PanelCard $collapsed={upgradesCollapsed}>
              <UpgradeList
                upgrades={gameState?.upgrades || {}}
                essence={essence}
                onPurchase={purchaseUpgrade}
                isCollapsed={upgradesCollapsed}
                onToggleCollapse={() => setUpgradesCollapsed(!upgradesCollapsed)}
              />
            </PanelCard>
          </DualPanelSection>

          {/* Bottom Navigation Bar */}
          <FeatureNav
            onFeatureClick={handleFeatureClick}
            activeFeature={activeFeature}
            notifications={{
              challenges: gameState?.hasUnclaimedChallenges,
              tournament: gameState?.hasUnclaimedTournamentRewards
            }}
          />

          {/* Prestige Panel */}
          <PrestigePanel
            prestige={gameState?.prestige}
            onPrestige={performPrestige}
            onPurchaseUpgrade={purchasePrestigeUpgrade}
            isOpen={showPrestige}
            onClose={() => setShowPrestige(false)}
          />

          {/* Character Selector Modal */}
          <CharacterSelector
            isOpen={showCharacterSelector}
            onClose={() => setShowCharacterSelector(false)}
            assignedCharacters={gameState?.assignedCharacters || []}
            maxCharacters={gameState?.maxAssignedCharacters || 5}
            characterBonus={gameState?.characterBonus || 1}
            onAssign={handleCharacterAssign}
            onUnassign={handleCharacterUnassign}
          />

          {/* Onboarding Overlay */}
          <OnboardingOverlay
            isOpen={showOnboarding}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />

          {/* Gamble Panel */}
          <GamblePanel
            isOpen={showGamble}
            onClose={handleModalClose(setShowGamble)}
            essence={essence}
            onGamble={performGamble}
            getGambleInfo={getGambleInfo}
          />

          {/* Infusion Panel */}
          <InfusionPanel
            isOpen={showInfusion}
            onClose={handleModalClose(setShowInfusion)}
            essence={essence}
            gameState={gameState}
            onInfuse={performInfusion}
          />

          {/* Weekly Tournament */}
          <WeeklyTournament
            isOpen={showTournament}
            onClose={handleModalClose(setShowTournament)}
            getTournamentInfo={getTournamentInfo}
            onClaimRewards={claimTournamentRewards}
          />

          {/* Character Mastery Display */}
          <CharacterMasteryDisplay
            isOpen={showMastery}
            onClose={handleModalClose(setShowMastery)}
            getMasteryInfo={getMasteryInfo}
            assignedCharacters={gameState?.assignedCharacters || []}
          />

          {/* Essence Types Display */}
          <EssenceTypesDisplay
            isOpen={showEssenceTypes}
            onClose={handleModalClose(setShowEssenceTypes)}
            getEssenceTypes={getEssenceTypes}
          />

          {/* Session Stats Panel */}
          <SessionStatsPanel
            isOpen={showSessionStats}
            onClose={handleModalClose(setShowSessionStats)}
          />

          {/* Synergy Preview Panel */}
          <SynergyPreviewPanel
            isOpen={showSynergyPreview}
            onClose={handleModalClose(setShowSynergyPreview)}
          />

          {/* Daily Challenges Panel */}
          <DailyChallengesPanel
            isOpen={showChallenges}
            onClose={handleModalClose(setShowChallenges)}
            onChallengeComplete={handleChallengeComplete}
          />

          {/* Boss Encounter */}
          <BossEncounter
            isOpen={showBoss}
            onClose={handleModalClose(setShowBoss)}
            clickPower={gameState?.clickPower || 1}
            totalClicks={totalClicks}
            onBossDefeat={handleBossDefeat}
            onBossSpawn={handleBossSpawn}
          />

          {/* Mobile Generators Modal */}
          <Modal
            isOpen={showMobileGenerators}
            onClose={handleModalClose(setShowMobileGenerators)}
            title={t('essenceTap.generators', { defaultValue: 'Generators' })}
            maxWidth="600px"
          >
            <MobilePanelContainer>
              <GeneratorList
                generators={gameState?.generators || []}
                essence={essence}
                lifetimeEssence={lifetimeEssence}
                totalProduction={gameState?.productionPerSecond || 0}
                onPurchase={purchaseGenerator}
                isCollapsed={false}
                onToggleCollapse={() => {}}
              />
            </MobilePanelContainer>
          </Modal>

          {/* Mobile Upgrades Modal */}
          <Modal
            isOpen={showMobileUpgrades}
            onClose={handleModalClose(setShowMobileUpgrades)}
            title={t('essenceTap.upgrades', { defaultValue: 'Upgrades' })}
            maxWidth="600px"
          >
            <MobilePanelContainer>
              <UpgradeList
                upgrades={gameState?.upgrades || {}}
                essence={essence}
                onPurchase={purchaseUpgrade}
                isCollapsed={false}
                onToggleCollapse={() => {}}
              />
            </MobilePanelContainer>
          </Modal>

          {/* Offline Progress Modal */}
          <AnimatePresence>
            {offlineProgress && (
              <Modal isOpen={true} onClose={dismissOfflineProgress}>
                <ModalBody>
                  <OfflineModalContent>
                    <OfflineTitle>
                      {t('essenceTap.welcomeBack', { defaultValue: 'Welcome Back!' })}
                    </OfflineTitle>
                    <OfflineEssence>
                      +{formatNumber(offlineProgress.essenceEarned)}
                    </OfflineEssence>
                    <OfflineDetails>
                      {t('essenceTap.offlineEarned', {
                        hours: offlineProgress.hoursAway.toFixed(1),
                        rate: formatNumber(offlineProgress.productionRate),
                        efficiency: Math.round(offlineProgress.efficiency * 100),
                        defaultValue: `Earned while away for ${offlineProgress.hoursAway.toFixed(1)} hours at ${Math.round(offlineProgress.efficiency * 100)}% efficiency`
                      })}
                    </OfflineDetails>
                  </OfflineModalContent>
                </ModalBody>
                <ModalFooter>
                  <Button variant="primary" onClick={dismissOfflineProgress}>
                    {t('essenceTap.collect', { defaultValue: 'Collect!' })}
                  </Button>
                </ModalFooter>
              </Modal>
            )}
          </AnimatePresence>

          {/* Achievement Toast */}
          <AchievementToast
            achievement={unlockedAchievement}
            onComplete={dismissAchievement}
          />
        </PageContainer>
      </PageTransition>
    </EssenceTapErrorBoundary>
  );
});

EssenceTapPage.displayName = 'EssenceTapPage';

export default EssenceTapPage;
