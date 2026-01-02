/**
 * ChallengeMode - Special challenge modes for Essence Tap
 *
 * Features:
 * - Speed Challenge: Tap X times in Y seconds
 * - Accuracy Challenge: Tap only golden essence (avoid regular)
 * - Endurance Challenge: Maintain combo for X seconds
 * - Progressive difficulty with increasing rewards
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import {
  IconLightning,
  IconTarget,
  IconTimer,
  IconTrophy,
  IconStar,
  IconGem,
  IconSparkles
} from '../../constants/icons';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const ChallengeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const ChallengeCard = styled(motion.div)`
  padding: ${theme.spacing.lg};
  background: ${props => props.$active
    ? `linear-gradient(135deg, ${props.$color}30, ${props.$color}10)`
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px solid ${props => props.$active ? props.$color : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.lg};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.3s ease;

  ${props => !props.$disabled && !props.$active && css`
    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: ${props.$color}80;
      transform: translateY(-2px);
    }
  `}
`;

const ChallengeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const ChallengeIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: ${theme.radius.lg};
  background: linear-gradient(135deg, ${props => props.$color}40, ${props => props.$color}20);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: ${props => props.$color};
`;

const ChallengeInfo = styled.div`
  flex: 1;
`;

const ChallengeName = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.xs} 0;
`;

const ChallengeDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const RewardPreview = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
`;

const RewardBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || theme.colors.text};
`;

const DifficultyBadge = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => {
    switch (props.$level) {
      case 'easy': return 'rgba(16, 185, 129, 0.2)';
      case 'medium': return 'rgba(245, 158, 11, 0.2)';
      case 'hard': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      default: return theme.colors.text;
    }
  }};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;
`;

const CooldownText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.sm};
`;

// Active Challenge UI
const ActiveChallengeContainer = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const ChallengeTitle = styled.h2`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
  margin-bottom: ${theme.spacing.md};
  animation: ${pulse} 1s ease-in-out infinite;
`;

const TimerDisplay = styled.div`
  font-size: 64px;
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$urgent ? '#EF4444' : theme.colors.text};
  margin: ${theme.spacing.lg} 0;
  ${props => props.$urgent && css`
    animation: ${shake} 0.3s ease-in-out infinite;
  `}
`;

const ProgressDisplay = styled.div`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg};
`;

const ProgressValue = styled.span`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  color: #10B981;
`;

const TapZone = styled(motion.div)`
  width: 200px;
  height: 200px;
  margin: ${theme.spacing.xl} auto;
  border-radius: 50%;
  background: ${props => props.$type === 'accuracy'
    ? props.$isGolden
      ? 'linear-gradient(135deg, #FCD34D, #F59E0B)'
      : 'linear-gradient(135deg, #A855F7, #7C3AED)'
    : 'linear-gradient(135deg, #A855F7, #7C3AED)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  font-size: 48px;
  color: white;
  box-shadow: ${props => props.$isGolden
    ? '0 0 30px rgba(252, 211, 77, 0.6)'
    : '0 0 20px rgba(168, 85, 247, 0.4)'};

  &:active {
    transform: scale(0.95);
  }
`;

const ComboBar = styled.div`
  width: 100%;
  max-width: 400px;
  margin: ${theme.spacing.lg} auto;
`;

const ComboBarTrack = styled.div`
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ComboBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #10B981, #34D399);
  border-radius: ${theme.radius.full};
`;

const ComboLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

// Results UI
const ResultsContainer = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const ResultTitle = styled.h2`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$success ? '#10B981' : '#EF4444'};
  margin-bottom: ${theme.spacing.lg};
`;

const ResultStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin: ${theme.spacing.lg} 0;
`;

const StatCard = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#A855F7'};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const RewardsEarned = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin: ${theme.spacing.lg} 0;
  padding: ${theme.spacing.lg};
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: ${theme.radius.lg};
`;

// Challenge definitions
const CHALLENGES = {
  speed: {
    id: 'speed',
    name: 'Speed Tap',
    description: 'Tap as fast as you can! Reach the target before time runs out.',
    IconComponent: IconLightning,
    color: '#F59E0B',
    difficulties: {
      easy: { target: 50, timeLimit: 15, rewards: { essence: 10000, xp: 10 } },
      medium: { target: 100, timeLimit: 20, rewards: { essence: 50000, xp: 25, rollTickets: 1 } },
      hard: { target: 200, timeLimit: 25, rewards: { essence: 200000, xp: 50, rollTickets: 2, fatePoints: 5 } }
    },
    cooldown: 300000 // 5 minutes
  },
  accuracy: {
    id: 'accuracy',
    name: 'Golden Hunter',
    description: 'Only tap when the orb turns golden! Avoid regular taps.',
    IconComponent: IconTarget,
    color: '#FCD34D',
    difficulties: {
      easy: { goldenRequired: 10, maxMisses: 5, timeLimit: 30, rewards: { essence: 15000, xp: 15 } },
      medium: { goldenRequired: 20, maxMisses: 3, timeLimit: 45, rewards: { essence: 75000, xp: 30, rollTickets: 1 } },
      hard: { goldenRequired: 30, maxMisses: 1, timeLimit: 60, rewards: { essence: 300000, xp: 60, rollTickets: 3, fatePoints: 10 } }
    },
    cooldown: 600000 // 10 minutes
  },
  endurance: {
    id: 'endurance',
    name: 'Combo Master',
    description: 'Keep your combo alive! Tap consistently to maintain the combo meter.',
    IconComponent: IconTimer,
    color: '#10B981',
    difficulties: {
      easy: { targetDuration: 30, comboDecay: 2000, rewards: { essence: 20000, xp: 20 } },
      medium: { targetDuration: 60, comboDecay: 1500, rewards: { essence: 100000, xp: 40, rollTickets: 2 } },
      hard: { targetDuration: 120, comboDecay: 1000, rewards: { essence: 500000, xp: 80, rollTickets: 4, fatePoints: 15 } }
    },
    cooldown: 900000 // 15 minutes
  }
};

const ChallengeMode = memo(({ isOpen, onClose, onRewardEarned }) => {
  const { t } = useTranslation();
  const [cooldowns, setCooldowns] = useState({});
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameState, setGameState] = useState(null);
  const [results, setResults] = useState(null);

  const timerRef = useRef(null);
  const goldenTimerRef = useRef(null);
  const comboTimerRef = useRef(null);

  // Load cooldowns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('essenceTap_challengeCooldowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const valid = {};
        Object.entries(parsed).forEach(([id, endTime]) => {
          if (endTime > now) {
            valid[id] = endTime;
          }
        });
        setCooldowns(valid);
      } catch {
        // Invalid data
      }
    }
  }, []);

  // Save cooldowns
  useEffect(() => {
    localStorage.setItem('essenceTap_challengeCooldowns', JSON.stringify(cooldowns));
  }, [cooldowns]);

  // Update cooldowns every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCooldowns(prev => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach(id => {
          if (updated[id] <= now) {
            delete updated[id];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    const timerRefCurrent = timerRef.current;
    const goldenTimerRefCurrent = goldenTimerRef.current;
    const comboTimerRefCurrent = comboTimerRef.current;
    return () => {
      if (timerRefCurrent) clearInterval(timerRefCurrent);
      if (goldenTimerRefCurrent) clearTimeout(goldenTimerRefCurrent);
      if (comboTimerRefCurrent) clearTimeout(comboTimerRefCurrent);
    };
  }, []);

  const formatCooldown = useCallback((ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getCooldownRemaining = useCallback((challengeId) => {
    const endTime = cooldowns[challengeId];
    if (!endTime) return 0;
    return Math.max(0, endTime - Date.now());
  }, [cooldowns]);

  // Schedule next golden appearance (for accuracy challenge)
  // Using ref to avoid circular dependencies
  const scheduleNextGoldenRef = useRef(null);

  scheduleNextGoldenRef.current = useCallback(() => {
    const delay = 1500 + Math.random() * 2000; // 1.5-3.5 seconds
    goldenTimerRef.current = setTimeout(() => {
      setGameState(prev => {
        if (!prev) return null;
        return { ...prev, isGolden: true };
      });

      // Golden lasts 1-2 seconds
      const goldenDuration = 1000 + Math.random() * 1000;
      setTimeout(() => {
        setGameState(prev => {
          if (!prev) return null;
          return { ...prev, isGolden: false };
        });
        scheduleNextGoldenRef.current?.();
      }, goldenDuration);
    }, delay);
  }, []);

  // Ref to hold endChallenge to avoid circular dependencies
  const endChallengeRef = useRef(null);

  // Start challenge
  const startChallenge = useCallback((challenge, diff) => {
    const config = challenge.difficulties[diff];
    setActiveChallenge(challenge);
    setDifficulty(diff);
    setResults(null);

    const initialState = {
      startTime: Date.now(),
      timeRemaining: config.timeLimit * 1000,
      taps: 0,
      goldenTaps: 0,
      misses: 0,
      comboDuration: 0,
      isGolden: false,
      comboMeter: 100,
      lastTapTime: Date.now()
    };

    setGameState(initialState);

    // Start main timer
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev) return null;
        const newTimeRemaining = prev.timeRemaining - 100;

        // Check for timeout
        if (newTimeRemaining <= 0) {
          endChallengeRef.current?.(challenge, diff, prev);
          return prev;
        }

        // For endurance, track combo duration
        if (challenge.id === 'endurance') {
          const timeSinceLastTap = Date.now() - prev.lastTapTime;
          const newComboMeter = Math.max(0, 100 - (timeSinceLastTap / config.comboDecay) * 100);

          if (newComboMeter <= 0) {
            endChallengeRef.current?.(challenge, diff, prev);
            return prev;
          }

          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            comboMeter: newComboMeter,
            comboDuration: prev.comboDuration + 100
          };
        }

        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 100);

    // For accuracy challenge, cycle golden states
    if (challenge.id === 'accuracy') {
      scheduleNextGoldenRef.current?.();
    }
  }, []);

  // End challenge
  const endChallenge = useCallback((challenge, diff, state) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (goldenTimerRef.current) {
      clearTimeout(goldenTimerRef.current);
      goldenTimerRef.current = null;
    }

    const config = challenge.difficulties[diff];
    let success = false;
    let stats = {};

    switch (challenge.id) {
      case 'speed':
        success = state.taps >= config.target;
        stats = {
          taps: state.taps,
          target: config.target,
          tapsPerSecond: (state.taps / (config.timeLimit - state.timeRemaining / 1000)).toFixed(1)
        };
        break;
      case 'accuracy':
        success = state.goldenTaps >= config.goldenRequired && state.misses <= config.maxMisses;
        stats = {
          goldenTaps: state.goldenTaps,
          required: config.goldenRequired,
          misses: state.misses,
          maxMisses: config.maxMisses
        };
        break;
      case 'endurance': {
        const durationSeconds = state.comboDuration / 1000;
        success = durationSeconds >= config.targetDuration;
        stats = {
          duration: durationSeconds.toFixed(1),
          target: config.targetDuration,
          totalTaps: state.taps
        };
        break;
      }
      default:
        break;
    }

    const rewards = success ? config.rewards : { essence: Math.floor(config.rewards.essence * 0.1) };

    setResults({ success, stats, rewards });
    setGameState(null);
    setActiveChallenge(null);

    // Set cooldown
    setCooldowns(prev => ({
      ...prev,
      [challenge.id]: Date.now() + challenge.cooldown
    }));

    // Notify parent of rewards
    if (success && onRewardEarned) {
      onRewardEarned(rewards);
    }
  }, [onRewardEarned]);

  // Assign endChallenge to ref after it's defined
  endChallengeRef.current = endChallenge;

  // Handle tap during challenge
  const handleTap = useCallback(() => {
    if (!gameState || !activeChallenge) return;

    const challenge = activeChallenge;
    const config = challenge.difficulties[difficulty];

    setGameState(prev => {
      if (!prev) return null;

      switch (challenge.id) {
        case 'speed': {
          const newTaps = prev.taps + 1;
          if (newTaps >= config.target) {
            setTimeout(() => endChallenge(challenge, difficulty, { ...prev, taps: newTaps }), 100);
          }
          return { ...prev, taps: newTaps };
        }

        case 'accuracy': {
          if (prev.isGolden) {
            const newGoldenTaps = prev.goldenTaps + 1;
            if (newGoldenTaps >= config.goldenRequired) {
              setTimeout(() => endChallenge(challenge, difficulty, { ...prev, goldenTaps: newGoldenTaps }), 100);
            }
            return { ...prev, goldenTaps: newGoldenTaps, isGolden: false };
          } else {
            const newMisses = prev.misses + 1;
            if (newMisses > config.maxMisses) {
              setTimeout(() => endChallenge(challenge, difficulty, { ...prev, misses: newMisses }), 100);
            }
            return { ...prev, misses: newMisses };
          }
        }

        case 'endurance':
          return {
            ...prev,
            taps: prev.taps + 1,
            lastTapTime: Date.now(),
            comboMeter: 100
          };

        default:
          return prev;
      }
    });
  }, [gameState, activeChallenge, difficulty, endChallenge]);

  // Render challenge selection
  const renderChallengeSelection = () => (
    <Container>
      <ChallengeGrid>
        {Object.values(CHALLENGES).map(challenge => {
          const cooldownRemaining = getCooldownRemaining(challenge.id);
          const isOnCooldown = cooldownRemaining > 0;
          const config = challenge.difficulties[difficulty];

          return (
            <ChallengeCard
              key={challenge.id}
              $color={challenge.color}
              $disabled={isOnCooldown}
              onClick={() => !isOnCooldown && startChallenge(challenge, difficulty)}
              whileHover={!isOnCooldown ? { scale: 1.02 } : {}}
              whileTap={!isOnCooldown ? { scale: 0.98 } : {}}
            >
              <ChallengeHeader>
                <ChallengeIcon $color={challenge.color}>
                  <challenge.IconComponent size={24} />
                </ChallengeIcon>
                <ChallengeInfo>
                  <ChallengeName>{challenge.name}</ChallengeName>
                  <ChallengeDescription>{challenge.description}</ChallengeDescription>
                </ChallengeInfo>
              </ChallengeHeader>

              <DifficultyBadge $level={difficulty}>
                {difficulty.toUpperCase()}
              </DifficultyBadge>

              <RewardPreview>
                {config.rewards.essence && (
                  <RewardBadge $color="#A855F7">
                    <IconGem size={14} />
                    {formatNumber(config.rewards.essence)}
                  </RewardBadge>
                )}
                {config.rewards.xp && (
                  <RewardBadge $color="#3B82F6">
                    +{config.rewards.xp} XP
                  </RewardBadge>
                )}
                {config.rewards.rollTickets && (
                  <RewardBadge $color="#10B981">
                    <IconSparkles size={14} />
                    {config.rewards.rollTickets}
                  </RewardBadge>
                )}
                {config.rewards.fatePoints && (
                  <RewardBadge $color="#FCD34D">
                    <IconStar size={14} />
                    {config.rewards.fatePoints} FP
                  </RewardBadge>
                )}
              </RewardPreview>

              {isOnCooldown && (
                <CooldownText>
                  Available in {formatCooldown(cooldownRemaining)}
                </CooldownText>
              )}
            </ChallengeCard>
          );
        })}
      </ChallengeGrid>

      {/* Difficulty selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: theme.spacing.md }}>
        {['easy', 'medium', 'hard'].map(diff => (
          <Button
            key={diff}
            variant={difficulty === diff ? 'primary' : 'secondary'}
            onClick={() => setDifficulty(diff)}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </Button>
        ))}
      </div>
    </Container>
  );

  // Render active challenge
  const renderActiveChallenge = () => {
    if (!gameState || !activeChallenge) return null;

    const config = activeChallenge.difficulties[difficulty];
    const timeSeconds = Math.ceil(gameState.timeRemaining / 1000);
    const isUrgent = timeSeconds <= 5;

    return (
      <ActiveChallengeContainer>
        <ChallengeTitle $color={activeChallenge.color}>
          {activeChallenge.name}
        </ChallengeTitle>

        <TimerDisplay $urgent={isUrgent}>
          {timeSeconds}s
        </TimerDisplay>

        {activeChallenge.id === 'speed' && (
          <ProgressDisplay>
            <ProgressValue>{gameState.taps}</ProgressValue> / {config.target} taps
          </ProgressDisplay>
        )}

        {activeChallenge.id === 'accuracy' && (
          <ProgressDisplay>
            Golden: <ProgressValue>{gameState.goldenTaps}</ProgressValue> / {config.goldenRequired}
            {' | '}
            Misses: <span style={{ color: gameState.misses > 0 ? '#EF4444' : 'inherit' }}>
              {gameState.misses}
            </span> / {config.maxMisses}
          </ProgressDisplay>
        )}

        {activeChallenge.id === 'endurance' && (
          <>
            <ProgressDisplay>
              Duration: <ProgressValue>{(gameState.comboDuration / 1000).toFixed(1)}s</ProgressValue> / {config.targetDuration}s
            </ProgressDisplay>
            <ComboBar>
              <ComboLabel>
                <span>Combo Meter</span>
                <span>{Math.round(gameState.comboMeter)}%</span>
              </ComboLabel>
              <ComboBarTrack>
                <ComboBarFill
                  initial={{ width: '100%' }}
                  animate={{ width: `${gameState.comboMeter}%` }}
                  transition={{ duration: 0.1 }}
                />
              </ComboBarTrack>
            </ComboBar>
          </>
        )}

        <TapZone
          $type={activeChallenge.id}
          $isGolden={gameState.isGolden}
          onClick={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
          whileTap={{ scale: 0.9 }}
        >
          {activeChallenge.id === 'accuracy' && gameState.isGolden ? (
            <IconSparkles size={48} />
          ) : (
            <activeChallenge.IconComponent size={48} />
          )}
        </TapZone>

        <Button variant="secondary" onClick={() => endChallenge(activeChallenge, difficulty, gameState)}>
          Give Up
        </Button>
      </ActiveChallengeContainer>
    );
  };

  // Render results
  const renderResults = () => {
    if (!results) return null;

    return (
      <ResultsContainer
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <IconTrophy size={64} style={{ color: results.success ? '#10B981' : '#EF4444' }} />

        <ResultTitle $success={results.success}>
          {results.success ? 'Challenge Complete!' : 'Challenge Failed'}
        </ResultTitle>

        <ResultStats>
          {Object.entries(results.stats).map(([key, value]) => (
            <StatCard key={key}>
              <StatValue>{value}</StatValue>
              <StatLabel>{key.replace(/([A-Z])/g, ' $1').trim()}</StatLabel>
            </StatCard>
          ))}
        </ResultStats>

        {results.success && (
          <RewardsEarned>
            {results.rewards.essence && (
              <RewardBadge $color="#A855F7">
                <IconGem size={18} />
                +{formatNumber(results.rewards.essence)} Essence
              </RewardBadge>
            )}
            {results.rewards.xp && (
              <RewardBadge $color="#3B82F6">
                +{results.rewards.xp} XP
              </RewardBadge>
            )}
            {results.rewards.rollTickets && (
              <RewardBadge $color="#10B981">
                <IconSparkles size={18} />
                +{results.rewards.rollTickets} Roll Tickets
              </RewardBadge>
            )}
            {results.rewards.fatePoints && (
              <RewardBadge $color="#FCD34D">
                <IconStar size={18} />
                +{results.rewards.fatePoints} Fate Points
              </RewardBadge>
            )}
          </RewardsEarned>
        )}

        <Button variant="primary" onClick={() => setResults(null)}>
          Continue
        </Button>
      </ResultsContainer>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={!gameState ? onClose : undefined} size="lg">
      <ModalHeader onClose={!gameState ? onClose : undefined}>
        <IconTrophy size={24} style={{ marginRight: 8 }} />
        {t('essenceTap.challengeMode', { defaultValue: 'Challenge Mode' })}
      </ModalHeader>

      <ModalBody>
        <AnimatePresence mode="wait">
          {results ? (
            renderResults()
          ) : gameState && activeChallenge ? (
            renderActiveChallenge()
          ) : (
            renderChallengeSelection()
          )}
        </AnimatePresence>
      </ModalBody>

      {!gameState && !results && (
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close', { defaultValue: 'Close' })}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
});

ChallengeMode.displayName = 'ChallengeMode';

export default ChallengeMode;
