/**
 * Shared styled components for Admin pages
 * Centralizes common UI patterns to reduce duplication
 *
 * NOTE: This file is being migrated to use the design system.
 * Modal components are now re-exported from the design system.
 * Admin-specific customizations are kept here.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  theme,
  ModalOverlay as DSModalOverlay,
  ModalContent as DSModalContent,
  ModalHeader as DSModalHeader,
  ModalBody as DSModalBody,
  ModalFooter as DSModalFooter,
} from '../../design-system';

// ============================================
// CONTAINER COMPONENTS
// ============================================

export const AdminContainer = styled(motion.div)`
  padding: 0 ${theme.spacing.md};
`;

// ============================================
// HEADER COMPONENTS
// ============================================

export const HeaderRow = styled.div`
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

export const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  color: ${theme.colors.text};

  svg { color: ${props => props.$iconColor || theme.colors.primary}; }
`;

export const ItemCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.backgroundTertiary};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  margin-left: ${theme.spacing.sm};
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

// ============================================
// SEARCH COMPONENTS
// ============================================

export const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-width: 200px;

  svg { color: ${theme.colors.textMuted}; font-size: 14px; }
`;

export const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  flex: 1;
  outline: none;

  &::placeholder { color: ${theme.colors.textMuted}; }
`;

export const ItemsPerPageSelect = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
`;

// ============================================
// MODAL COMPONENTS
// Re-exported from design system with Admin customizations
// ============================================

// Re-export design system modal components for backwards compatibility
export const ModalOverlay = styled(DSModalOverlay)`
  z-index: 10000;
`;

export const ModalContent = styled(DSModalContent)`
  width: 100%;
  max-width: ${props => props.$maxWidth || '500px'};
`;

export const ModalHeader = DSModalHeader;
export const ModalBody = DSModalBody;
export const ModalFooter = DSModalFooter;

// Admin-specific: Title with icon color support
export const ModalTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg { color: ${props => props.$iconColor || theme.colors.primary}; }
`;

// Admin-specific: Simple close button (design system uses IconButton)
export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  font-size: 24px;
  cursor: pointer;
  padding: ${theme.spacing.xs};
  line-height: 1;
  border-radius: ${theme.radius.sm};
  transition: all ${theme.transitions.fast};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${theme.colors.text};
      background: ${theme.colors.glass};
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

// ============================================
// FORM COMPONENTS
// ============================================

export const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

export const FormRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

export const Label = styled.label`
  display: block;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

export const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  min-height: 48px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${theme.colors.surfaceBorder};
  }

  /* Error state - use aria-invalid for semantic styling */
  &[aria-invalid="true"] {
    border-color: ${theme.colors.error};

    &:focus {
      box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.2);
    }
  }

  /* Success state */
  &[data-valid="true"] {
    border-color: ${theme.colors.success};
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-right: ${theme.spacing.xl};
  min-height: 48px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};
  /* Custom dropdown arrow */
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='rgba(255,255,255,0.6)' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right ${theme.spacing.md} center;

  &:hover:not(:focus):not(:disabled) {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: ${theme.colors.surfaceSolid};
    color: ${theme.colors.text};
    padding: ${theme.spacing.sm};
  }
`;

export const FileInput = styled.input`
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

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${props => props.$padded ? theme.spacing.md : 0};
  background: ${props => props.$padded ? theme.colors.backgroundTertiary : 'transparent'};
  border: ${props => props.$padded ? `1px solid ${theme.colors.surfaceBorder}` : 'none'};
  border-radius: ${props => props.$padded ? theme.radius.md : 0};
  cursor: pointer;
  
  input { width: 18px; height: 18px; }
  span { font-weight: ${theme.fontWeights.medium}; color: ${props => props.$highlight ? theme.colors.error : theme.colors.text}; }
`;

// ============================================
// BUTTON COMPONENTS
// ============================================

export const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) { background: ${theme.colors.surface}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => {
    if (props.$variant === 'secondary') return 'linear-gradient(135deg, #5856d6, #af52de)';
    if (props.$variant === 'accent') return 'linear-gradient(135deg, #ff6b9d, #c44569)';
    if (props.$variant === 'warning') return `linear-gradient(135deg, ${theme.colors.warning}, #ff6b35)`;
    if (props.$variant === 'gold') return 'linear-gradient(135deg, #ffd60a, #ff9f0a)';
    return `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`;
  }};
  border: none;
  border-radius: ${theme.radius.lg};
  color: ${props => props.$variant === 'warning' || props.$variant === 'gold' ? '#1a1a1a' : 'white'};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover { opacity: 0.9; transform: translateY(-1px); }
`;

export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  /* Minimum 44x44 touch target for accessibility (WCAG 2.5.5) */
  min-width: 44px;
  min-height: 44px;
  background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 113, 227, 0.15)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.primary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.25)' : 'rgba(0, 113, 227, 0.25)'};
      transform: translateY(-1px);
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const ToggleButton = styled.button`
  padding: 6px 14px;
  min-height: 36px;
  border: none;
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  background: ${props => props.$enabled ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$enabled ? '#30d158' : theme.colors.textSecondary};
  border: 1px solid ${props => props.$enabled ? 'rgba(48, 209, 88, 0.3)' : theme.colors.surfaceBorder};
  -webkit-tap-highlight-color: transparent;

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    min-height: 44px;
    padding: 8px 16px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      opacity: 0.85;
      transform: translateY(-1px);
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const ViewToggle = styled.div`
  display: flex;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: 4px;
`;

export const ViewButton = styled.button`
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

export const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

// ============================================
// EMPTY STATE COMPONENTS
// NOTE: Prefer using EmptyState from design-system for standard states.
// These are kept for backward compatibility with existing Admin components.
// ============================================

export const AdminEmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

export const AdminEmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.md};
`;

export const AdminEmptyText = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

export const AdminEmptySubtext = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

// Backward compatibility aliases - deprecated, use design-system EmptyState
/** @deprecated Use EmptyState from design-system or AdminEmptyState */
export const EmptyState = AdminEmptyState;
/** @deprecated Use AdminEmptyIcon */
export const EmptyIcon = AdminEmptyIcon;
/** @deprecated Use AdminEmptyText */
export const EmptyText = AdminEmptyText;
/** @deprecated Use AdminEmptySubtext */
export const EmptySubtext = AdminEmptySubtext;

// ============================================
// PAGINATION COMPONENTS
// ============================================

export const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
`;

export const PageButton = styled.button`
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

export const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

// ============================================
// FEEDBACK COMPONENTS
// ============================================

export const SuccessMessage = styled.p`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(48, 209, 88, 0.15);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

// ============================================
// MEDIA COMPONENTS
// ============================================

export const ImagePreview = styled.div`
  margin-top: ${theme.spacing.md};
  
  img, video {
    max-width: 100%;
    max-height: 200px;
    border-radius: ${theme.radius.md};
    border: 1px solid ${theme.colors.surfaceBorder};
  }
`;

// ============================================
// ACTION BAR COMPONENTS
// ============================================

export const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

export const ActionGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

// ============================================
// STATUS COMPONENTS
// ============================================

export const StatusBadge = styled.span`
  padding: 4px 12px;
  background: ${props => props.$active ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 59, 48, 0.15)'};
  border: 1px solid ${props => props.$active ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 59, 48, 0.3)'};
  border-radius: ${theme.radius.full};
  color: ${props => props.$active ? theme.colors.success : theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
`;

// ============================================
// FORM VALIDATION COMPONENTS
// ============================================

/**
 * Inline error message for form fields
 * Use with aria-describedby on the input for accessibility
 */
export const FieldError = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 59, 48, 0.1);
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};

  svg {
    flex-shrink: 0;
    font-size: 12px;
  }
`;

/**
 * Success hint for validated fields
 */
export const FieldSuccess = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};

  svg {
    flex-shrink: 0;
    font-size: 12px;
  }
`;

/**
 * Helper text under form fields
 */
export const FieldHint = styled.span`
  display: block;
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.xs};
  line-height: 1.4;
`;

// ============================================
// LOADING STATES
// ============================================

/**
 * Inline loading indicator for buttons/actions
 */
export const InlineSpinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * Skeleton loading placeholder for content
 */
export const SkeletonBox = styled.div`
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 0%,
    ${theme.colors.surface} 50%,
    ${theme.colors.backgroundTertiary} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: ${props => props.$radius || theme.radius.md};
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

// ============================================
// ALERT/NOTIFICATION COMPONENTS
// ============================================

/**
 * Contextual alert box for admin panels
 */
export const AdminAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => {
    switch (props.$variant) {
      case 'error': return 'rgba(255, 59, 48, 0.1)';
      case 'warning': return 'rgba(255, 159, 10, 0.1)';
      case 'success': return 'rgba(48, 209, 88, 0.1)';
      case 'info': return 'rgba(90, 200, 250, 0.1)';
      default: return theme.colors.surface;
    }
  }};
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'error': return 'rgba(255, 59, 48, 0.3)';
      case 'warning': return 'rgba(255, 159, 10, 0.3)';
      case 'success': return 'rgba(48, 209, 88, 0.3)';
      case 'info': return 'rgba(90, 200, 250, 0.3)';
      default: return theme.colors.surfaceBorder;
    }
  }};
  border-radius: ${theme.radius.lg};
  color: ${props => {
    switch (props.$variant) {
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'success': return theme.colors.success;
      case 'info': return theme.colors.info;
      default: return theme.colors.text;
    }
  }};

  svg {
    flex-shrink: 0;
    font-size: 18px;
    margin-top: 2px;
  }
`;

export const AlertContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const AlertTitle = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.xs};
`;

export const AlertMessage = styled.div`
  font-size: ${theme.fontSizes.sm};
  opacity: 0.9;
  line-height: 1.5;
`;

// ============================================
// RESPONSIVE TABLE HELPERS
// ============================================

/**
 * Responsive card that shows/hides based on breakpoint
 * Used for mobile-friendly data display
 */
export const ResponsiveCard = styled.div`
  display: none;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;

  @media (max-width: ${theme.breakpoints.md}) {
    display: block;
  }
`;

/**
 * Responsive table that hides on mobile
 */
export const ResponsiveTable = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;

  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

// ============================================
// CONFIRMATION/PREVIEW COMPONENTS
// ============================================

/**
 * Preview box for showing changes before applying
 */
export const PreviewBox = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border: 1px dashed ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  margin: ${theme.spacing.md} 0;

  .preview-label {
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${theme.colors.textMuted};
    margin-bottom: ${theme.spacing.sm};
  }
`;

/**
 * Comparison display for before/after changes
 */
export const ComparisonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: ${theme.spacing.md};
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};

  &:last-child {
    border-bottom: none;
  }

  .old-value {
    color: ${theme.colors.textSecondary};
    text-decoration: line-through;
    text-align: right;
  }

  .arrow {
    color: ${theme.colors.primary};
    font-size: 14px;
  }

  .new-value {
    color: ${theme.colors.success};
    font-weight: ${theme.fontWeights.medium};
  }
`;

// ============================================
// BATCH ACTION COMPONENTS
// ============================================

/**
 * Sticky batch action bar that appears when items are selected
 */
export const BatchActionBar = styled(motion.div)`
  position: sticky;
  bottom: ${theme.spacing.lg};
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surfaceSolid};
  border: 1px solid ${theme.colors.primary};
  border-radius: ${theme.radius.xl};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 100;

  /* Safe area for mobile */
  @media (max-width: ${theme.breakpoints.md}) {
    bottom: calc(${theme.spacing.lg} + env(safe-area-inset-bottom, 0px));
    margin: 0 ${theme.spacing.md};
    flex-wrap: wrap;
  }
`;

export const BatchActionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 ${theme.spacing.sm};
    background: ${theme.colors.primary};
    border-radius: ${theme.radius.full};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.bold};
    color: white;
  }
`;

export const BatchActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

// ============================================
// TOOLTIP COMPONENT
// ============================================

/**
 * Simple tooltip wrapper
 * Position with data-tooltip-position="top|bottom|left|right"
 */
export const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    ${props => {
      switch (props['data-tooltip-position']) {
        case 'bottom':
          return 'top: calc(100% + 8px); left: 50%; transform: translateX(-50%);';
        case 'left':
          return 'right: calc(100% + 8px); top: 50%; transform: translateY(-50%);';
        case 'right':
          return 'left: calc(100% + 8px); top: 50%; transform: translateY(-50%);';
        default: // top
          return 'bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);';
      }
    }}
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    background: ${theme.colors.surfaceSolid};
    border: 1px solid ${theme.colors.surfaceBorder};
    border-radius: ${theme.radius.md};
    font-size: ${theme.fontSizes.xs};
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity ${theme.transitions.fast};
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:hover::after,
  &:focus-within::after {
    opacity: 1;
  }
`;

