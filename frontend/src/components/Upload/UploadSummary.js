/**
 * UploadSummary - Results display after upload completion
 *
 * Features:
 * - Progressive disclosure (summary first, details on demand)
 * - Clear success/warning/error states
 * - Duplicate warnings with expandable details
 * - Accessible announcements
 */
import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCheck,
  FaExclamationTriangle,
  FaTimesCircle,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { theme } from '../../design-system';

const UploadSummary = memo(({
  result,
  duplicateWarnings = [],
  onDismissWarnings,
  onClose,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!result) return null;

  const {
    totalCreated = 0,
    totalWarnings = 0,
    totalErrors = 0,
    errors = [],
    message,
    error,
  } = result;

  const hasError = !!error;
  const hasWarnings = totalWarnings > 0 || duplicateWarnings.length > 0;
  const hasErrors = totalErrors > 0 || errors.length > 0;
  const isSuccess = totalCreated > 0 && !hasError;

  // Determine overall status
  const getStatus = () => {
    if (hasError) return 'error';
    if (hasErrors && totalCreated === 0) return 'error';
    if (hasWarnings) return 'warning';
    return 'success';
  };

  const status = getStatus();

  return (
    <Container
      $status={status}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="polite"
    >
      {/* Main Summary */}
      <SummaryHeader>
        <StatusIcon $status={status}>
          {status === 'success' && <FaCheck />}
          {status === 'warning' && <FaExclamationTriangle />}
          {status === 'error' && <FaTimesCircle />}
        </StatusIcon>

        <SummaryContent>
          <SummaryTitle $status={status}>
            {hasError
              ? 'Upload Failed'
              : isSuccess
                ? `${totalCreated} Character${totalCreated !== 1 ? 's' : ''} Uploaded`
                : 'Upload Complete'}
          </SummaryTitle>

          {hasError && (
            <SummaryMessage>{error}</SummaryMessage>
          )}

          {!hasError && message && (
            <SummaryMessage>{message}</SummaryMessage>
          )}

          {/* Quick stats */}
          {!hasError && (hasWarnings || hasErrors) && (
            <QuickStats>
              {hasWarnings && (
                <Stat $type="warning">
                  <FaExclamationTriangle />
                  {totalWarnings || duplicateWarnings.length} warning{(totalWarnings || duplicateWarnings.length) !== 1 ? 's' : ''}
                </Stat>
              )}
              {hasErrors && (
                <Stat $type="error">
                  <FaTimesCircle />
                  {totalErrors || errors.length} error{(totalErrors || errors.length) !== 1 ? 's' : ''}
                </Stat>
              )}
            </QuickStats>
          )}
        </SummaryContent>

        {/* Expand/collapse toggle */}
        {(hasWarnings || hasErrors) && !hasError && (
          <ExpandButton
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            aria-label={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? <FaChevronUp /> : <FaChevronDown />}
          </ExpandButton>
        )}
      </SummaryHeader>

      {/* Expandable Details */}
      <AnimatePresence>
        {showDetails && (
          <DetailsSection
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Duplicate Warnings */}
            {duplicateWarnings.length > 0 && (
              <DetailGroup>
                <DetailGroupTitle $type="warning">
                  <FaExclamationTriangle />
                  Possible Duplicates
                </DetailGroupTitle>
                <DetailGroupText>
                  These characters were uploaded but may be duplicates of existing ones.
                </DetailGroupText>
                <DetailList>
                  {duplicateWarnings.map((warning, i) => (
                    <DetailItem key={i}>
                      <DetailItemName>
                        {warning.characterName || warning.filename}
                      </DetailItemName>
                      <DetailItemInfo>
                        {warning.similarity && (
                          <InfoBadge $type="warning">{warning.similarity}% similar</InfoBadge>
                        )}
                        {warning.existingMatch?.name && (
                          <span>Similar to: {warning.existingMatch.name}</span>
                        )}
                      </DetailItemInfo>
                    </DetailItem>
                  ))}
                </DetailList>
                {onDismissWarnings && (
                  <DismissButton onClick={onDismissWarnings}>
                    Dismiss Warnings
                  </DismissButton>
                )}
              </DetailGroup>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <DetailGroup>
                <DetailGroupTitle $type="error">
                  <FaTimesCircle />
                  Failed Uploads
                </DetailGroupTitle>
                <DetailList>
                  {errors.map((err, i) => (
                    <DetailItem key={i} $error>
                      <DetailItemName>{err.filename}</DetailItemName>
                      <DetailItemInfo>
                        <span>{err.error}</span>
                        {err.isDuplicate && (
                          <InfoBadge $type="error">Duplicate</InfoBadge>
                        )}
                      </DetailItemInfo>
                    </DetailItem>
                  ))}
                </DetailList>
              </DetailGroup>
            )}
          </DetailsSection>
        )}
      </AnimatePresence>

      {/* Close button for modal context */}
      {onClose && (
        <CloseAction>
          <CloseButton onClick={onClose}>
            Close
          </CloseButton>
        </CloseAction>
      )}
    </Container>
  );
});

UploadSummary.displayName = 'UploadSummary';

// Styled components
const Container = styled(motion.div)`
  background: ${props => {
    switch (props.$status) {
      case 'error': return 'rgba(255, 59, 48, 0.1)';
      case 'warning': return 'rgba(255, 159, 10, 0.08)';
      default: return 'rgba(52, 199, 89, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'error': return 'rgba(255, 59, 48, 0.3)';
      case 'warning': return 'rgba(255, 159, 10, 0.3)';
      default: return 'rgba(52, 199, 89, 0.3)';
    }
  }};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
`;

const SummaryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
`;

const StatusIcon = styled.div`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'error': return 'rgba(255, 59, 48, 0.2)';
      case 'warning': return 'rgba(255, 159, 10, 0.2)';
      default: return 'rgba(52, 199, 89, 0.2)';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => {
    switch (props.$status) {
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      default: return theme.colors.success;
    }
  }};
  font-size: 18px;
`;

const SummaryContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const SummaryTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => {
    switch (props.$status) {
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      default: return theme.colors.success;
    }
  }};
`;

const SummaryMessage = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const QuickStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$type === 'error' ? theme.colors.error : theme.colors.warning};

  svg {
    font-size: 10px;
  }
`;

const ExpandButton = styled.button`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const DetailsSection = styled(motion.div)`
  border-top: 1px solid ${theme.colors.surfaceBorder};
  overflow: hidden;
`;

const DetailGroup = styled.div`
  padding: ${theme.spacing.lg};

  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.surfaceBorder};
  }
`;

const DetailGroupTitle = styled.h5`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0 0 ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$type === 'error' ? theme.colors.error : theme.colors.warning};

  svg {
    font-size: 12px;
  }
`;

const DetailGroupText = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const DetailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.radius.md};
  border-left: 3px solid ${props => props.$error ? theme.colors.error : theme.colors.warning};
`;

const DetailItemName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const DetailItemInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const InfoBadge = styled.span`
  padding: 2px 8px;
  background: ${props => props.$type === 'error'
    ? 'rgba(255, 59, 48, 0.2)'
    : 'rgba(255, 159, 10, 0.2)'};
  border-radius: ${theme.radius.full};
  color: ${props => props.$type === 'error' ? theme.colors.error : theme.colors.warning};
  font-weight: ${theme.fontWeights.medium};
`;

const DismissButton = styled.button`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CloseAction = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.xl};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default UploadSummary;
