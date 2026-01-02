/**
 * FeatureNav - Bottom navigation bar for Essence Tap features
 *
 * Features:
 * - Icon-based navigation
 * - Glassmorphism styling
 * - Active state indicators
 * - Tooltip on hover
 * - Responsive layout
 */

import React, { memo, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../design-system';
import {
  IconDice,
  IconSparkles,
  IconTrophy,
  IconStar,
  IconGem,
  IconStats,
  IconCategoryPerson,
  IconTarget,
  IconBanner
} from '../../constants/icons';
import { glassmorphism, bottomNavSlide, navItem } from './animations';

const activeGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(168, 85, 247, 0.6);
  }
`;

const NavContainer = styled(motion.nav)`
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: fit-content;
  z-index: 100;
  ${glassmorphism}
  border-radius: ${theme.radius.full};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  @media (max-width: ${theme.breakpoints.sm}) {
    bottom: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    border-radius: ${theme.radius.xl};
    justify-content: space-around;
    padding: ${theme.spacing.sm};
  }
`;

const NavButton = styled(motion.button)`
  width: 48px;
  height: 48px;
  border-radius: ${theme.radius.lg};
  border: none;
  background: ${props => props.$active
    ? 'rgba(168, 85, 247, 0.25)'
    : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active
    ? '#A855F7'
    : theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;

  ${props => props.$active && css`
    animation: ${activeGlow} 2s ease-in-out infinite;
    border: 1px solid rgba(168, 85, 247, 0.4);
  `}

  &:hover {
    background: rgba(168, 85, 247, 0.15);
    color: #A855F7;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 40px;
    height: 40px;
  }
`;

const NavIcon = styled.div`
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 18px;
  }
`;

const Tooltip = styled(motion.div)`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(20, 20, 25, 0.95);
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 ${theme.spacing.xs};

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const NotificationDot = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: #EF4444;
  border-radius: 50%;
  border: 2px solid rgba(28, 28, 30, 0.9);
`;

// Feature definitions
const FEATURES = [
  // Quick Actions
  { id: 'gamble', icon: IconDice, label: 'Gamble', group: 'quick' },
  { id: 'infuse', icon: IconSparkles, label: 'Infuse', group: 'quick' },
  { id: 'boss', icon: IconTarget, label: 'Boss Fight', group: 'quick' },
  // Divider
  { id: 'divider1', type: 'divider' },
  // Progress
  { id: 'tournament', icon: IconTrophy, label: 'Tournament', group: 'progress' },
  { id: 'mastery', icon: IconStar, label: 'Mastery', group: 'progress' },
  { id: 'challenges', icon: IconBanner, label: 'Challenges', group: 'progress' },
  // Divider
  { id: 'divider2', type: 'divider' },
  // Info
  { id: 'types', icon: IconGem, label: 'Essence Types', group: 'info' },
  { id: 'session', icon: IconStats, label: 'Session Stats', group: 'info' },
  { id: 'synergy', icon: IconCategoryPerson, label: 'Synergy', group: 'info' }
];

const FeatureNav = memo(({
  onFeatureClick,
  activeFeature = null,
  notifications = {}
}) => {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  return (
    <NavContainer
      variants={bottomNavSlide}
      initial="initial"
      animate="animate"
    >
      {FEATURES.map(feature => {
        if (feature.type === 'divider') {
          return <Divider key={feature.id} />;
        }

        const IconComponent = feature.icon;
        const isActive = activeFeature === feature.id;
        const hasNotification = notifications[feature.id];

        return (
          <NavButton
            key={feature.id}
            $active={isActive}
            onClick={() => onFeatureClick?.(feature.id)}
            onMouseEnter={() => setHoveredFeature(feature.id)}
            onMouseLeave={() => setHoveredFeature(null)}
            variants={navItem}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
          >
            <NavIcon>
              <IconComponent size={22} />
            </NavIcon>

            {hasNotification && <NotificationDot />}

            <AnimatePresence>
              {hoveredFeature === feature.id && (
                <Tooltip
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {feature.label}
                </Tooltip>
              )}
            </AnimatePresence>
          </NavButton>
        );
      })}
    </NavContainer>
  );
});

FeatureNav.displayName = 'FeatureNav';

export default FeatureNav;
