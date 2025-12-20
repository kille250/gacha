import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaImage, FaSearch, FaPlus, FaEdit, FaTrash, FaCloudUploadAlt, FaDownload } from 'react-icons/fa';
import { theme, getRarityColor, motionVariants } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';
import { isVideo, getVideoMimeType, PLACEHOLDER_IMAGE } from '../../utils/mediaUtils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
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

  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaImage /> {t('admin.characterManagement')}
          <CharCount>{filteredCharacters.length} characters</CharCount>
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
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
          <EmptyIcon>🎭</EmptyIcon>
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
                  {char.isR18 && <R18Badge>🔞</R18Badge>}
                  <RarityOverlay $rarity={char.rarity} />
                </CardMedia>
                <CardContent>
                  <CardName>{char.name}</CardName>
                  <CardSeries>{char.series}</CardSeries>
                  <RarityTag $rarity={char.rarity}>{char.rarity}</RarityTag>
                  <CardActions>
                    <IconButton onClick={() => onEditCharacter(char)} title="Edit">
                      <FaEdit />
                    </IconButton>
                    <IconButton $danger onClick={() => onDeleteCharacter(char.id)} title="Delete">
                      <FaTrash />
                    </IconButton>
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
                  <ListName>{char.name} {char.isR18 && <span>🔞</span>}</ListName>
                  <ListSeries>{char.series}</ListSeries>
                </ListInfo>
                <RarityTag $rarity={char.rarity}>{char.rarity}</RarityTag>
                <ListActions>
                  <IconButton onClick={() => onEditCharacter(char)}><FaEdit /></IconButton>
                  <IconButton $danger onClick={() => onDeleteCharacter(char.id)}><FaTrash /></IconButton>
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
            onClick={() => setShowAddModal(false)}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle><FaPlus /> {t('admin.addCharacter')}</ModalTitle>
                <CloseButton onClick={() => setShowAddModal(false)}>×</CloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={(e) => { onAddCharacter(e); setShowAddModal(false); }}>
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
                        <option value="common">{t('gacha.common')}</option>
                        <option value="uncommon">{t('gacha.uncommon')}</option>
                        <option value="rare">{t('gacha.rare')}</option>
                        <option value="epic">{t('gacha.epic')}</option>
                        <option value="legendary">{t('gacha.legendary')}</option>
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <Label>&nbsp;</Label>
                      <CheckboxLabel>
                        <input 
                          type="checkbox" 
                          checked={newCharacter.isR18} 
                          onChange={(e) => onCharacterChange({ target: { name: 'isR18', value: e.target.checked }})} 
                        />
                        <span>🔞 R18</span>
                      </CheckboxLabel>
                    </FormGroup>
                  </FormRow>
                  <FormGroup>
                    <Label>{t('admin.imageVideo')}</Label>
                    <FileInput 
                      type="file" 
                      accept="image/*,video/mp4,video/webm" 
                      onChange={onFileChange} 
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
                  </FormGroup>
                  <SubmitButton type="submit">
                    <FaPlus /> {t('admin.addCharacter')}
                  </SubmitButton>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
};

// Styled Components
const Container = styled(motion.div)`
  padding: 0 ${theme.spacing.md};
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  
  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  color: ${theme.colors.text};
  
  svg { color: ${theme.colors.success}; }
`;

const CharCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.backgroundTertiary};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  margin-left: ${theme.spacing.sm};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-width: 240px;
  
  svg { color: ${theme.colors.textMuted}; font-size: 14px; }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  flex: 1;
  outline: none;
  
  &::placeholder { color: ${theme.colors.textMuted}; }
`;

const ItemsPerPageSelect = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => 
    props.$variant === 'secondary' ? 'linear-gradient(135deg, #5856d6, #af52de)' :
    props.$variant === 'accent' ? 'linear-gradient(135deg, #ff6b9d, #c44569)' :
    `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`
  };
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover { opacity: 0.9; transform: translateY(-1px); }
`;

const ViewToggle = styled.div`
  display: flex;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: 4px;
`;

const ViewButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active ? theme.colors.primary : 'transparent'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? 'white' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.md};
`;

const EmptyText = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const EmptySubtext = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
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
  background: ${props => getRarityColor(props.$rarity)};
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
  background: ${props => getRarityColor(props.$rarity)};
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

const IconButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 113, 227, 0.15)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.primary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.25)' : 'rgba(0, 113, 227, 0.25)'};
  }
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

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
`;

const PageButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  
  &:disabled {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.textMuted};
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.md};
`;

const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const ModalTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  
  svg { color: ${theme.colors.success}; }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  
  &:hover { color: ${theme.colors.text}; }
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const FormRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  
  input { width: 18px; height: 18px; }
  span { font-weight: ${theme.fontWeights.medium}; color: ${theme.colors.error}; }
`;

const FileInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  
  &::file-selector-button {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    background: ${theme.colors.primary};
    border: none;
    border-radius: ${theme.radius.md};
    color: white;
    font-weight: ${theme.fontWeights.medium};
    cursor: pointer;
    margin-right: ${theme.spacing.md};
  }
`;

const ImagePreview = styled.div`
  margin-top: ${theme.spacing.md};
  
  img, video {
    max-width: 100%;
    max-height: 200px;
    border-radius: ${theme.radius.md};
    border: 1px solid ${theme.colors.surfaceBorder};
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  
  &:hover { opacity: 0.9; }
`;

export default AdminCharacters;

