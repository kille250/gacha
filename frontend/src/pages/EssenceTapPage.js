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
 */

import React, { useState, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
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
import { useEssenceTap, formatNumber, formatPerSecond } from '../hooks/useEssenceTap';
import {
  TapTarget,
  GeneratorList,
  UpgradeList,
  PrestigePanel
} from '../components/EssenceTap';

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
`;

const StatLabel = styled.span`
  color: ${theme.colors.textTertiary};
`;

const StatValue = styled.span`
  color: ${props => props.$color || '#A855F7'};
  font-weight: ${theme.fontWeights.medium};
`;

const EssenceTapPage = memo(() => {
  const { t } = useTranslation();
  const [showPrestige, setShowPrestige] = useState(false);

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
    refresh
  } = useEssenceTap();

  const handleClaimMilestones = useCallback(() => {
    if (gameState?.claimableMilestones?.length > 0) {
      gameState.claimableMilestones.forEach(milestone => {
        claimMilestone(milestone.key);
      });
    }
  }, [gameState?.claimableMilestones, claimMilestone]);

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
    <PageTransition>
      <PageContainer
        variants={pageEnterVariants}
        initial="initial"
        animate="animate"
      >
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
          </StatsBar>
        </Header>

        <MainLayout>
          <GeneratorsPanel>
            <PanelHeader>
              {t('essenceTap.generators', { defaultValue: 'Generators' })}
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
          </TapSection>

          <UpgradesPanel>
            <PanelHeader>
              {t('essenceTap.upgrades', { defaultValue: 'Upgrades' })}
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
  );
});

EssenceTapPage.displayName = 'EssenceTapPage';

export default EssenceTapPage;
