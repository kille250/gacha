/**
 * AnnouncementFormModal - Modal form for creating/editing announcements
 *
 * Features:
 * - Create new announcements or edit existing ones
 * - All announcement fields (title, content, type, priority, etc.)
 * - Scheduling with date pickers
 * - Display mode selection
 * - Target audience configuration
 * - Live preview of content
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  MdClose,
  MdSave,
  MdSchedule,
  MdBuild,
  MdNewReleases,
  MdCelebration,
  MdDescription,
  MdLocalOffer,
  MdWarning,
  MdInfo
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';

// ============================================
// OPTIONS
// ============================================

const TYPE_OPTIONS = [
  { value: 'info', label: 'Info', icon: MdInfo },
  { value: 'update', label: 'Update', icon: MdNewReleases },
  { value: 'event', label: 'Event', icon: MdCelebration },
  { value: 'maintenance', label: 'Maintenance', icon: MdBuild },
  { value: 'patch_notes', label: 'Patch Notes', icon: MdDescription },
  { value: 'promotion', label: 'Promotion', icon: MdLocalOffer },
  { value: 'warning', label: 'Warning', icon: MdWarning }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const DISPLAY_MODE_OPTIONS = [
  { value: 'banner', label: 'Banner' },
  { value: 'modal', label: 'Modal' },
  { value: 'toast', label: 'Toast' },
  { value: 'inline', label: 'Inline' }
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'admins', label: 'Admins Only' },
  { value: 'premium', label: 'Premium Users' },
  { value: 'new_users', label: 'New Users' }
];

// ============================================
// COMPONENT
// ============================================

const AnnouncementFormModal = ({ announcement, onSubmit, onClose }) => {
  const { t } = useTranslation();
  const isEditing = !!announcement;

  // Form state
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    type: announcement?.type || 'info',
    priority: announcement?.priority || 'medium',
    status: announcement?.status || 'draft',
    displayMode: announcement?.displayMode || 'banner',
    targetAudience: announcement?.targetAudience || 'all',
    dismissible: announcement?.dismissible ?? true,
    requiresAcknowledgment: announcement?.requiresAcknowledgment ?? false,
    publishAt: announcement?.publishAt ? new Date(announcement.publishAt).toISOString().slice(0, 16) : '',
    expiresAt: announcement?.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the modal container when opened
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        publishAt: formData.publishAt || null,
        expiresAt: formData.expiresAt || null
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit]);

  return (
    <Overlay onClick={onClose}>
      <ModalContainer
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-form-title"
      >
        <ModalHeader>
          <ModalTitle id="announcement-form-title">
            {isEditing ? t('admin.editAnnouncement') : t('admin.createAnnouncement')}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label={t('common.close')}>
            <MdClose />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <Form onSubmit={handleSubmit}>
            {/* Title */}
            <FormGroup>
              <Label htmlFor="title">{t('admin.announcementTitle')} *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder={t('admin.enterTitle')}
                required
              />
            </FormGroup>

            {/* Content */}
            <FormGroup>
              <Label htmlFor="content">{t('admin.announcementContent')} *</Label>
              <TextArea
                id="content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder={t('admin.enterContent')}
                rows={6}
                required
              />
            </FormGroup>

            {/* Type and Priority Row */}
            <FormRow>
              <FormGroup>
                <Label htmlFor="type">{t('admin.type')}</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  {TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`announcements.types.${opt.value}`)}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="priority">{t('admin.priority')}</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`announcements.priority.${opt.value}`)}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </FormRow>

            {/* Display Mode and Audience Row */}
            <FormRow>
              <FormGroup>
                <Label htmlFor="displayMode">{t('admin.displayMode')}</Label>
                <Select
                  id="displayMode"
                  value={formData.displayMode}
                  onChange={(e) => handleChange('displayMode', e.target.value)}
                >
                  {DISPLAY_MODE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`announcements.displayMode.${opt.value}`)}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="targetAudience">{t('admin.targetAudience')}</Label>
                <Select
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => handleChange('targetAudience', e.target.value)}
                >
                  {AUDIENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`announcements.audience.${opt.value}`)}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </FormRow>

            {/* Scheduling Row */}
            <FormRow>
              <FormGroup>
                <Label htmlFor="publishAt">
                  <MdSchedule /> {t('admin.publishAt')}
                </Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  value={formData.publishAt}
                  onChange={(e) => handleChange('publishAt', e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="expiresAt">{t('admin.expiresAt')}</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => handleChange('expiresAt', e.target.value)}
                />
              </FormGroup>
            </FormRow>

            {/* Options */}
            <OptionsGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  checked={formData.dismissible}
                  onChange={(e) => handleChange('dismissible', e.target.checked)}
                />
                <span>{t('admin.dismissible')}</span>
              </CheckboxLabel>

              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  checked={formData.requiresAcknowledgment}
                  onChange={(e) => handleChange('requiresAcknowledgment', e.target.checked)}
                />
                <span>{t('admin.requiresAcknowledgment')}</span>
              </CheckboxLabel>
            </OptionsGroup>
          </Form>
        </ModalBody>

        <ModalFooter>
          <CancelButton type="button" onClick={onClose}>
            {t('common.cancel')}
          </CancelButton>
          <SubmitButton
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
          >
            <MdSave aria-hidden="true" />
            {isSubmitting ? t('common.saving') : (isEditing ? t('common.save') : t('admin.createAnnouncement'))}
          </SubmitButton>
        </ModalFooter>
      </ModalContainer>
    </Overlay>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${theme.zIndex?.modal || 2000};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: ${theme.spacing.md};
`;

const ModalContainer = styled(motion.div)`
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.glassBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glassHover};
    color: ${theme.colors.text};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  flex: 1;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.md};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};

  svg {
    font-size: 16px;
  }
`;

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.md};
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const TextArea = styled.textarea`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.md};
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const Select = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.md};
  cursor: pointer;
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  option {
    background: ${theme.colors.backgroundSecondary};
    color: ${theme.colors.text};
  }
`;

const OptionsGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.text};
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${theme.colors.primary};
  cursor: pointer;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
`;

const CancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.glassBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glassHover};
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${theme.colors.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

AnnouncementFormModal.propTypes = {
  /** Announcement to edit (null for create) */
  announcement: PropTypes.object,
  /** Form submission handler */
  onSubmit: PropTypes.func.isRequired,
  /** Close modal handler */
  onClose: PropTypes.func.isRequired
};

export default AnnouncementFormModal;
