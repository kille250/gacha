/**
 * useAltMediaSearch - Hook for alternative media search functionality
 *
 * Manages the state and logic for searching and selecting alternative media
 * (images/videos) from external sources like Danbooru.
 */
import { useState, useCallback, useRef } from 'react';
import api from '../utils/api';

/**
 * Hook for managing alternative media search state
 * @param {Function} onMediaSelected - Callback when media is selected
 * @returns {Object} Alt media search state and handlers
 */
export const useAltMediaSearch = (onMediaSelected) => {
  // Character being searched
  const [altMediaCharacter, setAltMediaCharacter] = useState(null);

  // Search state
  const [altMediaSearchQuery, setAltMediaSearchQuery] = useState('');
  const [altMediaTags, setAltMediaTags] = useState([]);
  const [altMediaSelectedTag, setAltMediaSelectedTag] = useState(null);

  // Results state
  const [altMediaResults, setAltMediaResults] = useState([]);
  const [altMediaLoading, setAltMediaLoading] = useState(false);
  const [altMediaLoadingMore, setAltMediaLoadingMore] = useState(false);

  // Pagination
  const [altMediaPage, setAltMediaPage] = useState(1);
  const [altMediaHasMore, setAltMediaHasMore] = useState(false);

  // Filter state
  const [altMediaSort, setAltMediaSort] = useState('score');
  const [altMediaExtraTags, setAltMediaExtraTags] = useState('');
  const [altMediaTypeFilter, setAltMediaTypeFilter] = useState('all');

  // Hover preview state
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Long press for mobile preview
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  // Search for matching Danbooru tags
  const searchTags = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setAltMediaTags([]);
      return;
    }

    setAltMediaLoading(true);
    try {
      const response = await api.get(`/anime-import/sakuga-tags?q=${encodeURIComponent(query)}`);
      setAltMediaTags(response.data.tags || []);
    } catch (err) {
      console.error('Tag search failed:', err);
    } finally {
      setAltMediaLoading(false);
    }
  }, []);

  // Select a tag and load images
  const selectTag = useCallback(async (tag, extraTags = '', typeFilter = 'all', page = 1, append = false) => {
    if (!append) {
      setAltMediaSelectedTag(tag);
      setAltMediaLoading(true);
      setAltMediaResults([]);
      setAltMediaPage(1);
    } else {
      setAltMediaLoadingMore(true);
    }

    try {
      let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(tag.name)}&sort=${altMediaSort}&page=${page}`;
      if (extraTags.trim()) {
        url += `&extraTags=${encodeURIComponent(extraTags.trim())}`;
      }
      if (typeFilter !== 'all') {
        url += `&typeFilter=${typeFilter}`;
      }

      const response = await api.get(url);
      const newResults = response.data.results || [];

      if (append) {
        setAltMediaResults(prev => [...prev, ...newResults]);
      } else {
        setAltMediaResults(newResults);
      }
      setAltMediaHasMore(response.data.hasMore || false);
      setAltMediaPage(page);
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setAltMediaLoading(false);
      setAltMediaLoadingMore(false);
    }
  }, [altMediaSort]);

  // Change sort and reload
  const changeSort = useCallback(async (newSort) => {
    setAltMediaSort(newSort);
    if (altMediaSelectedTag) {
      setAltMediaLoading(true);
      setAltMediaResults([]);
      setAltMediaPage(1);
      try {
        let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(altMediaSelectedTag.name)}&sort=${newSort}&page=1`;
        if (altMediaExtraTags.trim()) {
          url += `&extraTags=${encodeURIComponent(altMediaExtraTags.trim())}`;
        }
        if (altMediaTypeFilter !== 'all') {
          url += `&typeFilter=${altMediaTypeFilter}`;
        }
        const response = await api.get(url);
        setAltMediaResults(response.data.results || []);
        setAltMediaHasMore(response.data.hasMore || false);
      } catch (err) {
        console.error('Image search failed:', err);
      } finally {
        setAltMediaLoading(false);
      }
    }
  }, [altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter]);

  // Load more results
  const loadMore = useCallback(() => {
    if (altMediaSelectedTag && altMediaHasMore && !altMediaLoadingMore) {
      selectTag(altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, altMediaPage + 1, true);
    }
  }, [altMediaSelectedTag, altMediaHasMore, altMediaLoadingMore, altMediaPage, altMediaExtraTags, altMediaTypeFilter, selectTag]);

  // Apply extra filters
  const applyFilters = useCallback(() => {
    if (altMediaSelectedTag) {
      selectTag(altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, 1, false);
    }
  }, [altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, selectTag]);

  // Open picker for a character
  const openPicker = useCallback((character) => {
    // Prepare initial search query from character name
    let searchName = character.name;
    if (searchName.includes(',')) {
      // "Monkey D., Luffy" -> "Luffy"
      const parts = searchName.split(',').map(p => p.trim());
      searchName = parts.reverse()[0];
    }
    searchName = searchName.split(' ')[0]; // Just first word

    setAltMediaCharacter(character);
    setAltMediaSearchQuery(searchName);
    setAltMediaTags([]);
    setAltMediaSelectedTag(null);
    setAltMediaResults([]);

    // Auto-search for tags
    searchTags(searchName);
  }, [searchTags]);

  // Close picker
  const closePicker = useCallback(() => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setHoveredMedia(null);
    setAltMediaCharacter(null);
    setAltMediaResults([]);
    setAltMediaTags([]);
    setAltMediaSelectedTag(null);
    setAltMediaSearchQuery('');
    setAltMediaPage(1);
    setAltMediaHasMore(false);
    setAltMediaExtraTags('');
    setAltMediaTypeFilter('all');
  }, []);

  // Select media
  const selectMedia = useCallback((media) => {
    if (!altMediaCharacter) return;

    if (onMediaSelected) {
      onMediaSelected(altMediaCharacter, media);
    }

    // Close the picker
    closePicker();
  }, [altMediaCharacter, onMediaSelected, closePicker]);

  // Handle search query change
  const handleSearchQueryChange = useCallback((query) => {
    setAltMediaSearchQuery(query);
    searchTags(query);
  }, [searchTags]);

  // Clear selected tag
  const clearSelectedTag = useCallback(() => {
    setAltMediaSelectedTag(null);
    setAltMediaResults([]);
    setAltMediaExtraTags('');
    setAltMediaTypeFilter('all');
  }, []);

  // Hover preview handlers
  const handleMediaHover = useCallback((media, rect) => {
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setHoveredMedia(media);
  }, []);

  const handleMediaHoverEnd = useCallback(() => {
    setHoveredMedia(null);
  }, []);

  // Long press handlers for mobile
  const handleTouchStart = useCallback((media, rect) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setHoverPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setHoveredMedia(media);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressTriggered.current) {
      setTimeout(() => setHoveredMedia(null), 100);
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setHoveredMedia(null);
  }, []);

  // Check if long press was triggered (for preventing click after long press)
  const wasLongPressTriggered = useCallback(() => {
    const triggered = longPressTriggered.current;
    longPressTriggered.current = false;
    return triggered;
  }, []);

  return {
    // State
    character: altMediaCharacter,
    searchQuery: altMediaSearchQuery,
    tags: altMediaTags,
    selectedTag: altMediaSelectedTag,
    results: altMediaResults,
    loading: altMediaLoading,
    loadingMore: altMediaLoadingMore,
    page: altMediaPage,
    hasMore: altMediaHasMore,
    sort: altMediaSort,
    extraTags: altMediaExtraTags,
    typeFilter: altMediaTypeFilter,
    hoveredMedia,
    hoverPosition,

    // State setters
    setExtraTags: setAltMediaExtraTags,
    setTypeFilter: setAltMediaTypeFilter,

    // Actions
    openPicker,
    closePicker,
    selectTag,
    selectMedia,
    searchTags,
    changeSort,
    loadMore,
    applyFilters,
    handleSearchQueryChange,
    clearSelectedTag,

    // Hover/touch handlers
    handleMediaHover,
    handleMediaHoverEnd,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    wasLongPressTriggered,

    // Computed
    isOpen: altMediaCharacter !== null,
  };
};

export default useAltMediaSearch;
