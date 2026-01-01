/**
 * AdminAnnouncements - Announcement management component for the admin interface
 *
 * Features:
 * - Grid view of all announcements with card layout
 * - Status indicators (draft, scheduled, published, archived)
 * - Type and priority badges
 * - Quick stats (published, scheduled, drafts)
 * - Create, edit, publish, archive, and delete announcements
 * - Duplicate announcements
 *
 * @accessibility
 * - All interactive elements are keyboard accessible
 * - Status indicators use color + text for accessibility
 * - Focus management on actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdCampaign,
  MdAdd,
  MdEdit,
  MdDelete,
  MdPublish,
  MdArchive,
  MdContentCopy,
  MdSchedule,
  MdDrafts,
  MdVisibility,
  MdPeople,
  MdBuild,
  MdNewReleases,
  MdCelebration,
  MdDescription,
  MdLocalOffer,
  MdWarning,
  MdInfo
} from 'react-icons/md';
import { theme, motionVariants, AriaLiveRegion } from '../../design-system';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  duplicateAnnouncement,
  deleteAnnouncement
} from '../../services/announcementService';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  EmptyState,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
} from './Admin.styles';
import AnnouncementFormModal from './AnnouncementFormModal';
import { ConfirmDialog } from '../../design-system';

// ============================================
// TYPE CONFIGURATION
// ============================================

const TYPE_CONFIG = {
  maintenance: { icon: MdBuild, color: theme.colors.warning },
  update: { icon: MdNewReleases, color: theme.colors.success },
  event: { icon: MdCelebration, color: '#bf5af2' },
  patch_notes: { icon: MdDescription, color: theme.colors.primary },
  promotion: { icon: MdLocalOffer, color: theme.colors.featured },
  warning: { icon: MdWarning, color: theme.colors.warning },
  info: { icon: MdInfo, color: theme.colors.info }
};

const STATUS_CONFIG = {
  draft: { color: theme.colors.textTertiary, label: 'Draft' },
  scheduled: { color: theme.colors.warning, label: 'Scheduled' },
  published: { color: theme.colors.success, label: 'Published' },
  archived: { color: theme.colors.textMuted, label: 'Archived' }
};

const PRIORITY_CONFIG = {
  critical: { color: theme.colors.error },
  high: { color: theme.colors.warning },
  medium: { color: theme.colors.info },
  low: { color: theme.colors.textTertiary }
};

// ============================================
// MAIN COMPONENT
// ============================================

const AdminAnnouncements = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminAnnouncements({ limit: 100 });
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      toast.error(t('admin.errorFetchingAnnouncements'));
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingAnnouncement(null);
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((ann) => {
    setEditingAnnouncement(ann);
    setFormModalOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async (formData) => {
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, formData);
        toast.success(t('admin.announcementUpdated'));
      } else {
        await createAnnouncement(formData);
        toast.success(t('admin.announcementCreated'));
      }
      setFormModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      toast.error(err.response?.data?.error || t('admin.errorSavingAnnouncement'));
    }
  }, [editingAnnouncement, t, toast, fetchAnnouncements]);

  const handlePublish = useCallback(async (ann) => {
    try {
      await publishAnnouncement(ann.id);
      toast.success(t('admin.announcementPublished'));
      setAnnouncement(`${ann.title} published`);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error publishing announcement:', err);
      toast.error(err.response?.data?.error || t('admin.errorPublishing'));
    }
  }, [t, toast, fetchAnnouncements]);

  const handleArchive = useCallback(async (ann) => {
    try {
      await archiveAnnouncement(ann.id);
      toast.success(t('admin.announcementArchived'));
      setAnnouncement(`${ann.title} archived`);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error archiving announcement:', err);
      toast.error(err.response?.data?.error || t('admin.errorArchiving'));
    }
  }, [t, toast, fetchAnnouncements]);

  const handleDuplicate = useCallback(async (ann) => {
    try {
      await duplicateAnnouncement(ann.id);
      toast.success(t('admin.announcementDuplicated'));
      fetchAnnouncements();
    } catch (err) {
      console.error('Error duplicating announcement:', err);
      toast.error(err.response?.data?.error || t('admin.errorDuplicating'));
    }
  }, [t, toast, fetchAnnouncements]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteAnnouncement(confirmDelete.id);
      toast.success(t('admin.announcementDeleted'));
      setConfirmDelete(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error(err.response?.data?.error || t('admin.errorDeleting'));
    }
  }, [confirmDelete, t, toast, fetchAnnouncements]);

  // Stats
  const publishedCount = announcements.filter(a => a.status === 'published').length;
  const scheduledCount = announcements.filter(a => a.status === 'scheduled').length;
  const draftCount = announcements.filter(a => a.status === 'draft').length;

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label={t('admin.announcementManagement')}
    >
      <AriaLiveRegion politeness="polite">
        {announcement}
      </AriaLiveRegion>

      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.accent}>
          <MdCampaign aria-hidden="true" /> {t('admin.announcementManagement')}
          <ItemCount aria-label={t('admin.announcementCount', { count: announcements.length })}>
            {announcements.length} {t('admin.announcements')}
          </ItemCount>
        </SectionTitle>
        <AddButton
          onClick={handleCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={t('admin.createAnnouncement')}
        >
          <MdAdd aria-hidden="true" /> {t('admin.createAnnouncement')}
        </AddButton>
      </HeaderRow>

      <StatsRow role="group" aria-label={t('admin.announcementStats')}>
        <MiniStat>
          <MiniStatValue>{publishedCount}</MiniStatValue>
          <MiniStatLabel>{t('admin.published')}</MiniStatLabel>
        </MiniStat>
        <MiniStat>
          <MiniStatValue>{scheduledCount}</MiniStatValue>
          <MiniStatLabel>{t('admin.scheduled')}</MiniStatLabel>
        </MiniStat>
        <MiniStat>
          <MiniStatValue>{draftCount}</MiniStatValue>
          <MiniStatLabel>{t('admin.drafts')}</MiniStatLabel>
        </MiniStat>
      </StatsRow>

      {isLoading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : announcements.length === 0 ? (
        <EmptyState role="status">
          <EmptyIcon aria-hidden="true"><MdCampaign /></EmptyIcon>
          <EmptyText>{t('admin.noAnnouncements')}</EmptyText>
          <EmptySubtext>{t('admin.createFirstAnnouncement')}</EmptySubtext>
          <AddButton onClick={handleCreate} style={{ marginTop: theme.spacing.lg }}>
            <MdAdd aria-hidden="true" /> {t('admin.createAnnouncement')}
          </AddButton>
        </EmptyState>
      ) : (
        <AnnouncementGrid role="list" aria-label={t('admin.announcementList')}>
          <AnimatePresence mode="popLayout">
            {announcements.map((ann) => {
              const typeConfig = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
              const statusConfig = STATUS_CONFIG[ann.status] || STATUS_CONFIG.draft;
              const priorityConfig = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.medium;
              const TypeIcon = typeConfig.icon;

              return (
                <AnnouncementCard
                  key={ann.id}
                  variants={motionVariants.card}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{ y: -4 }}
                  layout
                  $status={ann.status}
                  role="listitem"
                >
                  <CardHeader>
                    <TypeBadge $color={typeConfig.color}>
                      <TypeIcon aria-hidden="true" />
                      {t(`announcements.types.${ann.type}`)}
                    </TypeBadge>
                    <StatusBadge $color={statusConfig.color}>
                      {ann.status === 'scheduled' && <MdSchedule aria-hidden="true" />}
                      {ann.status === 'draft' && <MdDrafts aria-hidden="true" />}
                      {ann.status === 'published' && <MdVisibility aria-hidden="true" />}
                      {ann.status === 'archived' && <MdArchive aria-hidden="true" />}
                      {t(`admin.status.${ann.status}`)}
                    </StatusBadge>
                  </CardHeader>

                  <CardBody>
                    <CardTitle>{ann.title}</CardTitle>
                    <CardContent>{ann.content.substring(0, 100)}{ann.content.length > 100 ? '...' : ''}</CardContent>

                    <MetaRow>
                      <MetaItem>
                        <PriorityDot $color={priorityConfig.color} />
                        {t(`announcements.priority.${ann.priority}`)}
                      </MetaItem>
                      <MetaItem>
                        <MdPeople aria-hidden="true" />
                        {t(`announcements.audience.${ann.targetAudience}`)}
                      </MetaItem>
                    </MetaRow>

                    <StatsGrid>
                      <StatItem>
                        <StatValue>{ann.viewCount}</StatValue>
                        <StatLabel>{t('admin.views')}</StatLabel>
                      </StatItem>
                      <StatItem>
                        <StatValue>{ann.acknowledgmentCount}</StatValue>
                        <StatLabel>{t('admin.acknowledgments')}</StatLabel>
                      </StatItem>
                    </StatsGrid>
                  </CardBody>

                  <CardActions>
                    {ann.status === 'draft' && (
                      <ActionButton onClick={() => handlePublish(ann)} $variant="success">
                        <MdPublish aria-hidden="true" /> {t('admin.publish')}
                      </ActionButton>
                    )}
                    {ann.status === 'published' && (
                      <ActionButton onClick={() => handleArchive(ann)} $variant="warning">
                        <MdArchive aria-hidden="true" /> {t('admin.archive')}
                      </ActionButton>
                    )}
                    <ActionButton onClick={() => handleEdit(ann)}>
                      <MdEdit aria-hidden="true" /> {t('common.edit')}
                    </ActionButton>
                    <ActionButton onClick={() => handleDuplicate(ann)}>
                      <MdContentCopy aria-hidden="true" />
                    </ActionButton>
                    <ActionButton onClick={() => setConfirmDelete(ann)} $danger>
                      <MdDelete aria-hidden="true" />
                    </ActionButton>
                  </CardActions>
                </AnnouncementCard>
              );
            })}
          </AnimatePresence>
        </AnnouncementGrid>
      )}

      {/* Form Modal */}
      {formModalOpen && (
        <AnnouncementFormModal
          announcement={editingAnnouncement}
          onSubmit={handleFormSubmit}
          onClose={() => setFormModalOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          title={t('admin.deleteAnnouncement')}
          message={t('admin.confirmDeleteAnnouncement', { title: confirmDelete.title })}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          variant="danger"
        />
      )}
    </AdminContainer>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const AddButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

const MiniStat = styled.div`
  text-align: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const MiniStatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const MiniStatLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.textSecondary};
`;

const AnnouncementGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${theme.breakpoints.xl}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const AnnouncementCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;

  ${props => props.$status === 'archived' && css`
    opacity: 0.6;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const TypeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => `${props.$color}20`};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color};
  text-transform: uppercase;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$color};
`;

const CardBody = styled.div`
  padding: ${theme.spacing.md};
`;

const CardTitle = styled.h3`
  margin: 0 0 ${theme.spacing.xs};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  line-height: 1.4;
`;

const CardContent = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};

  svg {
    font-size: 14px;
  }
`;

const PriorityDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$color};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};
`;

const StatItem = styled.div`
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.textTertiary};
`;

const CardActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  min-height: 36px;
  background: ${props => {
    if (props.$danger) return 'rgba(255, 59, 48, 0.15)';
    if (props.$variant === 'success') return 'rgba(52, 199, 89, 0.15)';
    if (props.$variant === 'warning') return 'rgba(255, 159, 10, 0.15)';
    return 'rgba(0, 113, 227, 0.15)';
  }};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => {
    if (props.$danger) return theme.colors.error;
    if (props.$variant === 'success') return theme.colors.success;
    if (props.$variant === 'warning') return theme.colors.warning;
    return theme.colors.primary;
  }};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${props => {
      if (props.$danger) return 'rgba(255, 59, 48, 0.25)';
      if (props.$variant === 'success') return 'rgba(52, 199, 89, 0.25)';
      if (props.$variant === 'warning') return 'rgba(255, 159, 10, 0.25)';
      return 'rgba(0, 113, 227, 0.25)';
    }};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

AdminAnnouncements.propTypes = {};

export default AdminAnnouncements;
