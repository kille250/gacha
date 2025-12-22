import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaCheck, FaArrowLeft, FaGoogle, FaLock, FaUnlink, FaLink, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { theme, LoadingSpinner, ErrorMessage as SharedErrorMessage, SuccessMessage as SharedSuccessMessage } from '../styles/DesignSystem';
import api, { clearCache } from '../utils/api';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user, refreshUser, googleRelink, googleUnlink } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [googleSuccess, setGoogleSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [showRelinkConfirm, setShowRelinkConfirm] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  
  // Account reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: warning, 2: confirmation
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.username) {
      setNewUsername(user.username);
    }
  }, [user]);
  
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }
    
    setEmailLoading(true);
    try {
      const response = await api.put('/auth/profile/email', { 
        email: email.trim().toLowerCase() 
      });
      setEmailSuccess(response.data.message || t('settings.emailUpdated'));
      await refreshUser();
    } catch (err) {
      setEmailError(err.response?.data?.error || t('settings.emailUpdateFailed'));
    } finally {
      setEmailLoading(false);
    }
  };
  
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');
    
    if (!newUsername || newUsername.trim().length < 3) {
      setUsernameError(t('settings.usernameTooShort'));
      return;
    }
    
    if (newUsername.trim() === user?.username) {
      setUsernameError(t('settings.usernameSameAsCurrent'));
      return;
    }
    
    setUsernameLoading(true);
    try {
      const response = await api.put('/auth/profile/username', { 
        username: newUsername.trim() 
      });
      setUsernameSuccess(response.data.message || t('settings.usernameUpdated'));
      await refreshUser();
    } catch (err) {
      setUsernameError(err.response?.data?.error || t('settings.usernameUpdateFailed'));
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleGoogleRelink = async (credentialResponse) => {
    setGoogleError('');
    setGoogleSuccess('');
    setGoogleLoading(true);
    
    try {
      const result = await googleRelink(credentialResponse.credential);
      if (result.success) {
        setGoogleSuccess(result.message || t('settings.googleLinkedSuccess'));
        setShowRelinkConfirm(false);
      } else {
        setGoogleError(result.error);
      }
    } catch (err) {
      setGoogleError(t('settings.googleLinkFailed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleUnlink = async () => {
    setGoogleError('');
    setGoogleSuccess('');
    setGoogleLoading(true);
    
    try {
      const result = await googleUnlink();
      if (result.success) {
        setGoogleSuccess(result.message || t('settings.googleUnlinkedSuccess'));
        setShowUnlinkConfirm(false);
      } else {
        setGoogleError(result.error);
      }
    } catch (err) {
      setGoogleError(t('settings.googleUnlinkFailed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleError(t('settings.googleAuthFailed'));
  };

  const handleResetAccount = async () => {
    setResetError('');
    
    const REQUIRED_TEXT = 'RESET MY ACCOUNT';
    if (resetConfirmText !== REQUIRED_TEXT) {
      setResetError(t('settings.resetConfirmTextMismatch', { text: REQUIRED_TEXT }));
      return;
    }
    
    // For password-based accounts, require password
    if (user?.hasPassword && !resetPassword) {
      setResetError(t('settings.resetPasswordRequired'));
      return;
    }
    
    setResetLoading(true);
    try {
      const response = await api.post('/auth/reset-account', {
        password: resetPassword || undefined,
        confirmationText: resetConfirmText
      });
      
      setResetSuccess(response.data.message || t('settings.resetSuccess'));
      setShowResetConfirm(false);
      setResetStep(1);
      setResetPassword('');
      setResetConfirmText('');
      
      // Clear all caches and refresh user
      clearCache();
      await refreshUser();
    } catch (err) {
      setResetError(err.response?.data?.error || t('settings.resetFailed'));
    } finally {
      setResetLoading(false);
    }
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
    setResetStep(1);
    setResetPassword('');
    setResetConfirmText('');
    setResetError('');
  };

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </BackButton>
        <Title>{t('settings.title')}</Title>
      </Header>
      
      <Content>
        {/* Account Info */}
        <Section>
          <SectionTitle>{t('settings.accountInfo')}</SectionTitle>
          <InfoCard>
            <InfoRow>
              <InfoLabel><FaUser /> {t('settings.currentUsername')}</InfoLabel>
              <InfoValue>{user?.username}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel><FaEnvelope /> {t('settings.currentEmail')}</InfoLabel>
              <InfoValue>{user?.email || t('settings.notSet')}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel><FaGoogle /> {t('settings.googleLinked')}</InfoLabel>
              <InfoValue>
                {user?.hasGoogle ? (
                  <LinkedBadge><FaCheck /> {t('settings.linked')}</LinkedBadge>
                ) : (
                  <NotLinkedBadge>{t('settings.notLinked')}</NotLinkedBadge>
                )}
              </InfoValue>
            </InfoRow>
            {user?.linkedGoogleEmail && (
              <InfoRow>
                <InfoLabel><FaGoogle /> {t('settings.linkedGoogleEmail')}</InfoLabel>
                <InfoValue>
                  <GoogleEmailBadge>{user.linkedGoogleEmail}</GoogleEmailBadge>
                </InfoValue>
              </InfoRow>
            )}
          </InfoCard>
        </Section>

        {/* Google Account Section */}
        {GOOGLE_CLIENT_ID && (
          <Section>
            <SectionTitle>
              <FaGoogle /> {t('settings.googleAccount')}
            </SectionTitle>
            <SectionDescription>
              {user?.hasGoogle 
                ? t('settings.googleAccountLinkedDesc')
                : t('settings.googleAccountNotLinkedDesc')
              }
            </SectionDescription>

            {googleError && <ErrorMessage>{googleError}</ErrorMessage>}
            {googleSuccess && <SuccessMessage><FaCheck /> {googleSuccess}</SuccessMessage>}

            {user?.hasGoogle ? (
              <>
                {!showRelinkConfirm && !showUnlinkConfirm ? (
                  <GoogleButtonGroup>
                    <GoogleActionButton
                      onClick={() => setShowRelinkConfirm(true)}
                      disabled={googleLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaLink /> {t('settings.changeGoogleAccount')}
                    </GoogleActionButton>
                    <GoogleUnlinkButton
                      onClick={() => setShowUnlinkConfirm(true)}
                      disabled={googleLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaUnlink /> {t('settings.unlinkGoogle')}
                    </GoogleUnlinkButton>
                  </GoogleButtonGroup>
                ) : showUnlinkConfirm ? (
                  <RelinkConfirmBox>
                    <p>⚠️ {t('settings.unlinkConfirmMessage')}</p>
                    <GoogleButtonGroup>
                      <GoogleUnlinkButton
                        onClick={handleGoogleUnlink}
                        disabled={googleLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {googleLoading ? <LoadingSpinner /> : (
                          <><FaUnlink /> {t('settings.confirmUnlink')}</>
                        )}
                      </GoogleUnlinkButton>
                      <CancelButton onClick={() => setShowUnlinkConfirm(false)}>
                        {t('common.cancel')}
                      </CancelButton>
                    </GoogleButtonGroup>
                  </RelinkConfirmBox>
                ) : (
                  <RelinkConfirmBox>
                    <p>{t('settings.selectNewGoogleAccount')}</p>
                    <GoogleButtonWrapper>
                      {googleLoading ? (
                        <GoogleLoadingButton disabled>
                          <LoadingSpinner />
                        </GoogleLoadingButton>
                      ) : (
                        <GoogleLogin
                          onSuccess={handleGoogleRelink}
                          onError={handleGoogleError}
                          theme="filled_black"
                          size="large"
                          text="signin_with"
                          shape="rectangular"
                        />
                      )}
                    </GoogleButtonWrapper>
                    <CancelButton onClick={() => setShowRelinkConfirm(false)}>
                      {t('common.cancel')}
                    </CancelButton>
                  </RelinkConfirmBox>
                )}
              </>
            ) : (
              <GoogleButtonWrapper>
                {googleLoading ? (
                  <GoogleLoadingButton disabled>
                    <LoadingSpinner />
                  </GoogleLoadingButton>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleRelink}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />
                )}
              </GoogleButtonWrapper>
            )}
          </Section>
        )}
        
        {/* Email Section */}
        <Section>
          <SectionTitle>
            <FaEnvelope /> {user?.email ? t('settings.updateEmail') : t('settings.addEmail')}
          </SectionTitle>
          <SectionDescription>
            {t('settings.emailDescription')}
          </SectionDescription>
          
          <Form onSubmit={handleEmailSubmit}>
            <InputWrapper>
              <InputIcon><FaEnvelope /></InputIcon>
              <StyledInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.enterEmail')}
              />
            </InputWrapper>
            
            {emailError && <ErrorMessage>{emailError}</ErrorMessage>}
            {emailSuccess && <SuccessMessage><FaCheck /> {emailSuccess}</SuccessMessage>}
            
            <SubmitButton 
              type="submit" 
              disabled={emailLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {emailLoading ? <LoadingSpinner /> : t('settings.saveEmail')}
            </SubmitButton>
          </Form>
        </Section>
        
        {/* Username Section */}
        <Section>
          <SectionTitle>
            <FaUser /> {t('settings.changeUsername')}
          </SectionTitle>
          
          {user?.usernameChanged ? (
            <DisabledSection>
              <FaLock />
              <span>{t('settings.usernameAlreadyChanged')}</span>
            </DisabledSection>
          ) : (
            <>
              <SectionDescription>
                {t('settings.usernameDescription')}
              </SectionDescription>
              <WarningBox>
                ⚠️ {t('settings.usernameWarning')}
              </WarningBox>
              
              <Form onSubmit={handleUsernameSubmit}>
                <InputWrapper>
                  <InputIcon><FaUser /></InputIcon>
                  <StyledInput
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={t('settings.enterNewUsername')}
                  />
                </InputWrapper>
                
                {usernameError && <ErrorMessage>{usernameError}</ErrorMessage>}
                {usernameSuccess && <SuccessMessage><FaCheck /> {usernameSuccess}</SuccessMessage>}
                
                <SubmitButton 
                  type="submit" 
                  disabled={usernameLoading}
                  $variant="warning"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {usernameLoading ? <LoadingSpinner /> : t('settings.changeUsername')}
                </SubmitButton>
              </Form>
            </>
          )}
        </Section>

        {/* Danger Zone - Account Reset */}
        <DangerSection>
          <SectionTitle style={{ color: theme.colors.error }}>
            <FaExclamationTriangle /> {t('settings.dangerZone')}
          </SectionTitle>
          <SectionDescription>
            {t('settings.dangerZoneDescription')}
          </SectionDescription>
          
          {resetSuccess && <SuccessMessage><FaCheck /> {resetSuccess}</SuccessMessage>}
          
          {!showResetConfirm ? (
            <DangerButton
              onClick={() => setShowResetConfirm(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaTrash /> {t('settings.resetAccount')}
            </DangerButton>
          ) : resetStep === 1 ? (
            <ResetConfirmBox>
              <WarningHeader>
                <FaExclamationTriangle />
                <span>{t('settings.resetWarningTitle')}</span>
              </WarningHeader>
              <WarningList>
                <li>{t('settings.resetWarning1')}</li>
                <li>{t('settings.resetWarning2')}</li>
                <li>{t('settings.resetWarning3')}</li>
                <li>{t('settings.resetWarning4')}</li>
                <li>{t('settings.resetWarning5')}</li>
              </WarningList>
              <KeepList>
                <strong>{t('settings.resetKeepTitle')}</strong>
                <li>{t('settings.resetKeep1')}</li>
                <li>{t('settings.resetKeep2')}</li>
              </KeepList>
              <DangerButtonGroup>
                <DangerButton
                  onClick={() => setResetStep(2)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('settings.resetUnderstand')}
                </DangerButton>
                <CancelButton onClick={cancelReset}>
                  {t('common.cancel')}
                </CancelButton>
              </DangerButtonGroup>
            </ResetConfirmBox>
          ) : (
            <ResetConfirmBox>
              <WarningHeader>
                <FaExclamationTriangle />
                <span>{t('settings.resetFinalConfirm')}</span>
              </WarningHeader>
              
              {resetError && <ErrorMessage>{resetError}</ErrorMessage>}
              
              <ResetForm>
                <ResetLabel>
                  {t('settings.resetTypeConfirm', { text: 'RESET MY ACCOUNT' })}
                </ResetLabel>
                <StyledInput
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET MY ACCOUNT"
                  style={{ textAlign: 'center', fontWeight: 600, letterSpacing: '1px' }}
                />
                
                {user?.hasPassword && (
                  <>
                    <ResetLabel style={{ marginTop: theme.spacing.md }}>
                      <FaLock /> {t('settings.resetEnterPassword')}
                    </ResetLabel>
                    <InputWrapper>
                      <InputIcon><FaLock /></InputIcon>
                      <StyledInput
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder={t('auth.enterPassword')}
                      />
                    </InputWrapper>
                  </>
                )}
              </ResetForm>
              
              <DangerButtonGroup>
                <DangerButton
                  onClick={handleResetAccount}
                  disabled={resetLoading || resetConfirmText !== 'RESET MY ACCOUNT'}
                  whileHover={{ scale: resetConfirmText === 'RESET MY ACCOUNT' ? 1.02 : 1 }}
                  whileTap={{ scale: resetConfirmText === 'RESET MY ACCOUNT' ? 0.98 : 1 }}
                >
                  {resetLoading ? <LoadingSpinner /> : (
                    <><FaTrash /> {t('settings.resetAccountFinal')}</>
                  )}
                </DangerButton>
                <CancelButton onClick={cancelReset}>
                  {t('common.cancel')}
                </CancelButton>
              </DangerButtonGroup>
            </ResetConfirmBox>
          )}
        </DangerSection>
      </Content>
    </PageContainer>
  );
};

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
  color: ${theme.colors.text};
  font-family: ${theme.fonts.primary};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  background: ${theme.colors.backgroundSecondary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surface};
  }
`;

const Title = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
`;

const Content = styled.main`
  max-width: 600px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
`;

const Section = styled.section`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.md};
  color: ${theme.colors.text};
  
  svg {
    color: ${theme.colors.primary};
  }
`;

const SectionDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0 0 ${theme.spacing.lg};
  line-height: 1.5;
`;

const InfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  
  svg {
    font-size: 14px;
  }
`;

const InfoValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
`;

const LinkedBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${theme.colors.success};
  
  svg {
    font-size: 12px;
  }
`;

const NotLinkedBadge = styled.span`
  color: ${theme.colors.textMuted};
`;

const GoogleEmailBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(66, 133, 244, 0.15);
  border: 1px solid rgba(66, 133, 244, 0.3);
  border-radius: ${theme.radius.full};
  color: #4285f4;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: 14px;
  pointer-events: none;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-left: 44px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

const SubmitButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${props => props.$variant === 'warning' 
    ? 'linear-gradient(135deg, #ff9500, #ff6b00)' 
    : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`};
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

// Use shared ErrorMessage and SuccessMessage from DesignSystem
const ErrorMessage = SharedErrorMessage;
const SuccessMessage = SharedSuccessMessage;

const WarningBox = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 149, 0, 0.15);
  border: 1px solid rgba(255, 149, 0, 0.3);
  border-radius: ${theme.radius.lg};
  color: #ff9500;
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.5;
`;

const DisabledSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};
  
  svg {
    font-size: 20px;
  }
`;

const GoogleButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const GoogleActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #4285f4, #34a853);
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const GoogleUnlinkButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.error};
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.error};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: rgba(255, 59, 48, 0.1);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const RelinkConfirmBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  
  p {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.textSecondary};
    margin: 0;
    text-align: center;
  }
`;

const GoogleButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  
  > div {
    width: 100% !important;
  }
  
  iframe {
    width: 100% !important;
  }
`;

const GoogleLoadingButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  cursor: not-allowed;
  opacity: 0.7;
`;

const CancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.glass};
  }
`;

// Danger Zone Styles
const DangerSection = styled(Section)`
  border-color: rgba(255, 59, 48, 0.3);
  background: linear-gradient(135deg, 
    rgba(255, 59, 48, 0.05) 0%, 
    ${theme.colors.surface} 100%
  );
`;

const DangerButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #ff3b30, #d63030);
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.textMuted};
  }
`;

const ResetConfirmBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.lg};
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.error};
  
  svg {
    font-size: 24px;
  }
`;

const WarningList = styled.ul`
  margin: 0;
  padding-left: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.8;
  
  li {
    margin-bottom: ${theme.spacing.xs};
    
    &::marker {
      color: ${theme.colors.error};
    }
  }
`;

const KeepList = styled.ul`
  margin: 0;
  padding: ${theme.spacing.md};
  padding-left: calc(${theme.spacing.md} + ${theme.spacing.lg});
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.6;
  
  strong {
    display: block;
    margin-bottom: ${theme.spacing.sm};
    margin-left: -${theme.spacing.lg};
    color: ${theme.colors.success};
  }
  
  li::marker {
    color: ${theme.colors.success};
  }
`;

const DangerButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const ResetForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const ResetLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  
  svg {
    font-size: 14px;
  }
`;

export default SettingsPage;