/**
 * AmbientParticles - Floating ambient particle background
 *
 * Creates a premium, subtle floating particle effect for backgrounds.
 * Uses CSS animations for performance and reduced motion support.
 *
 * Features:
 * - Multiple particle layers with different speeds
 * - Configurable colors and density
 * - GPU-accelerated animations
 * - Reduced motion support
 * - Memory efficient (CSS-only, no JS animation loop)
 *
 * @example
 * <AmbientParticles />
 * <AmbientParticles color="purple" density="high" />
 */

import React, { memo, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

// ==================== ANIMATIONS ====================

const float1 = keyframes`
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  25% {
    transform: translate(10px, -20px) scale(1.1);
    opacity: 0.5;
  }
  50% {
    transform: translate(-5px, -35px) scale(0.9);
    opacity: 0.4;
  }
  75% {
    transform: translate(15px, -15px) scale(1.05);
    opacity: 0.35;
  }
`;

const float2 = keyframes`
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 0.2;
  }
  33% {
    transform: translate(-20px, -25px) rotate(120deg);
    opacity: 0.4;
  }
  66% {
    transform: translate(10px, -40px) rotate(240deg);
    opacity: 0.3;
  }
`;

const float3 = keyframes`
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.25;
  }
  50% {
    transform: translate(25px, -30px) scale(1.2);
    opacity: 0.45;
  }
`;

const drift = keyframes`
  0% {
    transform: translateX(-100%) translateY(100vh);
  }
  100% {
    transform: translateX(100vw) translateY(-100%);
  }
`;

const ambientGlow = keyframes`
  0%, 100% {
    opacity: 0.03;
    transform: scale(1) translate(0, 0);
  }
  50% {
    opacity: 0.06;
    transform: scale(1.05) translate(-2%, 2%);
  }
`;

// ==================== STYLED COMPONENTS ====================

const Container = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const GlowLayer = styled.div`
  position: absolute;
  inset: 0;
  background: ${props => props.$gradient};
  animation: ${ambientGlow} ${props => props.$duration}s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`;

const ParticleLayer = styled.div`
  position: absolute;
  inset: 0;
`;

const Particle = styled.div`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: ${props => props.$color};
  border-radius: 50%;
  filter: blur(${props => props.$blur}px);
  opacity: ${props => props.$opacity};
  left: ${props => props.$left}%;
  top: ${props => props.$top}%;
  animation: ${props => props.$animation} ${props => props.$duration}s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  will-change: transform, opacity;
`;

const DriftingParticle = styled.div`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: ${props => props.$color};
  border-radius: 50%;
  filter: blur(${props => props.$blur}px);
  opacity: ${props => props.$opacity};
  animation: ${drift} ${props => props.$duration}s linear infinite;
  animation-delay: ${props => props.$delay}s;
  will-change: transform;
`;

const OrbGlow = styled.div`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: radial-gradient(
    circle,
    ${props => props.$color} 0%,
    transparent 70%
  );
  border-radius: 50%;
  left: ${props => props.$left}%;
  top: ${props => props.$top}%;
  animation: ${float1} ${props => props.$duration}s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  will-change: transform, opacity;
`;

// ==================== PRESETS ====================

const colorPresets = {
  blue: {
    primary: 'rgba(0, 113, 227, 0.4)',
    secondary: 'rgba(88, 86, 214, 0.3)',
    accent: 'rgba(175, 82, 222, 0.25)',
    glow1: 'radial-gradient(ellipse at 20% 30%, rgba(0, 113, 227, 0.08) 0%, transparent 50%)',
    glow2: 'radial-gradient(ellipse at 80% 70%, rgba(175, 82, 222, 0.06) 0%, transparent 50%)',
  },
  purple: {
    primary: 'rgba(175, 82, 222, 0.4)',
    secondary: 'rgba(88, 86, 214, 0.3)',
    accent: 'rgba(191, 90, 242, 0.25)',
    glow1: 'radial-gradient(ellipse at 30% 20%, rgba(175, 82, 222, 0.08) 0%, transparent 50%)',
    glow2: 'radial-gradient(ellipse at 70% 80%, rgba(88, 86, 214, 0.06) 0%, transparent 50%)',
  },
  gold: {
    primary: 'rgba(255, 167, 38, 0.4)',
    secondary: 'rgba(255, 215, 0, 0.3)',
    accent: 'rgba(255, 193, 7, 0.25)',
    glow1: 'radial-gradient(ellipse at 25% 35%, rgba(255, 167, 38, 0.08) 0%, transparent 50%)',
    glow2: 'radial-gradient(ellipse at 75% 65%, rgba(255, 215, 0, 0.06) 0%, transparent 50%)',
  },
  cyan: {
    primary: 'rgba(0, 199, 190, 0.4)',
    secondary: 'rgba(0, 150, 199, 0.3)',
    accent: 'rgba(72, 219, 251, 0.25)',
    glow1: 'radial-gradient(ellipse at 15% 40%, rgba(0, 199, 190, 0.08) 0%, transparent 50%)',
    glow2: 'radial-gradient(ellipse at 85% 60%, rgba(72, 219, 251, 0.06) 0%, transparent 50%)',
  },
};

const densityPresets = {
  low: { particles: 8, orbs: 2, drifting: 3 },
  medium: { particles: 15, orbs: 4, drifting: 5 },
  high: { particles: 25, orbs: 6, drifting: 8 },
};

// ==================== COMPONENT ====================

/**
 * AmbientParticles Component
 *
 * @param {'blue' | 'purple' | 'gold' | 'cyan'} color - Color preset
 * @param {'low' | 'medium' | 'high'} density - Particle density
 * @param {boolean} showGlows - Show background glow layers
 * @param {boolean} showOrbs - Show large orb glows
 * @param {boolean} showDrifting - Show drifting particles
 */
const AmbientParticles = memo(function AmbientParticles({
  color = 'blue',
  density = 'medium',
  showGlows = true,
  showOrbs = true,
  showDrifting = true,
  className,
}) {
  const colors = colorPresets[color] || colorPresets.blue;
  const counts = densityPresets[density] || densityPresets.medium;

  // Generate stable particle configurations
  const particles = useMemo(() => {
    const animations = [float1, float2, float3];
    const colorOptions = [colors.primary, colors.secondary, colors.accent];

    return Array.from({ length: counts.particles }, (_, i) => ({
      id: `p-${i}`,
      size: 3 + Math.random() * 6,
      blur: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.3,
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: colorOptions[i % colorOptions.length],
      animation: animations[i % animations.length],
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 5,
    }));
  }, [counts.particles, colors]);

  const orbs = useMemo(() => {
    const colorOptions = [colors.primary, colors.secondary];

    return Array.from({ length: counts.orbs }, (_, i) => ({
      id: `o-${i}`,
      size: 100 + Math.random() * 150,
      left: 10 + Math.random() * 80,
      top: 10 + Math.random() * 80,
      color: colorOptions[i % colorOptions.length],
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 8,
    }));
  }, [counts.orbs, colors]);

  const driftingParticles = useMemo(() => {
    return Array.from({ length: counts.drifting }, (_, i) => ({
      id: `d-${i}`,
      size: 2 + Math.random() * 3,
      blur: 0.5 + Math.random() * 1,
      opacity: 0.1 + Math.random() * 0.2,
      color: colors.accent,
      duration: 20 + Math.random() * 20,
      delay: Math.random() * 20,
    }));
  }, [counts.drifting, colors]);

  return (
    <Container className={className} aria-hidden="true">
      {/* Background glow layers */}
      {showGlows && (
        <>
          <GlowLayer $gradient={colors.glow1} $duration={20} $delay={0} />
          <GlowLayer $gradient={colors.glow2} $duration={25} $delay={5} />
        </>
      )}

      {/* Large orb glows */}
      {showOrbs && (
        <ParticleLayer>
          {orbs.map(orb => (
            <OrbGlow
              key={orb.id}
              $size={orb.size}
              $left={orb.left}
              $top={orb.top}
              $color={orb.color}
              $duration={orb.duration}
              $delay={orb.delay}
            />
          ))}
        </ParticleLayer>
      )}

      {/* Floating particles */}
      <ParticleLayer>
        {particles.map(particle => (
          <Particle
            key={particle.id}
            $size={particle.size}
            $blur={particle.blur}
            $opacity={particle.opacity}
            $left={particle.left}
            $top={particle.top}
            $color={particle.color}
            $animation={particle.animation}
            $duration={particle.duration}
            $delay={particle.delay}
          />
        ))}
      </ParticleLayer>

      {/* Drifting particles */}
      {showDrifting && (
        <ParticleLayer>
          {driftingParticles.map(particle => (
            <DriftingParticle
              key={particle.id}
              $size={particle.size}
              $blur={particle.blur}
              $opacity={particle.opacity}
              $color={particle.color}
              $duration={particle.duration}
              $delay={particle.delay}
            />
          ))}
        </ParticleLayer>
      )}
    </Container>
  );
});

AmbientParticles.displayName = 'AmbientParticles';

export default AmbientParticles;
