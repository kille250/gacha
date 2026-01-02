/**
 * BossEncounter - Boss fight mini-game overlay
 *
 * Features:
 * - Boss health bar with timer
 * - Tap to damage boss
 * - Element weakness indicators
 * - Reward display on victory
 * - Pixi.js particle effects
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalBody } from '../../design-system';
import api from '../../utils/api';
import { formatNumber } from '../../hooks/useEssenceTap';
import { invalidateFor, CACHE_ACTIONS } from '../../cache/manager';
import {
  IconFlame,
  IconLight,
  IconDark,
  IconGem,
  IconStar,
  IconSparkles,
  IconSkull
} from '../../constants/icons';

const glow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.5)); }
  50% { filter: drop-shadow(0 0 30px rgba(239, 68, 68, 0.8)); }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
  text-align: center;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const BossHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const BossName = styled.h2`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  color: #EF4444;
  margin-bottom: ${theme.spacing.xs};
  animation: ${glow} 2s ease-in-out infinite;
`;

const BossTier = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const BossImage = styled(motion.div)`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(239, 68, 68, 0.3), rgba(139, 0, 0, 0.5));
  border: 4px solid #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: ${theme.spacing.lg} auto;
  cursor: pointer;
  user-select: none;
  transition: all 0.1s ease;

  &:active {
    transform: scale(0.95);
  }

  @media (min-width: ${theme.breakpoints.md}) {
    width: 250px;
    height: 250px;
  }
`;

const BossIconContainer = styled.div`
  font-size: 80px;
  color: #EF4444;

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: 100px;
  }
`;

const HealthBarContainer = styled.div`
  width: 100%;
  max-width: 400px;
  margin: ${theme.spacing.lg} auto;
`;

const HealthBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
`;

const HealthBar = styled.div`
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(239, 68, 68, 0.5);
`;

const HealthFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #DC2626, #EF4444, #F87171);
  border-radius: 10px;
`;

const TimerBar = styled.div`
  width: 100%;
  max-width: 400px;
  margin: ${theme.spacing.md} auto;
`;

const TimerLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$urgent ? '#EF4444' : theme.colors.textSecondary};
`;

const TimerBarTrack = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

const TimerFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.$urgent
    ? 'linear-gradient(90deg, #EF4444, #F97316)'
    : 'linear-gradient(90deg, #3B82F6, #60A5FA)'};
  border-radius: 4px;
`;

const WeaknessInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin: ${theme.spacing.md} 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const WeaknessBadge = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${props => props.$color || '#10B981'};
  font-weight: ${theme.fontWeights.semibold};
`;

const DamageNumber = styled(motion.div)`
  position: fixed;
  font-size: 28px;
  font-weight: ${theme.fontWeights.bold};
  color: #FCD34D;
  text-shadow: 0 0 10px rgba(252, 211, 77, 0.5);
  pointer-events: none;
  z-index: 100;
`;

const VictoryContainer = styled(motion.div)`
  text-align: center;
`;

const VictoryTitle = styled.h2`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  color: #10B981;
  margin-bottom: ${theme.spacing.lg};
`;

const RewardsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin: ${theme.spacing.lg} 0;
`;

const RewardCard = styled(motion.div)`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const RewardValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#A855F7'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
`;

const RewardLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const CooldownContainer = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const CooldownTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const CooldownText = styled.div`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
`;

const ELEMENT_ICONS = {
  fire: IconFlame,
  light: IconLight,
  dark: IconDark
};

const ELEMENT_COLORS = {
  fire: '#EF4444',
  light: '#FCD34D',
  dark: '#6366F1'
};

// Boss uses skull icon with different colors per tier
const BOSS_COLORS = {
  essence_drake: '#EF4444',
  void_serpent: '#8B5CF6',
  arcane_titan: '#3B82F6',
  prismatic_dragon: '#F59E0B'
};

const BossEncounter = memo(({ isOpen, onClose, clickPower = 1, onBossDefeat }) => {
  const { t } = useTranslation();
  const [bossInfo, setBossInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [victory, setVictory] = useState(null);
  const nextDamageId = useRef(0);
  const attackingRef = useRef(false);

  // Fetch boss info
  const fetchBossInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/essence-tap/boss');
      setBossInfo(response.data);
      setVictory(null);
    } catch (err) {
      console.error('Failed to fetch boss info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBossInfo();
    }
  }, [isOpen, fetchBossInfo]);

  // Timer countdown
  useEffect(() => {
    if (!bossInfo?.active) return;

    const interval = setInterval(() => {
      setBossInfo(prev => {
        if (!prev?.active) return prev;
        const newTime = Math.max(0, prev.timeRemaining - 100);
        if (newTime <= 0) {
          // Boss escaped
          fetchBossInfo();
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [bossInfo?.active, fetchBossInfo]);

  const handleAttack = async (e) => {
    // Allow attack if boss is active OR if boss can spawn (backend handles spawning)
    if (attackingRef.current || (!bossInfo?.active && !bossInfo?.canSpawn)) return;
    attackingRef.current = true;

    try {
      const response = await api.post('/essence-tap/boss/attack', { damage: clickPower });

      if (response.data.success) {
        // Show damage number
        const id = nextDamageId.current++;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 50;
        const y = rect.top + (Math.random() - 0.5) * 50;

        setDamageNumbers(prev => [...prev, {
          id,
          x,
          y,
          value: response.data.damageDealt
        }]);

        setTimeout(() => {
          setDamageNumbers(prev => prev.filter(d => d.id !== id));
        }, 800);

        // Update boss info
        if (response.data.defeated) {
          // Invalidate cache - boss defeat can award essence, FP, tickets, XP
          invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_BOSS_DEFEAT);
          setVictory(response.data.rewards);
          onBossDefeat?.(response.data.rewards);
        } else if (response.data.bossSpawned) {
          setBossInfo({
            active: true,
            boss: response.data.boss,
            currentHealth: response.data.bossHealth,
            maxHealth: response.data.bossHealth,
            timeRemaining: response.data.boss?.timeLimit || 30000
          });
        } else {
          setBossInfo(prev => ({
            ...prev,
            currentHealth: response.data.bossHealth
          }));
        }
      }
    } catch (err) {
      console.error('Failed to attack boss:', err);
    } finally {
      attackingRef.current = false;
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const formatCooldown = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalBody>
          <Container>Loading...</Container>
        </ModalBody>
      </Modal>
    );
  }

  // Victory screen
  if (victory) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalBody>
          <VictoryContainer
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <VictoryTitle>
              {t('essenceTap.bossDefeated', { defaultValue: 'Victory!' })}
            </VictoryTitle>

            <RewardsGrid>
              {victory.essence > 0 && (
                <RewardCard
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <RewardValue $color="#A855F7">
                    <IconGem size={24} />
                    +{formatNumber(victory.essence)}
                  </RewardValue>
                  <RewardLabel>Essence</RewardLabel>
                </RewardCard>
              )}

              {victory.fatePoints > 0 && (
                <RewardCard
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <RewardValue $color="#FCD34D">
                    <IconStar size={24} />
                    +{victory.fatePoints}
                  </RewardValue>
                  <RewardLabel>Fate Points</RewardLabel>
                </RewardCard>
              )}

              {victory.rollTickets > 0 && (
                <RewardCard
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <RewardValue $color="#10B981">
                    <IconSparkles size={24} />
                    +{victory.rollTickets}
                  </RewardValue>
                  <RewardLabel>Roll Tickets</RewardLabel>
                </RewardCard>
              )}

              {victory.xp > 0 && (
                <RewardCard
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <RewardValue $color="#3B82F6">
                    +{victory.xp}
                  </RewardValue>
                  <RewardLabel>XP</RewardLabel>
                </RewardCard>
              )}
            </RewardsGrid>

            <Button variant="primary" onClick={() => { setVictory(null); fetchBossInfo(); }}>
              {t('common.continue', { defaultValue: 'Continue' })}
            </Button>
          </VictoryContainer>
        </ModalBody>
      </Modal>
    );
  }

  // Cooldown or waiting for spawn
  if (!bossInfo?.active && !bossInfo?.canSpawn) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalBody>
          <CooldownContainer>
            <CooldownTitle>
              {t('essenceTap.bossOnCooldown', { defaultValue: 'Boss on Cooldown' })}
            </CooldownTitle>
            {bossInfo?.cooldownRemaining > 0 ? (
              <CooldownText>
                Next boss in: {formatCooldown(bossInfo.cooldownRemaining)}
              </CooldownText>
            ) : (
              <CooldownText>
                Clicks until spawn: {bossInfo?.clicksUntilSpawn || 'Unknown'}
              </CooldownText>
            )}
            <Button variant="secondary" onClick={onClose} style={{ marginTop: theme.spacing.lg }}>
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
          </CooldownContainer>
        </ModalBody>
      </Modal>
    );
  }

  // Can spawn - trigger spawn
  if (bossInfo?.canSpawn && !bossInfo?.active) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalBody>
          <Container>
            <BossHeader>
              <BossName>Boss Available!</BossName>
              <BossTier>Tier {bossInfo.nextBossTier?.tier || 1}</BossTier>
            </BossHeader>

            <BossImage
              onClick={handleAttack}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <BossIconContainer style={{ color: BOSS_COLORS[bossInfo.nextBossTier?.id] || '#EF4444' }}>
                <IconSkull size={80} />
              </BossIconContainer>
            </BossImage>

            <Button variant="primary" onClick={handleAttack}>
              {t('essenceTap.startBoss', { defaultValue: 'Start Fight!' })}
            </Button>
          </Container>
        </ModalBody>
      </Modal>
    );
  }

  // Active boss fight
  const boss = bossInfo?.boss;
  const healthPercent = (bossInfo.currentHealth / bossInfo.maxHealth) * 100;
  const timePercent = (bossInfo.timeRemaining / (boss?.timeLimit || 30000)) * 100;
  const isUrgent = timePercent < 30;
  const WeaknessIcon = boss?.elementWeakness ? ELEMENT_ICONS[boss.elementWeakness] : null;
  const weaknessColor = boss?.elementWeakness ? ELEMENT_COLORS[boss.elementWeakness] : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBody>
        <Container>
          <BossHeader>
            <BossName>{boss?.name || 'Unknown Boss'}</BossName>
            <BossTier>Tier {boss?.tier || 1}</BossTier>
          </BossHeader>

          {boss?.elementWeakness && WeaknessIcon && (
            <WeaknessInfo>
              Weak to:
              <WeaknessBadge $color={weaknessColor}>
                <WeaknessIcon size={16} />
                {boss.elementWeakness.charAt(0).toUpperCase() + boss.elementWeakness.slice(1)}
              </WeaknessBadge>
            </WeaknessInfo>
          )}

          <BossImage
            onClick={handleAttack}
            whileTap={{ scale: 0.9 }}
            animate={bossInfo.currentHealth < bossInfo.maxHealth * 0.3 ? { x: [-2, 2, -2, 0] } : {}}
            transition={{ duration: 0.1, repeat: Infinity }}
          >
            <BossIconContainer style={{ color: BOSS_COLORS[boss?.id] || '#EF4444' }}>
              <IconSkull size={80} />
            </BossIconContainer>
          </BossImage>

          <HealthBarContainer>
            <HealthBarLabel>
              <span>HP</span>
              <span>{formatNumber(bossInfo.currentHealth)} / {formatNumber(bossInfo.maxHealth)}</span>
            </HealthBarLabel>
            <HealthBar>
              <HealthFill
                initial={{ width: '100%' }}
                animate={{ width: `${healthPercent}%` }}
                transition={{ duration: 0.2 }}
              />
            </HealthBar>
          </HealthBarContainer>

          <TimerBar>
            <TimerLabel $urgent={isUrgent}>
              <span>Time</span>
              <span>{formatTime(bossInfo.timeRemaining)}</span>
            </TimerLabel>
            <TimerBarTrack>
              <TimerFill
                $urgent={isUrgent}
                style={{ width: `${timePercent}%` }}
              />
            </TimerBarTrack>
          </TimerBar>

          {/* Floating damage numbers */}
          <AnimatePresence>
            {damageNumbers.map(dmg => (
              <DamageNumber
                key={dmg.id}
                initial={{ x: dmg.x, y: dmg.y, opacity: 1, scale: 1 }}
                animate={{ y: dmg.y - 80, opacity: 0, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                -{formatNumber(dmg.value)}
              </DamageNumber>
            ))}
          </AnimatePresence>
        </Container>
      </ModalBody>
    </Modal>
  );
});

BossEncounter.displayName = 'BossEncounter';

export default BossEncounter;
