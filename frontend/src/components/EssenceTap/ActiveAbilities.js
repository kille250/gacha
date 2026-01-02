/**
 * ActiveAbilities - Player-activated special abilities for Essence Tap
 *
 * Features:
 * - Essence Storm: 10x production for 5 seconds
 * - Critical Focus: Guaranteed crits for 3 seconds
 * - Golden Rush: Increased golden essence chance
 * - Time Warp: Instant offline progress collection
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import {
  IconStorm,
  IconLightning,
  IconSparkles,
  IconClock,
  IconLocked
} from '../../constants/icons';

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px currentColor; }
  50% { box-shadow: 0 0 25px currentColor; }
`;

// cooldownSweep animation removed - using CSS conic-gradient instead

const Container = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
`;

const AbilityButton = styled(motion.button)`
  width: 70px;
  height: 70px;
  border-radius: ${theme.radius.lg};
  border: 2px solid ${props => props.$ready ? props.$color : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$active
    ? `linear-gradient(135deg, ${props.$color}40, ${props.$color}20)`
    : props.$ready
      ? `linear-gradient(135deg, ${props.$color}20, transparent)`
      : 'rgba(255, 255, 255, 0.03)'};
  cursor: ${props => props.$ready ? 'pointer' : 'not-allowed'};
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  ${props => props.$ready && !props.$active && css`
    &:hover {
      transform: scale(1.1);
      border-color: ${props.$color};
      animation: ${pulseGlow} 1.5s ease-in-out infinite;
      color: ${props.$color};
    }
  `}

  ${props => props.$active && css`
    animation: ${pulseGlow} 0.5s ease-in-out infinite;
    color: ${props.$color};
  `}
`;

const AbilityIcon = styled.div`
  font-size: 28px;
  color: ${props => props.$color || 'rgba(255, 255, 255, 0.7)'};
  opacity: ${props => props.$ready ? 1 : 0.4};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CooldownOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CooldownText = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: white;
`;

const CooldownRing = styled.div`
  position: absolute;
  inset: 2px;
  border-radius: ${theme.radius.lg};
  background: conic-gradient(
    transparent ${props => props.$progress * 100}%,
    rgba(0, 0, 0, 0.5) ${props => props.$progress * 100}%
  );
  pointer-events: none;
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 4px;
  background: ${props => props.$color};
  border-radius: 2px;
`;

const ActiveTimer = styled.div`
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
  white-space: nowrap;
`;

const AbilityTooltip = styled(motion.div)`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-width: 150px;
  z-index: 10;
  pointer-events: none;
`;

const TooltipTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
  margin-bottom: ${theme.spacing.xs};
`;

const TooltipDesc = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const TooltipCooldown = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  margin-top: ${theme.spacing.xs};
`;

// Ability definitions with React Icons
const ABILITIES = {
  essenceStorm: {
    id: 'essenceStorm',
    name: 'Essence Storm',
    description: '10x production for 5 seconds',
    IconComponent: IconStorm,
    color: '#8B5CF6',
    duration: 5000, // 5 seconds
    cooldown: 60000, // 60 seconds
    effects: { productionMultiplier: 10 }
  },
  criticalFocus: {
    id: 'criticalFocus',
    name: 'Critical Focus',
    description: 'Guaranteed crits for 3 seconds',
    IconComponent: IconLightning,
    color: '#F59E0B',
    duration: 3000, // 3 seconds
    cooldown: 45000, // 45 seconds
    effects: { guaranteedCrits: true }
  },
  goldenRush: {
    id: 'goldenRush',
    name: 'Golden Rush',
    description: '50x golden chance for 10 seconds',
    IconComponent: IconSparkles,
    color: '#FCD34D',
    duration: 10000, // 10 seconds
    cooldown: 120000, // 2 minutes
    effects: { goldenChanceMultiplier: 50 }
  },
  timeWarp: {
    id: 'timeWarp',
    name: 'Time Warp',
    description: 'Collect 30 minutes of offline progress',
    IconComponent: IconClock,
    color: '#06B6D4',
    duration: 0, // Instant
    cooldown: 300000, // 5 minutes
    effects: { instantOfflineMinutes: 30 }
  }
};

const ActiveAbilities = memo(({ onActivate, _activeEffects = {}, prestigeLevel = 0 }) => {
  const { t } = useTranslation();
  const [cooldowns, setCooldowns] = useState({});
  const [activeAbilities, setActiveAbilities] = useState({});
  const [hoveredAbility, setHoveredAbility] = useState(null);
  const [touchedAbility, setTouchedAbility] = useState(null);
  const touchTimeoutRef = React.useRef(null);

  // Load cooldowns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('essenceTap_abilityCooldowns');
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
        // Invalid data, ignore
      }
    }
  }, []);

  // Save cooldowns to localStorage
  useEffect(() => {
    localStorage.setItem('essenceTap_abilityCooldowns', JSON.stringify(cooldowns));
  }, [cooldowns]);

  // Update cooldowns and active abilities every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // Update cooldowns
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

      // Update active abilities
      setActiveAbilities(prev => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach(id => {
          if (updated[id] <= now) {
            delete updated[id];
            changed = true;
            // Notify parent that ability ended
            onActivate?.(id, null);
          }
        });
        return changed ? updated : prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onActivate]);

  const handleActivate = useCallback((abilityId) => {
    const ability = ABILITIES[abilityId];
    if (!ability) return;

    const now = Date.now();

    // Check if on cooldown
    if (cooldowns[abilityId] && cooldowns[abilityId] > now) return;

    // Activate ability
    if (ability.duration > 0) {
      setActiveAbilities(prev => ({
        ...prev,
        [abilityId]: now + ability.duration
      }));
    }

    // Set cooldown
    setCooldowns(prev => ({
      ...prev,
      [abilityId]: now + ability.cooldown
    }));

    // Notify parent
    onActivate?.(abilityId, ability.effects);
  }, [cooldowns, onActivate]);

  const getCooldownRemaining = useCallback((abilityId) => {
    const endTime = cooldowns[abilityId];
    if (!endTime) return 0;
    return Math.max(0, endTime - Date.now());
  }, [cooldowns]);

  const getActiveRemaining = useCallback((abilityId) => {
    const endTime = activeAbilities[abilityId];
    if (!endTime) return 0;
    return Math.max(0, endTime - Date.now());
  }, [activeAbilities]);

  const formatTime = useCallback((ms) => {
    if (ms <= 0) return '';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Determine which abilities are unlocked based on prestige level
  const getUnlockedAbilities = useCallback(() => {
    const unlocked = ['essenceStorm']; // Always available
    if (prestigeLevel >= 1) unlocked.push('criticalFocus');
    if (prestigeLevel >= 3) unlocked.push('goldenRush');
    if (prestigeLevel >= 5) unlocked.push('timeWarp');
    return unlocked;
  }, [prestigeLevel]);

  const unlockedAbilities = getUnlockedAbilities();

  // Handle touch start for long-press tooltip on mobile
  const handleTouchStart = useCallback((abilityId) => {
    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    // Show tooltip after 300ms hold
    touchTimeoutRef.current = setTimeout(() => {
      setTouchedAbility(abilityId);
    }, 300);
  }, []);

  // Handle touch end
  const handleTouchEnd = useCallback((abilityId, isReady) => {
    // If tooltip is showing, just hide it
    if (touchedAbility === abilityId) {
      setTouchedAbility(null);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      return;
    }
    // If no tooltip was showing (quick tap), activate the ability
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    if (isReady) {
      handleActivate(abilityId);
    }
  }, [touchedAbility, handleActivate]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  // Determine if tooltip should show (hover or touch)
  const shouldShowTooltip = useCallback((abilityId) => {
    return hoveredAbility === abilityId || touchedAbility === abilityId;
  }, [hoveredAbility, touchedAbility]);

  return (
    <Container>
      {Object.values(ABILITIES).map(ability => {
        const isUnlocked = unlockedAbilities.includes(ability.id);
        const cooldownRemaining = getCooldownRemaining(ability.id);
        const activeRemaining = getActiveRemaining(ability.id);
        const isReady = isUnlocked && cooldownRemaining === 0 && activeRemaining === 0;
        const isActive = activeRemaining > 0;
        const cooldownProgress = cooldownRemaining > 0
          ? 1 - (cooldownRemaining / ability.cooldown)
          : 1;

        return (
          <AbilityButton
            key={ability.id}
            $color={ability.color}
            $ready={isReady}
            $active={isActive}
            onClick={() => isReady && handleActivate(ability.id)}
            onMouseEnter={() => setHoveredAbility(ability.id)}
            onMouseLeave={() => setHoveredAbility(null)}
            onTouchStart={() => handleTouchStart(ability.id)}
            onTouchEnd={() => handleTouchEnd(ability.id, isReady)}
            onTouchCancel={() => {
              setTouchedAbility(null);
              if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
            }}
            whileHover={isReady ? { scale: 1.1 } : {}}
            whileTap={isReady ? { scale: 0.95 } : {}}
          >
            <AbilityIcon $ready={isUnlocked} $color={isUnlocked ? ability.color : undefined}>
              {isUnlocked ? <ability.IconComponent size={28} /> : <IconLocked size={28} />}
            </AbilityIcon>

            {cooldownRemaining > 0 && (
              <>
                <CooldownRing $progress={cooldownProgress} />
                <CooldownOverlay>
                  <CooldownText>{formatTime(cooldownRemaining)}</CooldownText>
                </CooldownOverlay>
              </>
            )}

            {isActive && (
              <>
                <ActiveTimer $color={ability.color}>
                  {formatTime(activeRemaining)}
                </ActiveTimer>
                <ActiveIndicator
                  $color={ability.color}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: activeRemaining / ability.duration }}
                  transition={{ duration: 0.1 }}
                />
              </>
            )}

            <AnimatePresence>
              {shouldShowTooltip(ability.id) && (
                <AbilityTooltip
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <TooltipTitle $color={ability.color}>
                    {t(`essenceTap.abilities.${ability.id}.name`, { defaultValue: ability.name })}
                  </TooltipTitle>
                  <TooltipDesc>
                    {isUnlocked
                      ? t(`essenceTap.abilities.${ability.id}.description`, { defaultValue: ability.description })
                      : t('essenceTap.abilityLocked', {
                          level: ability.id === 'criticalFocus' ? 1 : ability.id === 'goldenRush' ? 3 : 5,
                          defaultValue: `Unlocks at Prestige ${ability.id === 'criticalFocus' ? 1 : ability.id === 'goldenRush' ? 3 : 5}`
                        })}
                  </TooltipDesc>
                  {isUnlocked && (
                    <TooltipCooldown>
                      {t('essenceTap.cooldown', {
                        time: formatTime(ability.cooldown),
                        defaultValue: `Cooldown: ${formatTime(ability.cooldown)}`
                      })}
                    </TooltipCooldown>
                  )}
                </AbilityTooltip>
              )}
            </AnimatePresence>
          </AbilityButton>
        );
      })}
    </Container>
  );
});

ActiveAbilities.displayName = 'ActiveAbilities';

// Export abilities for use in calculations
export { ABILITIES };
export default ActiveAbilities;
