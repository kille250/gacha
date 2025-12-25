/**
 * AdminBreadcrumb - Navigation breadcrumb for admin interface
 *
 * Shows the current location within the admin interface hierarchy.
 * Helps users understand where they are and navigate back to parent sections.
 *
 * @accessibility
 * - Uses nav element with aria-label="Breadcrumb"
 * - Proper aria-current for current page
 * - Keyboard navigable links
 * - Screen reader friendly with separator hidden
 *
 * @features
 * - Collapsible on mobile (shows first and last items only)
 * - Supports custom icons for each level
 * - Animated transitions for smooth UX
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaChevronRight, FaHome } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, useReducedMotion } from '../../design-system';

const AdminBreadcrumb = ({
  items,
  onNavigate,
  showHome = true,
  homeLabel,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  // Build complete breadcrumb items including home
  const breadcrumbItems = useMemo(() => {
    const result = [];

    if (showHome) {
      result.push({
        id: 'home',
        label: homeLabel || t('admin.dashboard', 'Dashboard'),
        icon: FaHome,
        path: 'dashboard',
      });
    }

    if (items) {
      result.push(...items);
    }

    return result;
  }, [items, showHome, homeLabel, t]);

  // Don't render if there's only one item (the current page)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  const handleClick = (item, index) => {
    // Don't navigate if it's the last item (current page)
    if (index === breadcrumbItems.length - 1) return;

    if (onNavigate) {
      onNavigate(item);
    }
  };

  const handleKeyDown = (e, item, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(item, index);
    }
  };

  return (
    <BreadcrumbNav aria-label={t('common.breadcrumb', 'Breadcrumb')}>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;

          return (
            <BreadcrumbItem
              key={item.id || item.path || index}
              $isFirst={isFirst}
              $isLast={isLast}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -5 }}
              animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {index > 0 && (
                <Separator aria-hidden="true">
                  <FaChevronRight />
                </Separator>
              )}

              {isLast ? (
                <CurrentPage aria-current="page">
                  {Icon && <Icon aria-hidden="true" />}
                  <span>{item.label}</span>
                </CurrentPage>
              ) : (
                <BreadcrumbLink
                  onClick={() => handleClick(item, index)}
                  onKeyDown={(e) => handleKeyDown(e, item, index)}
                  tabIndex={0}
                  role="link"
                >
                  {Icon && <Icon aria-hidden="true" />}
                  <span>{item.label}</span>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </BreadcrumbNav>
  );
};

const BreadcrumbNav = styled.nav`
  margin-bottom: ${theme.spacing.lg};
`;

const BreadcrumbList = styled.ol`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  padding: 0;
  margin: 0;
  list-style: none;
`;

const BreadcrumbItem = styled(motion.li)`
  display: flex;
  align-items: center;

  /* On mobile, hide middle items */
  @media (max-width: ${theme.breakpoints.sm}) {
    ${props => !props.$isFirst && !props.$isLast && `
      display: none;
    `}
  }
`;

const Separator = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.textMuted};
  font-size: 10px;
  margin-right: ${theme.spacing.xs};
`;

const BreadcrumbLink = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  svg {
    font-size: 12px;
  }

  &:hover {
    color: ${theme.colors.text};
    background: ${theme.colors.hoverOverlay};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
      transform: none;
    }
  }
`;

const CurrentPage = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};

  svg {
    font-size: 12px;
    color: ${theme.colors.primary};
  }
`;

AdminBreadcrumb.propTypes = {
  /** Array of breadcrumb items */
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    path: PropTypes.string,
  })),
  /** Callback when a breadcrumb is clicked */
  onNavigate: PropTypes.func,
  /** Whether to show the home/dashboard link */
  showHome: PropTypes.bool,
  /** Custom label for home/dashboard */
  homeLabel: PropTypes.string,
};

export default AdminBreadcrumb;
