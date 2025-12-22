import React, { useState, useEffect, useCallback, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getCollectionData, getAssetUrl } from '../utils/api';
import { isVideo, PLACEHOLDER_IMAGE } from '../utils/mediaUtils';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import { FaSearch, FaFilter, FaTimes, FaArrowUp } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError } from '../hooks';
import { executeLevelUp, executeUpgradeAll } from '../actions/gachaActions';
import {
  theme,
  PageWrapper,
  Container,
  Section,
  Text,
  Spinner,
  motionVariants
} from '../styles/DesignSystem';

const CollectionPage = () => {
  const { t } = useTranslation();
  const { setUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();
  const { withLock } = useActionLock(200);
  
  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();
  
  const [collection, setCollection] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [uniqueSeries, setUniqueSeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [showFilters, setShowFilters] = useState(false);
  const [isUpgradingAll, setIsUpgradingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Single API call instead of 2 separate calls
      const data = await getCollectionData();
      setCollection(data.collection || []);
      setAllCharacters(data.allCharacters || []);
      const allSeries = [...new Set((data.allCharacters || []).map(char => char.series).filter(Boolean))].sort();
      setUniqueSeries(allSeries);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadDashboard'));
      setLoading(false);
    }
  }, [t, setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle network disconnect/reconnect
  useEffect(() => {
    const handleOffline = () => {
      setError(t('common.connectionLost') || 'Connection lost. Please check your network.');
    };
    
    const handleOnline = () => {
      // Refresh data on reconnect
      setError(null);
      fetchData();
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [t, fetchData, setError]);
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };
  
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  
  const handlePageChange = (newPage) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, newPage)));
  };

  const openPreview = (character) => {
    setPreviewChar(character);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };
  
  const handleLevelUp = async (characterId) => {
    // Use action lock to prevent rapid double-clicks
    await withLock(async () => {
      try {
        // Use centralized action helper for consistent cache invalidation and state updates
        const result = await executeLevelUp(characterId, setUser);
        
        if (result.success) {
          // Update the collection state with new level
          setCollection(prev => prev.map(char => 
            char.id === characterId 
              ? { 
                  ...char, 
                  level: result.newLevel, 
                  shards: result.shardsRemaining,
                  isMaxLevel: result.isMaxLevel,
                  shardsToNextLevel: result.shardsToNextLevel,
                  canLevelUp: result.shardsToNextLevel && result.shardsRemaining >= result.shardsToNextLevel
                }
              : char
          ));
          // Update preview char too
          if (previewChar?.id === characterId) {
            setPreviewChar(prev => ({
              ...prev,
              level: result.newLevel,
              shards: result.shardsRemaining,
              isMaxLevel: result.isMaxLevel,
              shardsToNextLevel: result.shardsToNextLevel,
              canLevelUp: result.shardsToNextLevel && result.shardsRemaining >= result.shardsToNextLevel
            }));
          }
        }
      } catch (err) {
        console.error('Level up failed:', err);
        setError(err.response?.data?.error || t('collection.levelUpFailed') || 'Level up failed. Please try again.');
        // Refresh collection data to sync state after failure with retry
        const refreshWithRetry = async (retries = 2) => {
          try {
            await fetchData();
          } catch (refreshErr) {
            console.warn(`Failed to refresh collection (${retries} retries left):`, refreshErr);
            if (retries > 0) {
              setTimeout(() => refreshWithRetry(retries - 1), 1000);
            }
          }
        };
        refreshWithRetry();
      }
    });
  };
  
  // Calculate count of characters that can be upgraded
  const upgradableCount = collection.filter(char => char.canLevelUp).length;
  
  // Handle upgrade all action
  const handleUpgradeAll = async () => {
    if (isUpgradingAll || upgradableCount === 0) return;
    
    setIsUpgradingAll(true);
    try {
      const result = await executeUpgradeAll();
      
      if (result.success && result.upgraded > 0) {
        // Refresh collection data to reflect all changes
        await fetchData();
      }
    } catch (err) {
      console.error('Upgrade all failed:', err);
      setError(err.response?.data?.error || t('collection.upgradeAllFailed') || 'Failed to upgrade characters. Please try again.');
      // Refresh to sync state after failure
      fetchData();
    } finally {
      setIsUpgradingAll(false);
    }
  };

  const getImagePath = (imageSrc) => {
    if (!imageSrc) return PLACEHOLDER_IMAGE;
    return getAssetUrl(imageSrc);
  };

  const ownedCharIds = new Set(collection.map(char => char.id));
  
  // Map character IDs to their level info (from collection data)
  const charLevels = new Map(collection.map(char => [char.id, { 
    level: char.level || 1, 
    isMaxLevel: char.isMaxLevel,
    shards: char.shards || 0,
    shardsToNextLevel: char.shardsToNextLevel,
    canLevelUp: char.canLevelUp
  }]));

  const getFilteredCharacters = () => {
    let characters = [...allCharacters];
    
    if (ownershipFilter === 'owned') {
      characters = characters.filter(char => ownedCharIds.has(char.id));
    } else if (ownershipFilter === 'not-owned') {
      characters = characters.filter(char => !ownedCharIds.has(char.id));
    }
    
    if (rarityFilter !== 'all') {
      characters = characters.filter(char => char.rarity === rarityFilter);
    }
    
    if (seriesFilter !== 'all') {
      characters = characters.filter(char => char.series === seriesFilter);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      characters = characters.filter(char =>
        char.name.toLowerCase().includes(query) ||
        (char.series && char.series.toLowerCase().includes(query))
      );
    }
    
    return characters;
  };
  
  const filteredCharacters = getFilteredCharacters();
  const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCharacters = filteredCharacters.slice(indexOfFirstItem, indexOfLastItem);
  
  const ownedCount = collection.length;
  const totalCount = allCharacters.length;
  const completionPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  const clearFilters = () => {
    setRarityFilter('all');
    setSeriesFilter('all');
    setOwnershipFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = rarityFilter !== 'all' || seriesFilter !== 'all' || ownershipFilter !== 'all' || searchQuery.trim() !== '';

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
                <StatValue>{ownedCount}</StatValue>
                <StatLabel>{t('collection.owned')}</StatLabel>
              </StatItem>
              <StatDivider />
              <StatItem>
                <StatValue>{totalCount}</StatValue>
                <StatLabel>{t('collection.total')}</StatLabel>
              </StatItem>
              <StatDivider />
              <StatItem>
                <StatValue>{completionPercentage}%</StatValue>
                <StatLabel>{t('collection.complete')}</StatLabel>
              </StatItem>
            </StatsRow>
            <ProgressBar>
              <ProgressFill style={{ width: `${completionPercentage}%` }} />
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
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <ClearSearch onClick={() => setSearchQuery('')}>
                <FaTimes />
              </ClearSearch>
            )}
          </SearchWrapper>
          
          <ControlsRight>
            <FilterToggle 
              onClick={() => setShowFilters(!showFilters)}
              active={showFilters || hasActiveFilters}
            >
              <FaFilter />
              <span>{t('common.filters')}</span>
              {hasActiveFilters && <FilterBadge />}
            </FilterToggle>
            
            <ItemsSelect value={itemsPerPage} onChange={handleItemsPerPageChange}>
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
                      active={ownershipFilter === option}
                      onClick={() => { setOwnershipFilter(option); setCurrentPage(1); }}
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
                    active={rarityFilter === 'all'}
                    onClick={() => { setRarityFilter('all'); setCurrentPage(1); }}
                  >
                    {t('common.all')}
                  </FilterChip>
                  {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => (
                    <FilterChip 
                      key={rarity}
                      active={rarityFilter === rarity}
                      onClick={() => { setRarityFilter(rarity); setCurrentPage(1); }}
                      $color={getRarityColor(rarity)}
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
                    value={seriesFilter}
                    onChange={(e) => { setSeriesFilter(e.target.value); setCurrentPage(1); }}
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
        
        {loading ? (
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
                {upgradableCount > 0 && (
                  <UpgradeAllButton
                    onClick={handleUpgradeAll}
                    disabled={isUpgradingAll}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FaArrowUp />
                    {isUpgradingAll 
                      ? (t('collection.upgrading') || 'Upgrading...') 
                      : `${t('collection.upgradeAll') || 'Upgrade All'} (${upgradableCount})`
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
                    onClick={() => openPreview({...char, isOwned, isVideo: isVideoMedia, level, shards, shardsToNextLevel, canLevelUp})}
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
              <Pagination>
                <PageButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </PageButton>
                <PageInfo>
                  {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                </PageInfo>
                <PageButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next')}
                </PageButton>
              </Pagination>
            )}
          </>
        )}
      </Container>
      
      <ImagePreviewModal
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar?.isOwned}
        isVideo={previewChar?.isVideo || isVideo(previewChar?.image)}
        level={previewChar?.level || 1}
        shards={previewChar?.shards}
        shardsToNextLevel={previewChar?.shardsToNextLevel}
        canLevelUp={previewChar?.canLevelUp}
        characterId={previewChar?.id}
        onLevelUp={handleLevelUp}
      />
    </StyledPageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.xl} 0 ${theme.spacing['3xl']};
`;

// Header
const HeaderSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderContent = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const PageTitle = styled.h1`
  font-size: ${theme.fontSizes['4xl']};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.02em;
  margin: 0 0 ${theme.spacing.xs};
`;

const PageSubtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// Stats Card
const StatsCard = styled(Section)`
  padding: ${theme.spacing.lg};
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const StatDivider = styled.div`
  width: 1px;
  height: 40px;
  background: ${theme.colors.surfaceBorder};
`;

const ProgressBar = styled.div`
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.success}, #4ade80);
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
`;

// Controls Bar
const ControlsBar = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
  }
`;

const SearchWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: 0 ${theme.spacing.md};
  min-width: 250px;
`;

const SearchIcon = styled.span`
  color: ${theme.colors.textTertiary};
  margin-right: ${theme.spacing.sm};
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
  
  &:focus {
    outline: none;
  }
`;

const ClearSearch = styled.button`
  color: ${theme.colors.textTertiary};
  padding: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  
  &:hover {
    color: ${theme.colors.text};
  }
`;

const ControlsRight = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.active ? 'rgba(88, 86, 214, 0.15)' : theme.colors.surface};
  border: 1px solid ${props => props.active ? theme.colors.accent : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.active ? theme.colors.accent : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  position: relative;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

const FilterBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: ${theme.colors.primary};
  border-radius: 50%;
`;

const ItemsSelect = styled.select`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  
  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

// Filters Panel
const FiltersPanel = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const FilterGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
  
  &:last-of-type {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const FilterChip = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.active 
    ? props.$color ? `${props.$color}20` : 'rgba(88, 86, 214, 0.15)'
    : theme.colors.glass};
  border: 1px solid ${props => props.active 
    ? props.$color || theme.colors.accent 
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.active 
    ? props.$color || theme.colors.accent 
    : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  text-transform: capitalize;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${props => props.$color ? `${props.$color}30` : 'rgba(88, 86, 214, 0.2)'};
    border-color: ${props => props.$color || theme.colors.accent};
  }
`;

const SeriesSelect = styled.select`
  width: 100%;
  max-width: 300px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  
  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

const ClearFiltersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: rgba(255, 59, 48, 0.2);
  }
`;

// Results
const ResultsInfo = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin-bottom: ${theme.spacing.md};
`;

const LevelingLegend = styled.div`
  background: rgba(88, 86, 214, 0.08);
  border: 1px solid rgba(88, 86, 214, 0.15);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const LegendHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const LegendTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const UpgradeAllButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #34C759, #30B350);
  border: none;
  border-radius: ${theme.radius.full};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.3);
  
  svg {
    font-size: 11px;
  }
  
  &:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(52, 199, 89, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 6px 12px;
    font-size: 11px;
  }
`;

const LegendItems = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md} ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm} ${theme.spacing.lg};
  }
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const LegendIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: bold;
  
  ${props => props.$type === 'shard' && `
    background: rgba(175, 82, 222, 0.2);
    color: #AF52DE;
  `}
  
  ${props => props.$type === 'levelup' && `
    background: rgba(52, 199, 89, 0.2);
    color: #34C759;
  `}
  
  ${props => props.$type === 'max' && `
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 140, 0, 0.3));
    color: #FFD700;
  `}
`;

const ErrorMessage = styled.div`
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  gap: ${theme.spacing.lg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
`;

const EmptyTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
`;

const EmptyText = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// Character Grid
const CharacterGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
`;

const CharacterCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  cursor: pointer;
  border: 1px solid ${props => props.$isOwned 
    ? theme.colors.surfaceBorder 
    : 'rgba(255, 255, 255, 0.03)'};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    border-color: ${props => props.$color};
    box-shadow: ${props => props.$glow};
  }
`;

const CardImageWrapper = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: all ${theme.transitions.slow};
  
  ${CharacterCard}:hover & {
    transform: scale(1.05);
    filter: ${props => props.$isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: filter ${theme.transitions.slow};
  
  ${CharacterCard}:hover & {
    filter: ${props => props.$isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

const NotOwnedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotOwnedLabel = styled.div`
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: white;
`;

const RarityIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => props.$color};
`;

const LevelBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: ${props => {
    if (props.$isMaxLevel) return 'linear-gradient(135deg, #ffd700, #ff8c00)';
    if (props.$canLevelUp) return 'linear-gradient(135deg, #34C759, #30B350)';
    return 'rgba(0, 0, 0, 0.75)';
  }};
  backdrop-filter: blur(4px);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => (props.$isMaxLevel || props.$canLevelUp) ? '#fff' : 'rgba(255,255,255,0.9)'};
  box-shadow: ${props => {
    if (props.$isMaxLevel) return '0 0 10px rgba(255, 215, 0, 0.5)';
    if (props.$canLevelUp) return '0 0 10px rgba(52, 199, 89, 0.5)';
    return '0 2px 4px rgba(0, 0, 0, 0.3)';
  }};
  z-index: 2;
  
  ${props => (props.$isMaxLevel || props.$canLevelUp) && `
    animation: pulse 2s ease-in-out infinite;
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `}
`;

const ShardBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 6px;
  background: ${props => props.$canLevelUp 
    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95), rgba(48, 179, 80, 0.95))'
    : 'rgba(175, 82, 222, 0.9)'};
  backdrop-filter: blur(4px);
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  z-index: 2;
  ${props => props.$canLevelUp && `
    box-shadow: 0 0 8px rgba(52, 199, 89, 0.5);
  `}
`;

const CardContent = styled.div`
  padding: ${theme.spacing.md};
`;

const CharName = styled.h3`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$isOwned ? theme.colors.text : theme.colors.textSecondary};
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CharSeries = styled.p`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$isOwned ? theme.colors.textSecondary : theme.colors.textMuted};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Pagination
const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  min-width: 120px;
  text-align: center;
`;

export default CollectionPage;
