import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaImage, FaSpinner, FaCheck } from 'react-icons/fa';
import api from '../../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../../utils/cacheManager';
import { isVideo } from '../../utils/mediaUtils';
import AltMediaPicker from './AltMediaPicker';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  Label,
  Input,
  Select,
  CheckboxLabel,
  ImagePreview,
  PrimaryButton,
  SecondaryButton,
  ButtonRow,
} from './AdminStyles';
import { theme } from '../../styles/DesignSystem';
import { useRarity } from '../../context/RarityContext';

/**
 * EditCharacterModal - Modal for editing character details and media
 * Extracted from AdminPage for better separation of concerns
 */
const EditCharacterModal = ({
  show,
  character,
  onClose,
  onSuccess,
  onError,
  getImageUrl,
}) => {
  const { t } = useTranslation();
  const { getOrderedRarities } = useRarity();
  const orderedRarities = getOrderedRarities();
  
  // Form state
  const [editForm, setEditForm] = useState({
    name: '',
    series: '',
    rarity: 'common',
    isR18: false,
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  
  // Alt media picker state
  const [showAltMediaPicker, setShowAltMediaPicker] = useState(false);
  const [selectedAltMedia, setSelectedAltMedia] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize form when character changes
  useEffect(() => {
    if (character) {
      setEditForm({
        name: character.name || '',
        series: character.series || '',
        rarity: character.rarity || 'common',
        isR18: character.isR18 || false,
      });
      setEditImagePreview(getImageUrl(character.image));
      setEditImageFile(null);
      setSelectedAltMedia(null);
    }
  }, [character, getImageUrl]);

  // Handle form field changes
  const handleFormChange = useCallback((field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle image file change
  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    setEditImageFile(file);
    setSelectedAltMedia(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setEditImagePreview(event.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle alt media selection
  const handleAltMediaSelect = useCallback((media) => {
    setSelectedAltMedia(media);
    setEditImagePreview(media.isAnimated ? media.file : (media.preview || media.file));
    setEditImageFile(null);
    setShowAltMediaPicker(false);
  }, []);

  // Close and reset state
  const handleClose = useCallback(() => {
    setEditImageFile(null);
    setEditImagePreview(null);
    setSelectedAltMedia(null);
    setShowAltMediaPicker(false);
    onClose();
  }, [onClose]);

  // Save character with file upload
  const handleSaveWithFile = async (e) => {
    e.preventDefault();
    if (!character) return;

    setSaving(true);
    try {
      await api.put(`/admin/characters/${character.id}`, editForm);
      
      if (editImageFile) {
        const formData = new FormData();
        formData.append('image', editImageFile);
        await api.put(`/admin/characters/${character.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_EDIT);
      onSuccess(t('admin.characterUpdated'));
      handleClose();
    } catch (err) {
      onError(err.response?.data?.error || t('admin.failedUpdateCharacter'));
    } finally {
      setSaving(false);
    }
  };

  // Save character with alt media URL
  const handleSaveWithAltMedia = async () => {
    if (!character || !selectedAltMedia) return;

    setSaving(true);
    try {
      await api.put(`/admin/characters/${character.id}`, editForm);
      await api.put(`/admin/characters/${character.id}/image-url`, {
        imageUrl: selectedAltMedia.file,
      });
      
      invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_EDIT);
      onSuccess(t('admin.characterUpdated'));
      handleClose();
    } catch (err) {
      onError(err.response?.data?.error || t('admin.failedUpdateCharacter'));
    } finally {
      setSaving(false);
    }
  };

  // Determine which image type to show in preview
  const renderImagePreview = () => {
    if (!editImagePreview) return null;

    let isVideoContent = false;
    if (selectedAltMedia) {
      isVideoContent = selectedAltMedia.isAnimated;
    } else if (editImageFile) {
      isVideoContent = isVideo(editImageFile);
    } else if (character) {
      isVideoContent = isVideo(character.image);
    }

    return (
      <ImagePreview>
        {isVideoContent ? (
          <video controls src={editImagePreview} autoPlay loop muted />
        ) : (
          <img src={editImagePreview} alt="Preview" />
        )}
      </ImagePreview>
    );
  };

  if (!show || !character) return null;

  return (
    <>
      <AnimatePresence>
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <ModalContent
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            <ModalHeader>
              <ModalTitle>
                <FaEdit /> Edit: {character.name}
              </ModalTitle>
              <CloseButton onClick={handleClose}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSaveWithFile}>
                <FormGroup>
                  <Label>{t('admin.name')}</Label>
                  <Input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.series')}</Label>
                  <Input
                    type="text"
                    value={editForm.series}
                    onChange={(e) => handleFormChange('series', e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.rarity')}</Label>
                  <Select
                    value={editForm.rarity}
                    onChange={(e) => handleFormChange('rarity', e.target.value)}
                  >
                    {orderedRarities.map(rarity => (
                      <option key={rarity.name} value={rarity.name}>
                        {rarity.displayName}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <CheckboxLabel>
                    <input
                      type="checkbox"
                      checked={editForm.isR18}
                      onChange={(e) => handleFormChange('isR18', e.target.checked)}
                    />
                    <span>🔞 {t('admin.r18Content')}</span>
                  </CheckboxLabel>
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.imageVideo')}</Label>
                  <ImageOptionsRow>
                    <FileInputWrapper>
                      <Input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={handleImageChange}
                      />
                    </FileInputWrapper>
                    <AltImageButton type="button" onClick={() => setShowAltMediaPicker(true)}>
                      <FaImage /> {t('animeImport.findAltImage') || 'Find Alt Image'}
                    </AltImageButton>
                  </ImageOptionsRow>
                  {selectedAltMedia && (
                    <SelectedAltInfo>
                      <FaCheck /> {t('animeImport.altImageSelected') || 'Alternative image selected from Danbooru'}
                    </SelectedAltInfo>
                  )}
                  {renderImagePreview()}
                </FormGroup>
                <ButtonRow>
                  {selectedAltMedia ? (
                    <PrimaryButton
                      type="button"
                      onClick={handleSaveWithAltMedia}
                      disabled={saving}
                      style={{ flex: 1 }}
                    >
                      {saving ? (
                        <>
                          <FaSpinner className="spin" /> {t('common.saving') || 'Saving...'}
                        </>
                      ) : (
                        t('admin.saveChanges')
                      )}
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton type="submit" disabled={saving} style={{ flex: 1 }}>
                      {saving ? (
                        <>
                          <FaSpinner className="spin" /> {t('common.saving') || 'Saving...'}
                        </>
                      ) : (
                        t('admin.saveChanges')
                      )}
                    </PrimaryButton>
                  )}
                  <SecondaryButton type="button" onClick={handleClose} style={{ flex: 1 }}>
                    {t('common.cancel')}
                  </SecondaryButton>
                </ButtonRow>
              </form>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      </AnimatePresence>

      {/* Alt Media Picker Modal */}
      <AltMediaPicker
        show={showAltMediaPicker}
        onClose={() => setShowAltMediaPicker(false)}
        characterName={character?.name}
        onSelectMedia={handleAltMediaSelect}
      />
    </>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const ImageOptionsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: stretch;
`;

const FileInputWrapper = styled.div`
  flex: 1;
`;

const AltImageButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(155, 89, 182, 0.3);
  }
`;

const SelectedAltInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(46, 204, 113, 0.15);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
`;

export default EditCharacterModal;

