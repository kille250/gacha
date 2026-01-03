/**
 * InfusionPanel - Essence Infusion system for permanent bonuses
 *
 * Features:
 * - Spend essence for permanent production bonus
 * - Visual feedback on infusion
 * - Display current bonus and cost
 */

import React, { useState, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconSparkles, IconArrowUp } from '../../constants/icons';
import { INFUSION_CONFIG } from '../../config/essenceTapConfig';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(138, 43, 226, 0.3); }
  50% { box-shadow: 0 0 40px rgba(138, 43, 226, 0.6); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const InfusionOrb = styled(motion.div)`
  width: 150px;
  height: 150px;
  margin: 0 auto ${theme.spacing.xl};
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(160, 100, 255, 0.9), rgba(100, 50, 200, 0.8), rgba(60, 20, 140, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${pulse} 2s ease-in-out infinite;
  position: relative;
  cursor: ${props => props.$canInfuse ? 'pointer' : 'not-allowed'};
  opacity: ${props => props.$canInfuse ? 1 : 0.5};

  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid rgba(138, 43, 226, 0.5);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), transparent 50%);
  }
`;

const OrbIcon = styled.div`
  font-size: 48px;
  color: white;
  z-index: 1;
`;

const CurrentBonus = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.15), rgba(138, 43, 226, 0.05));
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.lg};
`;

const BonusLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${theme.spacing.xs};
`;

const BonusValue = styled.div`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #A855F7, #EC4899);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const BonusSubtext = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const CostDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const CostRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  width: 100%;
  justify-content: space-between;
`;

const CostLabel = styled.span`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
`;

const CostValue = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canAfford ? '#A855F7' : '#EF4444'};
`;

const NextBonusPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: ${theme.radius.md};
`;

const ArrowIcon = styled.span`
  color: #10B981;
`;

const NextValue = styled.span`
  font-weight: ${theme.fontWeights.bold};
  color: #10B981;
`;

const ProgressSection = styled.div`
  margin-top: ${theme.spacing.lg};
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #A855F7, #EC4899);
  border-radius: ${theme.radius.full};
  width: ${props => Math.min(100, props.$percent)}%;
  transition: width 0.3s ease;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const InfoItem = styled.div`
  text-align: center;
`;

const InfoValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};
`;

const InfoLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const InfusionResult = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.5);
  border-radius: ${theme.radius.lg};
`;

const ResultText = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: #10B981;
  margin-bottom: ${theme.spacing.sm};
`;

const ResultDetail = styled.div`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
`;

const InfusionPanel = memo(({
  isOpen,
  onClose,
  essence,
  gameState,
  onInfuse
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Calculate infusion values from gameState using shared config
  const infusionCount = gameState?.infusion?.count || 0;
  const currentBonus = gameState?.infusion?.bonus || 0;
  const nextBonus = INFUSION_CONFIG.bonusPerInfusion;

  // Cost is a percentage of current essence (matches backend logic)
  const costPercent = Math.min(
    INFUSION_CONFIG.maxCostPercent,
    INFUSION_CONFIG.baseCostPercent + infusionCount * INFUSION_CONFIG.costIncreasePerUse
  );
  const nextCost = Math.floor(essence * costPercent);

  // Can afford if we have enough essence AND the cost meets minimum threshold
  const meetsMinimum = nextCost >= INFUSION_CONFIG.minimumEssence;
  const canAfford = essence >= nextCost && meetsMinimum;
  const canInfuse = canAfford && !loading;

  const handleInfuse = useCallback(async () => {
    if (!canInfuse) return;

    setLoading(true);
    try {
      const result = await onInfuse();
      if (result.success) {
        setLastResult({
          bonusGained: result.bonusGained,
          totalBonus: result.totalBonus,
          cost: result.cost
        });

        // Clear result after a few seconds
        setTimeout(() => setLastResult(null), 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [canInfuse, onInfuse]);

  // Progress to next milestone (every 10 infusions)
  const milestone = Math.ceil((infusionCount + 1) / 10) * 10;
  const progressPercent = ((infusionCount % 10) / 10) * 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <IconSparkles size={24} style={{ marginRight: 8 }} />
        {t('essenceTap.infusion.title', { defaultValue: 'Essence Infusion' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {/* Infusion Orb */}
          <InfusionOrb
            $canInfuse={canInfuse}
            onClick={handleInfuse}
            whileHover={canInfuse ? { scale: 1.05 } : {}}
            whileTap={canInfuse ? { scale: 0.95 } : {}}
          >
            <OrbIcon>
              <IconSparkles size={48} />
            </OrbIcon>
          </InfusionOrb>

          {/* Last Result */}
          <AnimatePresence>
            {lastResult && (
              <InfusionResult
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ResultText>
                  {t('essenceTap.infusion.success', { defaultValue: 'Infusion Complete!' })}
                </ResultText>
                <ResultDetail>
                  +{(lastResult.bonusGained * 100).toFixed(1)}% production bonus
                </ResultDetail>
              </InfusionResult>
            )}
          </AnimatePresence>

          {/* Current Bonus */}
          <CurrentBonus>
            <BonusLabel>
              {t('essenceTap.infusion.permanentBonus', { defaultValue: 'Permanent Production Bonus' })}
            </BonusLabel>
            <BonusValue>
              +{(currentBonus * 100).toFixed(1)}%
            </BonusValue>
            <BonusSubtext>
              {t('essenceTap.infusion.infusionCount', {
                count: infusionCount,
                defaultValue: `From ${infusionCount} infusions`
              })}
            </BonusSubtext>
          </CurrentBonus>

          {/* Cost Display */}
          <CostDisplay>
            <CostRow>
              <CostLabel>{t('essenceTap.infusion.nextInfusionCost', { defaultValue: 'Next Infusion Cost:' })}</CostLabel>
              <CostValue $canAfford={canAfford}>
                {formatNumber(nextCost)}
              </CostValue>
            </CostRow>
            <CostRow>
              <CostLabel>{t('essenceTap.infusion.yourEssence', { defaultValue: 'Your Essence:' })}</CostLabel>
              <CostValue $canAfford={true} style={{ color: '#A855F7' }}>
                {formatNumber(essence)}
              </CostValue>
            </CostRow>

            <NextBonusPreview>
              <span style={{ color: theme.colors.textSecondary }}>
                +{(currentBonus * 100).toFixed(1)}%
              </span>
              <ArrowIcon><IconArrowUp size={16} /></ArrowIcon>
              <NextValue>+{((currentBonus + nextBonus) * 100).toFixed(1)}%</NextValue>
            </NextBonusPreview>
          </CostDisplay>

          {/* Progress to next milestone */}
          <ProgressSection>
            <ProgressLabel>
              <span>{t('essenceTap.infusion.milestone', { defaultValue: 'Milestone Progress' })}</span>
              <span>{infusionCount} / {milestone}</span>
            </ProgressLabel>
            <ProgressBar>
              <ProgressFill $percent={progressPercent} />
            </ProgressBar>
          </ProgressSection>

          {/* Info Grid */}
          <InfoGrid>
            <InfoItem>
              <InfoValue $color="#A855F7">{infusionCount}</InfoValue>
              <InfoLabel>{t('essenceTap.infusion.totalInfusions', { defaultValue: 'Total Infusions' })}</InfoLabel>
            </InfoItem>
            <InfoItem>
              <InfoValue $color="#10B981">+{(nextBonus * 100).toFixed(1)}%</InfoValue>
              <InfoLabel>{t('essenceTap.infusion.perInfusion', { defaultValue: 'Per Infusion' })}</InfoLabel>
            </InfoItem>
            <InfoItem>
              <InfoValue $color="#FCD34D">{(costPercent * 100).toFixed(0)}%</InfoValue>
              <InfoLabel>{t('essenceTap.infusion.costPercent', { defaultValue: 'Cost (% of Essence)' })}</InfoLabel>
            </InfoItem>
            <InfoItem>
              <InfoValue $color="#EC4899">+{(INFUSION_CONFIG.costIncreasePerUse * 100).toFixed(0)}%</InfoValue>
              <InfoLabel>{t('essenceTap.infusion.costIncrease', { defaultValue: 'Cost Increase/Use' })}</InfoLabel>
            </InfoItem>
          </InfoGrid>
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
        <Button
          variant="primary"
          onClick={handleInfuse}
          disabled={!canInfuse}
        >
          {loading
            ? t('common.loading', { defaultValue: 'Loading...' })
            : !meetsMinimum
              ? t('essenceTap.infusion.needMinimum', {
                  minimum: formatNumber(INFUSION_CONFIG.minimumEssence),
                  defaultValue: `Need ${formatNumber(INFUSION_CONFIG.minimumEssence)} min`
                })
              : canAfford
                ? t('essenceTap.infusion.infuse', { defaultValue: 'Infuse!' })
                : t('essenceTap.infusion.notEnough', { defaultValue: 'Not Enough Essence' })}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

InfusionPanel.displayName = 'InfusionPanel';

export default InfusionPanel;
