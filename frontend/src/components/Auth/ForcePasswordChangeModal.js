/**
 * ForcePasswordChangeModal.js
 *
 * Modal shown when a user logs in with a temporary password that requires changing.
 * This is triggered after an admin-initiated password reset.
 */
import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { FaKey, FaLock, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import { theme } from '../../design-system';

const ForcePasswordChangeModal = ({ onSuccess, expiresAt }) => {
  const { t } = useTranslation();
  const { clearPasswordChangeRequired, refreshUser } = useContext(AuthContext);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Calculate time remaining until expiry
  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    if (diff <= 0) return 'expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const validatePassword = () => {
    if (newPassword.length < 8) {
      return t('auth.passwordTooShort', 'Password must be at least 8 characters');
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      return t('auth.passwordNeedsLetter', 'Password must contain at least one letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      return t('auth.passwordNeedsNumber', 'Password must contain at least one number');
    }
    if (newPassword !== confirmPassword) {
      return t('auth.passwordsDoNotMatch', 'Passwords do not match');
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Call the password change endpoint
      // Note: The temporary password is the "current password" for this change
      await api.put('/auth/profile/password', {
        newPassword
      });

      setSuccess(true);
      clearPasswordChangeRequired();

      // Refresh user data to update any cached state
      await refreshUser();

      // Brief delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.response?.data?.error || t('auth.passwordChangeFailed', 'Failed to change password'));
    } finally {
      setIsLoading(false);
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Overlay>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <IconWrapper $success={success}>
            {success ? <FaCheck /> : <FaKey />}
          </IconWrapper>
          <Title>
            {success
              ? t('auth.passwordChanged', 'Password Changed!')
              : t('auth.changePasswordRequired', 'Password Change Required')}
          </Title>
        </Header>

        {!success && (
          <>
            <Description>
              {t('auth.forcePasswordChangeDesc', 'Your password was reset by an administrator. You must set a new password to continue.')}
            </Description>

            {timeRemaining && timeRemaining !== 'expired' && (
              <ExpiryWarning>
                <FaExclamationTriangle />
                <span>
                  {t('auth.temporaryPasswordExpires', 'Temporary password expires in')}: {timeRemaining}
                </span>
              </ExpiryWarning>
            )}

            {timeRemaining === 'expired' && (
              <ExpiredWarning>
                <FaExclamationTriangle />
                <span>
                  {t('auth.temporaryPasswordExpired', 'Your temporary password has expired. Please contact an administrator for a new password.')}
                </span>
              </ExpiredWarning>
            )}
          </>
        )}

        {success ? (
          <SuccessMessage>
            {t('auth.passwordChangeSuccess', 'Your password has been changed successfully. Redirecting...')}
          </SuccessMessage>
        ) : (
          <Form onSubmit={handleSubmit}>
            {error && <ErrorMessage>{error}</ErrorMessage>}

            <InputGroup>
              <InputLabel>
                <FaLock />
                {t('auth.newPassword', 'New Password')}
              </InputLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.enterNewPassword', 'Enter new password')}
                disabled={isLoading || timeRemaining === 'expired'}
                autoFocus
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>
                <FaLock />
                {t('auth.confirmPassword', 'Confirm Password')}
              </InputLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmNewPassword', 'Confirm new password')}
                disabled={isLoading || timeRemaining === 'expired'}
              />
            </InputGroup>

            <PasswordRequirements>
              <RequirementTitle>{t('auth.passwordRequirements', 'Password Requirements')}:</RequirementTitle>
              <Requirement $met={newPassword.length >= 8}>
                {t('auth.atLeast8Chars', 'At least 8 characters')}
              </Requirement>
              <Requirement $met={/[a-zA-Z]/.test(newPassword)}>
                {t('auth.atLeastOneLetter', 'At least one letter')}
              </Requirement>
              <Requirement $met={/[0-9]/.test(newPassword)}>
                {t('auth.atLeastOneNumber', 'At least one number')}
              </Requirement>
              <Requirement $met={newPassword && newPassword === confirmPassword}>
                {t('auth.passwordsMatch', 'Passwords match')}
              </Requirement>
            </PasswordRequirements>

            <SubmitButton
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword || timeRemaining === 'expired'}
            >
              {isLoading
                ? t('common.processing', 'Processing...')
                : t('auth.setNewPassword', 'Set New Password')}
            </SubmitButton>
          </Form>
        )}
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: ${theme.spacing.md};
`;

const Modal = styled.div`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid ${theme.colors.surfaceBorder};
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${props => props.$success ? theme.colors.success : theme.colors.warning}20;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.md};

  svg {
    font-size: 28px;
    color: ${props => props.$success ? theme.colors.success : theme.colors.warning};
  }
`;

const Title = styled.h2`
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  text-align: center;
  margin: 0;
`;

const Description = styled.p`
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.5;
`;

const ExpiryWarning = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.warning}15;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.warning};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.lg};

  svg {
    flex-shrink: 0;
  }
`;

const ExpiredWarning = styled(ExpiryWarning)`
  background: ${theme.colors.danger}15;
  color: ${theme.colors.danger};
`;

const SuccessMessage = styled.p`
  color: ${theme.colors.success};
  text-align: center;
  font-weight: ${theme.fontWeights.medium};
  padding: ${theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const ErrorMessage = styled.div`
  background: ${theme.colors.danger}15;
  color: ${theme.colors.danger};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const InputLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};

  svg {
    font-size: 12px;
  }
`;

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.md};
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${theme.colors.textSecondary}80;
  }
`;

const PasswordRequirements = styled.div`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
`;

const RequirementTitle = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const Requirement = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$met ? theme.colors.success : theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &::before {
    content: '${props => props.$met ? '\\2713' : '\\2022'}';
    font-size: ${props => props.$met ? '12px' : '8px'};
  }
`;

const SubmitButton = styled.button`
  padding: ${theme.spacing.md};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  margin-top: ${theme.spacing.sm};

  &:hover:not(:disabled) {
    background: ${theme.colors.primaryDark || theme.colors.primary};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default ForcePasswordChangeModal;
