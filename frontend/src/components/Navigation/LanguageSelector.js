/**
 * LanguageSelector - Language switching component
 *
 * Displays current language with option to switch.
 * Supports both inline (desktop dropdown) and full (mobile) variants.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdLanguage } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { languages } from '../../i18n';

/**
 * LanguageSelector Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether submenu is open (for dropdown variant)
 * @param {Function} props.onToggle - Toggle open state
 * @param {Function} props.onSelect - Called with language code when selected
 * @param {string} props.variant - 'dropdown' | 'inline' (default: 'dropdown')
 */
const LanguageSelector = ({
  isOpen = false,
  onToggle,
  onSelect,
  variant = 'dropdown',
}) => {
  const { i18n, t } = useTranslation();
  const currentLang = languages[i18n.language];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    onSelect?.(code);
  };

  // Inline variant - horizontal flag buttons (for mobile)
  if (variant === 'inline') {
    return (
      <InlineContainer>
        <InlineLabel>
          <MdLanguage />
          <span>{t('nav.language') || 'Language'}</span>
        </InlineLabel>
        <InlineOptions>
          {Object.entries(languages).map(([code, lang]) => (
            <InlineOption
              key={code}
              $active={i18n.language === code}
              onClick={() => handleSelect(code)}
              type="button"
              aria-label={`Switch to ${lang.nativeName}`}
              aria-pressed={i18n.language === code}
            >
              {lang.flag}
            </InlineOption>
          ))}
        </InlineOptions>
      </InlineContainer>
    );
  }

  // Dropdown variant - for desktop profile menu
  return (
    <>
      <DropdownTrigger
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <TriggerIcon><MdLanguage /></TriggerIcon>
        <span>{currentLang?.nativeName || 'Language'}</span>
        <TriggerFlag>{currentLang?.flag || '🌐'}</TriggerFlag>
      </DropdownTrigger>

      <AnimatePresence>
        {isOpen && (
          <DropdownMenu
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="menu"
          >
            {Object.entries(languages).map(([code, lang]) => (
              <DropdownOption
                key={code}
                $active={i18n.language === code}
                onClick={() => handleSelect(code)}
                role="menuitem"
                aria-current={i18n.language === code ? 'true' : undefined}
              >
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
                {i18n.language === code && <CheckMark>✓</CheckMark>}
              </DropdownOption>
            ))}
          </DropdownMenu>
        )}
      </AnimatePresence>
    </>
  );
};

// ==================== STYLED COMPONENTS ====================

// Dropdown variant styles
const DropdownTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  }
`;

const TriggerIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 16px;
  color: ${theme.colors.textSecondary};
`;

const TriggerFlag = styled.span`
  margin-left: auto;
  font-size: 16px;
`;

const DropdownMenu = styled(motion.div)`
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

const DropdownOption = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  padding-left: 48px;
  width: 100%;
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.1)' : 'transparent'};
  border: none;
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  text-align: left;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  }
`;

const CheckMark = styled.span`
  margin-left: auto;
  color: ${theme.colors.primary};
  font-weight: ${theme.fontWeights.bold};
`;

// Inline variant styles (mobile)
const InlineContainer = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
`;

const InlineLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.sm};

  svg {
    font-size: 18px;
  }
`;

const InlineOptions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

const InlineOption = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active ? 'rgba(0, 113, 227, 0.2)' : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-size: 20px;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  /* Ensure minimum touch target */
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default LanguageSelector;
