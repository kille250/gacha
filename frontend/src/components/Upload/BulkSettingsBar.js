/**
 * BulkSettingsBar - Default settings for batch operations
 *
 * Features:
 * - Set default values for new files
 * - Apply settings to all files
 * - Generate random names for all files
 * - Responsive: horizontal on desktop, stacked on mobile
 */
import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FaMagic, FaCheck } from 'react-icons/fa';
import { theme } from '../../design-system';

const BulkSettingsBar = memo(({
  bulkDefaults,
  onBulkDefaultsChange,
  onApplyToAll,
  onGenerateNames,
  orderedRarities = [],
  fileCount = 0,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [generatingNames, setGeneratingNames] = useState(false);

  const handleChange = (field, value) => {
    onBulkDefaultsChange({ [field]: value });
  };

  const handleGenerateNames = async () => {
    if (generatingNames || disabled || fileCount === 0) return;
    setGeneratingNames(true);
    try {
      await onGenerateNames();
    } finally {
      setGeneratingNames(false);
    }
  };

  return (
    <Container role="group" aria-label={t('admin.upload.defaultSettings')}>
      <Header>
        <Title>{t('admin.upload.defaultSettings')}</Title>
        <Subtitle>{t('admin.upload.appliedToNewFiles')}</Subtitle>
      </Header>

      <SettingsGrid>
        <SettingField>
          <Label htmlFor="bulk-series">{t('admin.series')}</Label>
          <Input
            id="bulk-series"
            type="text"
            value={bulkDefaults.series}
            onChange={(e) => handleChange('series', e.target.value)}
            placeholder={t('admin.bannerForm.enterSeriesName')}
            disabled={disabled}
          />
        </SettingField>

        <SettingField>
          <Label htmlFor="bulk-rarity">{t('admin.rarity')}</Label>
          <Select
            id="bulk-rarity"
            value={bulkDefaults.rarity}
            onChange={(e) => handleChange('rarity', e.target.value)}
            disabled={disabled}
          >
            {orderedRarities.map(r => (
              <option key={r.id || r.name} value={r.name.toLowerCase()}>
                {r.displayName || r.name.charAt(0).toUpperCase() + r.name.slice(1)}
              </option>
            ))}
          </Select>
        </SettingField>

        <SettingField $narrow>
          <CheckboxLabel>
            <input
              type="checkbox"
              checked={bulkDefaults.isR18}
              onChange={(e) => handleChange('isR18', e.target.checked)}
              disabled={disabled}
              aria-label="Mark as R18 content"
            />
            <span>🔞 R18</span>
          </CheckboxLabel>
        </SettingField>
      </SettingsGrid>

      <ActionsBar>
        <ActionButton
          onClick={onApplyToAll}
          disabled={disabled || fileCount === 0}
          aria-label={t('admin.upload.applyToAll', { count: fileCount })}
        >
          <FaCheck />
          <span>{t('admin.upload.applyToAll', { count: fileCount })}</span>
        </ActionButton>

        <ActionButton
          $variant="secondary"
          onClick={handleGenerateNames}
          disabled={disabled || fileCount === 0 || generatingNames}
          aria-label={t('admin.upload.generateNames')}
        >
          <FaMagic className={generatingNames ? 'spinning' : ''} />
          <span>{generatingNames ? t('admin.upload.generating') : t('admin.upload.generateNames')}</span>
        </ActionButton>
      </ActionsBar>
    </Container>
  );
});

BulkSettingsBar.displayName = 'BulkSettingsBar';

// Styled components
const Container = styled.div`
  background: rgba(0, 113, 227, 0.05);
  border: 1px solid rgba(0, 113, 227, 0.2);
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Subtitle = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr 1fr auto;
    align-items: flex-end;
  }
`;

const SettingField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  ${props => props.$narrow && `
    @media (min-width: ${theme.breakpoints.sm}) {
      flex: 0 0 auto;
    }
  `}
`;

const Label = styled.label`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const inputStyles = `
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const Input = styled.input`
  ${inputStyles}
  min-width: 0;
`;

const Select = styled.select`
  ${inputStyles}
  cursor: pointer;
  min-width: 120px;

  &:disabled {
    cursor: not-allowed;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  white-space: nowrap;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};

  input {
    width: 18px;
    height: 18px;
  }

  &:has(input:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$variant === 'secondary'
    ? 'linear-gradient(135deg, #9b59b6, #8e44ad)'
    : 'linear-gradient(135deg, #0071e3, #0077ed)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => props.$variant === 'secondary'
      ? 'rgba(155, 89, 182, 0.3)'
      : 'rgba(0, 113, 227, 0.3)'};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

export default BulkSettingsBar;
