/**
 * KeyboardShortcutsModal - Displays all available keyboard shortcuts
 *
 * Shows a categorized list of keyboard shortcuts available in the admin interface.
 * Can be triggered via Shift+? or from the header menu.
 *
 * @accessibility
 * - Full keyboard navigation
 * - Screen reader optimized with proper headings
 * - Focus trapping within modal
 * - Escape key to close
 *
 * @features
 * - Categorized shortcuts for easy discovery
 * - Cross-platform key display (Cmd vs Ctrl)
 * - Styled kbd elements for visual clarity
 * - Responsive layout
 */

import React from 'react';
import styled from 'styled-components';
import { MdKeyboard, MdSearch, MdNavigation, MdEdit, MdViewModule } from 'react-icons/md';
import { theme } from '../../design-system';
import Modal from '../../design-system/overlays/Modal';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

// Shortcut categories with their shortcuts
const SHORTCUT_CATEGORIES = [
  {
    id: 'navigation',
    title: 'Navigation',
    icon: MdNavigation,
    shortcuts: [
      { keys: ['mod', 'd'], description: 'Go to Dashboard' },
      { keys: ['mod', 'u'], description: 'Go to Users' },
      { keys: ['mod', 'c'], description: 'Go to Characters' },
      { keys: ['mod', 'b'], description: 'Go to Banners' },
      { keys: ['mod', 'p'], description: 'Go to Coupons' },
      { keys: ['ArrowLeft'], description: 'Previous tab' },
      { keys: ['ArrowRight'], description: 'Next tab' },
      { keys: ['1-6'], description: 'Jump to tab 1-6' },
    ],
  },
  {
    id: 'quickActions',
    title: 'Quick Actions (Dashboard)',
    icon: MdEdit,
    shortcuts: [
      { keys: ['c'], description: 'Add Character' },
      { keys: ['u'], description: 'Multi Upload' },
      { keys: ['i'], description: 'Anime Import' },
      { keys: ['b'], description: 'New Banner' },
      { keys: ['p'], description: 'New Coupon' },
    ],
  },
  {
    id: 'actions',
    title: 'Common Actions',
    icon: MdEdit,
    shortcuts: [
      { keys: ['mod', 'n'], description: 'Create new item' },
      { keys: ['mod', 's'], description: 'Save changes' },
      { keys: ['mod', 'r'], description: 'Refresh data' },
      { keys: ['mod', 'Enter'], description: 'Confirm action' },
      { keys: ['Delete'], description: 'Delete selected' },
      { keys: ['mod', 'z'], description: 'Undo last action' },
    ],
  },
  {
    id: 'search',
    title: 'Search & Filter',
    icon: MdSearch,
    shortcuts: [
      { keys: ['mod', 'k'], description: 'Focus search' },
      { keys: ['/'], description: 'Focus search (alt)' },
      { keys: ['mod', 'f'], description: 'Open filters' },
      { keys: ['Escape'], description: 'Clear search / Close modal' },
    ],
  },
  {
    id: 'selection',
    title: 'Selection',
    icon: MdViewModule,
    shortcuts: [
      { keys: ['mod', 'a'], description: 'Select all' },
      { keys: ['Escape'], description: 'Deselect all' },
      { keys: ['Shift', 'Click'], description: 'Range select' },
      { keys: ['mod', 'Click'], description: 'Toggle selection' },
    ],
  },
];

/**
 * KeyboardShortcutsModal Component
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Function} onClose - Called when modal should close
 */
const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      maxWidth="600px"
    >
      <Content>
        <Intro>
          <MdKeyboard aria-hidden="true" />
          <span>Use these shortcuts to navigate and perform actions quickly.</span>
        </Intro>

        <CategoriesGrid role="list" aria-label="Shortcut categories">
          {SHORTCUT_CATEGORIES.map((category) => (
            <Category key={category.id} role="listitem">
              <CategoryHeader>
                <CategoryIcon aria-hidden="true">
                  <category.icon />
                </CategoryIcon>
                <CategoryTitle id={`category-${category.id}`}>
                  {category.title}
                </CategoryTitle>
              </CategoryHeader>

              <ShortcutsList
                role="list"
                aria-labelledby={`category-${category.id}`}
              >
                {category.shortcuts.map((shortcut, index) => (
                  <ShortcutItem key={index} role="listitem">
                    <ShortcutKeys aria-label={`Shortcut: ${formatShortcut(shortcut.keys)}`}>
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <Kbd>{formatKey(key)}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <KeySeparator aria-hidden="true">+</KeySeparator>
                          )}
                        </React.Fragment>
                      ))}
                    </ShortcutKeys>
                    <ShortcutDescription>
                      {shortcut.description}
                    </ShortcutDescription>
                  </ShortcutItem>
                ))}
              </ShortcutsList>
            </Category>
          ))}
        </CategoriesGrid>

        <Footer>
          <FooterNote>
            <Kbd>?</Kbd> Press <Kbd>Shift</Kbd> + <Kbd>?</Kbd> anytime to show this help
          </FooterNote>
        </Footer>
      </Content>
    </Modal>
  );
};

/**
 * Format a key for display
 */
const formatKey = (key) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const keyMap = {
    mod: isMac ? '⌘' : 'Ctrl',
    ctrl: isMac ? '⌃' : 'Ctrl',
    cmd: '⌘',
    alt: isMac ? '⌥' : 'Alt',
    shift: '⇧',
    enter: '↵',
    escape: 'Esc',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    delete: 'Del',
    backspace: '⌫',
    click: 'Click',
  };

  const normalized = key.toLowerCase();
  return keyMap[normalized] || key.toUpperCase();
};

// Styled Components
const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const Intro = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};

  svg {
    font-size: 24px;
    color: ${theme.colors.primary};
    flex-shrink: 0;
  }
`;

const CategoriesGrid = styled.div`
  display: grid;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Category = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CategoryIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${theme.colors.primarySubtle};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  font-size: 16px;
`;

const CategoryTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const ShortcutsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const ShortcutItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} 0;
`;

const ShortcutKeys = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 ${theme.spacing.xs};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.sm};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  font-family: ${theme.fonts.mono};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  white-space: nowrap;
`;

const KeySeparator = styled.span`
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.xs};
`;

const ShortcutDescription = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-align: right;
  flex: 1;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const FooterNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

export default KeyboardShortcutsModal;
