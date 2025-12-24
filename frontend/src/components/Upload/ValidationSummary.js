/**
 * ValidationSummary - Aggregate validation issues display
 *
 * Features:
 * - Shows all validation issues at once
 * - Categorizes by type (missing fields, errors, warnings)
 * - Collapsible for space efficiency
 * - Screen reader friendly with live region
 */
import React, { memo, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaChevronDown,
  FaCheckCircle,
} from 'react-icons/fa';
import { theme } from '../../design-system';
import { prefersReducedMotion } from '../../utils/featureFlags';
import { FILE_STATUS } from '../../hooks/useUploadState';

const ValidationSummary = memo(({
  files,
  fileValidation,
  fileStatus,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const issues = useMemo(() => {
    const result = {
      missingFields: [],
      errors: [],
      warnings: [],
      ready: 0,
    };

    files.forEach((file, index) => {
      const validation = fileValidation[file.id] || {};
      const status = fileStatus[file.id];

      // Collect missing fields
      const missing = [];
      if (!validation.name?.valid) missing.push('name');
      if (!validation.series?.valid) missing.push('series');
      if (!validation.rarity?.valid) missing.push('rarity');

      if (missing.length > 0) {
        result.missingFields.push({
          file,
          index: index + 1,
          fields: missing,
        });
      }

      // Collect status issues
      if (status?.status === FILE_STATUS.BLOCKED) {
        result.errors.push({
          file,
          index: index + 1,
          message: status.duplicate?.explanation || status.error || 'Cannot upload',
        });
      } else if (status?.status === FILE_STATUS.ERROR) {
        result.errors.push({
          file,
          index: index + 1,
          message: status.error || 'Upload error',
        });
      } else if (status?.status === FILE_STATUS.WARNING) {
        result.warnings.push({
          file,
          index: index + 1,
          message: status.warning?.explanation || 'Possible duplicate',
          similarity: status.warning?.similarity,
        });
      } else if (missing.length === 0) {
        result.ready++;
      }
    });

    return result;
  }, [files, fileValidation, fileStatus]);

  const totalIssues = issues.missingFields.length + issues.errors.length + issues.warnings.length;

  // All good - show success state
  if (totalIssues === 0 && files.length > 0) {
    return (
      <SuccessBanner role="status" aria-live="polite">
        <FaCheckCircle aria-hidden="true" />
        <span>All {files.length} files ready to upload</span>
      </SuccessBanner>
    );
  }

  // No files yet
  if (files.length === 0) {
    return null;
  }

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
      };

  return (
    <SummaryContainer
      role="region"
      aria-label="Validation summary"
      aria-live="polite"
    >
      <SummaryHeader
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        type="button"
      >
        <HeaderContent>
          {issues.errors.length > 0 && (
            <IssueCount $variant="error">
              <FaExclamationTriangle aria-hidden="true" />
              <span>{issues.errors.length} error{issues.errors.length !== 1 ? 's' : ''}</span>
            </IssueCount>
          )}
          {issues.missingFields.length > 0 && (
            <IssueCount $variant="info">
              <FaInfoCircle aria-hidden="true" />
              <span>{issues.missingFields.length} incomplete</span>
            </IssueCount>
          )}
          {issues.warnings.length > 0 && (
            <IssueCount $variant="warning">
              <FaExclamationCircle aria-hidden="true" />
              <span>{issues.warnings.length} warning{issues.warnings.length !== 1 ? 's' : ''}</span>
            </IssueCount>
          )}
          {issues.ready > 0 && (
            <IssueCount $variant="success">
              <FaCheckCircle aria-hidden="true" />
              <span>{issues.ready} ready</span>
            </IssueCount>
          )}
        </HeaderContent>
        <ExpandIcon $expanded={expanded}>
          <FaChevronDown aria-hidden="true" />
        </ExpandIcon>
      </SummaryHeader>

      <AnimatePresence>
        {expanded && !compact && (
          <DetailsSection {...motionProps}>
            {issues.errors.length > 0 && (
              <IssueGroup>
                <GroupTitle $variant="error">
                  <FaExclamationTriangle aria-hidden="true" />
                  Cannot Upload ({issues.errors.length})
                </GroupTitle>
                <IssueList>
                  {issues.errors.map((issue) => (
                    <IssueItem key={issue.file.id} $variant="error">
                      <strong>File {issue.index}:</strong> {issue.message}
                    </IssueItem>
                  ))}
                </IssueList>
              </IssueGroup>
            )}

            {issues.missingFields.length > 0 && (
              <IssueGroup>
                <GroupTitle $variant="info">
                  <FaInfoCircle aria-hidden="true" />
                  Missing Required Fields ({issues.missingFields.length})
                </GroupTitle>
                <IssueList>
                  {issues.missingFields.map((issue) => (
                    <IssueItem key={issue.file.id} $variant="info">
                      <strong>File {issue.index}:</strong> needs {issue.fields.join(', ')}
                    </IssueItem>
                  ))}
                </IssueList>
              </IssueGroup>
            )}

            {issues.warnings.length > 0 && (
              <IssueGroup>
                <GroupTitle $variant="warning">
                  <FaExclamationCircle aria-hidden="true" />
                  Possible Duplicates ({issues.warnings.length})
                </GroupTitle>
                <IssueList>
                  {issues.warnings.map((issue) => (
                    <IssueItem key={issue.file.id} $variant="warning">
                      <strong>File {issue.index}:</strong> {issue.message}
                      {issue.similarity && ` (${Math.round(issue.similarity * 100)}% similar)`}
                    </IssueItem>
                  ))}
                </IssueList>
              </IssueGroup>
            )}
          </DetailsSection>
        )}
      </AnimatePresence>
    </SummaryContainer>
  );
});

ValidationSummary.displayName = 'ValidationSummary';

const SummaryContainer = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
`;

const SummaryHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${theme.spacing.md};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${theme.colors.glass};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const variantStyles = {
  error: css`
    color: ${theme.colors.error};
    background: rgba(255, 59, 48, 0.1);
    border-color: rgba(255, 59, 48, 0.2);
  `,
  warning: css`
    color: ${theme.colors.warning};
    background: rgba(255, 159, 10, 0.1);
    border-color: rgba(255, 159, 10, 0.2);
  `,
  info: css`
    color: ${theme.colors.info};
    background: rgba(90, 200, 250, 0.1);
    border-color: rgba(90, 200, 250, 0.2);
  `,
  success: css`
    color: ${theme.colors.success};
    background: rgba(52, 199, 89, 0.1);
    border-color: rgba(52, 199, 89, 0.2);
  `,
};

const IssueCount = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  border: 1px solid transparent;
  ${props => variantStyles[props.$variant]}

  svg {
    font-size: 10px;
  }
`;

const ExpandIcon = styled.span`
  color: ${theme.colors.textMuted};
  font-size: 12px;
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0)'};
`;

const DetailsSection = styled(motion.div)`
  border-top: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const IssueGroup = styled.div``;

const GroupTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  margin-bottom: ${theme.spacing.sm};
  ${props => css`color: ${
    props.$variant === 'error' ? theme.colors.error :
    props.$variant === 'warning' ? theme.colors.warning :
    props.$variant === 'info' ? theme.colors.info :
    theme.colors.text
  };`}

  svg {
    font-size: 12px;
  }
`;

const IssueList = styled.ul`
  margin: 0;
  padding: 0 0 0 ${theme.spacing.lg};
  list-style: none;
`;

const IssueItem = styled.li`
  position: relative;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.xs} 0;
  line-height: 1.4;

  &::before {
    content: '•';
    position: absolute;
    left: -${theme.spacing.md};
    ${props => css`color: ${
      props.$variant === 'error' ? theme.colors.error :
      props.$variant === 'warning' ? theme.colors.warning :
      props.$variant === 'info' ? theme.colors.info :
      theme.colors.textMuted
    };`}
  }

  strong {
    color: ${theme.colors.text};
  }
`;

const SuccessBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.2);
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};

  svg {
    flex-shrink: 0;
  }
`;

export default ValidationSummary;
