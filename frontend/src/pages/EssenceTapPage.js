/**
 * EssenceTapPage - Main page for the Essence Tap clicker minigame
 *
 * Features:
 * - Central tap target for active clicking
 * - Essence counter with production rate
 * - Generators panel for passive income
 * - Upgrades panel for enhancements
 * - Prestige system for permanent progression
 * - Offline progress notification
 * - Character selection for bonuses
 * - Daily modifiers for variety
 * - Active abilities for strategic depth
 * - New player onboarding
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  theme,
  GlassCard,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  LoadingState,
  ErrorState,
  PageTransition
} from '../design-system';
import { pageEnterVariants } from '../App';
import { useEssenceTap, formatNumber, formatPerSecond } from '../hooks/useEssenceTap';
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
  BossEncounter
} from '../components/EssenceTap';
import { IconDice, IconSparkles, IconTrophy, IconStar, IconGem, IconStats, IconCategoryPerson, IconTarget, IconBanner } from '../constants/icons';

// Local storage key for onboarding
const ONBOARDING_COMPLETE_KEY = 'essenceTap_onboardingComplete';

// Animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const PageContainer = styled(motion.div)`
  min-height: 100vh;
  padding: ${theme.spacing.md};
  padding-bottom: calc(${theme.spacing.xl} + 80px);
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.xl};
    padding-bottom: ${theme.spacing.xl};
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.lg};
`;

const EssenceDisplay = styled.div`
  font-size: clamp(2rem, 8vw, 4rem);
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #A855F7, #EC4899, #F59E0B);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
  margin-bottom: ${theme.spacing.xs};
`;

const ProductionRate = styled.div`
  font-size: ${theme.fontSizes.xl};
  color: ${theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
`;

const LifetimeEssence = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin-top: ${theme.spacing.xs};
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 300px 1fr 300px;
  }
`;

const TapSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl} 0;

  @media (min-width: ${theme.breakpoints.lg}) {
    order: 2;
  }
`;

const SidePanel = styled(GlassCard)`
  padding: 0;
  overflow: hidden;
  max-height: 500px;
  display: flex;
  flex-direction: column;

  @media (min-width: ${theme.breakpoints.lg}) {
    max-height: calc(100vh - 300px);
    min-height: 400px;
  }
`;

const PanelHeader = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelContent = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const GeneratorsPanel = styled(SidePanel)`
  @media (min-width: ${theme.breakpoints.lg}) {
    order: 1;
  }
`;

const UpgradesPanel = styled(SidePanel)`
  @media (min-width: ${theme.breakpoints.lg}) {
    order: 3;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled(Button)`
  min-width: 120px;
`;

const MilestoneButton = styled(Button)`
  background: linear-gradient(135deg, #FCD34D, #F59E0B);
  border: none;
  animation: ${pulse} 2s ease-in-out infinite;

  &:hover {
    background: linear-gradient(135deg, #FDE68A, #FBBF24);
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

const StatsBar = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  flex-wrap: wrap;
  margin-top: ${theme.spacing.sm};
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.md};
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;

  ${props => props.$clickable && `
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  `}
`;

const StatLabel = styled.span`
  color: ${theme.colors.textTertiary};
`;

const StatValue = styled.span`
  color: ${props => props.$color || '#A855F7'};
  font-weight: ${theme.fontWeights.medium};
`;

const CharacterBonusButton = styled(StatItem)`
  cursor: pointer;
  border: 1px solid rgba(138, 43, 226, 0.3);

  &:hover {
    background: rgba(138, 43, 226, 0.15);
    border-color: rgba(138, 43, 226, 0.5);
  }
`;

const FeatureButtonsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  justify-content: center;
  margin-top: ${theme.spacing.md};
`;

const FeatureButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
`;

const EssenceTapPage = memo(() => {
  const { t } = useTranslation();
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

  const {
    gameState,
    loading,
    error,
    essence,
    lifetimeEssence,
    comboMultiplier,
    lastClickResult,
    offlineProgress,
    dismissOfflineProgress,
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
      // Show onboarding for new players (low lifetime essence)
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

  const handleDailyModifierChange = useCallback(() => {
    // Daily modifier state now handled by DailyModifierBanner component
  }, []);

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
          {/* Daily Modifier Banner */}
          <DailyModifierBanner onModifierChange={handleDailyModifierChange} />

        <Header>
          <EssenceDisplay>
            {formatNumber(essence)} Essence
          </EssenceDisplay>
          <ProductionRate>
            {formatPerSecond(gameState?.productionPerSecond || 0)}
          </ProductionRate>
          <LifetimeEssence>
            {t('essenceTap.lifetime', {
              amount: formatNumber(lifetimeEssence),
              defaultValue: `Lifetime: ${formatNumber(lifetimeEssence)}`
            })}
          </LifetimeEssence>

          <StatsBar>
            <StatItem>
              <StatLabel>Click:</StatLabel>
              <StatValue>+{formatNumber(gameState?.clickPower || 1)}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Crit:</StatLabel>
              <StatValue $color="#FCD34D">
                {((gameState?.critChance || 0) * 100).toFixed(1)}%
              </StatValue>
            </StatItem>
            {gameState?.prestige?.prestigeLevel > 0 && (
              <StatItem>
                <StatLabel>Prestige:</StatLabel>
                <StatValue $color="#EC4899">
                  x{((gameState?.prestige?.currentBonus || 1)).toFixed(2)}
                </StatValue>
              </StatItem>
            )}
            <CharacterBonusButton onClick={() => setShowCharacterSelector(true)}>
              <StatLabel>Characters:</StatLabel>
              <StatValue $color="#10B981">
                {gameState?.assignedCharacters?.length || 0}/{gameState?.maxAssignedCharacters || 5}
              </StatValue>
              <span style={{ fontSize: '12px' }}>
                (x{(gameState?.characterBonus || 1).toFixed(2)})
              </span>
            </CharacterBonusButton>
          </StatsBar>
        </Header>

        <MainLayout>
          <GeneratorsPanel>
            <PanelHeader>
              {t('essenceTap.generators.title', { defaultValue: 'Generators' })}
            </PanelHeader>
            <PanelContent>
              <GeneratorList
                generators={gameState?.generators || []}
                essence={essence}
                onPurchase={purchaseGenerator}
              />
            </PanelContent>
          </GeneratorsPanel>

          <TapSection>
            <TapTarget
              onClick={handleClick}
              clickPower={gameState?.clickPower || 1}
              lastClickResult={lastClickResult}
              comboMultiplier={comboMultiplier}
            />

            {/* Active Abilities */}
            <ActiveAbilities
              onActivate={handleAbilityActivate}
              activeEffects={activeAbilityEffects}
              prestigeLevel={gameState?.prestige?.prestigeLevel || 0}
            />

            <ActionButtons>
              <ActionButton
                variant="secondary"
                onClick={() => setShowPrestige(true)}
              >
                {t('essenceTap.awakening', { defaultValue: 'Awakening' })}
                {gameState?.prestige?.prestigeLevel > 0 && ` (${gameState.prestige.prestigeLevel})`}
              </ActionButton>

              {gameState?.claimableMilestones?.length > 0 && (
                <MilestoneButton onClick={handleClaimMilestones}>
                  {t('essenceTap.claimMilestones', {
                    count: gameState.claimableMilestones.length,
                    defaultValue: `Claim ${gameState.claimableMilestones.length} Milestone(s)!`
                  })}
                </MilestoneButton>
              )}
            </ActionButtons>

            {/* Feature Buttons Row */}
            <FeatureButtonsRow>
              <FeatureButton
                variant="secondary"
                onClick={() => setShowGamble(true)}
              >
                <IconDice size={16} />
                {t('essenceTap.gamble', { defaultValue: 'Gamble' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowInfusion(true)}
              >
                <IconSparkles size={16} />
                {t('essenceTap.infuse', { defaultValue: 'Infuse' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowTournament(true)}
              >
                <IconTrophy size={16} />
                {t('essenceTap.tournament', { defaultValue: 'Tournament' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowMastery(true)}
              >
                <IconStar size={16} />
                {t('essenceTap.mastery', { defaultValue: 'Mastery' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowEssenceTypes(true)}
              >
                <IconGem size={16} />
                {t('essenceTap.types', { defaultValue: 'Types' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowSessionStats(true)}
              >
                <IconStats size={16} />
                {t('essenceTap.session', { defaultValue: 'Session' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowSynergyPreview(true)}
              >
                <IconCategoryPerson size={16} />
                {t('essenceTap.synergy', { defaultValue: 'Synergy' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowChallenges(true)}
              >
                <IconBanner size={16} />
                {t('essenceTap.challenges', { defaultValue: 'Challenges' })}
              </FeatureButton>

              <FeatureButton
                variant="secondary"
                onClick={() => setShowBoss(true)}
              >
                <IconTarget size={16} />
                {t('essenceTap.boss', { defaultValue: 'Boss' })}
              </FeatureButton>
            </FeatureButtonsRow>
          </TapSection>

          <UpgradesPanel>
            <PanelHeader>
              {t('essenceTap.upgrades.title', { defaultValue: 'Upgrades' })}
            </PanelHeader>
            <PanelContent>
              <UpgradeList
                upgrades={gameState?.upgrades || {}}
                essence={essence}
                onPurchase={purchaseUpgrade}
              />
            </PanelContent>
          </UpgradesPanel>
        </MainLayout>

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
          onClose={() => setShowGamble(false)}
          essence={essence}
          onGamble={performGamble}
          getGambleInfo={getGambleInfo}
        />

        {/* Infusion Panel */}
        <InfusionPanel
          isOpen={showInfusion}
          onClose={() => setShowInfusion(false)}
          essence={essence}
          gameState={gameState}
          onInfuse={performInfusion}
        />

        {/* Weekly Tournament */}
        <WeeklyTournament
          isOpen={showTournament}
          onClose={() => setShowTournament(false)}
          getTournamentInfo={getTournamentInfo}
          onClaimRewards={claimTournamentRewards}
        />

        {/* Character Mastery Display */}
        <CharacterMasteryDisplay
          isOpen={showMastery}
          onClose={() => setShowMastery(false)}
          getMasteryInfo={getMasteryInfo}
          assignedCharacters={gameState?.assignedCharacters || []}
        />

        {/* Essence Types Display */}
        <EssenceTypesDisplay
          isOpen={showEssenceTypes}
          onClose={() => setShowEssenceTypes(false)}
          getEssenceTypes={getEssenceTypes}
        />

        {/* Session Stats Panel */}
        <SessionStatsPanel
          isOpen={showSessionStats}
          onClose={() => setShowSessionStats(false)}
        />

        {/* Synergy Preview Panel */}
        <SynergyPreviewPanel
          isOpen={showSynergyPreview}
          onClose={() => setShowSynergyPreview(false)}
        />

        {/* Daily Challenges Panel */}
        <DailyChallengesPanel
          isOpen={showChallenges}
          onClose={() => setShowChallenges(false)}
          onChallengeComplete={refresh}
        />

        {/* Boss Encounter */}
        <BossEncounter
          isOpen={showBoss}
          onClose={() => setShowBoss(false)}
          clickPower={gameState?.clickPower || 1}
          onBossDefeat={refresh}
        />

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
        </PageContainer>
      </PageTransition>
    </EssenceTapErrorBoundary>
  );
});

EssenceTapPage.displayName = 'EssenceTapPage';

export default EssenceTapPage;
