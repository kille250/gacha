/**
 * DojoCharacterPicker Styled Components
 *
 * Dedicated styles for the character picker modal with improved UX.
 * Provides visual selection feedback, better hierarchy, and smooth animations.
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';

// ===========================================
// ANIMATIONS
// ===========================================

const selectedPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.5); }
`;

const checkBounce = keyframes`
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

// ===========================================
// SEARCH CONTAINER
// ===========================================

export const PickerSearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.glass};
  flex-shrink: 0;
  position: relative;

  svg:first-child {
    color: ${theme.colors.textSecondary};
    font-size: 20px;
    flex-shrink: 0;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

export const PickerSearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  min-width: 0;
  height: 44px;

  &::placeholder {
    color: ${theme.colors.textTertiary};
  }
`;

export const PickerSearchClear = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.backgroundTertiary};
  border: none;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.text};
  }

  svg {
    font-size: 18px;
  }
`;

// ===========================================
// CHARACTER CARD
// ===========================================

export const PickerCharacterCard = styled(motion.div)`
  position: relative;
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  /* Border styling based on selection state */
  border: 3px solid ${props => props.$isSelected
    ? 'white'
    : (props.$color || theme.colors.surfaceBorder)};

  /* Glow effect */
  box-shadow: ${props => props.$isSelected
    ? `0 0 20px ${props.$color || theme.colors.primary}, 0 0 40px rgba(255, 255, 255, 0.3)`
    : 'none'};

  /* Selection animation */
  ${props => props.$isSelected && css`
    animation: ${selectedPulse} 1.5s ease-in-out infinite;
  `}

  /* Hover state */
  &:hover {
    box-shadow: 0 0 20px ${props => props.$color || theme.colors.primary};
    transform: translateY(-2px);
  }

  /* Focus state for keyboard navigation */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${theme.colors.primary},
                0 0 20px ${props => props.$color || theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.md};
    border-width: 2px;
  }
`;

export const PickerCharImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  ${PickerCharacterCard}:hover & {
    transform: scale(1.05);
  }
`;

export const PickerCharVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  ${PickerCharacterCard}:hover & {
    transform: scale(1.05);
  }
`;

export const PickerCharOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.sm};
  background: linear-gradient(
    transparent 0%,
    rgba(0, 0, 0, 0.6) 30%,
    rgba(0, 0, 0, 0.95) 100%
  );
  transition: all 0.2s ease;

  ${props => props.$isSelected && css`
    background: linear-gradient(
      transparent 0%,
      rgba(0, 0, 0, 0.7) 30%,
      rgba(0, 0, 0, 0.98) 100%
    );
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xs};
  }
`;

export const PickerCharName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  margin-bottom: 2px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

export const PickerCharSeries = styled.div`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  margin-bottom: 4px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 9px;
  }
`;

export const PickerCharBadges = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
`;

export const PickerCharRarity = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.$color || theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 1px 4px;
    font-size: 9px;
  }
`;

export const PickerCharLevel = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.$isMaxLevel
    ? 'linear-gradient(135deg, #ffd700, #ff8c00)'
    : 'rgba(88, 86, 214, 0.9)'};
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 1px 4px;
    font-size: 9px;
  }
`;

export const PickerCharPowerBonus = styled.div`
  font-size: 9px;
  color: #4ade80;
  font-weight: ${theme.fontWeights.bold};
  margin-top: 3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  text-align: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 8px;
  }
`;

export const PickerCharSpecBadge = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$color || '#9b59b6'};
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 20px;
    height: 20px;
    top: 4px;
    left: 4px;

    svg {
      width: 10px;
      height: 10px;
    }
  }
`;

// ===========================================
// SELECTION INDICATOR
// ===========================================

export const PickerSelectedIndicator = styled(motion.div)`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.full};
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 10px rgba(34, 197, 94, 0.5);
  z-index: 10;
  animation: ${checkBounce} 0.3s ease;

  svg {
    font-size: 18px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 24px;
    height: 24px;
    top: 4px;
    right: 4px;

    svg {
      font-size: 14px;
    }
  }
`;

// ===========================================
// FOOTER & CONFIRM BUTTON
// ===========================================

export const PickerFooter = styled(motion.div)`
  flex-shrink: 0;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.backgroundSecondary};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  padding-bottom: calc(${theme.spacing.md} + env(safe-area-inset-bottom, 0px));

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    padding-bottom: calc(${theme.spacing.sm} + env(safe-area-inset-bottom, 0px));
  }
`;

export const PickerConfirmButton = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  min-height: 52px;
  background: ${props => props.$color
    ? `linear-gradient(135deg, ${props.$color}, ${adjustColor(props.$color, -20)})`
    : 'linear-gradient(135deg, #4ade80, #22c55e)'};
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px ${props => props.$color
    ? `${props.$color}40`
    : 'rgba(74, 222, 128, 0.4)'};

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px ${props => props.$color
      ? `${props.$color}60`
      : 'rgba(74, 222, 128, 0.6)'};
  }

  svg {
    font-size: 20px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    min-height: 48px;
    font-size: ${theme.fontSizes.sm};

    svg {
      font-size: 18px;
    }
  }
`;

// ===========================================
// HELPERS
// ===========================================

/**
 * Adjust a hex color's brightness
 * @param {string} color - Hex color string
 * @param {number} amount - Amount to adjust (-255 to 255)
 */
function adjustColor(color, amount) {
  if (!color || !color.startsWith('#')) return color;

  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
