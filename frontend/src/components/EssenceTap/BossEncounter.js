/**
 * BossEncounter - Premium Boss Fight Minigame
 *
 * A completely reworked boss battle experience with:
 * - Immersive arena with tier-specific visuals
 * - Pixi.js particle effects for impact and ambient
 * - Dramatic health bar with segmented chunks
 * - Circular timer aura with urgency states
 * - Screen shake and haptic feedback
 * - Boss recoil and damage state animations
 * - Epic victory celebration with confetti
 * - Mobile-first responsive design
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as PIXI from 'pixi.js';
import { theme, Button, Confetti, useConfetti } from '../../design-system';
import api from '../../utils/api';
import { formatNumber } from '../../hooks/useEssenceTap';
import { invalidateFor, CACHE_ACTIONS } from '../../cache/manager';
import {
  IconGem,
  IconStar,
  IconSparkles,
  IconSkull,
  IconFlame,
  IconLight,
  IconDark,
  IconTrophy,
  IconLightning
} from '../../constants/icons';
import { ELEMENT_ICONS, ELEMENT_COLORS } from './CharacterSelectorFilters';
import { glassmorphism } from './animations';

// =============================================================================
// ANIMATION TIMING CONSTANTS
// =============================================================================

/**
 * Animation timing constants for boss encounter effects.
 * Centralized here for easy adjustment and consistency.
 */
const ANIMATION_TIMING = {
  HURT_DURATION_MS: 400,           // Duration of boss hurt animation
  SCREEN_SHAKE_DURATION_MS: 300,   // Duration of screen shake effect
  DAMAGE_NUMBER_FADE_MS: 800,      // Duration before damage numbers fade out
  DEFEAT_ANIMATION_DELAY_MS: 800,  // Delay before showing victory screen
  TIMER_TICK_INTERVAL_MS: 100,     // Timer countdown update interval
  AMBIENT_PARTICLE_COUNT: 20,      // Number of ambient particles around boss
  IMPACT_PARTICLE_COUNT_NORMAL: 15,// Particles on normal hit
  IMPACT_PARTICLE_COUNT_CRIT: 25,  // Particles on critical hit
};

// =============================================================================
// ANIMATIONS
// =============================================================================

const bossGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 20px var(--boss-color));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 40px var(--boss-color));
    transform: scale(1.02);
  }
`;

const bossHurt = keyframes`
  0% { transform: translateX(0) scale(1); filter: brightness(1); }
  10% { transform: translateX(-8px) scale(0.98); filter: brightness(2); }
  20% { transform: translateX(8px) scale(0.98); filter: brightness(1.5); }
  30% { transform: translateX(-6px) scale(0.99); filter: brightness(1.2); }
  40% { transform: translateX(6px) scale(0.99); filter: brightness(1.1); }
  50% { transform: translateX(-4px) scale(1); filter: brightness(1); }
  60% { transform: translateX(4px) scale(1); }
  70% { transform: translateX(-2px) scale(1); }
  80% { transform: translateX(2px) scale(1); }
  90% { transform: translateX(-1px) scale(1); }
  100% { transform: translateX(0) scale(1); }
`;

const lowHealthShake = keyframes`
  0%, 100% { transform: translateX(0) rotate(0deg); }
  10% { transform: translateX(-2px) rotate(-0.5deg); }
  20% { transform: translateX(2px) rotate(0.5deg); }
  30% { transform: translateX(-2px) rotate(-0.5deg); }
  40% { transform: translateX(2px) rotate(0.5deg); }
  50% { transform: translateX(-1px) rotate(0deg); }
  60% { transform: translateX(1px) rotate(0deg); }
  70% { transform: translateX(-1px) rotate(0deg); }
  80% { transform: translateX(1px) rotate(0deg); }
  90% { transform: translateX(0) rotate(0deg); }
`;

const timerPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
`;

const screenShake = keyframes`
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, -3px); }
  20% { transform: translate(4px, 3px); }
  30% { transform: translate(-3px, 2px); }
  40% { transform: translate(3px, -2px); }
  50% { transform: translate(-2px, 3px); }
  60% { transform: translate(2px, -3px); }
  70% { transform: translate(-2px, 2px); }
  80% { transform: translate(2px, -2px); }
  90% { transform: translate(-1px, 1px); }
`;

const spawnReveal = keyframes`
  0% {
    transform: scale(0.5) translateY(50px);
    opacity: 0;
    filter: blur(20px);
  }
  50% {
    transform: scale(1.1) translateY(-10px);
    opacity: 1;
    filter: blur(0);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
    filter: blur(0);
  }
`;

const defeatExplosion = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
    filter: brightness(1);
  }
  30% {
    transform: scale(1.3);
    opacity: 1;
    filter: brightness(3);
  }
  100% {
    transform: scale(2);
    opacity: 0;
    filter: brightness(5) blur(10px);
  }
`;

// Note: healthChunkShatter and floatUp animations reserved for future enhancements

const rewardReveal = keyframes`
  0% {
    transform: scale(0) rotate(-10deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.1) rotate(2deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.85) 50%,
    rgba(0, 0, 0, 0.95) 100%
  );
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  overflow: hidden;

  ${props => props.$shake && css`
    animation: ${screenShake} 0.3s ease-out;
  `}
`;

const ArenaContainer = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  margin: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  @media (max-width: ${theme.breakpoints.sm}) {
    margin: ${theme.spacing.sm};
    padding-bottom: env(safe-area-inset-bottom, 20px);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
  color: ${theme.colors.text};
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const BossHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.lg};
  z-index: 2;
`;

const BossNameplate = styled(motion.div)`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  ${glassmorphism}
  border-radius: ${theme.radius.xl};
  border-color: ${props => props.$color || 'rgba(255, 255, 255, 0.2)'};
`;

const BossName = styled.h2`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#EF4444'};
  margin: 0;
  text-shadow: 0 0 20px ${props => props.$color || '#EF4444'}80;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xl};
  }
`;

const BossTierBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};

  span {
    color: ${props => props.$color || '#EF4444'};
    font-weight: ${theme.fontWeights.semibold};
  }
`;

const BossArena = styled.div`
  position: relative;
  width: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl} 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    min-height: 280px;
    padding: ${theme.spacing.lg} 0;
  }
`;

const TimerRing = styled.div`
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 240px;
    height: 240px;
  }

  ${props => props.$urgent && css`
    animation: ${timerPulse} 0.5s ease-in-out infinite;
  `}
`;

const TimerRingSvg = styled.svg`
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
`;

const TimerCircleBackground = styled.circle`
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 6;
`;

const TimerCircleProgress = styled.circle`
  fill: none;
  stroke: ${props => props.$urgent ? '#EF4444' : props.$warning ? '#F59E0B' : '#3B82F6'};
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: ${props => props.$circumference};
  stroke-dashoffset: ${props => props.$offset};
  transition: stroke-dashoffset 0.1s linear, stroke 0.3s ease;
  filter: drop-shadow(0 0 8px ${props => props.$urgent ? '#EF4444' : props.$warning ? '#F59E0B' : '#3B82F6'});
`;

const TimerText = styled.div`
  position: absolute;
  bottom: -10px;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$urgent ? '#EF4444' : props.$warning ? '#F59E0B' : theme.colors.text};
  background: rgba(0, 0, 0, 0.7);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  border: 1px solid ${props => props.$urgent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'};
`;

const BossContainer = styled(motion.div)`
  --boss-color: ${props => props.$color || '#EF4444'};
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    ${props => props.$color || '#EF4444'}40,
    ${props => props.$color || '#EF4444'}20,
    rgba(0, 0, 0, 0.3)
  );
  border: 4px solid ${props => props.$color || '#EF4444'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  position: relative;
  z-index: 2;
  box-shadow:
    0 0 40px ${props => props.$color || '#EF4444'}60,
    inset 0 0 60px ${props => props.$color || '#EF4444'}20;

  ${props => !props.$isHurt && !props.$isDefeating && css`
    animation: ${bossGlow} 2s ease-in-out infinite;
  `}

  ${props => props.$isHurt && css`
    animation: ${bossHurt} 0.4s ease-out;
  `}

  ${props => props.$isDefeating && css`
    animation: ${defeatExplosion} 0.8s ease-out forwards;
  `}

  ${props => props.$lowHealth && !props.$isHurt && !props.$isDefeating && css`
    animation: ${lowHealthShake} 0.5s ease-in-out infinite, ${bossGlow} 1s ease-in-out infinite;
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 180px;
    height: 180px;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const BossIcon = styled.div`
  font-size: 80px;
  color: ${props => props.$color || '#EF4444'};
  filter: drop-shadow(0 0 20px ${props => props.$color || '#EF4444'});
  transition: transform 0.1s ease;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 64px;
  }
`;

const ParticleCanvas = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  pointer-events: none;
  z-index: 3;
`;

const WeaknessDisplay = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.7);
  border-radius: ${theme.radius.full};
  border: 1px solid ${props => props.$color || 'rgba(255, 255, 255, 0.2)'};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  z-index: 2;
`;

const WeaknessIcon = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${props => props.$color || '#10B981'};
  font-weight: ${theme.fontWeights.semibold};
`;

const HealthSection = styled.div`
  width: 100%;
  max-width: 450px;
  padding: 0 ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  z-index: 2;
`;

const HealthLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
`;

const HealthText = styled.span`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const HealthValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$low ? '#EF4444' : theme.colors.textSecondary};
`;

const HealthBarContainer = styled.div`
  height: 28px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 14px;
  border: 2px solid rgba(239, 68, 68, 0.3);
  overflow: hidden;
  position: relative;
`;

const HealthBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #991B1B, #DC2626, #EF4444, #F87171);
  background-size: 200% 100%;
  border-radius: 12px;
  position: relative;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 2s linear infinite;
  }
`;

const HealthChunks = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
`;

const HealthChunk = styled.div`
  flex: 1;
  border-right: 2px solid rgba(0, 0, 0, 0.3);

  &:last-child {
    border-right: none;
  }
`;

const DamageNumber = styled(motion.div)`
  position: absolute;
  font-size: ${props => props.$isCrit ? '32px' : props.$isWeakness ? '28px' : '24px'};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isWeakness ? props.$weaknessColor : props.$isCrit ? '#FFD700' : '#FCD34D'};
  text-shadow:
    0 0 10px ${props => props.$isWeakness ? props.$weaknessColor : props.$isCrit ? '#FFD700' : '#FCD34D'}80,
    0 2px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
`;

const AttackHint = styled.div`
  margin-top: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-align: center;
  opacity: 0.7;
`;

// Victory Screen Components
const VictoryOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
  padding: ${theme.spacing.xl};
`;

const VictoryTitle = styled(motion.h2)`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  color: #10B981;
  text-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
  margin-bottom: ${theme.spacing.sm};
  text-align: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xxl};
  }
`;

const VictorySubtitle = styled(motion.div)`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xl};
`;

const RewardsContainer = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
  max-width: 400px;
`;

const RewardCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.lg};
  ${glassmorphism}
  border-radius: ${theme.radius.xl};
  min-width: 100px;
  border-color: ${props => props.$color || 'rgba(255, 255, 255, 0.2)'};

  animation: ${rewardReveal} 0.5s ease-out backwards;
  animation-delay: ${props => props.$delay || '0s'};
`;

const RewardIcon = styled.div`
  font-size: 32px;
  color: ${props => props.$color || '#A855F7'};
  margin-bottom: ${theme.spacing.sm};
`;

const RewardValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || '#A855F7'};
`;

const RewardLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Spawn/Cooldown Screen Components
const StateContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xxl};
  min-height: 400px;
`;

const StateTitle = styled.h2`
  font-size: ${theme.fontSizes.xxl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  text-shadow: ${props => props.$glow ? `0 0 20px ${props.$color}80` : 'none'};
`;

const StateSubtitle = styled.div`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xl};
`;

const SpawnBossPreview = styled(motion.div)`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    ${props => props.$color || '#EF4444'}30,
    ${props => props.$color || '#EF4444'}10,
    transparent
  );
  border: 3px solid ${props => props.$color || '#EF4444'}80;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
  animation: ${spawnReveal} 0.8s ease-out;
  box-shadow: 0 0 40px ${props => props.$color || '#EF4444'}40;
`;

const CooldownProgress = styled.div`
  width: 100%;
  max-width: 300px;
  margin-bottom: ${theme.spacing.xl};
`;

const CooldownBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

const CooldownFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #60A5FA);
  border-radius: 4px;
  width: ${props => props.$progress}%;
  transition: width 1s linear;
`;

const CooldownText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.sm};
  text-align: center;
`;

const ClicksProgress = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ClicksText = styled.div`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.text};

  span {
    color: #A855F7;
    font-weight: ${theme.fontWeights.bold};
  }
`;

// Loading/Error Components
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: ${theme.colors.textSecondary};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const ErrorText = styled.div`
  color: #EF4444;
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.base};
`;

// =============================================================================
// BOSS VISUAL CONFIGURATION
// =============================================================================

/**
 * Visual-only boss configuration for particle effects and UI styling.
 * Game balance values (health, rewards, etc.) come from the backend.
 * This is intentionally separate from shared/balanceConstants.js.
 */
const BOSS_VISUAL_CONFIG = {
  essence_drake: {
    color: '#EF4444',
    icon: IconFlame,
    particleColors: [0xEF4444, 0xF87171, 0xFCA5A5],
    ambientParticles: true
  },
  void_serpent: {
    color: '#8B5CF6',
    icon: IconDark,
    particleColors: [0x8B5CF6, 0xA78BFA, 0xC4B5FD],
    ambientParticles: true
  },
  arcane_titan: {
    color: '#3B82F6',
    icon: IconSparkles,
    particleColors: [0x3B82F6, 0x60A5FA, 0x93C5FD],
    ambientParticles: true
  },
  prismatic_dragon: {
    color: '#F59E0B',
    icon: IconLight,
    particleColors: [0xF59E0B, 0xFBBF24, 0xFCD34D, 0xEF4444, 0x8B5CF6, 0x10B981],
    ambientParticles: true
  }
};

// Default visual config for unknown bosses
const DEFAULT_BOSS_VISUAL = BOSS_VISUAL_CONFIG.essence_drake;

// =============================================================================
// PARTICLE SYSTEM
// =============================================================================

class ImpactParticle {
  constructor(x, y, color, isCrit = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isCrit = isCrit;

    const angle = Math.random() * Math.PI * 2;
    const speed = (isCrit ? 8 : 5) + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2;

    this.gravity = 0.15;
    this.friction = 0.98;
    this.alpha = 1;
    this.alphaDecay = isCrit ? 0.015 : 0.02;
    this.scale = (isCrit ? 1.2 : 0.8) + Math.random() * 0.4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.alive = true;
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.alphaDecay;
    this.rotation += this.rotationSpeed;
    this.scale *= 0.99;

    if (this.alpha <= 0) {
      this.alive = false;
    }
  }
}

class AmbientParticle {
  constructor(centerX, centerY, radius, color) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * 0.5 + Math.random() * radius * 0.5;
    this.x = centerX + Math.cos(angle) * dist;
    this.y = centerY + Math.sin(angle) * dist;
    this.color = color;

    this.angle = angle;
    this.orbitSpeed = (Math.random() - 0.5) * 0.01;
    this.orbitRadius = dist;
    this.centerX = centerX;
    this.centerY = centerY;

    this.alpha = 0.3 + Math.random() * 0.4;
    this.scale = 0.3 + Math.random() * 0.3;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(time) {
    this.angle += this.orbitSpeed;
    this.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
    this.y = this.centerY + Math.sin(this.angle) * this.orbitRadius;
    this.alpha = 0.3 + Math.sin(time * 0.002 + this.pulsePhase) * 0.2;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const BossEncounter = memo(({ isOpen, onClose, clickPower = 1, totalClicks = 0, onBossDefeat, onBossSpawn }) => {
  const { t } = useTranslation();
  const [bossInfo, setBossInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [victory, setVictory] = useState(null);
  const [isHurt, setIsHurt] = useState(false);
  const [isDefeating, setIsDefeating] = useState(false);
  const [screenShaking, setScreenShaking] = useState(false);

  const nextDamageId = useRef(0);
  const attackingRef = useRef(false);
  const clicksAtFetchRef = useRef(0);
  const totalClicksRef = useRef(totalClicks);
  totalClicksRef.current = totalClicks;

  // Abort controller for API calls to prevent memory leaks and stale responses
  const abortControllerRef = useRef(null);

  // Particle system refs
  const canvasRef = useRef(null);
  const pixiAppRef = useRef(null);
  const impactParticlesRef = useRef([]);
  const ambientParticlesRef = useRef([]);
  const graphicsRef = useRef(null);

  // Confetti for victory
  const { fire: fireConfetti, isActive: confettiActive } = useConfetti();

  // Fetch boss info with abort controller support
  const fetchBossInfo = useCallback(async () => {
    // Cancel any pending fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_BOSS_OPEN);
      const response = await api.get('/essence-tap/boss', {
        signal: abortControllerRef.current.signal
      });
      setBossInfo(response.data);
      clicksAtFetchRef.current = totalClicksRef.current;
      setVictory(null);
      setIsDefeating(false);
    } catch (err) {
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Failed to fetch boss info:', err);
      setError(t('essenceTap.boss.fetchError', { defaultValue: 'Failed to load boss data. Please try again.' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Handle modal open/close and cleanup
  useEffect(() => {
    if (isOpen) {
      fetchBossInfo();
    } else {
      // Clear error state when modal closes to prevent stale errors on reopen
      setError(null);
    }

    // Cleanup: abort pending requests when modal closes or unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, fetchBossInfo]);

  // Live clicks until spawn calculation
  const liveClicksUntilSpawn = bossInfo?.clicksUntilSpawn != null
    ? Math.max(0, bossInfo.clicksUntilSpawn - (totalClicks - clicksAtFetchRef.current))
    : null;

  // Initialize Pixi.js for particles
  useEffect(() => {
    if (!canvasRef.current || pixiAppRef.current) return;

    const app = new PIXI.Application();

    app.init({
      width: 400,
      height: 400,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    }).then(() => {
      if (canvasRef.current && app.canvas) {
        canvasRef.current.appendChild(app.canvas);
        pixiAppRef.current = app;

        const graphics = new PIXI.Graphics();
        app.stage.addChild(graphics);
        graphicsRef.current = graphics;

        // Initialize ambient particles if boss is active
        if (bossInfo?.active && bossInfo?.boss) {
          const config = BOSS_VISUAL_CONFIG[bossInfo.boss.id] || DEFAULT_BOSS_VISUAL;
          if (config.ambientParticles) {
            for (let i = 0; i < ANIMATION_TIMING.AMBIENT_PARTICLE_COUNT; i++) {
              const color = config.particleColors[Math.floor(Math.random() * config.particleColors.length)];
              ambientParticlesRef.current.push(new AmbientParticle(200, 200, 120, color));
            }
          }
        }

        let startTime = Date.now();
        app.ticker.add(() => {
          if (!graphicsRef.current) return;
          const time = Date.now() - startTime;

          graphicsRef.current.clear();

          // Update and draw ambient particles
          ambientParticlesRef.current.forEach(p => {
            p.update(time);
            graphicsRef.current.circle(p.x, p.y, 3 * p.scale);
            graphicsRef.current.fill({ color: p.color, alpha: p.alpha });
          });

          // Update and draw impact particles
          impactParticlesRef.current = impactParticlesRef.current.filter(p => {
            p.update();
            if (!p.alive) return false;

            const g = graphicsRef.current;
            g.circle(p.x, p.y, 5 * p.scale);
            g.fill({ color: p.color, alpha: p.alpha });

            if (p.isCrit) {
              g.circle(p.x, p.y, 3 * p.scale);
              g.fill({ color: 0xFFFFFF, alpha: p.alpha * 0.5 });
            }

            return true;
          });
        });
      }
    });

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true });
        pixiAppRef.current = null;
        graphicsRef.current = null;
      }
    };
  }, [bossInfo?.active, bossInfo?.boss]);

  // Timer countdown
  useEffect(() => {
    if (!bossInfo?.active) return;

    const interval = setInterval(() => {
      setBossInfo(prev => {
        if (!prev?.active) return prev;
        const newTime = Math.max(0, prev.timeRemaining - ANIMATION_TIMING.TIMER_TICK_INTERVAL_MS);
        if (newTime <= 0) {
          fetchBossInfo();
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, ANIMATION_TIMING.TIMER_TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [bossInfo?.active, fetchBossInfo]);

  // Spawn impact particles
  const spawnImpactParticles = useCallback((x, y, colors, count, isCrit) => {
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      impactParticlesRef.current.push(new ImpactParticle(x, y, color, isCrit));
    }
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback((type = 'light') => {
    if (window.navigator && window.navigator.vibrate) {
      switch (type) {
        case 'heavy':
          window.navigator.vibrate([30, 10, 30]);
          break;
        case 'medium':
          window.navigator.vibrate(20);
          break;
        default:
          window.navigator.vibrate(10);
          break;
      }
    }
  }, []);

  /**
   * Handle attack on the boss.
   * Race condition mitigation:
   * - attackingRef prevents concurrent attacks from rapid clicks
   * - Server is the source of truth for boss health (response.data.bossHealth)
   * - Functional state updates (prev => ...) ensure fresh state during async operations
   * - Server validates attack eligibility and returns authoritative state
   */
  const handleAttack = useCallback(async () => {
    // Prevent concurrent attacks - this is the primary race condition guard
    if (attackingRef.current) return;

    // Early validation - use current ref values since bossInfo may be stale
    if (!bossInfo?.active && !bossInfo?.canSpawn) return;

    attackingRef.current = true;

    try {
      const response = await api.post('/essence-tap/boss/attack', { damage: clickPower });

      if (response.data.success) {
        invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_BOSS_ATTACK);

        // Handle boss spawn (when clicking "Start Fight")
        if (response.data.bossSpawned) {
          const newBossData = {
            active: true,
            boss: response.data.boss,
            currentHealth: response.data.bossHealth,
            maxHealth: response.data.bossHealth,
            timeRemaining: response.data.boss?.timeLimit || 30000
          };
          setBossInfo(newBossData);
          onBossSpawn?.();

          // Initialize ambient particles for new boss
          ambientParticlesRef.current = [];
          const newConfig = BOSS_VISUAL_CONFIG[response.data.boss?.id] || DEFAULT_BOSS_VISUAL;
          if (newConfig.ambientParticles) {
            for (let i = 0; i < ANIMATION_TIMING.AMBIENT_PARTICLE_COUNT; i++) {
              const color = newConfig.particleColors[Math.floor(Math.random() * newConfig.particleColors.length)];
              ambientParticlesRef.current.push(new AmbientParticle(200, 200, 120, color));
            }
          }
          // Don't show damage effects for spawn, just return
          attackingRef.current = false;
          return;
        }

        // Visual feedback for actual attacks
        setIsHurt(true);
        setScreenShaking(true);
        triggerHaptic('medium');

        setTimeout(() => setIsHurt(false), ANIMATION_TIMING.HURT_DURATION_MS);
        setTimeout(() => setScreenShaking(false), ANIMATION_TIMING.SCREEN_SHAKE_DURATION_MS);

        // Spawn particles
        const config = bossInfo?.boss?.id ? BOSS_VISUAL_CONFIG[bossInfo.boss.id] || DEFAULT_BOSS_VISUAL : DEFAULT_BOSS_VISUAL;
        const isCrit = response.data.damageDealt > clickPower * 1.5;
        const particleCount = isCrit ? ANIMATION_TIMING.IMPACT_PARTICLE_COUNT_CRIT : ANIMATION_TIMING.IMPACT_PARTICLE_COUNT_NORMAL;
        spawnImpactParticles(200, 200, config.particleColors, particleCount, isCrit);

        // Show damage number
        const id = nextDamageId.current++;
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 60 - 30;

        setDamageNumbers(prev => [...prev, {
          id,
          x: 200 + offsetX,
          y: 150 + offsetY,
          value: response.data.damageDealt,
          isCrit,
          isWeakness: response.data.weaknessBonus
        }]);

        setTimeout(() => {
          setDamageNumbers(prev => prev.filter(d => d.id !== id));
        }, ANIMATION_TIMING.DAMAGE_NUMBER_FADE_MS);

        // Handle boss defeat
        if (response.data.defeated) {
          setIsDefeating(true);
          triggerHaptic('heavy');

          invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_BOSS_DEFEAT);

          // Delay victory screen for death animation
          setTimeout(() => {
            setVictory(response.data.rewards);
            fireConfetti();
            onBossDefeat?.(response.data.rewards);
          }, ANIMATION_TIMING.DEFEAT_ANIMATION_DELAY_MS);
        } else {
          // Regular damage update
          setBossInfo(prev => ({
            ...prev,
            currentHealth: response.data.bossHealth
          }));
        }
      }
    } catch (err) {
      console.error('Failed to attack boss:', err);
      setError(t('essenceTap.boss.attackError', { defaultValue: 'Attack failed. Please try again.' }));
    } finally {
      attackingRef.current = false;
    }
  }, [bossInfo, clickPower, t, triggerHaptic, spawnImpactParticles, fireConfetti, onBossDefeat, onBossSpawn]);

  // Format time display
  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const formatCooldown = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get boss visual config
  const getBossConfig = (bossId) => {
    return BOSS_VISUAL_CONFIG[bossId] || DEFAULT_BOSS_VISUAL;
  };

  if (!isOpen) return null;

  // Loading state
  if (loading) {
    return (
      <AnimatePresence>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>
          <LoadingContainer>
            <IconSkull size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            {t('common.loading', { defaultValue: 'Loading...' })}
          </LoadingContainer>
        </Overlay>
      </AnimatePresence>
    );
  }

  // Error state
  if (error) {
    return (
      <AnimatePresence>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>
          <ErrorContainer>
            <ErrorText>{error}</ErrorText>
            <Button variant="primary" onClick={fetchBossInfo}>
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </ErrorContainer>
        </Overlay>
      </AnimatePresence>
    );
  }

  // Victory screen
  if (victory) {
    return (
      <AnimatePresence>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Confetti active={confettiActive} />
          <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>
          <ArenaContainer>
            <VictoryOverlay
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <VictoryTitle
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <IconTrophy size={40} style={{ marginRight: 12, verticalAlign: 'middle' }} />
                {t('essenceTap.bossDefeated', { defaultValue: 'Victory!' })}
              </VictoryTitle>

              <VictorySubtitle
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {t('essenceTap.boss.bossSlain', { defaultValue: 'Boss Slain!' })}
              </VictorySubtitle>

              <RewardsContainer>
                {victory.essence > 0 && (
                  <RewardCard $color="rgba(168, 85, 247, 0.3)" $delay="0.4s">
                    <RewardIcon $color="#A855F7">
                      <IconGem size={32} />
                    </RewardIcon>
                    <RewardValue $color="#A855F7">+{formatNumber(victory.essence)}</RewardValue>
                    <RewardLabel>Essence</RewardLabel>
                  </RewardCard>
                )}

                {victory.fatePoints > 0 && (
                  <RewardCard $color="rgba(252, 211, 77, 0.3)" $delay="0.5s">
                    <RewardIcon $color="#FCD34D">
                      <IconStar size={32} />
                    </RewardIcon>
                    <RewardValue $color="#FCD34D">+{victory.fatePoints}</RewardValue>
                    <RewardLabel>Fate Points</RewardLabel>
                  </RewardCard>
                )}

                {victory.rollTickets > 0 && (
                  <RewardCard $color="rgba(16, 185, 129, 0.3)" $delay="0.6s">
                    <RewardIcon $color="#10B981">
                      <IconSparkles size={32} />
                    </RewardIcon>
                    <RewardValue $color="#10B981">+{victory.rollTickets}</RewardValue>
                    <RewardLabel>Roll Tickets</RewardLabel>
                  </RewardCard>
                )}

                {victory.xp > 0 && (
                  <RewardCard $color="rgba(59, 130, 246, 0.3)" $delay="0.7s">
                    <RewardIcon $color="#3B82F6">
                      <IconStar size={32} />
                    </RewardIcon>
                    <RewardValue $color="#3B82F6">+{victory.xp}</RewardValue>
                    <RewardLabel>XP</RewardLabel>
                  </RewardCard>
                )}
              </RewardsContainer>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    setVictory(null);
                    fetchBossInfo();
                  }}
                >
                  {t('common.continue', { defaultValue: 'Continue' })}
                </Button>
              </motion.div>
            </VictoryOverlay>
          </ArenaContainer>
        </Overlay>
      </AnimatePresence>
    );
  }

  // Cooldown state
  if (!bossInfo?.active && !bossInfo?.canSpawn) {
    const cooldownProgress = bossInfo?.cooldownRemaining
      ? Math.max(0, 100 - (bossInfo.cooldownRemaining / 3600000) * 100)
      : 0;

    return (
      <AnimatePresence>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>
          <ArenaContainer>
            <StateContainer
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SpawnBossPreview $color="rgba(255, 255, 255, 0.3)">
                <IconSkull size={64} style={{ opacity: 0.3 }} />
              </SpawnBossPreview>

              <StateTitle>
                {t('essenceTap.bossOnCooldown', { defaultValue: 'Boss on Cooldown' })}
              </StateTitle>

              {bossInfo?.cooldownRemaining > 0 ? (
                <CooldownProgress>
                  <CooldownBar>
                    <CooldownFill $progress={cooldownProgress} />
                  </CooldownBar>
                  <CooldownText>
                    {t('essenceTap.boss.nextBossIn', { defaultValue: 'Next boss in:' })}{' '}
                    <strong>{formatCooldown(bossInfo.cooldownRemaining)}</strong>
                  </CooldownText>
                </CooldownProgress>
              ) : (
                <ClicksProgress>
                  <ClicksText>
                    {t('essenceTap.boss.clicksUntilSpawn', { defaultValue: 'Clicks until spawn:' })}{' '}
                    <span>{liveClicksUntilSpawn ?? '...'}</span>
                  </ClicksText>
                  <StateSubtitle>
                    {t('essenceTap.boss.keepTapping', { defaultValue: 'Keep tapping to summon the boss!' })}
                  </StateSubtitle>
                </ClicksProgress>
              )}

              <Button variant="secondary" onClick={onClose}>
                {t('common.close', { defaultValue: 'Close' })}
              </Button>
            </StateContainer>
          </ArenaContainer>
        </Overlay>
      </AnimatePresence>
    );
  }

  // Spawn ready state
  if (bossInfo?.canSpawn && !bossInfo?.active) {
    const nextBossConfig = getBossConfig(bossInfo.nextBossTier?.id);
    const BossIconComponent = nextBossConfig.icon;

    return (
      <AnimatePresence>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>
          <ArenaContainer>
            <StateContainer
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <SpawnBossPreview
                $color={nextBossConfig.color}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <BossIconComponent size={72} style={{ color: nextBossConfig.color }} />
              </SpawnBossPreview>

              <StateTitle $color={nextBossConfig.color} $glow>
                {t('essenceTap.boss.bossReady', { defaultValue: 'Boss Ready!' })}
              </StateTitle>

              <StateSubtitle>
                {bossInfo.nextBossTier?.name || 'Unknown Boss'} - Tier {bossInfo.nextBossTier?.tier || 1}
              </StateSubtitle>

              <Button
                variant="primary"
                onClick={handleAttack}
                style={{
                  background: `linear-gradient(135deg, ${nextBossConfig.color}, ${nextBossConfig.color}CC)`,
                  boxShadow: `0 0 20px ${nextBossConfig.color}60`
                }}
              >
                {t('essenceTap.startBoss', { defaultValue: 'Start Fight!' })}
              </Button>
            </StateContainer>
          </ArenaContainer>
        </Overlay>
      </AnimatePresence>
    );
  }

  // Active boss fight
  const boss = bossInfo?.boss;
  const bossConfig = getBossConfig(boss?.id);
  const BossIconComponent = bossConfig.icon;
  const healthPercent = (bossInfo.currentHealth / bossInfo.maxHealth) * 100;
  const timePercent = (bossInfo.timeRemaining / (boss?.timeLimit || 30000)) * 100;
  const isUrgent = timePercent < 20;
  const isWarning = timePercent < 40 && !isUrgent;
  const isLowHealth = healthPercent < 30;

  // Timer ring calculations
  const timerRadius = 130;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference * (1 - timePercent / 100);

  const WeaknessIconComponent = boss?.elementWeakness ? ELEMENT_ICONS[boss.elementWeakness] : null;
  const weaknessColor = boss?.elementWeakness ? ELEMENT_COLORS[boss.elementWeakness] : null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        $shake={screenShaking}
      >
        <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>

        <ArenaContainer
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {/* Boss Header */}
          <BossHeader>
            <BossNameplate
              $color={`${bossConfig.color}40`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <BossName $color={bossConfig.color}>
                {boss?.name || 'Unknown Boss'}
              </BossName>
              <BossTierBadge $color={bossConfig.color}>
                <IconSkull size={14} />
                Tier <span>{boss?.tier || 1}</span>
              </BossTierBadge>
            </BossNameplate>
          </BossHeader>

          {/* Boss Arena */}
          <BossArena>
            {/* Timer Ring */}
            <TimerRing $urgent={isUrgent}>
              <TimerRingSvg viewBox="0 0 280 280">
                <TimerCircleBackground
                  cx="140"
                  cy="140"
                  r={timerRadius}
                />
                <TimerCircleProgress
                  cx="140"
                  cy="140"
                  r={timerRadius}
                  $circumference={timerCircumference}
                  $offset={timerOffset}
                  $urgent={isUrgent}
                  $warning={isWarning}
                />
              </TimerRingSvg>

              {/* Particle Canvas */}
              <ParticleCanvas ref={canvasRef} />

              {/* Boss Container */}
              <BossContainer
                $color={bossConfig.color}
                $isHurt={isHurt}
                $isDefeating={isDefeating}
                $lowHealth={isLowHealth}
                onClick={handleAttack}
                whileTap={{ scale: 0.95 }}
              >
                <BossIcon $color={bossConfig.color}>
                  <BossIconComponent size={80} />
                </BossIcon>
              </BossContainer>

              {/* Timer Text */}
              <TimerText $urgent={isUrgent} $warning={isWarning}>
                {formatTime(bossInfo.timeRemaining)}
              </TimerText>
            </TimerRing>

            {/* Damage Numbers */}
            <AnimatePresence>
              {damageNumbers.map(dmg => (
                <DamageNumber
                  key={dmg.id}
                  $isCrit={dmg.isCrit}
                  $isWeakness={dmg.isWeakness}
                  $weaknessColor={weaknessColor}
                  initial={{ x: dmg.x, y: dmg.y, opacity: 1, scale: 1 }}
                  animate={{ y: dmg.y - 80, opacity: 0, scale: dmg.isCrit ? 1.5 : 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ left: 0, top: 0 }}
                >
                  -{formatNumber(dmg.value)}
                  {dmg.isCrit && ' CRIT!'}
                  {dmg.isWeakness && <IconLightning size={16} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                </DamageNumber>
              ))}
            </AnimatePresence>
          </BossArena>

          {/* Element Weakness */}
          {boss?.elementWeakness && WeaknessIconComponent && (
            <WeaknessDisplay
              $color={`${weaknessColor}40`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {t('essenceTap.boss.weakTo', { defaultValue: 'Weak to:' })}
              <WeaknessIcon $color={weaknessColor}>
                <WeaknessIconComponent size={18} />
                {boss.elementWeakness.charAt(0).toUpperCase() + boss.elementWeakness.slice(1)}
              </WeaknessIcon>
            </WeaknessDisplay>
          )}

          {/* Health Bar */}
          <HealthSection>
            <HealthLabel>
              <HealthText>HP</HealthText>
              <HealthValue $low={isLowHealth}>
                {formatNumber(bossInfo.currentHealth)} / {formatNumber(bossInfo.maxHealth)}
              </HealthValue>
            </HealthLabel>
            <HealthBarContainer>
              <HealthBarFill
                initial={{ width: '100%' }}
                animate={{ width: `${healthPercent}%` }}
                transition={{ duration: 0.2 }}
              />
              <HealthChunks>
                {[...Array(10)].map((_, i) => (
                  <HealthChunk key={i} />
                ))}
              </HealthChunks>
            </HealthBarContainer>
          </HealthSection>

          {/* Attack Hint */}
          <AttackHint>
            {t('essenceTap.boss.tapToAttack', { defaultValue: 'Tap the boss to attack!' })}
          </AttackHint>
        </ArenaContainer>
      </Overlay>
    </AnimatePresence>
  );
});

BossEncounter.displayName = 'BossEncounter';

export default BossEncounter;
