/**
 * Shared styled components for Admin pages
 * Centralizes common UI patterns to reduce duplication
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../styles/DesignSystem';

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
// ============================================

export const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex?.modal || 1000};
  padding: ${theme.spacing.md};
`;

export const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: ${props => props.$maxWidth || '500px'};
  max-height: 90vh;
  overflow-y: auto;
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

export const ModalTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  
  svg { color: ${props => props.$iconColor || theme.colors.primary}; }
`;

export const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  
  &:hover { color: ${theme.colors.text}; }
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
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
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
  
  &:hover { background: ${theme.colors.surface}; }
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

export const ToggleButton = styled.button`
  padding: 4px 12px;
  border: none;
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  background: ${props => props.$enabled ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$enabled ? '#30d158' : theme.colors.textSecondary};
  border: 1px solid ${props => props.$enabled ? 'rgba(48, 209, 88, 0.3)' : theme.colors.surfaceBorder};
  
  &:hover { opacity: 0.8; }
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
// ============================================

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

export const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.md};
`;

export const EmptyText = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

export const EmptySubtext = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

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
// ANIMATION UTILITIES
// ============================================

/**
 * CSS for spin animation - add 'spin' class to elements that need to rotate
 * Usage: Add className="spin" to an icon that should spin
 */
export const spinAnimation = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

