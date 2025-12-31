/**
 * CreateFromDanbooru - Modal for creating characters from Danbooru images
 *
 * Combines Danbooru search/selection with character creation form.
 * Reuses existing Danbooru search logic from AltMediaPicker.
 *
 * Flow:
 * 1. User searches Danbooru for images
 * 2. User selects an image
 * 3. User fills in character details (name, series, rarity)
 * 4. Character is created with Danbooru metadata preserved
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaImage, FaTimes, FaSearch, FaStar, FaSpinner, FaCheck,
  FaPlay, FaUser, FaTv, FaTag, FaPlus, FaArrowLeft, FaCheckCircle
} from 'react-icons/fa';
import api from '../../utils/api';
import { theme } from '../../design-system';
import { useRarity } from '../../context/RarityContext';
import { IconR18 } from '../../constants/icons';
import { isDuplicateError, getDuplicateInfo } from '../../utils/errorHandler';
import DuplicateWarningBanner from '../UI/DuplicateWarningBanner';

/**
 * Parse character name from Danbooru character tag
 * Format: character_name_(series) -> Character Name
 *
 * @param {string} characterTag - Raw character tag from Danbooru (e.g., "2b_(nier:automata)")
 * @returns {string} - Formatted character name
 */
const parseCharacterName = (characterTag) => {
  if (!characterTag) return '';

  // Get first tag if multiple (space-separated)
  const firstTag = characterTag.split(' ')[0];

  // Extract name before _(series) suffix
  const nameMatch = firstTag.match(/^(.+?)_\([^)]+\)$/);
  const rawName = nameMatch ? nameMatch[1] : firstTag;

  // Format: replace underscores with spaces and title case
  return rawName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Parse series name from Danbooru copyright tag
 * Format: series_name -> Series Name
 *
 * @param {string} copyrightTag - Raw copyright tag from Danbooru (e.g., "nier:automata")
 * @returns {string} - Formatted series name
 */
const parseSeriesName = (copyrightTag) => {
  if (!copyrightTag) return '';

  // Get first tag if multiple (space-separated)
  const firstTag = copyrightTag.split(' ')[0];

  // Format: replace underscores with spaces and title case
  return firstTag
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Outfit/variant keyword mappings for auto-detection
 * Priority order: seasonal > special outfits > common outfits
 * First match wins, so order matters
 *
 * Based on Danbooru tag popularity and common costume variants
 */
const OUTFIT_VARIANTS = [
  // Seasonal (high priority - limited editions)
  { tags: ['christmas', 'santa_costume', 'santa_hat', 'santa_dress'], label: 'Christmas' },
  { tags: ['halloween', 'jack-o\'-lantern', 'halloween_costume'], label: 'Halloween' },
  { tags: ['valentine', 'valentines_day', 'heart_background'], label: 'Valentine' },
  { tags: ['new_year', 'new_years', 'kadomatsu', 'ema_(object)'], label: 'New Year' },
  { tags: ['easter', 'easter_egg', 'easter_bunny'], label: 'Easter' },

  // Wedding/Formal
  { tags: ['wedding_dress', 'bridal_veil', 'bride'], label: 'Wedding' },
  { tags: ['formal', 'evening_gown', 'ball_gown', 'formal_clothes'], label: 'Formal' },
  { tags: ['tuxedo', 'suit', 'business_suit'], label: 'Suit' },

  // Swimwear
  { tags: ['swimsuit', 'bikini', 'one-piece_swimsuit', 'competition_swimsuit'], label: 'Swimsuit' },
  { tags: ['school_swimsuit', 'sukumizu'], label: 'School Swimsuit' },
  { tags: ['beach', 'ocean', 'poolside'], label: 'Summer' },

  // Traditional Japanese
  { tags: ['kimono', 'furisode', 'uchikake'], label: 'Kimono' },
  { tags: ['yukata'], label: 'Yukata' },
  { tags: ['miko', 'nontraditional_miko', 'hakama'], label: 'Miko' },
  { tags: ['fundoshi', 'sarashi'], label: 'Fundoshi' },

  // Traditional Other
  { tags: ['chinese_clothes', 'china_dress', 'qipao', 'changpao'], label: 'Chinese Dress' },
  { tags: ['hanbok'], label: 'Hanbok' },
  { tags: ['ao_dai'], label: 'Ao Dai' },
  { tags: ['dirndl'], label: 'Dirndl' },

  // Costumes/Uniforms
  { tags: ['school_uniform', 'serafuku', 'sailor_collar', 'gakuran'], label: 'School' },
  { tags: ['gym_uniform', 'buruma', 'bloomers'], label: 'Gym' },
  { tags: ['maid', 'maid_headdress', 'maid_apron', 'wa_maid', 'victorian_maid'], label: 'Maid' },
  { tags: ['bunny_girl', 'playboy_bunny', 'bunnysuit', 'rabbit_ears'], label: 'Bunny' },
  { tags: ['nurse', 'nurse_cap', 'nurse_dress'], label: 'Nurse' },
  { tags: ['cheerleader', 'cheerleader_uniform', 'pom_poms'], label: 'Cheerleader' },
  { tags: ['police', 'police_uniform', 'policewoman'], label: 'Police' },
  { tags: ['military', 'military_uniform', 'soldier', 'naval_uniform'], label: 'Military' },
  { tags: ['idol', 'idol_clothes'], label: 'Idol' },
  { tags: ['race_queen', 'racing_suit'], label: 'Race Queen' },
  { tags: ['office_lady', 'pencil_skirt', 'business_suit'], label: 'Office Lady' },
  { tags: ['waitress'], label: 'Waitress' },

  // Fantasy/Magical
  { tags: ['witch', 'witch_hat'], label: 'Witch' },
  { tags: ['vampire', 'vampire_costume'], label: 'Vampire' },
  { tags: ['angel', 'angel_wings', 'halo'], label: 'Angel' },
  { tags: ['demon', 'demon_girl', 'demon_horns', 'devil'], label: 'Demon' },
  { tags: ['magical_girl', 'mahou_shoujo'], label: 'Magical Girl' },
  { tags: ['fairy', 'fairy_wings'], label: 'Fairy' },
  { tags: ['elf', 'pointy_ears'], label: 'Elf' },
  { tags: ['princess', 'tiara', 'crown'], label: 'Princess' },
  { tags: ['mermaid', 'mermaid_tail'], label: 'Mermaid' },

  // Animal/Kemonomimi
  { tags: ['catgirl', 'cat_ears', 'cat_tail', 'nekomimi'], label: 'Cat' },
  { tags: ['fox_girl', 'fox_ears', 'fox_tail', 'kitsune'], label: 'Fox' },
  { tags: ['wolf_girl', 'wolf_ears', 'wolf_tail'], label: 'Wolf' },
  { tags: ['dog_girl', 'dog_ears', 'dog_tail', 'inumimi'], label: 'Dog' },
  { tags: ['rabbit_girl', 'rabbit_ears', 'rabbit_tail', 'usagimimi'], label: 'Rabbit' },

  // Historical/Themed
  { tags: ['pirate', 'pirate_costume', 'pirate_hat'], label: 'Pirate' },
  { tags: ['ninja', 'kunoichi'], label: 'Ninja' },
  { tags: ['samurai', 'katana', 'ronin'], label: 'Samurai' },
  { tags: ['cowboy', 'cowgirl', 'cowboy_western', 'cowboy_hat'], label: 'Cowgirl' },
  { tags: ['sailor', 'sailor_dress', 'sailor_hat'], label: 'Sailor' },

  // Fashion Styles
  { tags: ['gothic_lolita', 'gothic'], label: 'Gothic' },
  { tags: ['lolita_fashion', 'sweet_lolita', 'classic_lolita'], label: 'Lolita' },
  { tags: ['steampunk'], label: 'Steampunk' },
  { tags: ['cyberpunk'], label: 'Cyberpunk' },
  { tags: ['punk', 'punk_fashion'], label: 'Punk' },

  // Casual/Sportswear
  { tags: ['sportswear', 'sports_bra', 'gym_uniform'], label: 'Sportswear' },
  { tags: ['track_suit', 'tracksuit'], label: 'Tracksuit' },
  { tags: ['pajamas', 'sleepwear', 'nightgown'], label: 'Pajamas' },
  { tags: ['casual', 'casual_clothes'], label: 'Casual' },
  { tags: ['naked_apron', 'apron'], label: 'Apron' },
  { tags: ['hoodie', 'hooded'], label: 'Hoodie' },

  // Fantasy/Armor
  { tags: ['armor', 'full_armor', 'knight', 'bikini_armor'], label: 'Armor' },
  { tags: ['cape', 'cloak'], label: 'Cape' },

  // Other Costumes
  { tags: ['nun', 'habit'], label: 'Nun' },
  { tags: ['priest', 'cassock'], label: 'Priest' },
  { tags: ['kigurumi', 'animal_costume'], label: 'Kigurumi' },
  { tags: ['ghost_costume', 'jiangshi_costume'], label: 'Ghost' },
  { tags: ['reindeer_costume'], label: 'Reindeer' },
  { tags: ['superhero', 'superhero_costume'], label: 'Superhero' },
  { tags: ['plugsuit', 'bodysuit'], label: 'Plugsuit' },
  { tags: ['leotard', 'unitard'], label: 'Leotard' },
];

/**
 * Detect outfit variant from Danbooru general tags
 *
 * @param {string} generalTags - Space-separated general tags from Danbooru
 * @returns {string|null} - Detected variant label or null
 */
const detectOutfitVariant = (generalTags) => {
  if (!generalTags) return null;

  const tagSet = new Set(generalTags.toLowerCase().split(' '));

  for (const variant of OUTFIT_VARIANTS) {
    for (const tag of variant.tags) {
      if (tagSet.has(tag)) {
        return variant.label;
      }
    }
  }

  return null;
};

/**
 * CreateFromDanbooru Modal Component
 */
const CreateFromDanbooru = ({
  show,
  onClose,
  onCharacterCreated
}) => {
  const { t } = useTranslation();
  const { getOrderedRarities } = useRarity();
  const orderedRarities = getOrderedRarities();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [results, setResults] = useState([]);
  const [extraTags, setExtraTags] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('score');

  // Selection state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [step, setStep] = useState('search'); // 'search' | 'details'

  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Character form state
  const [characterData, setCharacterData] = useState({
    name: '',
    series: '',
    rarity: 'common',
    isR18: false
  });

  // Error state
  const [duplicateError, setDuplicateError] = useState(null);
  const [error, setError] = useState(null);

  // Hover preview state (desktop only)
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Mobile preview modal state
  const [previewMedia, setPreviewMedia] = useState(null);

  // Already added posts tracking
  const [addedPosts, setAddedPosts] = useState({});

  // Long press handling for mobile
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  // Track if device uses touch to prevent hover on touch devices
  const isTouchDevice = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Ref for form first input
  const nameInputRef = useRef(null);

  // Ref for modal body to track scroll position
  const bodyRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const shouldRestoreScroll = useRef(false);

  // Focus name input when entering details step
  useEffect(() => {
    if (step === 'details' && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Restore scroll position when returning to search step
  useEffect(() => {
    if (step === 'search' && shouldRestoreScroll.current && savedScrollPosition.current > 0) {
      const targetScroll = savedScrollPosition.current;
      let attempts = 0;
      const maxAttempts = 15; // More attempts for large result sets

      const tryRestoreScroll = () => {
        attempts++;
        if (bodyRef.current) {
          const maxScrollable = bodyRef.current.scrollHeight - bodyRef.current.clientHeight;

          // Wait until scroll container is tall enough
          if (maxScrollable < targetScroll && attempts < maxAttempts) {
            setTimeout(tryRestoreScroll, 100);
            return;
          }

          bodyRef.current.scrollTop = targetScroll;

          // Verify scroll was applied (with tolerance)
          const actualScroll = bodyRef.current.scrollTop;
          const scrollSucceeded = Math.abs(actualScroll - targetScroll) < 10 ||
                                  actualScroll >= maxScrollable - 10;

          if (scrollSucceeded || attempts >= maxAttempts) {
            shouldRestoreScroll.current = false;
            return;
          }

          // Retry if scroll didn't work yet
          setTimeout(tryRestoreScroll, 100);
        } else if (attempts < maxAttempts) {
          setTimeout(tryRestoreScroll, 100);
        }
      };

      // Initial delay to let React start rendering
      setTimeout(tryRestoreScroll, 50);
    }
  }, [step]);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSearchQuery('');
      setTags([]);
      setSelectedTag(null);
      setResults([]);
      setExtraTags('');
      setTypeFilter('all');
      setSort('score');
      setSelectedMedia(null);
      setStep('search');
      setCharacterData({ name: '', series: '', rarity: 'common', isR18: false });
      setDuplicateError(null);
      setError(null);
      // Reset scroll tracking refs
      savedScrollPosition.current = 0;
      shouldRestoreScroll.current = false;
    }
  }, [show]);

  // Check which posts are already added to the database
  const checkAddedPosts = useCallback(async (mediaResults) => {
    if (!mediaResults || mediaResults.length === 0) return;

    try {
      const postIds = mediaResults.map(m => m.id);
      const response = await api.post('/anime-import/check-danbooru-posts', { postIds });
      setAddedPosts(prev => ({ ...prev, ...response.data.addedPosts }));
    } catch (err) {
      console.error('Failed to check added posts:', err);
    }
  }, []);

  // Search for tags matching query
  const searchTags = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setTags([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/anime-import/sakuga-tags?q=${encodeURIComponent(query)}`);
      setTags(response.data.tags || []);
    } catch (err) {
      console.error('Tag search failed:', err);
      const isTimeout = err.message?.includes('timeout') || err.code === 'ECONNABORTED';
      setError(isTimeout ? 'Search timed out. Try a more specific search term.' : 'Failed to search tags. Please try again.');
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Select a tag and fetch images
  const selectTag = useCallback(async (tag, currentExtraTags = '', currentTypeFilter = 'all', currentPage = 1, append = false) => {
    if (!append) {
      setSelectedTag(tag);
      setLoading(true);
      setResults([]);
      setPage(1);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(tag.name)}&sort=${sort}&page=${currentPage}`;
      if (currentExtraTags.trim()) {
        url += `&extraTags=${encodeURIComponent(currentExtraTags.trim())}`;
      }
      if (currentTypeFilter !== 'all') {
        url += `&typeFilter=${currentTypeFilter}`;
      }

      const response = await api.get(url);
      const newResults = response.data.results || [];

      if (append) {
        setResults(prev => [...prev, ...newResults]);
      } else {
        setResults(newResults);
      }
      setHasMore(response.data.hasMore || false);
      setPage(currentPage);

      // Check which posts are already added
      checkAddedPosts(newResults);
    } catch (err) {
      console.error('Image search failed:', err);
      const isTimeout = err.message?.includes('timeout') || err.code === 'ECONNABORTED';
      setError(isTimeout ? 'Search timed out. Please try again.' : 'Failed to load images. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, checkAddedPosts]);

  // Change sort order and refresh results
  const changeSort = useCallback(async (newSort) => {
    setSort(newSort);
    if (selectedTag) {
      setLoading(true);
      setResults([]);
      setPage(1);
      try {
        let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(selectedTag.name)}&sort=${newSort}&page=1`;
        if (extraTags.trim()) {
          url += `&extraTags=${encodeURIComponent(extraTags.trim())}`;
        }
        if (typeFilter !== 'all') {
          url += `&typeFilter=${typeFilter}`;
        }
        const response = await api.get(url);
        const newResults = response.data.results || [];
        setResults(newResults);
        setHasMore(response.data.hasMore || false);
        checkAddedPosts(newResults);
      } catch (err) {
        console.error('Image search failed:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [selectedTag, extraTags, typeFilter, checkAddedPosts]);

  // Load more results
  const loadMore = useCallback(() => {
    if (selectedTag && hasMore && !loadingMore) {
      selectTag(selectedTag, extraTags, typeFilter, page + 1, true);
    }
  }, [selectedTag, hasMore, loadingMore, page, extraTags, typeFilter, selectTag]);

  // Apply extra filters
  const applyFilters = useCallback(() => {
    if (selectedTag) {
      selectTag(selectedTag, extraTags, typeFilter, 1, false);
    }
  }, [selectedTag, extraTags, typeFilter, selectTag]);

  // Clear selected tag
  const clearSelectedTag = useCallback(() => {
    setSelectedTag(null);
    setResults([]);
    setExtraTags('');
    setTypeFilter('all');
  }, []);

  // Select media and move to details step
  const handleSelectMedia = useCallback((media) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    // Save scroll position before switching to details step
    if (bodyRef.current) {
      savedScrollPosition.current = bodyRef.current.scrollTop;
      shouldRestoreScroll.current = true;
    }

    setSelectedMedia(media);
    setStep('details');
    setDuplicateError(null);
    setError(null);

    // Auto-fill character name and series from Danbooru tags
    // Priority: media's tags (from the specific post) > selectedTag (from search)
    const characterName = parseCharacterName(media.characterTags);
    const seriesName = parseSeriesName(media.copyrightTags);

    // Detect outfit variant from general tags
    const variant = detectOutfitVariant(media.generalTags);

    // Build final name with variant suffix if detected
    const finalName = characterName
      ? (variant ? `${characterName} (${variant})` : characterName)
      : '';

    setCharacterData(prev => ({
      ...prev,
      name: finalName || prev.name,
      series: seriesName || (selectedTag?.displayName || selectedTag?.name.replace(/_/g, ' ') || prev.series)
    }));
  }, [selectedTag]);

  // Go back to search step
  const handleBackToSearch = useCallback(() => {
    setStep('search');
    setSelectedMedia(null);
    setDuplicateError(null);
    setError(null);
    // Scroll restoration is handled by useEffect watching step changes
  }, []);

  // Handle character form changes
  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setCharacterData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Submit character creation
  const handleSubmit = useCallback(async (e, addAnother = false) => {
    e.preventDefault();
    if (!selectedMedia) return;

    setSubmitting(true);
    setDuplicateError(null);
    setError(null);

    try {
      const response = await api.post('/anime-import/create-from-danbooru', {
        name: characterData.name,
        series: characterData.series,
        rarity: characterData.rarity,
        isR18: characterData.isR18,
        danbooruMedia: selectedMedia
      });

      // Success - notify parent
      if (onCharacterCreated) {
        onCharacterCreated(response.data.character);
      }

      // Mark this post as added in our tracking state
      const createdChar = response.data.character;
      setAddedPosts(prev => ({
        ...prev,
        [selectedMedia.id]: {
          id: createdChar.id,
          name: createdChar.name,
          series: createdChar.series,
          image: createdChar.image
        }
      }));

      if (addAnother) {
        // Go back to search step, keep search state (selectedTag, results, page, etc.)
        // The media now shows "Added" badge instead of being removed
        setSelectedMedia(null);
        setStep('search');
        setCharacterData({ name: '', series: '', rarity: 'common', isR18: false });
        setDuplicateError(null);
        setError(null);
        // Scroll restoration is handled by useEffect watching step changes
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Character creation failed:', err);

      if (isDuplicateError(err)) {
        const duplicateInfo = getDuplicateInfo(err);
        setDuplicateError(duplicateInfo);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to create character');
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedMedia, characterData, onCharacterCreated, onClose]);

  // Close handler
  const handleClose = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setHoveredMedia(null);
    onClose();
  }, [onClose]);

  // Category icons mapping
  const CATEGORY_ICON_COMPONENTS = {
    4: <FaUser />,  // Person/character
    3: <FaTv />,    // Series/show
  };
  const getCategoryIconComponent = (category) => CATEGORY_ICON_COMPONENTS[category] || <FaTag />;

  if (!show) return null;

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={() => handleClose()}
    >
      <Modal
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <Header>
          <h3>
            {step === 'search' ? (
              <><FaImage /> {t('admin.createFromDanbooru', 'Create Character from Danbooru')}</>
            ) : (
              <><FaPlus /> {t('admin.characterDetails', 'Character Details')}</>
            )}
          </h3>
          <CloseButton onClick={handleClose}>
            <FaTimes />
          </CloseButton>
        </Header>

        <Body ref={bodyRef}>
          {step === 'search' ? (
            <>
              {/* Search Step */}
              <SearchRow>
                <SearchInput
                  type="text"
                  placeholder={t('animeImport.searchTagPlaceholder', 'Search for character/series tag...')}
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    searchTags(e.target.value);
                  }}
                />
                {selectedTag && (
                  <SortSelect
                    value={sort}
                    onChange={e => changeSort(e.target.value)}
                  >
                    <option value="score">{t('animeImport.sortScore', 'By Score')}</option>
                    <option value="favorites">{t('animeImport.sortFavorites', 'By Favorites')}</option>
                    <option value="newest">{t('animeImport.sortNewest', 'Newest')}</option>
                    <option value="random">{t('animeImport.sortRandom', 'Random')}</option>
                  </SortSelect>
                )}
              </SearchRow>

              {/* Tag Suggestions */}
              {!selectedTag && tags.length > 0 && (
                <TagList>
                  <TagLabel>{t('animeImport.selectTag', 'Select a tag:')}</TagLabel>
                  {tags.map(tag => (
                    <TagChip
                      key={tag.name}
                      onClick={() => selectTag(tag)}
                      $category={tag.category}
                    >
                      <span>{tag.displayName}</span>
                      <TagMeta>
                        <span>{getCategoryIconComponent(tag.category)}</span>
                        <span>{tag.count.toLocaleString()}</span>
                      </TagMeta>
                    </TagChip>
                  ))}
                </TagList>
              )}

              {/* Selected Tag Info */}
              {selectedTag && (
                <>
                  <SelectedTagBar>
                    <SelectedTagName>
                      {getCategoryIconComponent(selectedTag.category)}
                      {selectedTag.displayName}
                    </SelectedTagName>
                    <SmallButton onClick={clearSelectedTag}>
                      {t('animeImport.changeTag', 'Change Tag')}
                    </SmallButton>
                  </SelectedTagBar>

                  {/* Extra Filters Row */}
                  <FilterRow>
                    <ExtraTagsInput
                      type="text"
                      placeholder={t('animeImport.extraTagsPlaceholder', 'Additional tags (e.g. solo, 1girl)')}
                      value={extraTags}
                      onChange={e => setExtraTags(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyFilters()}
                    />
                    <TypeSelect
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                    >
                      <option value="all">{t('animeImport.typeAll', 'All Types')}</option>
                      <option value="animated">{t('animeImport.typeAnimated', 'Animated Only')}</option>
                      <option value="static">{t('animeImport.typeStatic', 'Static Only')}</option>
                    </TypeSelect>
                    <FilterApplyButton onClick={applyFilters}>
                      <FaSearch /> {t('animeImport.applyFilters', 'Apply')}
                    </FilterApplyButton>
                  </FilterRow>
                </>
              )}

              {/* Results */}
              {loading ? (
                <LoadingText>
                  <FaSpinner className="spin" /> {t('animeImport.searchingVideos', 'Searching...')}
                </LoadingText>
              ) : error ? (
                <ErrorText>{error}</ErrorText>
              ) : selectedTag && results.length === 0 ? (
                <EmptyText>{t('animeImport.noVideosFound', 'No results found')}</EmptyText>
              ) : results.length > 0 ? (
                <>
                  <ResultsInfo>
                    {t('animeImport.showingResults', 'Showing')} {results.length} {t('animeImport.results', 'results')}
                    {hasMore && ` (${t('animeImport.moreAvailable', 'more available')})`}
                  </ResultsInfo>
                  <MediaGrid>
                    {results.map(media => {
                      const isAdded = !!addedPosts[media.id];
                      const addedChar = addedPosts[media.id];
                      return (
                        <MediaCard
                          key={media.id}
                          onClick={() => handleSelectMedia(media)}
                          onMouseEnter={(e) => {
                            // Only show hover preview on non-touch devices
                            if (isTouchDevice.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                            setHoveredMedia(media);
                          }}
                          onMouseLeave={() => {
                            // Only handle if not touch device
                            if (!isTouchDevice.current) {
                              setHoveredMedia(null);
                            }
                          }}
                          onTouchStart={(e) => {
                            // Mark as touch device to disable hover behavior
                            isTouchDevice.current = true;
                            // Clear any hover state from previous mouse interaction
                            setHoveredMedia(null);

                            // Store touch position for move detection
                            const touch = e.touches[0];
                            touchStartPos.current = { x: touch.clientX, y: touch.clientY };

                            longPressTriggered.current = false;
                            longPressTimer.current = setTimeout(() => {
                              longPressTriggered.current = true;
                              setPreviewMedia(media);
                            }, 400);
                          }}
                          onTouchEnd={() => {
                            if (longPressTimer.current) {
                              clearTimeout(longPressTimer.current);
                              longPressTimer.current = null;
                            }
                          }}
                          onTouchMove={(e) => {
                            // Cancel long press if user moves finger more than 10px
                            if (longPressTimer.current) {
                              const touch = e.touches[0];
                              const dx = touch.clientX - touchStartPos.current.x;
                              const dy = touch.clientY - touchStartPos.current.y;
                              const distance = Math.sqrt(dx * dx + dy * dy);

                              if (distance > 10) {
                                clearTimeout(longPressTimer.current);
                                longPressTimer.current = null;
                              }
                            }
                          }}
                          onContextMenu={(e) => {
                            // Prevent native context menu on long-press (iOS image preview)
                            e.preventDefault();
                          }}
                          $isAnimated={media.isAnimated}
                          $isAdded={isAdded}
                        >
                          <img src={media.preview} alt="Danbooru media option" />
                          <MediaFormat $isAnimated={media.isAnimated}>
                            {media.isAnimated ? <><FaPlay /> {media.fileExt?.toUpperCase()}</> : media.fileExt?.toUpperCase()}
                          </MediaFormat>
                          <MediaScore>
                            <FaStar /> {media.score}
                          </MediaScore>
                          {isAdded && (
                            <AddedBadge title={`Added as: ${addedChar.name}`}>
                              <FaCheckCircle /> {t('animeImport.added', 'Added')}
                            </AddedBadge>
                          )}
                          <SelectOverlay $isAdded={isAdded}>
                            {isAdded ? (
                              <>{t('animeImport.alreadyAdded', 'Already Added')}</>
                            ) : (
                              <><FaCheck /> {t('animeImport.selectThis', 'Select')}</>
                            )}
                          </SelectOverlay>
                        </MediaCard>
                      );
                    })}
                  </MediaGrid>

                  {/* Hover Preview */}
                  <AnimatePresence>
                    {hoveredMedia && (
                      <HoverPreviewContainer
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          left: Math.min(hoverPosition.x, window.innerWidth - 340),
                          top: Math.max(hoverPosition.y - 280, 10)
                        }}
                      >
                        {hoveredMedia.isAnimated ? (
                          <HoverPreviewVideo src={hoveredMedia.file} autoPlay loop muted playsInline />
                        ) : (
                          <HoverPreviewImage src={hoveredMedia.file} alt="Preview" />
                        )}
                        <HoverPreviewInfo>
                          <span><FaStar /> {hoveredMedia.score}</span>
                          <span>{hoveredMedia.fileExt?.toUpperCase()}</span>
                        </HoverPreviewInfo>
                      </HoverPreviewContainer>
                    )}
                  </AnimatePresence>

                  {hasMore && (
                    <LoadMoreButton onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? (
                        <><FaSpinner className="spin" /> {t('animeImport.loadingMore', 'Loading...')}</>
                      ) : (
                        <>{t('animeImport.loadMore', 'Load More')}</>
                      )}
                    </LoadMoreButton>
                  )}

                  {/* Mobile Preview Modal - fullscreen overlay for better mobile experience */}
                  <AnimatePresence>
                    {previewMedia && (
                      <MobilePreviewOverlay
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewMedia(null)}
                      >
                        <MobilePreviewContent
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.9 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {previewMedia.isAnimated ? (
                            <MobilePreviewVideo src={previewMedia.file} autoPlay loop muted playsInline controls />
                          ) : (
                            <MobilePreviewImage src={previewMedia.file || previewMedia.sample} alt="Preview" />
                          )}
                          <MobilePreviewInfo>
                            <span><FaStar /> {previewMedia.score}</span>
                            <span>{previewMedia.fileExt?.toUpperCase()}</span>
                            <span>ID: {previewMedia.id}</span>
                            {addedPosts[previewMedia.id] && (
                              <MobilePreviewAdded>
                                <FaCheckCircle /> {t('animeImport.addedAs', 'Added as')}: {addedPosts[previewMedia.id].name}
                              </MobilePreviewAdded>
                            )}
                          </MobilePreviewInfo>
                          <MobilePreviewActions>
                            <MobilePreviewButton onClick={() => setPreviewMedia(null)}>
                              <FaTimes /> {t('common.close', 'Close')}
                            </MobilePreviewButton>
                            <MobilePreviewButton
                              $primary
                              onClick={() => {
                                setPreviewMedia(null);
                                handleSelectMedia(previewMedia);
                              }}
                            >
                              <FaCheck /> {t('animeImport.selectThis', 'Select')}
                            </MobilePreviewButton>
                          </MobilePreviewActions>
                        </MobilePreviewContent>
                      </MobilePreviewOverlay>
                    )}
                  </AnimatePresence>
                </>
              ) : !selectedTag && tags.length === 0 && !loading ? (
                <EmptyText>{t('animeImport.typeToSearch', 'Type to search for character/series tags')}</EmptyText>
              ) : null}
            </>
          ) : (
            <>
              {/* Details Step */}
              <BackButton onClick={handleBackToSearch}>
                <FaArrowLeft /> {t('common.back', 'Back to Search')}
              </BackButton>

              {/* Selected Image Preview */}
              {selectedMedia && (
                <PreviewSection>
                  <PreviewLabel>{t('admin.selectedImage', 'Selected Image')}</PreviewLabel>
                  <PreviewContainer>
                    {selectedMedia.isAnimated ? (
                      <PreviewVideo src={selectedMedia.file} autoPlay loop muted playsInline />
                    ) : (
                      <PreviewImage src={selectedMedia.sample || selectedMedia.file} alt="Selected" />
                    )}
                    <PreviewMeta>
                      <span><FaStar /> {selectedMedia.score}</span>
                      <span>{selectedMedia.fileExt?.toUpperCase()}</span>
                      <span>ID: {selectedMedia.id}</span>
                    </PreviewMeta>
                  </PreviewContainer>
                </PreviewSection>
              )}

              {/* Character Form */}
              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="danbooru-char-name">{t('admin.name', 'Name')} *</Label>
                  <Input
                    ref={nameInputRef}
                    id="danbooru-char-name"
                    type="text"
                    name="name"
                    value={characterData.name}
                    onChange={handleFormChange}
                    required
                    autoComplete="off"
                    placeholder={t('admin.characterNamePlaceholder', 'Character name')}
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="danbooru-char-series">{t('admin.series', 'Series')} *</Label>
                  <Input
                    id="danbooru-char-series"
                    type="text"
                    name="series"
                    value={characterData.series}
                    onChange={handleFormChange}
                    required
                    autoComplete="off"
                    placeholder={t('admin.seriesPlaceholder', 'Series/anime name')}
                  />
                </FormGroup>

                <FormRow>
                  <FormGroup style={{ flex: 1 }}>
                    <Label htmlFor="danbooru-char-rarity">{t('admin.rarity', 'Rarity')}</Label>
                    <Select
                      id="danbooru-char-rarity"
                      name="rarity"
                      value={characterData.rarity}
                      onChange={handleFormChange}
                    >
                      {orderedRarities.map(rarity => (
                        <option key={rarity.name} value={rarity.name}>
                          {rarity.displayName}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>&nbsp;</Label>
                    <CheckboxLabel $padded $highlight>
                      <input
                        id="danbooru-char-r18"
                        type="checkbox"
                        name="isR18"
                        checked={characterData.isR18}
                        onChange={handleFormChange}
                      />
                      <span><IconR18 aria-hidden="true" /> {t('admin.r18', 'R18')}</span>
                    </CheckboxLabel>
                  </FormGroup>
                </FormRow>

                {/* Error Display */}
                {error && (
                  <ErrorMessage>{error}</ErrorMessage>
                )}

                {/* Duplicate Error */}
                {duplicateError && (
                  <DuplicateWarningBanner
                    status={duplicateError.status}
                    explanation={duplicateError.explanation}
                    similarity={duplicateError.similarity}
                    existingMatch={duplicateError.existingMatch}
                    mediaType={selectedMedia?.isAnimated ? 'video' : 'image'}
                    onChangeMedia={handleBackToSearch}
                  />
                )}

                <ButtonRow>
                  <SubmitButton
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={submitting || duplicateError}
                    aria-busy={submitting}
                    $variant="secondary"
                  >
                    {submitting ? (
                      <><FaSpinner className="spin" /> {t('admin.creating', 'Creating...')}</>
                    ) : (
                      <><FaPlus /> {t('createFromDanbooru.addAndContinue', 'Add & Continue')}</>
                    )}
                  </SubmitButton>
                  <SubmitButton
                    type="submit"
                    disabled={submitting || duplicateError}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <><FaSpinner className="spin" /> {t('admin.creating', 'Creating...')}</>
                    ) : (
                      <><FaCheck /> {t('createFromDanbooru.addAndClose', 'Add & Close')}</>
                    )}
                  </SubmitButton>
                </ButtonRow>
              </Form>
            </>
          )}
        </Body>

        <Footer>
          <SourceNote>{t('animeImport.danbooru', 'Images from Danbooru')}</SourceNote>
          <SmallButton onClick={handleClose}>{t('common.cancel', 'Cancel')}</SmallButton>
        </Footer>
      </Modal>
    </Overlay>
  );
};

CreateFromDanbooru.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCharacterCreated: PropTypes.func
};

CreateFromDanbooru.defaultProps = {
  onCharacterCreated: null
};

// Styled Components
const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
`;

const Modal = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 750px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(155, 89, 182, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;

    svg { color: #9b59b6; }
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #aaa;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 200px;

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SearchRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
`;

const SearchInput = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #9b59b6;
  }

  &::placeholder { color: #666; }
`;

const SortSelect = styled.select`
  background: rgba(155, 89, 182, 0.2);
  border: 1px solid rgba(155, 89, 182, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #9b59b6;
  }

  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const TagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
`;

const TagLabel = styled.span`
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const TagChip = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props =>
    props.$category === 4 ? 'rgba(46, 204, 113, 0.15)' :
    props.$category === 3 ? 'rgba(52, 152, 219, 0.15)' :
    'rgba(255, 255, 255, 0.08)'};
  border: 1px solid ${props =>
    props.$category === 4 ? 'rgba(46, 204, 113, 0.3)' :
    props.$category === 3 ? 'rgba(52, 152, 219, 0.3)' :
    'rgba(255, 255, 255, 0.15)'};
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: ${props =>
      props.$category === 4 ? 'rgba(46, 204, 113, 0.25)' :
      props.$category === 3 ? 'rgba(52, 152, 219, 0.25)' :
      'rgba(255, 255, 255, 0.12)'};
    transform: translateX(4px);
  }
`;

const TagMeta = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 0.8rem;
`;

const SelectedTagBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(155, 89, 182, 0.15);
  border: 1px solid rgba(155, 89, 182, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 15px;
`;

const SelectedTagName = styled.span`
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SmallButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const ExtraTagsInput = styled.input`
  flex: 1;
  min-width: 150px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 0.85rem;

  &:focus {
    outline: none;
    border-color: #9b59b6;
  }

  &::placeholder { color: #666; }
`;

const TypeSelect = styled.select`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #9b59b6;
  }

  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const FilterApplyButton = styled.button`
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  border: none;
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(155, 89, 182, 0.3);
  }
`;

const LoadingText = styled.p`
  color: #888;
  text-align: center;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const EmptyText = styled.p`
  color: #666;
  text-align: center;
  padding: 30px;
`;

const ErrorText = styled.p`
  color: #e74c3c;
  text-align: center;
  padding: 30px;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 8px;
  margin: 10px 0;
`;

const ResultsInfo = styled.div`
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 10px;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const MediaCard = styled.div`
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props =>
    props.$isAdded ? 'rgba(46, 204, 113, 0.7)' :
    props.$isAnimated ? 'rgba(155, 89, 182, 0.5)' : 'transparent'};
  transition: border-color 0.2s, transform 0.2s, opacity 0.2s;
  opacity: ${props => props.$isAdded ? 0.7 : 1};

  /* iOS-specific touch handling */
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  /* Only apply hover effects on devices that support hover */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: ${props => props.$isAdded ? 'rgba(46, 204, 113, 0.9)' : '#9b59b6'};
      opacity: 1;
      transform: scale(1.05);
    }
  }

  /* Active/pressed state for touch */
  &:active {
    transform: scale(0.95);
  }

  img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
    /* Prevent iOS image save dialog on long press */
    -webkit-touch-callout: none;
    pointer-events: none;
  }
`;

const MediaFormat = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  background: ${props => props.$isAnimated
    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
    : 'rgba(0, 0, 0, 0.7)'};
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const MediaScore = styled.div`
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffc107;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const SelectOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.$isAdded
    ? 'linear-gradient(transparent, rgba(46, 204, 113, 0.9))'
    : 'linear-gradient(transparent, rgba(155, 89, 182, 0.9))'};
  color: #fff;
  padding: 20px 8px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;

  /* Only show on hover for devices that support it */
  @media (hover: hover) and (pointer: fine) {
    ${MediaCard}:hover & {
      opacity: 1;
    }
  }

  /* Show on active/pressed for touch devices */
  ${MediaCard}:active & {
    opacity: 1;
  }
`;

const AddedBadge = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 2;
`;

const LoadMoreButton = styled.button`
  width: 100%;
  background: rgba(155, 89, 182, 0.2);
  border: 1px solid rgba(155, 89, 182, 0.4);
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: rgba(155, 89, 182, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HoverPreviewContainer = styled(motion.div)`
  position: fixed;
  z-index: 10002;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(155, 89, 182, 0.4);
  transform: translateX(-50%);
  pointer-events: none;
  max-width: 320px;
  max-height: 280px;

  /* Hide on touch devices - they use the mobile preview modal instead */
  @media (hover: none), (pointer: coarse) {
    display: none;
  }
`;

const HoverPreviewImage = styled.img`
  display: block;
  max-width: 300px;
  max-height: 240px;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
`;

const HoverPreviewVideo = styled.video`
  display: block;
  max-width: 300px;
  max-height: 240px;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
`;

const HoverPreviewInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px 2px;
  color: #aaa;
  font-size: 0.75rem;

  span {
    display: flex;
    align-items: center;
    gap: 4px;

    svg {
      color: #ffc107;
      font-size: 10px;
    }
  }
`;

// Details Step Styles
const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: #9b59b6;
  padding: 0;
  font-size: 0.9rem;
  cursor: pointer;
  margin-bottom: 20px;
  transition: color 0.2s;

  &:hover {
    color: #b07cc9;
  }
`;

const PreviewSection = styled.div`
  margin-bottom: 20px;
`;

const PreviewLabel = styled.div`
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const PreviewContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  width: auto;
  height: auto;
  object-fit: contain;
`;

const PreviewVideo = styled.video`
  max-width: 100%;
  max-height: 200px;
  width: auto;
  height: auto;
  object-fit: contain;
`;

const PreviewMeta = styled.div`
  display: flex;
  gap: 15px;
  padding: 10px;
  color: #888;
  font-size: 0.8rem;
  width: 100%;
  justify-content: center;

  span {
    display: flex;
    align-items: center;
    gap: 4px;

    svg {
      color: #ffc107;
    }
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-end;
`;

const Label = styled.label`
  color: #aaa;
  font-size: 0.85rem;
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
  color: #fff;
  font-size: 0.95rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #9b59b6;
  }

  &::placeholder {
    color: #666;
  }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #9b59b6;
  }

  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: ${props => props.$padded ? '12px 14px' : '0'};
  background: ${props => props.$highlight ? 'rgba(231, 76, 60, 0.1)' : 'transparent'};
  border: ${props => props.$highlight ? '1px solid rgba(231, 76, 60, 0.3)' : 'none'};
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.$highlight ? 'rgba(231, 76, 60, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #e74c3c;
  }

  span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.4);
  border-radius: 8px;
  padding: 12px 14px;
  color: #e74c3c;
  font-size: 0.9rem;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const SubmitButton = styled.button`
  flex: 1;
  background: ${props => props.$variant === 'secondary'
    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
    : `linear-gradient(135deg, ${theme.colors.success} 0%, #27ae60 100%)`};
  border: none;
  color: #fff;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === 'secondary'
      ? '0 5px 20px rgba(155, 89, 182, 0.3)'
      : '0 5px 20px rgba(46, 204, 113, 0.3)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SourceNote = styled.span`
  display: inline-block;
  color: #888;
  font-size: 0.75rem;
`;

// Mobile Preview Components
const MobilePreviewOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10003;
  padding: 20px;

  /* iOS safe area handling */
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  padding-left: max(20px, env(safe-area-inset-left));
  padding-right: max(20px, env(safe-area-inset-right));

  /* Prevent any touch issues */
  touch-action: none;
  -webkit-touch-callout: none;
`;

const MobilePreviewContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 16px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(155, 89, 182, 0.3);

  /* Enable scrolling within content if needed */
  touch-action: pan-y;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const MobilePreviewImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 60vh;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
  margin: 0 auto;

  /* Prevent iOS image save on long press */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
`;

const MobilePreviewVideo = styled.video`
  display: block;
  max-width: 100%;
  max-height: 60vh;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
  margin: 0 auto;

  /* Prevent unwanted touch behaviors but allow video controls */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
`;

const MobilePreviewInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 4px;
  color: #aaa;
  font-size: 0.85rem;
  justify-content: center;

  span {
    display: flex;
    align-items: center;
    gap: 4px;

    svg {
      color: #ffc107;
      font-size: 12px;
    }
  }
`;

const MobilePreviewAdded = styled.span`
  width: 100%;
  display: flex;
  justify-content: center;
  color: ${theme.colors.success};
  font-weight: ${theme.fontWeights.semibold};
  margin-top: ${theme.spacing.xs};

  svg {
    color: ${theme.colors.success};
  }
`;

const MobilePreviewActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
`;

const MobilePreviewButton = styled.button`
  flex: 1;
  background: ${props => props.$primary
    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  border: ${props => props.$primary ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'};
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  /* Touch handling */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${props => props.$primary
        ? 'linear-gradient(135deg, #a569bd 0%, #9b59b6 100%)'
        : 'rgba(255, 255, 255, 0.15)'};
    }
  }

  &:active {
    transform: scale(0.97);
    background: ${props => props.$primary
      ? 'linear-gradient(135deg, #a569bd 0%, #9b59b6 100%)'
      : 'rgba(255, 255, 255, 0.15)'};
  }
`;

export default CreateFromDanbooru;
