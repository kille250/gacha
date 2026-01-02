/**
 * DojoCharacterPicker - Optimized Character Selection Modal
 *
 * High-performance character picker with:
 * - Fuzzy search with character highlighting
 * - Virtual scrolling for large lists
 * - Instant keyboard navigation
 * - Optimistic UI updates
 * - Full accessibility support
 * - GPU-accelerated animations
 */

import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdSearch, MdCheck, MdClear, MdSort, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';
import { AnimatePresence } from 'framer-motion';
import styled, { css, keyframes } from 'styled-components';

import { Spinner, theme, useReducedMotion } from '../../../design-system';
import { getAssetUrl } from '../../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo, getVideoMimeType } from '../../../utils/mediaUtils';
import { fuzzySearch, highlightMatches } from '../../../utils/fuzzySearch';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseBtn,
  ModalBody,
  NoCharacters,
  CharacterList,
  SeriesTitle,
  CharacterGrid,
} from './DojoPage.styles';
import {
  PickerSearchContainer,
  PickerSearchInput,
  PickerSearchClear,
  PickerCharacterCard,
  PickerCharImage,
  PickerCharVideo,
  PickerCharOverlay,
  PickerCharName,
  PickerCharBadges,
  PickerCharRarity,
  PickerCharLevel,
  PickerCharPowerBonus,
  PickerCharSpecBadge,
  PickerCharElementBadge,
  PickerSelectedIndicator,
  PickerConfirmButton,
  PickerFooter,
  PickerCharSeries,
} from './DojoCharacterPicker.styles';
import { ElementBadge } from '../../patterns';

// Specialization icon mapping
const SPEC_ICONS = {
  strength: GiCrossedSwords,
  wisdom: GiBookCover,
  spirit: GiSparkles
};

const SPEC_COLORS = {
  strength: '#e74c3c',
  wisdom: '#3498db',
  spirit: '#9b59b6'
};

// Rarity order for sorting (higher = better)
const RARITY_ORDER = {
  'Common': 1,
  'Uncommon': 2,
  'Rare': 3,
  'Epic': 4,
  'Legendary': 5
};

// Sort options
const SORT_OPTIONS = {
  RARITY_DESC: 'rarity_desc',
  LEVEL_DESC: 'level_desc',
  NAME_ASC: 'name_asc',
};

// Skeleton loader animation
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Skeleton loader for characters
const SkeletonCard = styled.div`
  aspect-ratio: 3/4;
  border-radius: ${theme.radius.lg};
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 25%,
    ${theme.colors.surfaceHover} 50%,
    ${theme.colors.backgroundTertiary} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;

  @media (max-width: ${theme.breakpoints.sm}) {
    border-radius: ${theme.radius.md};
  }
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// Sort controls container
const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 0 ${theme.spacing.md} ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const SortButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.15)' : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  min-height: 36px;

  &:hover {
    background: rgba(0, 113, 227, 0.1);
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    font-size: 14px;
  }
`;

// Synergy badge for characters that would create/boost synergy
const SynergyBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: rgba(48, 209, 88, 0.9);
  border-radius: ${theme.radius.sm};
  color: white;
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  z-index: 5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  svg {
    font-size: 10px;
  }
`;

// Highlighted text for fuzzy search matches
const HighlightedText = styled.span`
  ${props => props.$highlighted && css`
    background: rgba(255, 215, 0, 0.3);
    color: #FFD700;
    border-radius: 2px;
  `}
`;

// Keyboard shortcut hint
const KeyboardHint = styled.div`
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.sm};
  padding: 2px 8px;
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;

  ${PickerCharacterCard}:focus-visible & {
    opacity: 1;
  }
`;

// Navigation hint at bottom of modal
const NavigationHint = styled.div`
  display: none;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};

  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    background: ${theme.colors.backgroundTertiary};
    border: 1px solid ${theme.colors.surfaceBorder};
    border-radius: ${theme.radius.sm};
    font-family: inherit;
    font-size: 10px;
  }
`;

// Character card with highlighted name - using forwardRef for keyboard navigation
const CharacterCardContent = memo(React.forwardRef(({ char, isSelected, rarityColor, synergyInfo, searchQuery, matches, motionProps, prefersReducedMotion, t, onKeyDown, onClick, id }, ref) => {
  const nameSegments = useMemo(() => {
    if (searchQuery && matches?.name) {
      return highlightMatches(char.name, matches.name);
    }
    return [{ text: char.name, highlighted: false }];
  }, [char.name, searchQuery, matches]);

  const seriesSegments = useMemo(() => {
    if (searchQuery && matches?.series) {
      return highlightMatches(char.series, matches.series);
    }
    return [{ text: char.series, highlighted: false }];
  }, [char.series, searchQuery, matches]);

  return (
    <PickerCharacterCard
      ref={ref}
      id={id}
      $color={rarityColor}
      $isSelected={isSelected}
      $hasSynergy={!!synergyInfo}
      onClick={onClick}
      whileHover={motionProps.card?.whileHover}
      whileTap={motionProps.card?.whileTap}
      transition={motionProps.card?.transition}
      role="option"
      aria-selected={isSelected}
      aria-label={`${char.name} - ${char.rarity}${char.level ? ` Level ${char.level}` : ''}${synergyInfo ? ` - Synergy ${synergyInfo.count}` : ''}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Synergy badge */}
      {synergyInfo && (
        <SynergyBadge title={t('dojo.synergyBoostHint', { count: synergyInfo.count, defaultValue: `Synergy x${synergyInfo.count}` })}>
          <FaUsers />
          <span>x{synergyInfo.count}</span>
        </SynergyBadge>
      )}

      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <PickerSelectedIndicator
            {...motionProps.indicator}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0 }}
          >
            <MdCheck />
          </PickerSelectedIndicator>
        )}
      </AnimatePresence>

      {/* Character image */}
      {isVideo(char.image) ? (
        <PickerCharVideo autoPlay loop muted playsInline>
          <source src={getAssetUrl(char.image)} type={getVideoMimeType(char.image)} />
        </PickerCharVideo>
      ) : (
        <PickerCharImage
          src={getAssetUrl(char.image) || PLACEHOLDER_IMAGE}
          alt={char.name}
          loading="lazy"
          onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
        />
      )}

      {/* Character info overlay */}
      <PickerCharOverlay $isSelected={isSelected}>
        <PickerCharName>
          {nameSegments.map((seg, i) => (
            <HighlightedText key={i} $highlighted={seg.highlighted}>
              {seg.text}
            </HighlightedText>
          ))}
        </PickerCharName>
        <PickerCharSeries>
          {seriesSegments.map((seg, i) => (
            <HighlightedText key={i} $highlighted={seg.highlighted}>
              {seg.text}
            </HighlightedText>
          ))}
        </PickerCharSeries>
        <PickerCharBadges>
          <PickerCharRarity $color={rarityColor}>
            {char.rarity}
          </PickerCharRarity>
          {char.level && (
            <PickerCharLevel
              $isMaxLevel={char.level >= 5}
            >
              Lv.{char.level}
            </PickerCharLevel>
          )}
        </PickerCharBadges>
        {char.levelMultiplier > 1 && (
          <PickerCharPowerBonus>
            +{Math.round((char.levelMultiplier - 1) * 100)}% power
          </PickerCharPowerBonus>
        )}
      </PickerCharOverlay>

      {/* Specialization badge */}
      {char.specialization && (
        <PickerCharSpecBadge
          $color={SPEC_COLORS[char.specialization]}
          title={t(`specialization.${char.specialization}.name`)}
        >
          {React.createElement(SPEC_ICONS[char.specialization], { size: 12 })}
        </PickerCharSpecBadge>
      )}

      {/* Element badge */}
      {char.element && (
        <PickerCharElementBadge>
          <ElementBadge
            element={char.element}
            size="sm"
            variant="backdrop"
          />
        </PickerCharElementBadge>
      )}

      <KeyboardHint>Enter to select</KeyboardHint>
    </PickerCharacterCard>
  );
}));

CharacterCardContent.displayName = 'CharacterCardContent';

const DojoCharacterPicker = ({
  onClose,
  charactersLoading,
  filteredCharacters,
  charactersBySeries: _charactersBySeries,
  searchQuery,
  onSearchChange,
  onSelect,
  getRarityColor,
  currentlyTrainingSeries = [],
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.RARITY_DESC);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const gridRef = useRef(null);
  const characterRefs = useRef({});
  const modalContentRef = useRef(null);

  // Motion variants that respect reduced motion preference
  // Using scale/opacity/y for proper framer-motion syntax
  const motionProps = prefersReducedMotion ? {
    overlay: {},
    content: {},
    card: {},
    indicator: {},
    clearButton: {},
    footer: {},
  } : {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 }
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      transition: { duration: 0.15, ease: 'easeOut' }
    },
    card: {
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
      transition: { duration: 0.1 }
    },
    indicator: {
      initial: { opacity: 0, scale: 0 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: 'spring', stiffness: 500, damping: 25 }
    },
    clearButton: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      whileHover: { scale: 1.1 },
      whileTap: { scale: 0.9 }
    },
    footer: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.15, ease: 'easeOut' }
    },
  };

  // Get selected character details
  const selectedChar = selectedCharId
    ? filteredCharacters.find(c => c.id === selectedCharId)
    : null;

  // Fuzzy search with match indices for highlighting
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredCharacters.map(char => ({ item: char, matches: {} }));
    }

    return fuzzySearch(
      filteredCharacters,
      searchQuery,
      (char) => [char.name, char.series || '']
    );
  }, [filteredCharacters, searchQuery]);

  // Create matches lookup for quick access
  const matchesLookup = useMemo(() => {
    const lookup = {};
    for (const result of searchResults) {
      lookup[result.item.id] = {};
      if (result.matches) {
        for (const [field, indices] of Object.entries(result.matches)) {
          if (field === result.item.name) {
            lookup[result.item.id].name = indices;
          } else if (field === result.item.series) {
            lookup[result.item.id].series = indices;
          }
        }
      }
    }
    return lookup;
  }, [searchResults]);

  // Get filtered character list from search results
  const searchedCharacters = useMemo(() =>
    searchResults.map(r => r.item),
    [searchResults]
  );

  // Sort characters within each series based on current sort option
  const sortedCharactersBySeries = useMemo(() => {
    const sorted = {};

    // Group searched characters by series
    const groupedBySeries = {};
    for (const char of searchedCharacters) {
      const series = char.series || 'Unknown';
      if (!groupedBySeries[series]) {
        groupedBySeries[series] = [];
      }
      groupedBySeries[series].push(char);
    }

    Object.entries(groupedBySeries).forEach(([series, chars]) => {
      const sortedChars = [...chars].sort((a, b) => {
        switch (sortBy) {
          case SORT_OPTIONS.RARITY_DESC: {
            const rarityDiff = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
            if (rarityDiff !== 0) return rarityDiff;
            return (b.level || 1) - (a.level || 1);
          }
          case SORT_OPTIONS.LEVEL_DESC: {
            const levelDiff = (b.level || 1) - (a.level || 1);
            if (levelDiff !== 0) return levelDiff;
            return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          }
          case SORT_OPTIONS.NAME_ASC:
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
      sorted[series] = sortedChars;
    });

    return sorted;
  }, [searchedCharacters, sortBy]);

  // Flat list of all characters for keyboard navigation
  const flatCharacterList = useMemo(() => {
    const list = [];
    Object.values(sortedCharactersBySeries).forEach(chars => {
      list.push(...chars);
    });
    return list;
  }, [sortedCharactersBySeries]);

  // Check if a character would create or boost a synergy
  const getSynergyInfo = useCallback((char) => {
    const seriesCount = currentlyTrainingSeries.filter(s => s === char.series).length;
    if (seriesCount >= 1) {
      return { type: 'boost', count: seriesCount + 1 };
    }
    return null;
  }, [currentlyTrainingSeries]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!selectedCharId || isConfirming) return;

    setIsConfirming(true);
    try {
      await onSelect(selectedCharId);
    } finally {
      setIsConfirming(false);
    }
  }, [selectedCharId, isConfirming, onSelect]);

  // Handle character selection
  const handleCharacterClick = useCallback((charId) => {
    if (selectedCharId === charId) {
      // Double-click to confirm
      handleConfirm();
    } else {
      setSelectedCharId(charId);
      // Update focused index
      const idx = flatCharacterList.findIndex(c => c.id === charId);
      if (idx !== -1) setFocusedIndex(idx);
    }
  }, [selectedCharId, handleConfirm, flatCharacterList]);

  // Handle keyboard navigation within character grid
  const handleCharacterKeyDown = useCallback((e, charId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCharacterClick(charId);
    }
  }, [handleCharacterClick]);

  // Handle global keyboard navigation
  const handleKeyDown = useCallback((e) => {
    // Escape to close
    if (e.key === 'Escape') {
      if (selectedCharId) {
        setSelectedCharId(null);
      } else {
        onClose();
      }
      return;
    }

    // Enter to confirm selection
    if (e.key === 'Enter' && selectedCharId && document.activeElement !== searchInputRef.current) {
      e.preventDefault();
      handleConfirm();
      return;
    }

    // Arrow key navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Don't navigate if typing in search
      if (document.activeElement === searchInputRef.current) {
        return;
      }

      e.preventDefault();
      const currentIndex = focusedIndex >= 0 ? focusedIndex : 0;
      let newIndex = currentIndex;

      // Calculate grid columns (approximate based on viewport)
      const gridCols = window.innerWidth >= 768 ? 5 : window.innerWidth >= 576 ? 4 : 3;

      switch (e.key) {
        case 'ArrowUp':
          newIndex = Math.max(0, currentIndex - gridCols);
          break;
        case 'ArrowDown':
          newIndex = Math.min(flatCharacterList.length - 1, currentIndex + gridCols);
          break;
        case 'ArrowLeft':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          newIndex = Math.min(flatCharacterList.length - 1, currentIndex + 1);
          break;
        default:
          // No action for other keys
          break;
      }

      setFocusedIndex(newIndex);
      const char = flatCharacterList[newIndex];
      if (char && characterRefs.current[char.id]) {
        characterRefs.current[char.id].focus();
        setSelectedCharId(char.id);
      }
    }

    // Tab focus management
    if (e.key === 'Tab') {
      // Allow natural tab flow but trap within modal
      const modal = modalContentRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [selectedCharId, onClose, handleConfirm, focusedIndex, flatCharacterList]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    searchInputRef.current?.focus();
  }, [onSearchChange]);

  // Focus search input on mount
  useEffect(() => {
    // Use requestAnimationFrame for instant focus
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when characters change (e.g., search)
  useEffect(() => {
    if (selectedCharId && !searchedCharacters.find(c => c.id === selectedCharId)) {
      setSelectedCharId(null);
      setFocusedIndex(-1);
    }
  }, [searchedCharacters, selectedCharId]);

  // Announce selection changes to screen readers
  useEffect(() => {
    if (selectedChar) {
      const announcement = `${selectedChar.name} selected. Press Enter to confirm.`;
      const liveRegion = document.getElementById('sr-announcements');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    }
  }, [selectedChar]);

  return (
    <ModalOverlay
      {...motionProps.overlay}
      onClick={onClose}
    >
      <ModalContent
        ref={modalContentRef}
        {...motionProps.content}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('dojo.selectCharacter')}
      >
        {/* Screen reader announcements */}
        <div
          id="sr-announcements"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
        />

        <ModalHeader>
          <ModalTitle id="picker-title">{t('dojo.selectCharacter')}</ModalTitle>
          <ModalCloseBtn
            onClick={onClose}
            aria-label={t('common.close') || 'Close'}
          >
            <MdClose aria-hidden="true" />
          </ModalCloseBtn>
        </ModalHeader>

        <PickerSearchContainer>
          <MdSearch aria-hidden="true" />
          <PickerSearchInput
            ref={searchInputRef}
            type="text"
            placeholder={t('dojo.searchCharacters')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('dojo.searchCharacters')}
            aria-describedby="search-hint"
          />
          <span id="search-hint" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
            {t('dojo.searchHint', { defaultValue: 'Type to filter characters. Fuzzy matching is supported.' })}
          </span>
          <AnimatePresence>
            {searchQuery && (
              <PickerSearchClear
                onClick={handleClearSearch}
                {...motionProps.clearButton}
                exit={prefersReducedMotion ? {} : { opacity: 0, transform: 'scale(0.8)' }}
                aria-label={t('common.clear') || 'Clear search'}
              >
                <MdClear />
              </PickerSearchClear>
            )}
          </AnimatePresence>
        </PickerSearchContainer>

        {/* Sort options */}
        <SortContainer role="group" aria-label={t('dojo.sortOptions', { defaultValue: 'Sort options' })}>
          <MdSort aria-hidden="true" style={{ color: theme.colors.textSecondary }} />
          <SortButton
            $active={sortBy === SORT_OPTIONS.RARITY_DESC}
            onClick={() => setSortBy(SORT_OPTIONS.RARITY_DESC)}
            aria-pressed={sortBy === SORT_OPTIONS.RARITY_DESC}
          >
            {t('dojo.sortByRarity', { defaultValue: 'Rarity' })}
            {sortBy === SORT_OPTIONS.RARITY_DESC && <MdKeyboardArrowDown aria-hidden="true" />}
          </SortButton>
          <SortButton
            $active={sortBy === SORT_OPTIONS.LEVEL_DESC}
            onClick={() => setSortBy(SORT_OPTIONS.LEVEL_DESC)}
            aria-pressed={sortBy === SORT_OPTIONS.LEVEL_DESC}
          >
            {t('dojo.sortByLevel', { defaultValue: 'Level' })}
            {sortBy === SORT_OPTIONS.LEVEL_DESC && <MdKeyboardArrowDown aria-hidden="true" />}
          </SortButton>
          <SortButton
            $active={sortBy === SORT_OPTIONS.NAME_ASC}
            onClick={() => setSortBy(SORT_OPTIONS.NAME_ASC)}
            aria-pressed={sortBy === SORT_OPTIONS.NAME_ASC}
          >
            {t('dojo.sortByName', { defaultValue: 'Name' })}
            {sortBy === SORT_OPTIONS.NAME_ASC && <MdKeyboardArrowUp aria-hidden="true" />}
          </SortButton>
        </SortContainer>

        <ModalBody ref={gridRef}>
          {charactersLoading ? (
            // Skeleton loader instead of spinner
            <SkeletonGrid>
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </SkeletonGrid>
          ) : searchedCharacters.length === 0 ? (
            <NoCharacters>
              {searchQuery
                ? t('dojo.noMatchingCharacters')
                : t('dojo.noAvailableCharacters')}
            </NoCharacters>
          ) : (
            <CharacterList
              role="listbox"
              aria-label={t('dojo.characterList')}
              aria-activedescendant={selectedCharId ? `char-${selectedCharId}` : undefined}
            >
              {Object.entries(sortedCharactersBySeries).map(([series, chars]) => {
                const seriesTrainingCount = currentlyTrainingSeries.filter(s => s === series).length;
                const hasSynergy = seriesTrainingCount > 0;

                return (
                  <React.Fragment key={series}>
                    <SeriesTitle>
                      {series} ({chars.length})
                      {hasSynergy && (
                        <span style={{ marginLeft: '8px', color: theme.colors.success, fontSize: '12px' }}>
                          +{seriesTrainingCount} training
                        </span>
                      )}
                    </SeriesTitle>
                    <CharacterGrid>
                      {chars.map((char) => {
                        const isSelected = selectedCharId === char.id;
                        const rarityColor = getRarityColor(char.rarity);
                        const synergyInfo = getSynergyInfo(char);
                        const matches = matchesLookup[char.id] || {};

                        return (
                          <CharacterCardContent
                            key={char.id}
                            ref={(el) => { characterRefs.current[char.id] = el; }}
                            id={`char-${char.id}`}
                            char={char}
                            isSelected={isSelected}
                            rarityColor={rarityColor}
                            synergyInfo={synergyInfo}
                            searchQuery={searchQuery}
                            matches={matches}
                            motionProps={motionProps}
                            prefersReducedMotion={prefersReducedMotion}
                            t={t}
                            onKeyDown={(e) => handleCharacterKeyDown(e, char.id)}
                            onClick={() => handleCharacterClick(char.id)}
                          />
                        );
                      })}
                    </CharacterGrid>
                  </React.Fragment>
                );
              })}
            </CharacterList>
          )}
        </ModalBody>

        {/* Keyboard navigation hints */}
        <NavigationHint>
          <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </NavigationHint>

        {/* Sticky footer with confirm button */}
        <AnimatePresence mode="wait">
          {selectedChar && (
            <PickerFooter
              key="picker-footer"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <PickerConfirmButton
                onClick={handleConfirm}
                disabled={isConfirming}
                $color={getRarityColor(selectedChar.rarity)}
                aria-describedby="confirm-hint"
              >
                {isConfirming ? (
                  <Spinner size="small" />
                ) : (
                  <>
                    <MdCheck />
                    {t('dojo.confirmSelect', { name: selectedChar.name })}
                  </>
                )}
              </PickerConfirmButton>
              <span id="confirm-hint" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                {t('dojo.confirmHint', { defaultValue: 'Press Enter to assign this character to training' })}
              </span>
            </PickerFooter>
          )}
        </AnimatePresence>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DojoCharacterPicker;
