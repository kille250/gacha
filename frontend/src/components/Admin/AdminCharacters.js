/**
 * AdminCharacters - Character management component for the admin interface
 *
 * Features:
 * - Grid and list view modes for character browsing
 * - Search by name or series
 * - Pagination with configurable items per page
 * - Character creation with image/video upload
 * - Duplicate detection with blocking on similar uploads
 * - Edit and delete functionality with confirmation
 * - Bulk upload and anime import actions
 *
 * @accessibility
 * - All interactive elements are keyboard accessible
 * - Proper ARIA labels on buttons and controls
 * - Focus management on modal open/close
 * - Screen reader announcements for actions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaImage, FaSearch, FaPlus, FaEdit, FaTrash, FaCloudUploadAlt, FaDownload, FaSpinner, FaTheaterMasks, FaCheckSquare, FaSquare, FaTimes } from 'react-icons/fa';
import { theme, motionVariants, AriaLiveRegion } from '../../design-system';
import { useTranslation } from 'react-i18next';
import { IconR18 } from '../../constants/icons';
import { ElementBadge } from '../patterns';
import { isVideo, getVideoMimeType, PLACEHOLDER_IMAGE } from '../../utils/mediaUtils';
import { useRarity } from '../../context/RarityContext';
import { isDuplicateError, getDuplicateInfo } from '../../utils/errorHandler';
import DuplicateWarningBanner from '../UI/DuplicateWarningBanner';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  HeaderActions,
  SearchWrapper,
  SearchInput,
  ItemsPerPageSelect,
  ActionBar,
  ActionGroup,
  ActionButton,
  ViewToggle,
  ViewButton,
  EmptyState,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
  Pagination,
  PageButton,
  PageInfo,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  FormRow,
  Label,
  Input,
  Select,
  FileInput,
  CheckboxLabel,
  ImagePreview,
  PrimaryButton,
  IconButton,
} from './Admin.styles';

const AdminCharacters = ({
  characters,
  pagination,
  getImageUrl,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onBatchDeleteCharacters,
  onMultiUpload,
  onAnimeImport,
  onCreateFromDanbooru,
  newCharacter,
  onCharacterChange,
  selectedFile,
  onFileChange,
  uploadedImage
}) => {
  const { t } = useTranslation();
  const { getRarityColor, getOrderedRarities } = useRarity();

  // Debounce timer ref for search
  const searchDebounceRef = useRef(null);

  // Local search input state (for immediate UI feedback)
  const [searchInput, setSearchInput] = useState(pagination.search || '');

  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicate detection state for add modal
  const [duplicateError, setDuplicateError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState('');

  // Ref for modal first focusable element
  const modalFirstInputRef = useRef(null);

  // Get ordered rarities for dropdown
  const orderedRarities = getOrderedRarities();

  // Focus first input when modal opens
  useEffect(() => {
    if (showAddModal && modalFirstInputRef.current) {
      // Small delay to ensure modal animation completes
      const timer = setTimeout(() => {
        modalFirstInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  // Sync local search input with pagination state when it changes externally
  useEffect(() => {
    setSearchInput(pagination.search || '');
  }, [pagination.search]);

  // Auto-adjust page if current page exceeds total pages (e.g., after deletion)
  useEffect(() => {
    if (pagination.page > 1 && pagination.totalPages > 0 && pagination.page > pagination.totalPages) {
      pagination.setPage(pagination.totalPages);
    }
  }, [pagination]);

  // Characters from server are already paginated - use directly
  const currentCharacters = characters;

  // Announce function for screen readers
  const announce = useCallback((message) => {
    setAnnouncement(message);
    // Clear after a delay to allow repeated announcements
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    // Debounce the server-side search
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      pagination.setSearch(value);
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleItemsPerPageChange = (e) => {
    pagination.setLimit(Number(e.target.value));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDuplicateError(null);

    try {
      await onAddCharacter(e);
      setShowAddModal(false);
      announce(t('admin.characterAdded', 'Character added successfully'));
    } catch (err) {
      // Check if this is a duplicate error
      if (isDuplicateError(err)) {
        const duplicateInfo = getDuplicateInfo(err);
        setDuplicateError(duplicateInfo);
        announce(t('admin.duplicateDetected', 'Duplicate image detected'));
      } else {
        // Re-throw for parent to handle
        throw err;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setDuplicateError(null);
  };

  const handleClearDuplicateAndFile = () => {
    setDuplicateError(null);
    // Trigger file input clear by calling onFileChange with empty
    onFileChange({ target: { files: [] } });
  };

  // Multi-select handlers
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    const pageIds = currentCharacters.map(c => c.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageIds.forEach(id => next.add(id));
      return next;
    });
    announce(t('admin.selectedCount', { count: currentCharacters.length }));
  }, [currentCharacters, announce, t]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    announce(t('admin.selectionCleared', 'Selection cleared'));
  }, [announce, t]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await onBatchDeleteCharacters(ids);
      setSelectedIds(new Set());
      announce(t('admin.batchDeleteSuccess', { count: ids.length }));
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, onBatchDeleteCharacters, announce, t]);

  // Check if all on current page are selected
  const allOnPageSelected = currentCharacters.length > 0 &&
    currentCharacters.every(c => selectedIds.has(c.id));

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label={t('admin.characterManagement')}
    >
      {/* Screen reader announcements */}
      <AriaLiveRegion politeness="polite">
        {announcement}
      </AriaLiveRegion>

      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.success}>
          <FaImage aria-hidden="true" /> {t('admin.characterManagement')}
          <ItemCount aria-label={t('admin.characterCount', { count: pagination.total })}>
            {pagination.total} {t('gacha.characters', 'characters')}
            {pagination.loading && <FaSpinner className="spin" style={{ marginLeft: '8px' }} aria-label={t('common.loading')} />}
          </ItemCount>
        </SectionTitle>
        <HeaderActions>
          <SearchWrapper>
            <FaSearch aria-hidden="true" />
            <SearchInput
              type="search"
              placeholder={t('admin.searchCharacters', 'Search name or series...')}
              value={searchInput}
              onChange={handleSearchChange}
              aria-label={t('admin.searchCharacters', 'Search characters by name or series')}
            />
          </SearchWrapper>
          <ItemsPerPageSelect
            value={pagination.limit}
            onChange={handleItemsPerPageChange}
            aria-label={t('admin.itemsPerPage', 'Items per page')}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </ItemsPerPageSelect>
        </HeaderActions>
      </HeaderRow>

      <ActionBar>
        <ActionGroup role="group" aria-label={t('admin.characterActions', 'Character actions')}>
          <ActionButton onClick={() => setShowAddModal(true)} aria-label={t('admin.addCharacter')}>
            <FaPlus aria-hidden="true" /> {t('admin.addCharacter')}
          </ActionButton>
          <ActionButton $variant="secondary" onClick={onMultiUpload} aria-label={t('admin.multiUpload')}>
            <FaCloudUploadAlt aria-hidden="true" /> {t('admin.multiUpload')}
          </ActionButton>
          <ActionButton $variant="accent" onClick={onAnimeImport} aria-label={t('admin.animeImport')}>
            <FaDownload aria-hidden="true" /> {t('admin.animeImport')}
          </ActionButton>
          {onCreateFromDanbooru && (
            <ActionButton $variant="secondary" onClick={onCreateFromDanbooru} aria-label={t('admin.createFromDanbooru', 'Create from Danbooru')}>
              <FaImage aria-hidden="true" /> {t('admin.createFromDanbooru', 'Danbooru')}
            </ActionButton>
          )}
        </ActionGroup>
        <ViewToggle role="group" aria-label={t('admin.viewMode', 'View mode')}>
          <ViewButton
            $active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
          >
            {t('admin.gridView', 'Grid')}
          </ViewButton>
          <ViewButton
            $active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
          >
            {t('admin.listView', 'List')}
          </ViewButton>
        </ViewToggle>
      </ActionBar>

      {/* Selection controls bar */}
      <SelectionBar>
        <SelectionLeft>
          <SelectAllButton
            onClick={allOnPageSelected ? clearSelection : selectAllOnPage}
            aria-label={allOnPageSelected ? t('admin.deselectAll', 'Deselect all') : t('admin.selectAll', 'Select all on page')}
          >
            {allOnPageSelected ? <FaCheckSquare aria-hidden="true" /> : <FaSquare aria-hidden="true" />}
            {allOnPageSelected
              ? t('admin.deselectAll', 'Deselect all')
              : t('admin.selectAllOnPage', 'Select all on page')}
          </SelectAllButton>
          {selectedIds.size > 0 && (
            <SelectedCount aria-live="polite">
              {t('admin.selectedCount', { count: selectedIds.size, defaultValue: '{{count}} selected' })}
            </SelectedCount>
          )}
        </SelectionLeft>
        {selectedIds.size > 0 && (
          <SelectionActions>
            <ActionButton
              $variant="danger"
              onClick={handleBatchDelete}
              disabled={isDeleting}
              aria-label={t('admin.deleteSelected', 'Delete selected')}
            >
              {isDeleting ? <FaSpinner className="spin" aria-hidden="true" /> : <FaTrash aria-hidden="true" />}
              {t('admin.deleteSelected', 'Delete selected')} ({selectedIds.size})
            </ActionButton>
            <ActionButton $variant="secondary" onClick={clearSelection} aria-label={t('admin.clearSelection', 'Clear selection')}>
              <FaTimes aria-hidden="true" /> {t('admin.clearSelection', 'Clear')}
            </ActionButton>
          </SelectionActions>
        )}
      </SelectionBar>
      
      {currentCharacters.length === 0 ? (
        <EmptyState role="status">
          <EmptyIcon aria-hidden="true"><FaTheaterMasks /></EmptyIcon>
          <EmptyText>{t('admin.noCharactersFound', 'No characters found')}</EmptyText>
          <EmptySubtext>{t('admin.noCharactersHint', 'Try adjusting your search or add new characters')}</EmptySubtext>
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <CharacterGrid role="list" aria-label={t('admin.characterGrid', 'Character grid')}>
          <AnimatePresence mode="popLayout">
            {currentCharacters.map(char => (
              <CharacterCard
                key={char.id}
                variants={motionVariants.card}
                initial="hidden"
                animate="visible"
                exit="exit"
                whileHover="hover"
                layout
                role="listitem"
                $selected={selectedIds.has(char.id)}
              >
                <CardCheckbox
                  onClick={() => toggleSelect(char.id)}
                  aria-label={selectedIds.has(char.id)
                    ? t('admin.deselectCharacter', { name: char.name }, `Deselect ${char.name}`)
                    : t('admin.selectCharacter', { name: char.name }, `Select ${char.name}`)}
                  aria-pressed={selectedIds.has(char.id)}
                >
                  {selectedIds.has(char.id) ? <FaCheckSquare /> : <FaSquare />}
                </CardCheckbox>
                <CardMedia>
                  {isVideo(char.image) ? (
                    <video autoPlay loop muted playsInline aria-hidden="true">
                      <source src={getImageUrl(char.image)} type={getVideoMimeType(char.image)} />
                    </video>
                  ) : (
                    <img
                      src={getImageUrl(char.image)}
                      alt={`${char.name} from ${char.series}`}
                      onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                    />
                  )}
                  {char.isR18 && <R18Badge aria-label={t('admin.r18Content', 'R18 content')}><IconR18 /></R18Badge>}
                  {char.element && (
                    <ElementBadgePosition>
                      <ElementBadge element={char.element} size="sm" variant="backdrop" />
                    </ElementBadgePosition>
                  )}
                  <RarityOverlay $color={getRarityColor(char.rarity)} aria-hidden="true" />
                </CardMedia>
                <CardContent>
                  <CardName>{char.name}</CardName>
                  <CardSeries>{char.series}</CardSeries>
                  <RarityTag $color={getRarityColor(char.rarity)} aria-label={`${t('admin.rarity')}: ${char.rarity}`}>
                    {char.rarity}
                  </RarityTag>
                  <CardActions>
                    <CardIconButton
                      onClick={() => onEditCharacter(char)}
                      aria-label={t('admin.editCharacterLabel', { name: char.name }, `Edit ${char.name}`)}
                    >
                      <FaEdit aria-hidden="true" />
                    </CardIconButton>
                    <CardIconButton
                      $danger
                      onClick={() => onDeleteCharacter(char.id, char.name)}
                      aria-label={t('admin.deleteCharacterLabel', { name: char.name }, `Delete ${char.name}`)}
                    >
                      <FaTrash aria-hidden="true" />
                    </CardIconButton>
                  </CardActions>
                </CardContent>
              </CharacterCard>
            ))}
          </AnimatePresence>
        </CharacterGrid>
      ) : (
        <CharacterList role="list" aria-label={t('admin.characterList', 'Character list')}>
          <AnimatePresence>
            {currentCharacters.map(char => (
              <ListItem
                key={char.id}
                variants={motionVariants.staggerItem}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                role="listitem"
                $selected={selectedIds.has(char.id)}
              >
                <ListCheckbox
                  onClick={() => toggleSelect(char.id)}
                  aria-label={selectedIds.has(char.id)
                    ? t('admin.deselectCharacter', { name: char.name }, `Deselect ${char.name}`)
                    : t('admin.selectCharacter', { name: char.name }, `Select ${char.name}`)}
                  aria-pressed={selectedIds.has(char.id)}
                >
                  {selectedIds.has(char.id) ? <FaCheckSquare /> : <FaSquare />}
                </ListCheckbox>
                <ListThumb>
                  {isVideo(char.image) ? (
                    <video autoPlay loop muted playsInline aria-hidden="true">
                      <source src={getImageUrl(char.image)} type={getVideoMimeType(char.image)} />
                    </video>
                  ) : (
                    <img
                      src={getImageUrl(char.image)}
                      alt={`${char.name} from ${char.series}`}
                      onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                    />
                  )}
                </ListThumb>
                <ListInfo>
                  <ListName>
                    {char.name}
                    {char.isR18 && (
                      <span aria-label={t('admin.r18Content', 'R18 content')}>
                        <IconR18 aria-hidden="true" />
                      </span>
                    )}
                  </ListName>
                  <ListSeries>{char.series}</ListSeries>
                </ListInfo>
                {char.element && (
                  <ElementBadge element={char.element} size="sm" showLabel />
                )}
                <RarityTag $color={getRarityColor(char.rarity)} aria-label={`${t('admin.rarity')}: ${char.rarity}`}>
                  {char.rarity}
                </RarityTag>
                <ListActions>
                  <IconButton
                    onClick={() => onEditCharacter(char)}
                    aria-label={t('admin.editCharacterLabel', { name: char.name }, `Edit ${char.name}`)}
                  >
                    <FaEdit aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    $danger
                    onClick={() => onDeleteCharacter(char.id, char.name)}
                    aria-label={t('admin.deleteCharacterLabel', { name: char.name }, `Delete ${char.name}`)}
                  >
                    <FaTrash aria-hidden="true" />
                  </IconButton>
                </ListActions>
              </ListItem>
            ))}
          </AnimatePresence>
        </CharacterList>
      )}
      
      {pagination.totalPages > 1 && (
        <Pagination role="navigation" aria-label={t('common.pagination', 'Pagination')}>
          <PageButton
            onClick={() => pagination.setPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1 || pagination.loading}
            aria-label={t('common.previousPage', 'Previous page')}
          >
            {t('common.previous', 'Previous')}
          </PageButton>
          <PageInfo aria-live="polite" aria-atomic="true">
            {t('common.pageOfTotal', { defaultValue: 'Page {{current}} of {{total}}', current: pagination.page, total: pagination.totalPages })}
          </PageInfo>
          <PageButton
            onClick={() => pagination.setPage(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page === pagination.totalPages || pagination.loading}
            aria-label={t('common.nextPage', 'Next page')}
          >
            {t('common.next', 'Next')}
          </PageButton>
        </Pagination>
      )}
      
      {/* Add Character Modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseAddModal(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-character-title"
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <ModalHeader>
                <ModalTitle id="add-character-title" $iconColor={theme.colors.success}>
                  <FaPlus aria-hidden="true" /> {t('admin.addCharacter')}
                </ModalTitle>
                <CloseButton onClick={handleCloseAddModal} aria-label={t('common.close', 'Close')}>×</CloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleAddSubmit}>
                  <FormGroup>
                    <Label htmlFor="character-name">{t('admin.name')}</Label>
                    <Input
                      ref={modalFirstInputRef}
                      id="character-name"
                      type="text"
                      name="name"
                      value={newCharacter.name}
                      onChange={onCharacterChange}
                      required
                      autoComplete="off"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="character-series">{t('admin.series')}</Label>
                    <Input
                      id="character-series"
                      type="text"
                      name="series"
                      value={newCharacter.series}
                      onChange={onCharacterChange}
                      required
                      autoComplete="off"
                    />
                  </FormGroup>
                  <FormRow>
                    <FormGroup style={{ flex: 1 }}>
                      <Label htmlFor="character-rarity">{t('admin.rarity')}</Label>
                      <Select
                        id="character-rarity"
                        name="rarity"
                        value={newCharacter.rarity}
                        onChange={onCharacterChange}
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
                          id="character-r18"
                          type="checkbox"
                          checked={newCharacter.isR18}
                          onChange={(e) => onCharacterChange({ target: { name: 'isR18', value: e.target.checked }})}
                          aria-describedby="r18-hint"
                        />
                        <span><IconR18 aria-hidden="true" /> {t('admin.r18', 'R18')}</span>
                      </CheckboxLabel>
                    </FormGroup>
                  </FormRow>
                  <FormGroup>
                    <Label htmlFor="character-file">{t('admin.imageVideo')}</Label>
                    <FileInput
                      id="character-file"
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={(e) => {
                        setDuplicateError(null); // Clear duplicate error when selecting new file
                        onFileChange(e);
                      }}
                      required
                      aria-describedby={duplicateError ? 'duplicate-error' : undefined}
                    />
                    {uploadedImage && (
                      <ImagePreview>
                        {isVideo(selectedFile) ? (
                          <video controls src={uploadedImage} aria-label={t('admin.videoPreview', 'Video preview')} />
                        ) : (
                          <img src={uploadedImage} alt={t('admin.imagePreview', 'Image preview')} />
                        )}
                      </ImagePreview>
                    )}

                    {/* Duplicate Error - Blocking */}
                    {duplicateError && (
                      <DuplicateWarningBanner
                        id="duplicate-error"
                        status={duplicateError.status}
                        explanation={duplicateError.explanation}
                        similarity={duplicateError.similarity}
                        existingMatch={duplicateError.existingMatch}
                        mediaType={selectedFile?.type?.startsWith('video/') ? 'video' : 'image'}
                        onChangeMedia={handleClearDuplicateAndFile}
                      />
                    )}
                  </FormGroup>
                  <PrimaryButton
                    type="submit"
                    style={{ width: '100%' }}
                    disabled={isSubmitting || duplicateError}
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="spin" aria-hidden="true" />
                        {t('admin.adding', 'Adding...')}
                      </>
                    ) : (
                      <>
                        <FaPlus aria-hidden="true" /> {t('admin.addCharacter')}
                      </>
                    )}
                  </PrimaryButton>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </AdminContainer>
  );
};

// ============================================
// CHARACTER-SPECIFIC STYLED COMPONENTS
// ============================================

// Selection bar styled components
const SelectionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} 0;
  margin-bottom: ${theme.spacing.sm};
`;

const SelectionLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const SelectAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    border-color: ${theme.colors.primary};
  }

  svg {
    color: ${theme.colors.primary};
  }
`;

const SelectedCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
`;

const SelectionActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const CharacterCard = styled(motion.div)`
  position: relative;
  background: ${theme.colors.surface};
  border: 2px solid ${props => props.$selected ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  transition: border-color 0.2s ease;

  ${props => props.$selected && `
    box-shadow: 0 0 0 2px ${theme.colors.primary}33;
  `}
`;

const CardCheckbox = styled.button`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
`;

const CardMedia = styled.div`
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const R18Badge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
  background: rgba(0,0,0,0.6);
  padding: 4px 8px;
  border-radius: ${theme.radius.md};
`;

const ElementBadgePosition = styled.div`
  position: absolute;
  bottom: 12px;
  right: 8px;
  z-index: 2;
`;

const RarityOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${props => props.$color};
`;

const CardContent = styled.div`
  padding: ${theme.spacing.md};
`;

const CardName = styled.h4`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardSeries = styled.p`
  margin: 4px 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RarityTag = styled.span`
  display: inline-block;
  padding: 2px 10px;
  background: ${props => props.$color};
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  color: white;
`;

const CardActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

// Card-specific icon button with flex: 1
const CardIconButton = styled(IconButton)`
  flex: 1;
`;

const CharacterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const ListItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 2px solid ${props => props.$selected ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  transition: border-color 0.2s ease;

  ${props => props.$selected && `
    box-shadow: 0 0 0 2px ${theme.colors.primary}33;
  `}

  &:hover { background: ${theme.colors.backgroundTertiary}; }
`;

const ListCheckbox = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  cursor: pointer;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    border-color: ${theme.colors.primary};
  }
`;

const ListThumb = styled.div`
  width: 50px;
  height: 50px;
  border-radius: ${theme.radius.md};
  overflow: hidden;
  flex-shrink: 0;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ListInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListName = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListSeries = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ListActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

// PropTypes for type checking and documentation
AdminCharacters.propTypes = {
  /** Array of character objects to display (already paginated from server) */
  characters: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    series: PropTypes.string.isRequired,
    rarity: PropTypes.string.isRequired,
    image: PropTypes.string,
    isR18: PropTypes.bool,
  })).isRequired,
  /** Server-side pagination state and handlers */
  pagination: PropTypes.shape({
    page: PropTypes.number.isRequired,
    limit: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    search: PropTypes.string,
    loading: PropTypes.bool,
    setPage: PropTypes.func.isRequired,
    setLimit: PropTypes.func.isRequired,
    setSearch: PropTypes.func.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  /** Function to get full image URL from path */
  getImageUrl: PropTypes.func.isRequired,
  /** Handler for adding a new character */
  onAddCharacter: PropTypes.func.isRequired,
  /** Handler for editing a character */
  onEditCharacter: PropTypes.func.isRequired,
  /** Handler for deleting a character (id, name) */
  onDeleteCharacter: PropTypes.func.isRequired,
  /** Handler for batch deleting characters (array of ids) */
  onBatchDeleteCharacters: PropTypes.func.isRequired,
  /** Handler for opening multi-upload modal */
  onMultiUpload: PropTypes.func.isRequired,
  /** Handler for opening anime import modal */
  onAnimeImport: PropTypes.func.isRequired,
  /** Handler for opening create from Danbooru modal */
  onCreateFromDanbooru: PropTypes.func,
  /** Current new character form data */
  newCharacter: PropTypes.shape({
    name: PropTypes.string,
    series: PropTypes.string,
    rarity: PropTypes.string,
    isR18: PropTypes.bool,
  }).isRequired,
  /** Handler for character form field changes */
  onCharacterChange: PropTypes.func.isRequired,
  /** Currently selected file for upload */
  selectedFile: PropTypes.object,
  /** Handler for file input changes */
  onFileChange: PropTypes.func.isRequired,
  /** Data URL of uploaded image for preview */
  uploadedImage: PropTypes.string,
};

AdminCharacters.defaultProps = {
  selectedFile: null,
  uploadedImage: null,
  onCreateFromDanbooru: null,
};

export default AdminCharacters;
