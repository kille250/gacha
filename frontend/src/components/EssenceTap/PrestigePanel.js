/**
 * PrestigePanel - Awakening/Prestige system panel
 */

import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const PrestigeHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
`;

const PrestigeTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
`;

const PrestigeSubtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const PrestigeButton = styled(Button)`
  width: 100%;
  padding: ${theme.spacing.md};
  font-size: ${theme.fontSizes.lg};
  background: ${props => props.disabled
    ? 'rgba(255, 255, 255, 0.1)'
    : 'linear-gradient(135deg, #8B5CF6, #A855F7, #C084FC)'};
  border: none;
  margin-bottom: ${theme.spacing.xl};

  &:not(:disabled):hover {
    background: linear-gradient(135deg, #7C3AED, #9333EA, #A855F7);
  }
`;

const PrestigeInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: rgba(138, 43, 226, 0.1);
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.lg};
`;

const PrestigeInfoItem = styled.div`
  text-align: center;
`;

const PrestigeInfoValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
`;

const PrestigeInfoLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const UpgradesSection = styled.div`
  margin-top: ${theme.spacing.xl};
`;

const SectionTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const UpgradeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: ${theme.spacing.md};
`;

const UpgradeCard = styled(motion.div)`
  padding: ${theme.spacing.md};
  background: ${props => props.$maxed
    ? 'rgba(16, 185, 129, 0.1)'
    : props.$canAfford
      ? 'rgba(138, 43, 226, 0.15)'
      : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$maxed
    ? 'rgba(16, 185, 129, 0.4)'
    : props.$canAfford
      ? 'rgba(138, 43, 226, 0.4)'
      : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.lg};
  cursor: ${props => (!props.$maxed && props.$canAfford) ? 'pointer' : 'default'};
  transition: all 0.2s ease;

  ${props => (!props.$maxed && props.$canAfford) && `
    &:hover {
      background: rgba(138, 43, 226, 0.25);
      transform: translateY(-2px);
    }
  `}
`;

const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const UpgradeDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

const UpgradeLevel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: #A855F7;
  margin-bottom: ${theme.spacing.xs};
`;

const UpgradeFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UpgradeCost = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$canAfford ? '#A855F7' : '#EF4444'};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const ShardIcon = styled.span`
  font-size: ${theme.fontSizes.base};
`;

const ConfirmModalContent = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
`;

const ConfirmTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const ConfirmDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg};
`;

const ConfirmStats = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const ConfirmStat = styled.div`
  text-align: center;
`;

const ConfirmStatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
`;

const ConfirmStatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const WarningText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: #F59E0B;
  margin-top: ${theme.spacing.md};
`;

const PrestigePanel = memo(({
  prestige,
  onPrestige,
  onPurchaseUpgrade,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handlePrestigeClick = useCallback(() => {
    if (prestige?.canPrestige) {
      setShowConfirm(true);
    }
  }, [prestige?.canPrestige]);

  const handleConfirmPrestige = useCallback(() => {
    setShowConfirm(false);
    onPrestige?.();
  }, [onPrestige]);

  if (!prestige) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalHeader onClose={onClose}>
          {t('essenceTap.awakening', { defaultValue: 'Awakening' })}
        </ModalHeader>

        <ModalBody>
          <Container>
            <PrestigeHeader>
              <PrestigeTitle>
                {t('essenceTap.awakeningTitle', { defaultValue: 'Transcend Your Power' })}
              </PrestigeTitle>
              <PrestigeSubtitle>
                {t('essenceTap.awakeningDesc', {
                  defaultValue: 'Reset your progress to gain permanent multipliers'
                })}
              </PrestigeSubtitle>
            </PrestigeHeader>

            <StatsGrid>
              <StatCard>
                <StatValue $color="#A855F7">{prestige.prestigeLevel}</StatValue>
                <StatLabel>{t('essenceTap.prestigeLevel', { defaultValue: 'Awakenings' })}</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#FCD34D">{prestige.currentShards}</StatValue>
                <StatLabel>{t('essenceTap.shards', { defaultValue: 'Shards' })}</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#10B981">{(prestige.currentBonus * 100 - 100).toFixed(0)}%</StatValue>
                <StatLabel>{t('essenceTap.bonus', { defaultValue: 'Bonus' })}</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#3B82F6">{prestige.lifetimeShards}</StatValue>
                <StatLabel>{t('essenceTap.lifetimeShards', { defaultValue: 'Lifetime Shards' })}</StatLabel>
              </StatCard>
            </StatsGrid>

            {prestige.canPrestige && (
              <PrestigeInfo>
                <PrestigeInfoItem>
                  <PrestigeInfoValue>+{prestige.shardsIfPrestige}</PrestigeInfoValue>
                  <PrestigeInfoLabel>{t('essenceTap.shardsEarned', { defaultValue: 'Shards Earned' })}</PrestigeInfoLabel>
                </PrestigeInfoItem>
                <PrestigeInfoItem>
                  <PrestigeInfoValue>{((prestige.bonusAfterPrestige - 1) * 100).toFixed(0)}%</PrestigeInfoValue>
                  <PrestigeInfoLabel>{t('essenceTap.newBonus', { defaultValue: 'New Bonus' })}</PrestigeInfoLabel>
                </PrestigeInfoItem>
              </PrestigeInfo>
            )}

            <PrestigeButton
              disabled={!prestige.canPrestige}
              onClick={handlePrestigeClick}
            >
              {prestige.canPrestige
                ? t('essenceTap.awaken', { defaultValue: 'Awaken Now' })
                : t('essenceTap.requireEssence', {
                    amount: formatNumber(prestige.minimumEssence),
                    defaultValue: `Need ${formatNumber(prestige.minimumEssence)} lifetime essence`
                  })}
            </PrestigeButton>

            {prestige.upgrades && prestige.upgrades.length > 0 && (
              <UpgradesSection>
                <SectionTitle>
                  {t('essenceTap.permanentUpgrades', { defaultValue: 'Permanent Upgrades' })}
                </SectionTitle>

                <UpgradeGrid>
                  {prestige.upgrades.map(upgrade => (
                    <UpgradeCard
                      key={upgrade.id}
                      $maxed={upgrade.maxed}
                      $canAfford={upgrade.canAfford}
                      onClick={() => !upgrade.maxed && upgrade.canAfford && onPurchaseUpgrade?.(upgrade.id)}
                      whileHover={(!upgrade.maxed && upgrade.canAfford) ? { scale: 1.02 } : {}}
                      whileTap={(!upgrade.maxed && upgrade.canAfford) ? { scale: 0.98 } : {}}
                    >
                      <UpgradeName>{upgrade.name}</UpgradeName>
                      <UpgradeDescription>{upgrade.description}</UpgradeDescription>
                      <UpgradeLevel>
                        Level {upgrade.level} / {upgrade.maxLevel}
                      </UpgradeLevel>
                      <UpgradeFooter>
                        {upgrade.maxed ? (
                          <span style={{ color: '#10B981' }}>
                            {t('essenceTap.maxed', { defaultValue: 'MAXED' })}
                          </span>
                        ) : (
                          <>
                            <UpgradeCost $canAfford={upgrade.canAfford}>
                              <ShardIcon>💠</ShardIcon>
                              {upgrade.cost}
                            </UpgradeCost>
                            <Button
                              variant={upgrade.canAfford ? 'primary' : 'secondary'}
                              disabled={!upgrade.canAfford}
                              size="sm"
                            >
                              {t('essenceTap.upgrade', { defaultValue: 'Upgrade' })}
                            </Button>
                          </>
                        )}
                      </UpgradeFooter>
                    </UpgradeCard>
                  ))}
                </UpgradeGrid>
              </UpgradesSection>
            )}
          </Container>
        </ModalBody>
      </Modal>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} size="sm">
        <ModalBody>
          <ConfirmModalContent>
            <ConfirmTitle>
              {t('essenceTap.confirmAwakening', { defaultValue: 'Confirm Awakening?' })}
            </ConfirmTitle>
            <ConfirmDescription>
              {t('essenceTap.confirmDesc', {
                defaultValue: 'This will reset your essence, generators, and upgrades.'
              })}
            </ConfirmDescription>

            <ConfirmStats>
              <ConfirmStat>
                <ConfirmStatValue>+{prestige.shardsIfPrestige}</ConfirmStatValue>
                <ConfirmStatLabel>{t('essenceTap.shards', { defaultValue: 'Shards' })}</ConfirmStatLabel>
              </ConfirmStat>
              <ConfirmStat>
                <ConfirmStatValue>+{((prestige.bonusAfterPrestige - prestige.currentBonus) * 100).toFixed(0)}%</ConfirmStatValue>
                <ConfirmStatLabel>{t('essenceTap.bonusIncrease', { defaultValue: 'Bonus Increase' })}</ConfirmStatLabel>
              </ConfirmStat>
            </ConfirmStats>

            <WarningText>
              {t('essenceTap.prestigeWarning', {
                defaultValue: 'Your prestige upgrades will be kept!'
              })}
            </WarningText>
          </ConfirmModalContent>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="primary" onClick={handleConfirmPrestige}>
            {t('essenceTap.awaken', { defaultValue: 'Awaken' })}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
});

PrestigePanel.displayName = 'PrestigePanel';

export default PrestigePanel;
