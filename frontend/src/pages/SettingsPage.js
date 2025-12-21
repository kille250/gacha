import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaCheck, FaArrowLeft, FaGoogle, FaLock, FaUnlink, FaLink } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../styles/DesignSystem';
import api from '../utils/api';

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
      </Content>
    </PageContainer>
  );
};

// Animations
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

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

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ErrorMessage = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(52, 199, 89, 0.15);
  border: 1px solid rgba(52, 199, 89, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
`;

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

export default SettingsPage;