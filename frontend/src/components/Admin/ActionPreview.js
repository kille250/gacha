/**
 * ActionPreview - Preview component for destructive/important admin actions
 *
 * Shows users exactly what will happen before they confirm an action.
 * Helps prevent mistakes and builds user confidence in the admin interface.
 *
 * Features:
 * - Before/after comparison display
 * - Affected items list
 * - Impact summary with icons
 * - Warning levels (info, warning, danger)
 * - Collapsible details for complex actions
 *
 * @accessibility
 * - Proper heading hierarchy
 * - Screen reader announcements
 * - Focus management
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaTrash,
  FaEdit,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaTimes,
  FaArrowRight,
  FaUsers,
  FaCoins,
  FaImage,
  FaFlag
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';

// Impact type icons
const IMPACT_ICONS = {
  delete: FaTrash,
  edit: FaEdit,
  users: FaUsers,
  coins: FaCoins,
  characters: FaImage,
  banners: FaFlag
};

// Severity colors and styles
const SEVERITY_CONFIG = {
  info: {
    color: theme.colors.info,
    background: 'rgba(90, 200, 250, 0.1)',
    border: 'rgba(90, 200, 250, 0.3)',
    icon: FaInfoCircle
  },
  warning: {
    color: theme.colors.warning,
    background: 'rgba(255, 159, 10, 0.1)',
    border: 'rgba(255, 159, 10, 0.3)',
    icon: FaExclamationTriangle
  },
  danger: {
    color: theme.colors.error,
    background: 'rgba(255, 59, 48, 0.1)',
    border: 'rgba(255, 59, 48, 0.3)',
    icon: FaExclamationTriangle
  }
};

const ActionPreview = ({
  // Action details
  title,
  description,
  severity = 'info',

  // Impact summary
  impacts = [],

  // Before/after changes
  changes = [],

  // Affected items
  affectedItems = [],
  affectedItemsLabel,
  maxVisibleItems = 5,

  // Additional warnings
  warnings = [],

  // Reversibility
  isReversible = true,
  reverseDescription,

  // Style
  className
}) => {
  const { t } = useTranslation();
  const [showAllItems, setShowAllItems] = useState(false);

  // Get severity configuration
  const severityConfig = useMemo(() => SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info, [severity]);
  const SeverityIcon = severityConfig.icon;

  // Calculate visible items
  const visibleItems = useMemo(() => {
    if (showAllItems || affectedItems.length <= maxVisibleItems) {
      return affectedItems;
    }
    return affectedItems.slice(0, maxVisibleItems);
  }, [affectedItems, maxVisibleItems, showAllItems]);

  const hiddenItemsCount = affectedItems.length - visibleItems.length;

  return (
    <PreviewContainer
      className={className}
      $severity={severity}
      $severityConfig={severityConfig}
      role="region"
      aria-label={t('admin.actionPreview', 'Action preview')}
    >
      {/* Header */}
      <PreviewHeader>
        <HeaderIcon $color={severityConfig.color}>
          <SeverityIcon aria-hidden="true" />
        </HeaderIcon>
        <HeaderContent>
          <PreviewTitle>{title}</PreviewTitle>
          {description && <PreviewDescription>{description}</PreviewDescription>}
        </HeaderContent>
      </PreviewHeader>

      {/* Impact Summary */}
      {impacts.length > 0 && (
        <ImpactSection>
          <SectionLabel>{t('admin.impact', 'Impact')}</SectionLabel>
          <ImpactGrid>
            {impacts.map((impact, index) => {
              const ImpactIcon = IMPACT_ICONS[impact.type] || FaInfoCircle;
              return (
                <ImpactItem key={index}>
                  <ImpactIcon aria-hidden="true" />
                  <ImpactText>
                    <ImpactValue>{impact.value}</ImpactValue>
                    <ImpactLabel>{impact.label}</ImpactLabel>
                  </ImpactText>
                </ImpactItem>
              );
            })}
          </ImpactGrid>
        </ImpactSection>
      )}

      {/* Changes (Before/After) */}
      {changes.length > 0 && (
        <ChangesSection>
          <SectionLabel>{t('admin.changes', 'Changes')}</SectionLabel>
          <ChangesList>
            {changes.map((change, index) => (
              <ChangeRow key={index}>
                <ChangeField>{change.field}</ChangeField>
                <ChangeValues>
                  <OldValue>
                    {change.oldValue !== undefined && change.oldValue !== null
                      ? String(change.oldValue)
                      : <EmptyValue>{t('admin.empty', 'empty')}</EmptyValue>
                    }
                  </OldValue>
                  <ChangeArrow>
                    <FaArrowRight aria-hidden="true" />
                  </ChangeArrow>
                  <NewValue>
                    {change.newValue !== undefined && change.newValue !== null
                      ? String(change.newValue)
                      : <EmptyValue>{t('admin.empty', 'empty')}</EmptyValue>
                    }
                  </NewValue>
                </ChangeValues>
              </ChangeRow>
            ))}
          </ChangesList>
        </ChangesSection>
      )}

      {/* Affected Items */}
      {affectedItems.length > 0 && (
        <AffectedSection>
          <SectionLabel>
            {affectedItemsLabel || t('admin.affectedItems', 'Affected items')}
            <ItemCount>({affectedItems.length})</ItemCount>
          </SectionLabel>
          <AffectedList>
            <AnimatePresence initial={false}>
              {visibleItems.map((item, index) => (
                <AffectedItem
                  key={item.id || index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {item.image && (
                    <ItemImage src={item.image} alt={item.name || 'Item preview'} />
                  )}
                  <ItemInfo>
                    <ItemName>{item.name}</ItemName>
                    {item.description && (
                      <ItemDescription>{item.description}</ItemDescription>
                    )}
                  </ItemInfo>
                </AffectedItem>
              ))}
            </AnimatePresence>
          </AffectedList>

          {affectedItems.length > maxVisibleItems && (
            <ShowMoreButton
              onClick={() => setShowAllItems(!showAllItems)}
              aria-expanded={showAllItems}
            >
              {showAllItems ? (
                <>
                  <FaChevronUp aria-hidden="true" />
                  {t('admin.showLess', 'Show less')}
                </>
              ) : (
                <>
                  <FaChevronDown aria-hidden="true" />
                  {t('admin.showMore', 'Show {{count}} more', { count: hiddenItemsCount })}
                </>
              )}
            </ShowMoreButton>
          )}
        </AffectedSection>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <WarningsSection>
          {warnings.map((warning, index) => (
            <WarningItem key={index}>
              <FaExclamationTriangle aria-hidden="true" />
              <span>{warning}</span>
            </WarningItem>
          ))}
        </WarningsSection>
      )}

      {/* Reversibility Notice */}
      <ReversibilitySection>
        {isReversible ? (
          <ReversibleNotice>
            <FaCheck aria-hidden="true" />
            <span>
              {reverseDescription || t('admin.reversibleAction', 'This action can be undone')}
            </span>
          </ReversibleNotice>
        ) : (
          <IrreversibleNotice>
            <FaTimes aria-hidden="true" />
            <span>
              {reverseDescription || t('admin.irreversibleAction', 'This action cannot be undone')}
            </span>
          </IrreversibleNotice>
        )}
      </ReversibilitySection>
    </PreviewContainer>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const PreviewContainer = styled.div`
  background: ${props => props.$severityConfig?.background || theme.colors.surface};
  border: 1px solid ${props => props.$severityConfig?.border || theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin: ${theme.spacing.md} 0;
`;

const PreviewHeader = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${props => `${props.$color}20`};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color};
  font-size: 18px;
  flex-shrink: 0;
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const PreviewTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const PreviewDescription = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  margin-bottom: ${theme.spacing.sm};
`;

const ItemCount = styled.span`
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

const ImpactSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ImpactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${theme.spacing.sm};
`;

const ImpactItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};

  svg {
    color: ${theme.colors.textMuted};
    font-size: 14px;
  }
`;

const ImpactText = styled.div`
  display: flex;
  flex-direction: column;
`;

const ImpactValue = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  line-height: 1.2;
`;

const ImpactLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const ChangesSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ChangesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const ChangeRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};

  @media (min-width: ${theme.breakpoints.sm}) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const ChangeField = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

const ChangeValues = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const OldValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
  text-decoration: line-through;
`;

const NewValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.success};
`;

const EmptyValue = styled.span`
  font-style: italic;
  color: ${theme.colors.textMuted};
`;

const ChangeArrow = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.primary};
  font-size: 10px;
`;

const AffectedSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const AffectedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const AffectedItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const ItemImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.sm};
  object-fit: cover;
  flex-shrink: 0;
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemName = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemDescription = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const ShowMoreButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  width: 100%;
  padding: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
  background: transparent;
  border: 1px dashed ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.hoverOverlay};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  svg {
    font-size: 12px;
  }
`;

const WarningsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const WarningItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.warningMuted};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.warning};
  font-size: ${theme.fontSizes.sm};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const ReversibilitySection = styled.div`
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const ReversibleNotice = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.success};

  svg {
    font-size: 14px;
  }
`;

const IrreversibleNotice = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.error};
  font-weight: ${theme.fontWeights.medium};

  svg {
    font-size: 14px;
  }
`;

// PropTypes
ActionPreview.propTypes = {
  /** Main title describing the action */
  title: PropTypes.string.isRequired,
  /** Additional description */
  description: PropTypes.string,
  /** Severity level affecting styling */
  severity: PropTypes.oneOf(['info', 'warning', 'danger']),
  /** Impact summary items */
  impacts: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.oneOf(['delete', 'edit', 'users', 'coins', 'characters', 'banners']),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired
  })),
  /** Before/after changes to display */
  changes: PropTypes.arrayOf(PropTypes.shape({
    field: PropTypes.string.isRequired,
    oldValue: PropTypes.any,
    newValue: PropTypes.any
  })),
  /** List of affected items */
  affectedItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.any,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.string
  })),
  /** Label for affected items section */
  affectedItemsLabel: PropTypes.string,
  /** Max items to show before "show more" */
  maxVisibleItems: PropTypes.number,
  /** Warning messages to display */
  warnings: PropTypes.arrayOf(PropTypes.string),
  /** Whether the action can be undone */
  isReversible: PropTypes.bool,
  /** Custom reversibility message */
  reverseDescription: PropTypes.string,
  /** Additional CSS class */
  className: PropTypes.string
};

export default ActionPreview;
