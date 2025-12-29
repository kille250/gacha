/**
 * SelectorInventory - Character selector tickets display
 *
 * Shows owned character selectors and allows using them
 * to pick any character of the matching rarity.
 *
 * Redesigned with improved UX:
 * - Clear visual selection states with animations
 * - Better card layout with rarity colors and series info
 * - Keyboard navigation support
 * - Search with clear button
 * - Responsive grid layout
 * - Sticky confirm footer
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTicketAlt,
  FaHeart,
  FaCrown,
  FaCheck,
  FaSearch,
  FaTimes,
  FaStar,
  FaPlus
} from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useSelectors } from '../../hooks/useGameEnhancements';
import { getAssetUrl } from '../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo } from '../../utils/mediaUtils';
import { theme } from '../../design-system';

// ===========================================
// ANIMATIONS
// ===========================================

const selectedPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0.2); }
`;

const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

// ===========================================
// CONTAINER STYLES
// ===========================================

const Container = styled(motion.div)`
  background: linear-gradient(135deg,
    ${theme.colors.surface} 0%,
    ${theme.colors.backgroundSecondary} 100%
  );
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin: ${theme.spacing.md} 0;
  border: 1px solid ${theme.colors.surfaceBorder};
  backdrop-filter: blur(${theme.blur.md});
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h3`
  color: ${theme.colors.text};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const SelectorCount = styled.div`
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 171, 0, 0.1) 100%);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  color: #ffd700;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  border: 1px solid rgba(255, 215, 0, 0.3);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.textSecondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${theme.spacing.md};
  opacity: 0.4;
  color: ${theme.colors.textTertiary};
`;

const EmptyText = styled.div`
  font-size: ${theme.fontSizes.sm};
  line-height: 1.6;
`;

const SelectorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${theme.spacing.md};
`;

const SelectorCard = styled(motion.div)`
  background: ${props => {
    switch (props.$rarity) {
      case 'legendary': return 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 171, 0, 0.08) 100%)';
      case 'epic': return 'linear-gradient(135deg, rgba(156, 39, 176, 0.12) 0%, rgba(103, 58, 183, 0.08) 100%)';
      default: return 'linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(3, 169, 244, 0.08) 100%)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.$rarity) {
      case 'legendary': return 'rgba(255, 215, 0, 0.4)';
      case 'epic': return 'rgba(156, 39, 176, 0.4)';
      default: return 'rgba(33, 150, 243, 0.4)';
    }
  }};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: ${props => {
      switch (props.$rarity) {
        case 'legendary': return 'rgba(255, 215, 0, 0.7)';
        case 'epic': return 'rgba(156, 39, 176, 0.7)';
        default: return 'rgba(33, 150, 243, 0.7)';
      }
    }};
    box-shadow: 0 8px 24px ${props => {
      switch (props.$rarity) {
        case 'legendary': return 'rgba(255, 215, 0, 0.2)';
        case 'epic': return 'rgba(156, 39, 176, 0.2)';
        default: return 'rgba(33, 150, 243, 0.2)';
      }
    }};
  }
`;

const SelectorIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: ${theme.spacing.sm};
  color: ${props => {
    switch (props.$rarity) {
      case 'legendary': return '#ffd700';
      case 'epic': return '#ba68c8';
      default: return '#64b5f6';
    }
  }};
  animation: ${floatAnimation} 3s ease-in-out infinite;
`;

const SelectorRarity = styled.div`
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.base};
  text-transform: capitalize;
  margin-bottom: 2px;
`;

const SelectorLabel = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
`;

const SelectorDate = styled.div`
  color: ${theme.colors.textTertiary};
  font-size: ${theme.fontSizes.xs};
  margin-top: ${theme.spacing.sm};
`;

// ===========================================
// PICKER MODAL STYLES
// ===========================================

const PickerModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(${theme.blur.lg});
  display: flex;
  flex-direction: column;
  z-index: 1000;
`;

const PickerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundSecondary};
  flex-shrink: 0;
`;

const PickerTitle = styled.h2`
  color: ${theme.colors.text};
  margin: 0;
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const RarityBadge = styled.span`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: capitalize;
  background: ${props => {
    switch (props.$rarity) {
      case 'legendary': return 'linear-gradient(135deg, #ffd700, #ff8c00)';
      case 'epic': return 'linear-gradient(135deg, #9c27b0, #673ab7)';
      default: return 'linear-gradient(135deg, #2196f3, #03a9f4)';
    }
  }};
  color: white;
`;

const CloseButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: ${theme.radius.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
    border-color: ${theme.colors.error};
    color: ${theme.colors.error};
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: 0 ${theme.spacing.md};
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: ${theme.colors.primary};
    background: ${theme.colors.background};
  }

  svg {
    color: ${theme.colors.textSecondary};
    flex-shrink: 0;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  padding: ${theme.spacing.md} 0;
  outline: none;
  min-width: 0;

  &::placeholder {
    color: ${theme.colors.textTertiary};
  }
`;

const ClearSearchButton = styled(motion.button)`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.surfaceHover};
  border: none;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: ${theme.colors.error};
    color: white;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const FilterButton = styled.button`
  background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 171, 0, 0.15))'
    : theme.colors.glass};
  border: 1px solid ${props => props.$active
    ? 'rgba(255, 215, 0, 0.5)'
    : 'transparent'};
  color: ${props => props.$active ? '#ffd700' : theme.colors.textSecondary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &:hover {
    background: ${props => props.$active
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 171, 0, 0.2))'
      : theme.colors.surfaceHover};
  }

  svg {
    font-size: 12px;
  }
`;

const PickerContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  padding-bottom: 100px;
  -webkit-overflow-scrolling: touch;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${theme.spacing.md};

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${theme.spacing.sm};
  }
`;

// ===========================================
// CHARACTER CARD STYLES
// ===========================================

const CharacterCard = styled(motion.button)`
  position: relative;
  background: ${props => props.$selected
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(56, 142, 60, 0.15) 100%)'
    : theme.colors.glass};
  border: 3px solid ${props => props.$selected
    ? '#4caf50'
    : props.$rarityColor || theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: 0;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  aspect-ratio: 3/4;
  display: flex;
  flex-direction: column;

  ${props => props.$selected && css`
    animation: ${selectedPulse} 1.5s ease-in-out infinite;
  `}

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px ${props => props.$rarityColor
      ? `${props.$rarityColor}40`
      : 'rgba(0, 0, 0, 0.3)'};
    border-color: ${props => props.$selected
      ? '#4caf50'
      : props.$rarityColor || theme.colors.primary};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CharacterImageWrapper = styled.div`
  flex: 1;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  ${CharacterCard}:hover & img,
  ${CharacterCard}:hover & video {
    transform: scale(1.08);
  }
`;

const CharacterOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.sm};
  background: linear-gradient(
    transparent 0%,
    rgba(0, 0, 0, 0.7) 40%,
    rgba(0, 0, 0, 0.95) 100%
  );
`;

const CharacterName = styled.div`
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
`;

const CharacterSeries = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OwnershipBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  padding: 3px 8px;
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 3px;

  ${props => props.$owned ? css`
    background: rgba(76, 175, 80, 0.9);
    color: white;
  ` : css`
    background: linear-gradient(135deg, #ffd700, #ff8c00);
    color: #1a1a2e;
  `}
`;

const SelectedIndicator = styled(motion.div)`
  position: absolute;
  top: -6px;
  left: -6px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #4caf50, #388e3c);
  border-radius: ${theme.radius.full};
  border: 3px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.5);
  z-index: 10;
`;

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textTertiary};
  font-size: 2rem;
`;

// ===========================================
// CONFIRM BAR STYLES
// ===========================================

const ConfirmBar = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${theme.colors.backgroundSecondary};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  padding-bottom: calc(${theme.spacing.md} + env(safe-area-inset-bottom, 0px));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${theme.spacing.md};
  z-index: 100;
  backdrop-filter: blur(${theme.blur.lg});
`;

const SelectedInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  flex: 1;
  min-width: 0;
`;

const SelectedImage = styled.div`
  width: 52px;
  height: 52px;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
  flex-shrink: 0;
  border: 2px solid ${props => props.$color || theme.colors.surfaceBorder};

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SelectedText = styled.div`
  min-width: 0;

  .name {
    color: ${theme.colors.text};
    font-weight: ${theme.fontWeights.semibold};
    font-size: ${theme.fontSizes.base};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hint {
    color: ${props => props.$isNew ? '#ffd700' : '#4caf50'};
    font-size: ${theme.fontSizes.sm};
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const ConfirmButton = styled(motion.button)`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border: none;
  color: white;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.radius.lg};
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
  min-height: 48px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.lg};
  z-index: 200;
`;

// ===========================================
// SUCCESS MODAL STYLES
// ===========================================

const SuccessModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: ${theme.spacing.lg};
`;

const SuccessContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xxl};
  text-align: center;
  max-width: 380px;
  width: 100%;
  border: 2px solid rgba(76, 175, 80, 0.5);
  box-shadow: 0 0 40px rgba(76, 175, 80, 0.2);
`;

const SuccessIcon = styled(motion.div)`
  width: 80px;
  height: 80px;
  margin: 0 auto ${theme.spacing.lg};
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: white;
  box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
`;

const SuccessTitle = styled.div`
  color: #4caf50;
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin-bottom: ${theme.spacing.sm};
`;

const SuccessMessage = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  margin-bottom: ${theme.spacing.xl};
  line-height: 1.5;
`;

const SuccessButton = styled(motion.button)`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border: none;
  color: white;
  padding: ${theme.spacing.md} ${theme.spacing.xxl};
  border-radius: ${theme.radius.lg};
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
`;

// ===========================================
// CONSTANTS
// ===========================================

const RARITY_ICONS = {
  rare: FaTicketAlt,
  epic: FaHeart,
  legendary: FaCrown
};

const RARITY_COLORS = {
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ffd700'
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const getCharacterImageUrl = (char) => {
  const imagePath = char.imageUrl || char.image;
  if (!imagePath) return PLACEHOLDER_IMAGE;
  return getAssetUrl(imagePath);
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export function SelectorInventory() {
  const { t } = useTranslation();
  const {
    selectors,
    characters,
    loading,
    loadingCharacters,
    using,
    fetchCharactersForRarity,
    useSelector: redeemSelector
  } = useSelectors();

  const [activeSelector, setActiveSelector] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [successResult, setSuccessResult] = useState(null);
  const searchInputRef = useRef(null);

  // Handle image loading errors
  const handleImageError = useCallback((e) => {
    if (!e.target.src.includes('data:image/svg') && !e.target.src.includes('placeholder')) {
      e.target.src = PLACEHOLDER_IMAGE;
    }
  }, []);

  // Open picker modal
  const handleSelectorClick = async (selector) => {
    setActiveSelector(selector);
    setSelectedCharacter(null);
    setSearchQuery('');
    setOwnershipFilter('all');
    await fetchCharactersForRarity(selector.rarity, selector.bannerId);
  };

  // Close picker modal
  const handleClose = useCallback(() => {
    setActiveSelector(null);
    setSelectedCharacter(null);
  }, []);

  // Confirm selection
  const handleConfirm = useCallback(async () => {
    if (!activeSelector || !selectedCharacter || using) return;

    try {
      const result = await redeemSelector(activeSelector.id, selectedCharacter.id);
      setSuccessResult(result);
      setActiveSelector(null);
      setSelectedCharacter(null);
    } catch (err) {
      console.error('Failed to use selector:', err);
    }
  }, [activeSelector, selectedCharacter, using, redeemSelector]);

  // Select character
  const handleCharacterSelect = useCallback((char) => {
    if (selectedCharacter?.id === char.id) {
      // Double-click to confirm
      handleConfirm();
    } else {
      setSelectedCharacter(char);
    }
  }, [selectedCharacter, handleConfirm]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!activeSelector) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedCharacter) {
          setSelectedCharacter(null);
        } else {
          handleClose();
        }
      } else if (e.key === 'Enter' && selectedCharacter) {
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSelector, selectedCharacter, handleClose, handleConfirm]);

  // Focus search on open
  useEffect(() => {
    if (activeSelector && !loadingCharacters) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [activeSelector, loadingCharacters]);

  // Filter characters
  const filteredCharacters = characters?.characters?.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (char.series && char.series.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesOwnership =
      ownershipFilter === 'all' ||
      (ownershipFilter === 'owned' && char.owned) ||
      (ownershipFilter === 'new' && !char.owned);
    return matchesSearch && matchesOwnership;
  }) || [];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getRarityColor = (rarity) => RARITY_COLORS[rarity] || RARITY_COLORS.rare;

  if (loading) {
    return (
      <Container>
        <Title>{t('selectorInventory.loadingSelectors')}</Title>
      </Container>
    );
  }

  if (!selectors || selectors.available === 0) {
    return (
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>
            <FaTicketAlt size={18} />
            {t('selectorInventory.title')}
          </Title>
        </Header>
        <EmptyState>
          <EmptyIcon><FaTicketAlt /></EmptyIcon>
          <EmptyText>
            {t('selectorInventory.noSelectorsAvailable')}<br />
            {t('selectorInventory.exchangeFatePoints')}
          </EmptyText>
        </EmptyState>
      </Container>
    );
  }

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>
            <FaTicketAlt size={18} />
            {t('selectorInventory.title')}
          </Title>
          <SelectorCount>{selectors.available} {t('selectorInventory.available')}</SelectorCount>
        </Header>

        <SelectorGrid>
          {selectors.selectors.map((selector) => {
            const Icon = RARITY_ICONS[selector.rarity] || FaTicketAlt;
            return (
              <SelectorCard
                key={selector.id}
                $rarity={selector.rarity}
                onClick={() => handleSelectorClick(selector)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SelectorIcon $rarity={selector.rarity}>
                  <Icon size={40} />
                </SelectorIcon>
                <SelectorRarity>{selector.rarity}</SelectorRarity>
                <SelectorLabel>{t('selectorInventory.selector')}</SelectorLabel>
                <SelectorDate>
                  {t('selectorInventory.obtained')}: {formatDate(selector.obtained)}
                </SelectorDate>
              </SelectorCard>
            );
          })}
        </SelectorGrid>
      </Container>

      {/* Character Picker Modal */}
      <AnimatePresence>
        {activeSelector && (
          <PickerModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PickerHeader>
              <PickerTitle>
                {t('selectorInventory.chooseCharacter')}
                <RarityBadge $rarity={activeSelector.rarity}>
                  {activeSelector.rarity}
                </RarityBadge>
              </PickerTitle>
              <CloseButton onClick={handleClose} aria-label={t('common.close')}>
                <MdClose />
              </CloseButton>
            </PickerHeader>

            <SearchContainer>
              <SearchInputWrapper>
                <FaSearch />
                <SearchInput
                  ref={searchInputRef}
                  placeholder={t('selectorInventory.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('accessibility.searchCharacters')}
                />
                <AnimatePresence>
                  {searchQuery && (
                    <ClearSearchButton
                      onClick={handleClearSearch}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      aria-label={t('accessibility.clearSearch')}
                    >
                      <FaTimes size={12} />
                    </ClearSearchButton>
                  )}
                </AnimatePresence>
              </SearchInputWrapper>
            </SearchContainer>

            <FilterRow>
              <FilterButton
                $active={ownershipFilter === 'all'}
                onClick={() => setOwnershipFilter('all')}
              >
                {t('selectorInventory.filters.all')} ({characters?.total || 0})
              </FilterButton>
              <FilterButton
                $active={ownershipFilter === 'new'}
                onClick={() => setOwnershipFilter('new')}
              >
                <FaStar />
                {t('selectorInventory.filters.new')} ({characters?.characters?.filter(c => !c.owned).length || 0})
              </FilterButton>
              <FilterButton
                $active={ownershipFilter === 'owned'}
                onClick={() => setOwnershipFilter('owned')}
              >
                <FaCheck />
                {t('selectorInventory.filters.owned')} ({characters?.characters?.filter(c => c.owned).length || 0})
              </FilterButton>
            </FilterRow>

            <PickerContent>
              {loadingCharacters ? (
                <LoadingText>{t('selectorInventory.loadingCharacters')}</LoadingText>
              ) : filteredCharacters.length === 0 ? (
                <LoadingText>
                  {searchQuery ? t('selectorInventory.noMatch') : t('selectorInventory.noCharacters')}
                </LoadingText>
              ) : (
                <CharacterGrid role="listbox" aria-label={t('accessibility.characterSelection')}>
                  {filteredCharacters.map(char => {
                    const imageSrc = getCharacterImageUrl(char);
                    const isSelected = selectedCharacter?.id === char.id;
                    const charIsVideo = isVideo(char.imageUrl || char.image);
                    const rarityColor = getRarityColor(activeSelector.rarity);

                    return (
                      <CharacterCard
                        key={char.id}
                        $selected={isSelected}
                        $rarityColor={rarityColor}
                        onClick={() => handleCharacterSelect(char)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        role="option"
                        aria-selected={isSelected}
                        aria-label={`${char.name}${char.owned ? ` (${t('selectorInventory.filters.owned')})` : ` (${t('selectorInventory.filters.new')})`}`}
                      >
                        <AnimatePresence>
                          {isSelected && (
                            <SelectedIndicator
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <FaCheck />
                            </SelectedIndicator>
                          )}
                        </AnimatePresence>

                        <OwnershipBadge $owned={char.owned}>
                          {char.owned ? (
                            <><FaPlus size={8} /> {t('selectorInventory.status.dupe')}</>
                          ) : (
                            <><FaStar size={8} /> {t('selectorInventory.status.new')}</>
                          )}
                        </OwnershipBadge>

                        <CharacterImageWrapper>
                          {charIsVideo ? (
                            <video
                              src={imageSrc}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onError={handleImageError}
                            />
                          ) : imageSrc && imageSrc !== PLACEHOLDER_IMAGE ? (
                            <img
                              src={imageSrc}
                              alt={char.name}
                              onError={handleImageError}
                              loading="lazy"
                            />
                          ) : (
                            <ImagePlaceholder>?</ImagePlaceholder>
                          )}
                          <CharacterOverlay>
                            <CharacterName>{char.name}</CharacterName>
                            {char.series && (
                              <CharacterSeries>{char.series}</CharacterSeries>
                            )}
                          </CharacterOverlay>
                        </CharacterImageWrapper>
                      </CharacterCard>
                    );
                  })}
                </CharacterGrid>
              )}
            </PickerContent>

            {/* Confirm Bar */}
            <AnimatePresence>
              {selectedCharacter && (
                <ConfirmBar
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                >
                  <SelectedInfo>
                    <SelectedImage $color={getRarityColor(activeSelector.rarity)}>
                      {(() => {
                        const imageSrc = getCharacterImageUrl(selectedCharacter);
                        const charIsVideo = isVideo(selectedCharacter.imageUrl || selectedCharacter.image);

                        if (charIsVideo) {
                          return (
                            <video
                              src={imageSrc}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onError={handleImageError}
                            />
                          );
                        }
                        if (imageSrc && imageSrc !== PLACEHOLDER_IMAGE) {
                          return (
                            <img
                              src={imageSrc}
                              alt={selectedCharacter.name}
                              onError={handleImageError}
                            />
                          );
                        }
                        return <ImagePlaceholder>?</ImagePlaceholder>;
                      })()}
                    </SelectedImage>
                    <SelectedText $isNew={!selectedCharacter.owned}>
                      <div className="name">{selectedCharacter.name}</div>
                      <div className="hint">
                        {selectedCharacter.owned ? (
                          <><FaPlus size={10} /> {t('selectorInventory.status.shard')}</>
                        ) : (
                          <><FaStar size={10} /> {t('selectorInventory.status.newCharacter')}</>
                        )}
                      </div>
                    </SelectedText>
                  </SelectedInfo>
                  <ConfirmButton
                    onClick={handleConfirm}
                    disabled={using}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {using ? t('selectorInventory.claiming') : (
                      <><FaCheck /> {t('common.confirm')}</>
                    )}
                  </ConfirmButton>
                </ConfirmBar>
              )}
            </AnimatePresence>

            {using && (
              <LoadingOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {t('selectorInventory.claimingCharacter')}
              </LoadingOverlay>
            )}
          </PickerModal>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successResult && (
          <SuccessModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSuccessResult(null)}
          >
            <SuccessContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SuccessIcon
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <FaCheck />
              </SuccessIcon>
              <SuccessTitle>
                {successResult.isNew ? t('selectorInventory.success.newCharacter') : t('selectorInventory.success.shardObtained')}
              </SuccessTitle>
              <SuccessMessage>
                {successResult.message}
              </SuccessMessage>
              <SuccessButton
                onClick={() => setSuccessResult(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('selectorInventory.success.awesome')}
              </SuccessButton>
            </SuccessContent>
          </SuccessModal>
        )}
      </AnimatePresence>
    </>
  );
}

export default SelectorInventory;
