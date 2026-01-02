/**
 * GamblePanel - Gamble system for Essence Tap
 *
 * Features:
 * - Three bet types: Safe, Risky, Extreme
 * - Progressive jackpot display
 * - Cooldown timer
 * - Win/loss animations
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconDice, IconTrophy, IconWarning } from '../../constants/icons';
import { BET_TYPES } from '../../config/essenceTapConfig';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const JackpotDisplay = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.1));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: ${theme.radius.lg};
  animation: ${pulse} 2s ease-in-out infinite;
`;

const JackpotLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${theme.spacing.xs};
`;

const JackpotAmount = styled.div`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #FFD700, #FFA500);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const CurrentEssence = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(138, 43, 226, 0.1);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.lg};
`;

const EssenceLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const EssenceValue = styled.span`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: #A855F7;
`;

const BetSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const BetAmountInput = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const BetInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.lg};
  text-align: center;

  &:focus {
    outline: none;
    border-color: rgba(138, 43, 226, 0.5);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const QuickBetButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const BetTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const BetTypeCard = styled(motion.button)`
  padding: ${theme.spacing.lg};
  background: ${props => props.$selected
    ? `linear-gradient(135deg, ${props.$color}30, ${props.$color}15)`
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px solid ${props => props.$selected ? props.$color : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: ${props => props.$color};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BetTypeName = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color || theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const BetTypeChance = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const BetTypeMultiplier = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#10B981'};
`;

const ResultDisplay = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
  background: ${props => props.$won
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))'
    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))'};
  border: 1px solid ${props => props.$won ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
  border-radius: ${theme.radius.lg};
`;

const ResultText = styled.div`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$won ? '#10B981' : '#EF4444'};
  margin-bottom: ${theme.spacing.sm};
`;

const ResultAmount = styled.div`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;

const CooldownDisplay = styled.div`
  text-align: center;
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.md};
`;

const CooldownText = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

const CooldownTime = styled.span`
  color: #FCD34D;
  font-weight: ${theme.fontWeights.semibold};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const WarningText = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: ${theme.radius.md};
  color: #F59E0B;
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.md};
`;

const GamblePanel = memo(({
  isOpen,
  onClose,
  essence,
  onGamble,
  getGambleInfo
}) => {
  const { t } = useTranslation();
  const [betType, setBetType] = useState('safe');
  const [betAmount, setBetAmount] = useState('10000');
  const [lastResult, setLastResult] = useState(null);
  const [jackpotInfo, setJackpotInfo] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gambleStats, setGambleStats] = useState({ wins: 0, losses: 0, netGain: 0 });

  // Fetch jackpot info on open
  useEffect(() => {
    if (isOpen && getGambleInfo) {
      getGambleInfo().then(result => {
        if (result.success) {
          setJackpotInfo(result);
        }
      });
    }
  }, [isOpen, getGambleInfo]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleBetAmountChange = useCallback((e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setBetAmount(value);
  }, []);

  const handleQuickBet = useCallback((percentage) => {
    const amount = Math.floor(essence * percentage);
    setBetAmount(String(Math.max(1000, amount)));
  }, [essence]);

  const handleGamble = useCallback(async () => {
    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount < 1000) return;
    if (amount > essence) return;
    if (cooldown > 0) return;

    setLoading(true);
    try {
      const result = await onGamble(betType, amount);
      if (result.success) {
        setLastResult({
          won: result.won,
          amount: result.essenceChange,
          multiplier: result.multiplier,
          jackpotWin: result.jackpotWin
        });

        // Update stats
        setGambleStats(prev => ({
          wins: prev.wins + (result.won ? 1 : 0),
          losses: prev.losses + (result.won ? 0 : 1),
          netGain: prev.netGain + result.essenceChange
        }));

        // Set cooldown (15 seconds)
        setCooldown(15);

        // Refresh jackpot info
        if (getGambleInfo) {
          getGambleInfo().then(info => {
            if (info.success) {
              setJackpotInfo(info);
            }
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [betAmount, betType, essence, cooldown, onGamble, getGambleInfo]);

  const betAmountNum = parseInt(betAmount, 10) || 0;
  const potentialWin = Math.floor(betAmountNum * BET_TYPES[betType].multiplier);
  const canGamble = betAmountNum >= 1000 && betAmountNum <= essence && cooldown === 0 && !loading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <IconDice size={24} style={{ marginRight: 8 }} />
        {t('essenceTap.gamble.title', { defaultValue: 'Essence Gamble' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {/* Jackpot Display */}
          <JackpotDisplay>
            <JackpotLabel>
              <IconTrophy size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {t('essenceTap.gamble.jackpot', { defaultValue: 'Progressive Jackpot' })}
            </JackpotLabel>
            <JackpotAmount>
              {formatNumber(jackpotInfo?.currentJackpot || 1000000)}
            </JackpotAmount>
          </JackpotDisplay>

          {/* Current Essence */}
          <CurrentEssence>
            <EssenceLabel>{t('essenceTap.gamble.yourEssence', { defaultValue: 'Your Essence:' })}</EssenceLabel>
            <EssenceValue>{formatNumber(essence)}</EssenceValue>
          </CurrentEssence>

          {/* Warning */}
          <WarningText>
            <IconWarning size={16} />
            {t('essenceTap.gamble.warning', { defaultValue: 'Gambling can result in loss. Play responsibly!' })}
          </WarningText>

          {/* Last Result */}
          <AnimatePresence>
            {lastResult && (
              <ResultDisplay
                $won={lastResult.won}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <ResultText $won={lastResult.won}>
                  {lastResult.won
                    ? t('essenceTap.gamble.youWon', { defaultValue: 'You Won!' })
                    : t('essenceTap.gamble.youLost', { defaultValue: 'You Lost!' })}
                </ResultText>
                <ResultAmount>
                  {lastResult.won ? '+' : ''}{formatNumber(lastResult.amount)} essence
                </ResultAmount>
                {lastResult.jackpotWin && (
                  <ResultAmount style={{ color: '#FFD700', marginTop: 8 }}>
                    JACKPOT: +{formatNumber(lastResult.jackpotWin)}
                  </ResultAmount>
                )}
              </ResultDisplay>
            )}
          </AnimatePresence>

          {/* Cooldown */}
          {cooldown > 0 && (
            <CooldownDisplay>
              <CooldownText>{t('essenceTap.gamble.nextGambleIn', { defaultValue: 'Next gamble in: ' })}</CooldownText>
              <CooldownTime>{cooldown}s</CooldownTime>
            </CooldownDisplay>
          )}

          {/* Bet Amount */}
          <BetSection>
            <SectionTitle>{t('essenceTap.gamble.betAmount', { defaultValue: 'Bet Amount' })}</SectionTitle>
            <BetAmountInput>
              <BetInput
                type="text"
                value={betAmount}
                onChange={handleBetAmountChange}
                placeholder="Enter amount..."
                aria-label="Bet amount in essence"
              />
              <QuickBetButton onClick={() => handleQuickBet(0.1)} aria-label="Bet 10% of your essence">10%</QuickBetButton>
              <QuickBetButton onClick={() => handleQuickBet(0.25)} aria-label="Bet 25% of your essence">25%</QuickBetButton>
              <QuickBetButton onClick={() => handleQuickBet(0.5)} aria-label="Bet 50% of your essence">50%</QuickBetButton>
            </BetAmountInput>
            {betAmountNum >= 10000 && (
              <div style={{ fontSize: theme.fontSizes.xs, color: '#10B981', textAlign: 'center' }}>
                {t('essenceTap.gamble.qualifiesForJackpot', { defaultValue: 'Qualifies for jackpot!' })}
              </div>
            )}
          </BetSection>

          {/* Bet Types */}
          <SectionTitle>{t('essenceTap.gamble.selectBetType', { defaultValue: 'Select Bet Type' })}</SectionTitle>
          <BetTypeGrid role="radiogroup" aria-label="Bet type selection">
            {Object.entries(BET_TYPES).map(([key, config]) => (
              <BetTypeCard
                key={key}
                $selected={betType === key}
                $color={config.color}
                onClick={() => setBetType(key)}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                role="radio"
                aria-checked={betType === key}
                aria-label={`${config.name}: ${config.winChance}% win chance, ${config.multiplier}x multiplier`}
                tabIndex={betType === key ? 0 : -1}
              >
                <BetTypeName $color={config.color}>{config.name}</BetTypeName>
                <BetTypeChance>{config.winChance}% chance</BetTypeChance>
                <BetTypeMultiplier $color={config.color}>x{config.multiplier}</BetTypeMultiplier>
              </BetTypeCard>
            ))}
          </BetTypeGrid>

          {/* Potential Win */}
          {betAmountNum > 0 && (
            <div style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
              <span style={{ color: theme.colors.textSecondary }}>
                {t('essenceTap.gamble.potentialWin', { defaultValue: 'Potential Win: ' })}
              </span>
              <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: theme.fontSizes.lg }}>
                +{formatNumber(potentialWin)}
              </span>
            </div>
          )}

          {/* Session Stats */}
          <StatsGrid>
            <StatItem>
              <StatValue $color="#10B981">{gambleStats.wins}</StatValue>
              <StatLabel>{t('essenceTap.gamble.wins', { defaultValue: 'Wins' })}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue $color="#EF4444">{gambleStats.losses}</StatValue>
              <StatLabel>{t('essenceTap.gamble.losses', { defaultValue: 'Losses' })}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue $color={gambleStats.netGain >= 0 ? '#10B981' : '#EF4444'}>
                {gambleStats.netGain >= 0 ? '+' : ''}{formatNumber(gambleStats.netGain)}
              </StatValue>
              <StatLabel>{t('essenceTap.gamble.netGain', { defaultValue: 'Net Gain' })}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue $color="#A855F7">
                {gambleStats.wins + gambleStats.losses > 0
                  ? ((gambleStats.wins / (gambleStats.wins + gambleStats.losses)) * 100).toFixed(1)
                  : '0'}%
              </StatValue>
              <StatLabel>{t('essenceTap.gamble.winRate', { defaultValue: 'Win Rate' })}</StatLabel>
            </StatItem>
          </StatsGrid>
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
        <Button
          variant="primary"
          onClick={handleGamble}
          disabled={!canGamble}
          style={{
            background: canGamble
              ? `linear-gradient(135deg, ${BET_TYPES[betType].color}, ${BET_TYPES[betType].color}CC)`
              : undefined
          }}
        >
          {loading
            ? t('common.loading', { defaultValue: 'Loading...' })
            : cooldown > 0
              ? `${t('essenceTap.gamble.wait', { defaultValue: 'Wait' })} ${cooldown}s`
              : t('essenceTap.gamble.gamble', { defaultValue: 'Gamble!' })}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

GamblePanel.displayName = 'GamblePanel';

export default GamblePanel;
