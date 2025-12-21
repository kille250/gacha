import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaFlag, FaPlus, FaEdit, FaTrash, FaGripVertical, FaStar, FaRegStar } from 'react-icons/fa';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';
import { PLACEHOLDER_BANNER } from '../../utils/mediaUtils';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  ActionButton,
  IconButton,
  EmptyState,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
  StatusBadge,
} from './AdminStyles';

// Sortable Banner Item
const SortableBannerCard = ({ banner, index, getBannerImageUrl, onToggleFeatured, onEdit, onDelete }) => {
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

  return (
    <BannerCard ref={setNodeRef} style={style} $isDragging={isDragging}>
      <DragHandle {...attributes} {...listeners}>
        <FaGripVertical />
      </DragHandle>
      <OrderBadge>{index + 1}</OrderBadge>
      <BannerThumb>
        <img src={getBannerImageUrl(banner.image)} alt={banner.name} onError={(e) => { e.target.src = PLACEHOLDER_BANNER; }} />
      </BannerThumb>
      <BannerInfo>
        <BannerName>{banner.name}</BannerName>
        <BannerMeta>
          {banner.series} • {banner.Characters?.length || 0} characters
        </BannerMeta>
      </BannerInfo>
      <BannerTags>
        <FeaturedButton 
          $featured={banner.featured}
          onClick={() => onToggleFeatured(banner)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {banner.featured ? <FaStar /> : <FaRegStar />}
          {banner.featured ? 'Featured' : 'Feature'}
        </FeaturedButton>
        <StatusBadge $active={banner.active}>
          {banner.active ? 'Active' : 'Inactive'}
        </StatusBadge>
      </BannerTags>
      <BannerActions>
        <BannerIconButton onClick={() => onEdit(banner)}>
          <FaEdit />
        </BannerIconButton>
        <BannerIconButton $danger onClick={() => onDelete(banner.id)}>
          <FaTrash />
        </BannerIconButton>
      </BannerActions>
    </BannerCard>
  );
};

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

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.warning}>
          <FaFlag /> {t('admin.bannerManagement')}
          <ItemCount>{banners.length} banners</ItemCount>
        </SectionTitle>
        <AddBannerButton onClick={onAddBanner} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <FaPlus /> {t('admin.addBanner')}
        </AddBannerButton>
      </HeaderRow>
      
      <DragHint>
        <span>💡</span> {t('admin.dragToReorder')}
      </DragHint>
      
      {banners.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🏳️</EmptyIcon>
          <EmptyText>No banners yet</EmptyText>
          <EmptySubtext>Create your first banner to get started</EmptySubtext>
          <AddBannerButton onClick={onAddBanner} style={{ marginTop: theme.spacing.lg }}>
            <FaPlus /> Create Banner
          </AddBannerButton>
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <BannerList>
              {banners.map((banner, index) => (
                <SortableBannerCard
                  key={banner.id}
                  banner={banner}
                  index={index}
                  getBannerImageUrl={getBannerImageUrl}
                  onToggleFeatured={onToggleFeatured}
                  onEdit={onEditBanner}
                  onDelete={onDeleteBanner}
                />
              ))}
            </BannerList>
          </SortableContext>
        </DndContext>
      )}
      
      <StatsRow>
        <StatItem>
          <StatLabel>Featured</StatLabel>
          <StatValue>{banners.filter(b => b.featured).length}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Active</StatLabel>
          <StatValue>{banners.filter(b => b.active).length}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Total Characters</StatLabel>
          <StatValue>{banners.reduce((sum, b) => sum + (b.Characters?.length || 0), 0)}</StatValue>
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
  
  &:hover {
    color: ${theme.colors.text};
    background: rgba(255, 255, 255, 0.05);
  }
  
  &:active { cursor: grabbing; }
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
`;

const BannerActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  flex-shrink: 0;
`;

const BannerIconButton = styled(IconButton)`
  width: 40px;
  height: 40px;
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
