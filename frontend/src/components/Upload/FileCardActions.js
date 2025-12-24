/**
 * FileCardActions - Action buttons for file cards
 *
 * Features:
 * - Remove file button
 * - Copy-to-all button
 * - Generate name button
 * - Accessible with keyboard support
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { FaTrash, FaCopy, FaMagic } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';

const FileCardActions = memo(({
  onRemove,
  onCopyToAll,
  onRegenerateName,
  field,
  disabled = false,
}) => {
  return (
    <ActionsContainer>
      {onRegenerateName && (
        <ActionButton
          onClick={onRegenerateName}
          title="Generate random name"
          aria-label="Generate random name"
          disabled={disabled}
          type="button"
        >
          <FaMagic />
        </ActionButton>
      )}
      {onCopyToAll && (
        <ActionButton
          onClick={() => onCopyToAll(field)}
          title={`Apply ${field} to all files`}
          aria-label={`Apply ${field} to all files`}
          disabled={disabled}
          type="button"
        >
          <FaCopy />
        </ActionButton>
      )}
      {onRemove && (
        <RemoveButton
          onClick={onRemove}
          title="Remove file"
          aria-label="Remove file"
          disabled={disabled}
          type="button"
        >
          <FaTrash />
        </RemoveButton>
      )}
    </ActionsContainer>
  );
});

FileCardActions.displayName = 'FileCardActions';

const ActionsContainer = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  border-radius: ${theme.radius.sm};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;

  &:hover:not(:disabled) {
    color: ${theme.colors.primary};
    background: rgba(0, 113, 227, 0.1);
  }

  &:focus-visible {
    color: ${theme.colors.primary};
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RemoveButton = styled(ActionButton)`
  &:hover:not(:disabled) {
    color: ${theme.colors.error};
    background: rgba(255, 59, 48, 0.1);
  }
`;

export default FileCardActions;
