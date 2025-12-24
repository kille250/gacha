import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaSearch, FaFilter, FaTimes, FaArrowUp } from 'react-icons/fa';

// Utilities
import { getAssetUrl } from '../utils/api';
import { isVideo, PLACEHOLDER_IMAGE } from '../utils/mediaUtils';

// Components
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// Hooks & Context
import { useCollection } from '../hooks';
import { useRarity } from '../context/RarityContext';

// Design System
import { Container, Text, Spinner, motionVariants } from '../styles/DesignSystem';

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
  LoadingContainer,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  EmptyText,
  CharacterGrid,
  CharacterCard,
  CardImageWrapper,
  CardImage,
  CardVideo,
  NotOwnedOverlay,
  NotOwnedLabel,
  RarityIndicator,
  LevelBadge,
  ShardBadge,
  CardContent,
  CharName,
  CharSeries,
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

  const getImagePath = (imageSrc) => {
    if (!imageSrc) return PLACEHOLDER_IMAGE;
    return getAssetUrl(imageSrc);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleItemsPerPageChange = (e) => {
    setPerPage(Number(e.target.value));
  };

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
          <StatsCard>
            <StatsRow>
              <StatItem>
                <StatValue>{stats.owned}</StatValue>
                <StatLabel>{t('collection.owned')}</StatLabel>
              </StatItem>
              <StatDivider />
              <StatItem>
                <StatValue>{stats.total}</StatValue>
                <StatLabel>{t('collection.total')}</StatLabel>
              </StatItem>
              <StatDivider />
              <StatItem>
                <StatValue>{stats.completionPercentage}%</StatValue>
                <StatLabel>{t('collection.complete')}</StatLabel>
              </StatItem>
            </StatsRow>
            <ProgressBar>
              <ProgressFill style={{ width: `${stats.completionPercentage}%` }} />
            </ProgressBar>
          </StatsCard>
        </HeaderSection>

        {/* Search & Filter Bar */}
        <ControlsBar>
          <SearchWrapper>
            <SearchIcon><FaSearch /></SearchIcon>
            <SearchInput
              type="text"
              placeholder={t('collection.searchPlaceholder')}
              value={filters.search}
              onChange={handleSearchChange}
              aria-label={t('collection.searchPlaceholder')}
            />
            {filters.search && (
              <ClearSearch
                onClick={() => setSearch('')}
                aria-label={t('common.clearSearch') || 'Clear search'}
              >
                <FaTimes />
              </ClearSearch>
            )}
          </SearchWrapper>

          <ControlsRight>
            <FilterToggle
              onClick={() => setShowFilters(!showFilters)}
              $active={showFilters || hasActiveFilters}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <FaFilter />
              <span>{t('common.filters')}</span>
              {hasActiveFilters && <FilterBadge />}
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
            >
              <FilterGroup>
                <FilterLabel>{t('collection.ownership')}</FilterLabel>
                <FilterOptions>
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
                <FilterLabel>{t('collection.rarity')}</FilterLabel>
                <FilterOptions>
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
                  <FilterLabel>{t('collection.series')}</FilterLabel>
                  <SeriesSelect
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
                  <FaTimes /> {t('common.clearFilters')}
                </ClearFiltersBtn>
              )}
            </FiltersPanel>
          )}
        </AnimatePresence>

        {/* Results */}
        {error && <ErrorMessage>{error}</ErrorMessage>}

        {isLoading ? (
          <LoadingContainer>
            <Spinner size="56px" />
            <Text secondary>{t('collection.loadingCollection')}</Text>
          </LoadingContainer>
        ) : filteredCharacters.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🔍</EmptyIcon>
            <EmptyTitle>{t('collection.noCharactersFound')}</EmptyTitle>
            <EmptyText>{t('collection.adjustFilters')}</EmptyText>
            {hasActiveFilters && (
              <ClearFiltersBtn onClick={clearFilters} style={{ marginTop: '16px' }}>
                <FaTimes /> {t('common.clearFilters')}
              </ClearFiltersBtn>
            )}
          </EmptyState>
        ) : (
          <>
            <ResultsInfo>
              {t('common.showing')} {currentCharacters.length} {t('common.of')} {filteredCharacters.length} {t('common.characters')}
            </ResultsInfo>

            <LevelingLegend>
              <LegendHeader>
                <LegendTitle>⚔️ {t('collection.cardLeveling') || 'Card Leveling'}</LegendTitle>
                {stats.upgradableCount > 0 && (
                  <UpgradeAllButton
                    onClick={handleUpgradeAll}
                    disabled={isUpgradingAll}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FaArrowUp />
                    {isUpgradingAll
                      ? (t('collection.upgrading') || 'Upgrading...')
                      : `${t('collection.upgradeAll') || 'Upgrade All'} (${stats.upgradableCount})`
                    }
                  </UpgradeAllButton>
                )}
              </LegendHeader>
              <LegendItems>
                <LegendItem>
                  <LegendIcon $type="shard">◆</LegendIcon>
                  <span>{t('collection.shardsFromDuplicates') || 'Shards from duplicates'}</span>
                </LegendItem>
                <LegendItem>
                  <LegendIcon $type="levelup">⬆</LegendIcon>
                  <span>{t('collection.readyToLevelUp') || 'Ready to level up!'}</span>
                </LegendItem>
                <LegendItem>
                  <LegendIcon $type="max">★</LegendIcon>
                  <span>{t('collection.maxLevel') || 'Max level (Lv.5)'}</span>
                </LegendItem>
              </LegendItems>
            </LevelingLegend>

            <CharacterGrid
              variants={motionVariants.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {currentCharacters.map((char) => {
                const isOwned = ownedCharIds.has(char.id);
                const imagePath = getImagePath(char.image);
                const isVideoMedia = isVideo(char.image);
                const levelInfo = charLevels.get(char.id);
                const level = levelInfo?.level || 1;
                const isMaxLevel = levelInfo?.isMaxLevel || false;
                const shards = levelInfo?.shards || 0;
                const shardsToNextLevel = levelInfo?.shardsToNextLevel;
                const canLevelUp = levelInfo?.canLevelUp || false;

                return (
                  <CharacterCard
                    key={char.id}
                    variants={motionVariants.staggerItem}
                    $color={getRarityColor(char.rarity)}
                    $glow={getRarityGlow(char.rarity)}
                    $isOwned={isOwned}
                    onClick={() => openPreview({ ...char, isOwned, isVideo: isVideoMedia, level, shards, shardsToNextLevel, canLevelUp })}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CardImageWrapper>
                      {isVideoMedia ? (
                        <CardVideo
                          src={imagePath}
                          autoPlay
                          loop
                          muted
                          playsInline
                          $isOwned={isOwned}
                        />
                      ) : (
                        <CardImage
                          src={imagePath}
                          alt={char.name}
                          $isOwned={isOwned}
                          loading="lazy"
                          onError={(e) => {
                            if (!e.target.src.includes('placeholder.com')) {
                              e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                            }
                          }}
                        />
                      )}
                      {!isOwned && (
                        <NotOwnedOverlay>
                          <NotOwnedLabel>{t('common.notOwned')}</NotOwnedLabel>
                        </NotOwnedOverlay>
                      )}
                      {isOwned && (
                        <>
                          <LevelBadge $isMaxLevel={isMaxLevel} $canLevelUp={canLevelUp}>
                            Lv.{level}{isMaxLevel ? '★' : ''}{canLevelUp && ' ⬆'}
                          </LevelBadge>
                          {!isMaxLevel && shards > 0 && (
                            <ShardBadge $canLevelUp={canLevelUp}>
                              ◆{shards}/{shardsToNextLevel}
                            </ShardBadge>
                          )}
                        </>
                      )}
                      <RarityIndicator $color={getRarityColor(char.rarity)} />
                    </CardImageWrapper>
                    <CardContent>
                      <CharName $isOwned={isOwned}>{char.name}</CharName>
                      <CharSeries $isOwned={isOwned}>{char.series}</CharSeries>
                    </CardContent>
                  </CharacterCard>
                );
              })}
            </CharacterGrid>

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationContainer>
                <PageButton
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label={t('common.previousPage') || 'Previous page'}
                >
                  {t('common.previous')}
                </PageButton>
                <PageInfo>
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
