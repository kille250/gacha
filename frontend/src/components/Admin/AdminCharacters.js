import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaImage, FaSearch, FaPlus, FaEdit, FaTrash, FaCloudUploadAlt, FaDownload, FaSpinner, FaTheaterMasks } from 'react-icons/fa';
import { theme, motionVariants } from '../../design-system';
import { useTranslation } from 'react-i18next';
import { IconR18 } from '../../constants/icons';
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
} from './AdminStyles';

const AdminCharacters = ({
  characters,
  getImageUrl,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onMultiUpload,
  onAnimeImport,
  newCharacter,
  onCharacterChange,
  selectedFile,
  onFileChange,
  uploadedImage
}) => {
  const { t } = useTranslation();
  const { getRarityColor, getOrderedRarities } = useRarity();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  // Duplicate detection state for add modal
  const [duplicateError, setDuplicateError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get ordered rarities for dropdown
  const orderedRarities = getOrderedRarities();
  
  const filteredCharacters = characters.filter(char => 
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.series.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCharacters = filteredCharacters.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDuplicateError(null);

    try {
      await onAddCharacter(e);
      setShowAddModal(false);
    } catch (err) {
      // Check if this is a duplicate error
      if (isDuplicateError(err)) {
        const duplicateInfo = getDuplicateInfo(err);
        setDuplicateError(duplicateInfo);
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

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.success}>
          <FaImage /> {t('admin.characterManagement')}
          <ItemCount>{filteredCharacters.length} characters</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <SearchWrapper>
            <FaSearch />
            <SearchInput 
              type="text" 
              placeholder="Search name or series..." 
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </SearchWrapper>
          <ItemsPerPageSelect 
            value={itemsPerPage} 
            onChange={handleItemsPerPageChange}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </ItemsPerPageSelect>
        </HeaderActions>
      </HeaderRow>
      
      <ActionBar>
        <ActionGroup>
          <ActionButton onClick={() => setShowAddModal(true)}>
            <FaPlus /> Add Character
          </ActionButton>
          <ActionButton $variant="secondary" onClick={onMultiUpload}>
            <FaCloudUploadAlt /> Multi Upload
          </ActionButton>
          <ActionButton $variant="accent" onClick={onAnimeImport}>
            <FaDownload /> Anime Import
          </ActionButton>
        </ActionGroup>
        <ViewToggle>
          <ViewButton $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>Grid</ViewButton>
          <ViewButton $active={viewMode === 'list'} onClick={() => setViewMode('list')}>List</ViewButton>
        </ViewToggle>
      </ActionBar>
      
      {currentCharacters.length === 0 ? (
        <EmptyState>
          <EmptyIcon><FaTheaterMasks /></EmptyIcon>
          <EmptyText>No characters found</EmptyText>
          <EmptySubtext>Try adjusting your search or add new characters</EmptySubtext>
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <CharacterGrid>
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
              >
                <CardMedia>
                  {isVideo(char.image) ? (
                    <video autoPlay loop muted playsInline>
                      <source src={getImageUrl(char.image)} type={getVideoMimeType(char.image)} />
                    </video>
                  ) : (
                    <img src={getImageUrl(char.image)} alt={char.name} onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                  )}
                  {char.isR18 && <R18Badge><IconR18 /></R18Badge>}
                  <RarityOverlay $color={getRarityColor(char.rarity)} />
                </CardMedia>
                <CardContent>
                  <CardName>{char.name}</CardName>
                  <CardSeries>{char.series}</CardSeries>
                  <RarityTag $color={getRarityColor(char.rarity)}>{char.rarity}</RarityTag>
                  <CardActions>
                    <CardIconButton onClick={() => onEditCharacter(char)} title="Edit">
                      <FaEdit />
                    </CardIconButton>
                    <CardIconButton
                      $danger
                      onClick={() => onDeleteCharacter(char.id, char.name)}
                      title="Delete"
                      aria-label={`Delete ${char.name}`}
                    >
                      <FaTrash />
                    </CardIconButton>
                  </CardActions>
                </CardContent>
              </CharacterCard>
            ))}
          </AnimatePresence>
        </CharacterGrid>
      ) : (
        <CharacterList>
          <AnimatePresence>
            {currentCharacters.map(char => (
              <ListItem
                key={char.id}
                variants={motionVariants.staggerItem}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
              >
                <ListThumb>
                  {isVideo(char.image) ? (
                    <video autoPlay loop muted playsInline>
                      <source src={getImageUrl(char.image)} type={getVideoMimeType(char.image)} />
                    </video>
                  ) : (
                    <img src={getImageUrl(char.image)} alt={char.name} onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                  )}
                </ListThumb>
                <ListInfo>
                  <ListName>{char.name} {char.isR18 && <span><IconR18 /></span>}</ListName>
                  <ListSeries>{char.series}</ListSeries>
                </ListInfo>
                <RarityTag $color={getRarityColor(char.rarity)}>{char.rarity}</RarityTag>
                <ListActions>
                  <IconButton onClick={() => onEditCharacter(char)} label="Edit character"><FaEdit /></IconButton>
                  <IconButton $danger onClick={() => onDeleteCharacter(char.id, char.name)} label={`Delete ${char.name}`}><FaTrash /></IconButton>
                </ListActions>
              </ListItem>
            ))}
          </AnimatePresence>
        </CharacterList>
      )}
      
      {totalPages > 1 && (
        <Pagination>
          <PageButton 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
          >
            Previous
          </PageButton>
          <PageInfo>
            Page {currentPage} of {totalPages}
          </PageInfo>
          <PageButton 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages}
          >
            Next
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
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <ModalHeader>
                <ModalTitle $iconColor={theme.colors.success}><FaPlus /> {t('admin.addCharacter')}</ModalTitle>
                <CloseButton onClick={handleCloseAddModal}>×</CloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleAddSubmit}>
                  <FormGroup>
                    <Label>{t('admin.name')}</Label>
                    <Input type="text" name="name" value={newCharacter.name} onChange={onCharacterChange} required />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('admin.series')}</Label>
                    <Input type="text" name="series" value={newCharacter.series} onChange={onCharacterChange} required />
                  </FormGroup>
                  <FormRow>
                    <FormGroup style={{ flex: 1 }}>
                      <Label>{t('admin.rarity')}</Label>
                      <Select name="rarity" value={newCharacter.rarity} onChange={onCharacterChange}>
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
                          type="checkbox"
                          checked={newCharacter.isR18}
                          onChange={(e) => onCharacterChange({ target: { name: 'isR18', value: e.target.checked }})}
                        />
                        <span><IconR18 /> R18</span>
                      </CheckboxLabel>
                    </FormGroup>
                  </FormRow>
                  <FormGroup>
                    <Label>{t('admin.imageVideo')}</Label>
                    <FileInput
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={(e) => {
                        setDuplicateError(null); // Clear duplicate error when selecting new file
                        onFileChange(e);
                      }}
                      required
                    />
                    {uploadedImage && (
                      <ImagePreview>
                        {isVideo(selectedFile) ? (
                          <video controls src={uploadedImage} />
                        ) : (
                          <img src={uploadedImage} alt="Preview" />
                        )}
                      </ImagePreview>
                    )}

                    {/* Duplicate Error - Blocking */}
                    {duplicateError && (
                      <DuplicateWarningBanner
                        status={duplicateError.status}
                        explanation={duplicateError.explanation}
                        similarity={duplicateError.similarity}
                        existingMatch={duplicateError.existingMatch}
                        mediaType={selectedFile?.type?.startsWith('video/') ? 'video' : 'image'}
                        onChangeMedia={handleClearDuplicateAndFile}
                      />
                    )}
                  </FormGroup>
                  <PrimaryButton type="submit" style={{ width: '100%' }} disabled={isSubmitting || duplicateError}>
                    {isSubmitting ? (
                      <><FaSpinner className="spin" /> Adding...</>
                    ) : (
                      <><FaPlus /> {t('admin.addCharacter')}</>
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
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
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
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  
  &:hover { background: ${theme.colors.backgroundTertiary}; }
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

export default AdminCharacters;
