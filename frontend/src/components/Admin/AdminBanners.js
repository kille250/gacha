import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaFlag, FaPlus, FaEdit, FaTrash, FaGripVertical, FaStar, FaRegStar } from 'react-icons/fa';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { theme, motionVariants } from '../../design-system';
import { useTranslation } from 'react-i18next';
import { PLACEHOLDER_BANNER } from '../../utils/mediaUtils';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  IconButton,
  EmptyState,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
  StatusBadge,
} from './AdminStyles';

/**
 * Sortable Banner Item
 *
 * @accessibility
 * - Drag handle has proper aria-label for screen readers
 * - Keyboard navigation via arrow keys when drag handle is focused
 * - Focus visible indicators on all interactive elements
 * - Status announced via aria-live when featured status changes
 */
const SortableBannerCard = ({ banner, index, getBannerImageUrl, onToggleFeatured, onEdit, onDelete, t }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    touchAction: 'none',
  };

  // Keyboard handler for banner card actions
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit(banner);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(banner.id, banner.name);
    }
  };

  return (
    <BannerCard
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      role="listitem"
      aria-label={`${banner.name} - ${banner.series}, ${banner.featured ? 'Featured' : 'Not featured'}, ${banner.active ? 'Active' : 'Inactive'}`}
      onKeyDown={handleKeyDown}
    >
      <DragHandle
        {...attributes}
        {...listeners}
        aria-label={t('admin.dragToReorder', 'Drag to reorder')}
        aria-describedby={`banner-${banner.id}-order`}
      >
        <FaGripVertical aria-hidden="true" />
      </DragHandle>
      <OrderBadge id={`banner-${banner.id}-order`} aria-label={`Position ${index + 1}`}>
        {index + 1}
      </OrderBadge>
      <BannerThumb>
        <img
          src={getBannerImageUrl(banner.image)}
          alt=""
          aria-hidden="true"
          onError={(e) => { e.target.src = PLACEHOLDER_BANNER; }}
        />
      </BannerThumb>
      <BannerInfo>
        <BannerName>{banner.name}</BannerName>
        <BannerMeta>
          {banner.series} • {banner.Characters?.length || 0} {t('gacha.characters', 'characters')}
        </BannerMeta>
      </BannerInfo>
      <BannerTags>
        <FeaturedButton
          $featured={banner.featured}
          onClick={() => onToggleFeatured(banner)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-pressed={banner.featured}
          aria-label={banner.featured
            ? t('admin.removeFeatured', 'Remove from featured')
            : t('admin.addFeatured', 'Add to featured')
          }
        >
          {banner.featured ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
          <span>{banner.featured ? t('admin.featured') : t('admin.feature')}</span>
        </FeaturedButton>
        <StatusBadge $active={banner.active} role="status">
          {banner.active ? t('admin.active') : t('admin.inactive')}
        </StatusBadge>
      </BannerTags>
      <BannerActions>
        <BannerIconButton
          onClick={() => onEdit(banner)}
          aria-label={t('admin.editBanner', 'Edit {{name}}').replace('{{name}}', banner.name)}
        >
          <FaEdit aria-hidden="true" />
        </BannerIconButton>
        <BannerIconButton
          $danger
          onClick={() => onDelete(banner.id, banner.name)}
          aria-label={t('admin.deleteBanner', 'Delete {{name}}').replace('{{name}}', banner.name)}
        >
          <FaTrash aria-hidden="true" />
        </BannerIconButton>
      </BannerActions>
    </BannerCard>
  );
};

/**
 * AdminBanners - Banner management with drag-and-drop reordering
 *
 * @accessibility
 * - Uses aria-live to announce drag operations
 * - Keyboard accessible via @dnd-kit keyboard sensor
 * - All buttons have proper labels
 * - Empty state has clear call-to-action
 */
const AdminBanners = ({
  banners,
  getBannerImageUrl,
  onAddBanner,
  onEditBanner,
  onDeleteBanner,
  onToggleFeatured,
  onDragEnd
}) => {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Announce drag operation for screen readers
  const announcements = {
    onDragStart: ({ active }) => {
      const banner = banners.find(b => b.id === active.id);
      return `Picked up banner ${banner?.name}. Use arrow keys to move.`;
    },
    onDragOver: ({ over }) => {
      if (over) {
        const overIndex = banners.findIndex(b => b.id === over.id);
        return `Banner is now at position ${overIndex + 1} of ${banners.length}.`;
      }
      return '';
    },
    onDragEnd: ({ active, over }) => {
      if (over) {
        const overIndex = banners.findIndex(b => b.id === over.id);
        const banner = banners.find(b => b.id === active.id);
        return `Dropped ${banner?.name} at position ${overIndex + 1}.`;
      }
      return `Drag cancelled.`;
    },
    onDragCancel: () => `Drag cancelled.`,
  };

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label={t('admin.bannerManagement', 'Banner Management')}
    >
      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.warning}>
          <FaFlag aria-hidden="true" /> {t('admin.bannerManagement')}
          <ItemCount aria-label={`${banners.length} total banners`}>{banners.length} banners</ItemCount>
        </SectionTitle>
        <AddBannerButton
          onClick={onAddBanner}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={t('admin.addBanner', 'Add new banner')}
        >
          <FaPlus aria-hidden="true" /> {t('admin.addBanner')}
        </AddBannerButton>
      </HeaderRow>

      <DragHint role="note" aria-live="polite">
        <span aria-hidden="true">💡</span> {t('admin.dragToReorder', 'Drag banners to change their display order. Use keyboard arrow keys when focused on the drag handle.')}
      </DragHint>

      {banners.length === 0 ? (
        <EmptyState role="status">
          <EmptyIcon aria-hidden="true">🏳️</EmptyIcon>
          <EmptyText>{t('admin.noBannersYet', 'No banners yet')}</EmptyText>
          <EmptySubtext>{t('admin.createFirstBanner', 'Create your first banner to get started')}</EmptySubtext>
          <AddBannerButton
            onClick={onAddBanner}
            style={{ marginTop: theme.spacing.lg }}
            aria-label={t('admin.createBanner', 'Create banner')}
          >
            <FaPlus aria-hidden="true" /> {t('admin.createBanner')}
          </AddBannerButton>
        </EmptyState>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: `To pick up a banner, press space or enter. While dragging, use the arrow keys to move the banner. Press space or enter again to drop the banner, or press escape to cancel.`,
            },
          }}
        >
          <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <BannerList role="list" aria-label={t('admin.bannerList', 'Banner list')}>
              {banners.map((banner, index) => (
                <SortableBannerCard
                  key={banner.id}
                  banner={banner}
                  index={index}
                  getBannerImageUrl={getBannerImageUrl}
                  onToggleFeatured={onToggleFeatured}
                  onEdit={onEditBanner}
                  onDelete={onDeleteBanner}
                  t={t}
                />
              ))}
            </BannerList>
          </SortableContext>
        </DndContext>
      )}

      <StatsRow role="group" aria-label={t('admin.bannerStats', 'Banner statistics')}>
        <StatItem>
          <StatLabel id="featured-label">{t('admin.featuredCount', 'Featured')}</StatLabel>
          <StatValue aria-labelledby="featured-label">{banners.filter(b => b.featured).length}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel id="active-label">{t('admin.activeCount', 'Active')}</StatLabel>
          <StatValue aria-labelledby="active-label">{banners.filter(b => b.active).length}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel id="chars-label">{t('admin.totalCharactersCount', 'Total Characters')}</StatLabel>
          <StatValue aria-labelledby="chars-label">{banners.reduce((sum, b) => sum + (b.Characters?.length || 0), 0)}</StatValue>
        </StatItem>
      </StatsRow>
    </AdminContainer>
  );
};

// ============================================
// BANNER-SPECIFIC STYLED COMPONENTS
// ============================================

const AddBannerButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b35);
  border: none;
  border-radius: ${theme.radius.lg};
  color: #1a1a1a;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
`;

const DragHint = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.2);
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.warning};
  margin-bottom: ${theme.spacing.lg};
`;

const BannerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const BannerCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$isDragging ? theme.colors.surface : theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$isDragging ? theme.colors.warning : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast};
  will-change: ${props => props.$isDragging ? 'transform' : 'auto'};
  
  &:hover {
    background: ${theme.colors.surface};
    border-color: ${theme.colors.surfaceBorder};
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  cursor: grab;
  touch-action: none;
  min-width: 44px;
  min-height: 44px;
  border-radius: ${theme.radius.md};
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${theme.colors.text};
      background: rgba(255, 255, 255, 0.05);
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
    color: ${theme.colors.primary};
    background: ${theme.colors.primarySubtle};
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.95);
  }

  /* Visual feedback during drag */
  &[aria-pressed="true"] {
    color: ${theme.colors.primary};
    background: ${theme.colors.primaryMuted};
  }
`;

const OrderBadge = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b35);
  color: #1a1a1a;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  flex-shrink: 0;
`;

const BannerThumb = styled.div`
  width: 100px;
  height: 60px;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    width: 80px;
    height: 50px;
  }
`;

const BannerInfo = styled.div`
  flex: 1;
  min-width: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-basis: calc(100% - 200px);
  }
`;

const BannerName = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BannerMeta = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const BannerTags = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-basis: 100%;
    margin-left: 60px;
  }
`;

const FeaturedButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-height: 40px;
  background: ${props => props.$featured
    ? 'linear-gradient(135deg, #ffd60a, #ffb300)'
    : theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$featured ? 'transparent' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.$featured ? '#1a1a1a' : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  box-shadow: ${props => props.$featured ? '0 4px 12px rgba(255, 215, 0, 0.3)' : 'none'};
  transition: box-shadow ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    min-height: 44px;
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BannerActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  flex-shrink: 0;
`;

const BannerIconButton = styled(IconButton)`
  width: 44px;
  height: 44px;

  @media (hover: hover) and (pointer: fine) {
    width: 40px;
    height: 40px;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
`;

const StatItem = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

export default AdminBanners;
