import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaSearch, FaFilter, FaTimes, FaArrowUp } from 'react-icons/fa';

// Utilities
import { getAssetUrl } from '../utils/api';
import { isVideo, PLACEHOLDER_IMAGE } from '../utils/mediaUtils';

// Components
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import CharacterCard from '../components/patterns/CharacterCard';

// Hooks & Context
import { useCollection } from '../hooks';
import { useRarity } from '../context/RarityContext';

// Design System - consolidated imports
import { Container, motionVariants, LoadingState, EmptyState } from '../design-system';

// Icon Constants
import { IconSearch, IconCombat } from '../constants/icons';

// Extracted styles
import {
  StyledPageWrapper,
  HeaderSection,
  HeaderContent,
  PageTitle,
  PageSubtitle,
  StatsCard,
  StatsRow,
  StatItem,
  StatValue,
  StatLabel,
  StatDivider,
  ProgressBar,
  ProgressFill,
  ControlsBar,
  SearchWrapper,
  SearchIcon,
  SearchInput,
  ClearSearch,
  ControlsRight,
  FilterToggle,
  FilterBadge,
  ItemsSelect,
  FiltersPanel,
  FilterGroup,
  FilterLabel,
  FilterOptions,
  FilterChip,
  SeriesSelect,
  ClearFiltersBtn,
  ResultsInfo,
  LevelingLegend,
  LegendHeader,
  LegendTitle,
  UpgradeAllButton,
  LegendItems,
  LegendItem,
  LegendIcon,
  ErrorMessage,
  CharacterGrid,
  PaginationContainer,
  PageButton,
  PageInfo,
} from './CollectionPage.styles';

const CollectionPage = () => {
  const { t } = useTranslation();
  const { getRarityColor, getRarityGlow } = useRarity();
  const [showFilters, setShowFilters] = useState(false);

  // All collection state and logic from composite hook
  const {
    currentCharacters,
    filteredCharacters,
    uniqueSeries,
    isLoading,
    error,
    ownedCharIds,
    charLevels,
    stats,
    filters,
    hasActiveFilters,
    setFilter,
    setSearch,
    setPage,
    setPerPage,
    clearFilters,
    totalPages,
    currentPage,
    preview,
    openPreview,
    closePreview,
    handleLevelUp,
    handleUpgradeAll,
    isUpgradingAll,
  } = useCollection();

  const getImagePath = useCallback((imageSrc) => {
    if (!imageSrc) return PLACEHOLDER_IMAGE;
    return getAssetUrl(imageSrc);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, [setSearch]);

  const handleItemsPerPageChange = useCallback((e) => {
    setPerPage(Number(e.target.value));
  }, [setPerPage]);

  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, [setSearch]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Handler for card click to open preview
  const handleCardClick = useCallback((char, isOwned, isVideoMedia, levelInfo) => {
    openPreview({
      ...char,
      isOwned,
      isVideo: isVideoMedia,
      level: levelInfo?.level || 1,
      shards: levelInfo?.shards || 0,
      shardsToNextLevel: levelInfo?.shardsToNextLevel,
      canLevelUp: levelInfo?.canLevelUp || false
    });
  }, [openPreview]);

  // Loading state using shared component
  if (isLoading) {
    return (
      <StyledPageWrapper>
        <Container>
          <LoadingState
            message={t('collection.loadingCollection')}
            fullPage
          />
        </Container>
      </StyledPageWrapper>
    );
  }

  return (
    <StyledPageWrapper>
      <Container>
        {/* Header Section */}
        <HeaderSection>
          <HeaderContent>
            <PageTitle>{t('collection.title')}</PageTitle>
            <PageSubtitle>{t('collection.subtitle')}</PageSubtitle>
          </HeaderContent>

          {/* Progress Stats */}
          <StatsCard role="region" aria-label={t('collection.stats') || 'Collection statistics'}>
            <StatsRow>
              <StatItem>
                <StatValue>{stats.owned}</StatValue>
                <StatLabel>{t('collection.owned')}</StatLabel>
              </StatItem>
              <StatDivider aria-hidden="true" />
              <StatItem>
                <StatValue>{stats.total}</StatValue>
                <StatLabel>{t('collection.total')}</StatLabel>
              </StatItem>
              <StatDivider aria-hidden="true" />
              <StatItem>
                <StatValue>{stats.completionPercentage}%</StatValue>
                <StatLabel>{t('collection.complete')}</StatLabel>
              </StatItem>
            </StatsRow>
            <ProgressBar
              role="progressbar"
              aria-valuenow={stats.completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${stats.completionPercentage}% complete`}
            >
              <ProgressFill style={{ width: `${stats.completionPercentage}%` }} />
            </ProgressBar>
          </StatsCard>
        </HeaderSection>

        {/* Search & Filter Bar */}
        <ControlsBar role="search">
          <SearchWrapper>
            <SearchIcon aria-hidden="true"><FaSearch /></SearchIcon>
            <SearchInput
              type="text"
              placeholder={t('collection.searchPlaceholder')}
              value={filters.search}
              onChange={handleSearchChange}
              aria-label={t('collection.searchPlaceholder')}
            />
            {filters.search && (
              <ClearSearch
                onClick={handleClearSearch}
                aria-label={t('common.clearSearch') || 'Clear search'}
              >
                <FaTimes aria-hidden="true" />
              </ClearSearch>
            )}
          </SearchWrapper>

          <ControlsRight>
            <FilterToggle
              onClick={handleToggleFilters}
              $active={showFilters || hasActiveFilters}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <FaFilter aria-hidden="true" />
              <span>{t('common.filters')}</span>
              {hasActiveFilters && <FilterBadge aria-label="Active filters" />}
            </FilterToggle>

            <ItemsSelect
              value={filters.perPage}
              onChange={handleItemsPerPageChange}
              aria-label={t('common.itemsPerPage') || 'Items per page'}
            >
              <option value="24">{t('admin.itemsPerPage', { count: 24 })}</option>
              <option value="48">{t('admin.itemsPerPage', { count: 48 })}</option>
              <option value="96">{t('admin.itemsPerPage', { count: 96 })}</option>
            </ItemsSelect>
          </ControlsRight>
        </ControlsBar>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <FiltersPanel
              id="filter-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="region"
              aria-label={t('common.filterOptions') || 'Filter options'}
            >
              <FilterGroup>
                <FilterLabel id="ownership-label">{t('collection.ownership')}</FilterLabel>
                <FilterOptions role="group" aria-labelledby="ownership-label">
                  {['all', 'owned', 'not-owned'].map(option => (
                    <FilterChip
                      key={option}
                      $active={filters.ownership === option}
                      onClick={() => setFilter('ownership', option)}
                      aria-pressed={filters.ownership === option}
                    >
                      {option === 'all' ? t('common.all') : option === 'owned' ? t('common.owned') : t('common.missing')}
                    </FilterChip>
                  ))}
                </FilterOptions>
              </FilterGroup>

              <FilterGroup>
                <FilterLabel id="rarity-label">{t('collection.rarity')}</FilterLabel>
                <FilterOptions role="group" aria-labelledby="rarity-label">
                  <FilterChip
                    $active={filters.rarity === 'all'}
                    onClick={() => setFilter('rarity', 'all')}
                    aria-pressed={filters.rarity === 'all'}
                  >
                    {t('common.all')}
                  </FilterChip>
                  {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => (
                    <FilterChip
                      key={rarity}
                      $active={filters.rarity === rarity}
                      onClick={() => setFilter('rarity', rarity)}
                      $color={getRarityColor(rarity)}
                      aria-pressed={filters.rarity === rarity}
                    >
                      {rarity}
                    </FilterChip>
                  ))}
                </FilterOptions>
              </FilterGroup>

              {uniqueSeries.length > 0 && (
                <FilterGroup>
                  <FilterLabel htmlFor="series-select">{t('collection.series')}</FilterLabel>
                  <SeriesSelect
                    id="series-select"
                    value={filters.series}
                    onChange={(e) => setFilter('series', e.target.value)}
                    aria-label={t('collection.series')}
                  >
                    <option value="all">{t('collection.allSeries')}</option>
                    {uniqueSeries.map(series => (
                      <option key={series} value={series}>{series}</option>
                    ))}
                  </SeriesSelect>
                </FilterGroup>
              )}

              {hasActiveFilters && (
                <ClearFiltersBtn onClick={clearFilters}>
                  <FaTimes aria-hidden="true" /> {t('common.clearFilters')}
                </ClearFiltersBtn>
              )}
            </FiltersPanel>
          )}
        </AnimatePresence>

        {/* Results */}
        {error && (
          <ErrorMessage role="alert">
            {error}
          </ErrorMessage>
        )}

        {filteredCharacters.length === 0 ? (
          <EmptyState
            icon={<IconSearch />}
            title={t('collection.noCharactersFound')}
            description={t('collection.adjustFilters')}
            actionLabel={hasActiveFilters ? t('common.clearFilters') : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          <>
            <ResultsInfo aria-live="polite">
              {t('common.showing')} {currentCharacters.length} {t('common.of')} {filteredCharacters.length} {t('common.characters')}
            </ResultsInfo>

            <LevelingLegend role="region" aria-label={t('collection.cardLeveling') || 'Card leveling information'}>
              <LegendHeader>
                <LegendTitle>
                  <IconCombat aria-hidden="true" /> {t('collection.cardLeveling') || 'Card Leveling'}
                </LegendTitle>
                {stats.upgradableCount > 0 && (
                  <UpgradeAllButton
                    onClick={handleUpgradeAll}
                    disabled={isUpgradingAll}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={isUpgradingAll
                      ? t('collection.upgrading') || 'Upgrading...'
                      : `${t('collection.upgradeAll') || 'Upgrade All'} (${stats.upgradableCount})`
                    }
                  >
                    <FaArrowUp aria-hidden="true" />
                    {isUpgradingAll
                      ? (t('collection.upgrading') || 'Upgrading...')
                      : `${t('collection.upgradeAll') || 'Upgrade All'} (${stats.upgradableCount})`
                    }
                  </UpgradeAllButton>
                )}
              </LegendHeader>
              <LegendItems>
                <LegendItem>
                  <LegendIcon $type="shard" aria-hidden="true">◆</LegendIcon>
                  <span>{t('collection.shardsFromDuplicates') || 'Shards from duplicates'}</span>
                </LegendItem>
                <LegendItem>
                  <LegendIcon $type="levelup" aria-hidden="true">⬆</LegendIcon>
                  <span>{t('collection.readyToLevelUp') || 'Ready to level up!'}</span>
                </LegendItem>
                <LegendItem>
                  <LegendIcon $type="max" aria-hidden="true">★</LegendIcon>
                  <span>{t('collection.maxLevel') || 'Max level (Lv.5)'}</span>
                </LegendItem>
              </LegendItems>
            </LevelingLegend>

            <CharacterGrid
              variants={motionVariants.staggerContainer}
              initial="hidden"
              animate="visible"
              role="grid"
              aria-label={t('collection.characterGrid') || 'Character collection'}
            >
              {currentCharacters.map((char) => {
                const isOwned = ownedCharIds.has(char.id);
                const imagePath = getImagePath(char.image);
                const isVideoMedia = isVideo(char.image);
                const levelInfo = charLevels.get(char.id);

                return (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    isOwned={isOwned}
                    isVideo={isVideoMedia}
                    imageSrc={imagePath}
                    rarityColor={getRarityColor(char.rarity)}
                    rarityGlow={getRarityGlow(char.rarity)}
                    levelInfo={levelInfo}
                    notOwnedLabel={t('common.notOwned')}
                    onClick={() => handleCardClick(char, isOwned, isVideoMedia, levelInfo)}
                    role="gridcell"
                  />
                );
              })}
            </CharacterGrid>

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationContainer role="navigation" aria-label={t('common.pagination') || 'Pagination'}>
                <PageButton
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label={t('common.previousPage') || 'Previous page'}
                >
                  {t('common.previous')}
                </PageButton>
                <PageInfo aria-current="page">
                  {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                </PageInfo>
                <PageButton
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label={t('common.nextPage') || 'Next page'}
                >
                  {t('common.next')}
                </PageButton>
              </PaginationContainer>
            )}
          </>
        )}
      </Container>

      <ImagePreviewModal
        isOpen={preview.isOpen}
        onClose={closePreview}
        image={preview.character ? getImagePath(preview.character.image) : ''}
        name={preview.character?.name || ''}
        series={preview.character?.series || ''}
        rarity={preview.character?.rarity || 'common'}
        isOwned={preview.character?.isOwned}
        isVideo={preview.character?.isVideo || isVideo(preview.character?.image)}
        level={preview.character?.level || 1}
        shards={preview.character?.shards}
        shardsToNextLevel={preview.character?.shardsToNextLevel}
        canLevelUp={preview.character?.canLevelUp}
        characterId={preview.character?.id}
        onLevelUp={handleLevelUp}
      />
    </StyledPageWrapper>
  );
};

export default CollectionPage;
