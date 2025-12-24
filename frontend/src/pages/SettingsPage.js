import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaEnvelope, FaCheck, FaArrowLeft, FaGoogle, FaLock, FaUnlink, FaLink, FaExclamationTriangle, FaTrash, FaIdCard, FaUserEdit, FaShieldAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { theme, LoadingSpinner, ErrorMessage as SharedErrorMessage, SuccessMessage as SharedSuccessMessage } from '../design-system';
import {
  updateEmail as updateEmailAction,
  updateUsername as updateUsernameAction,
  updatePassword as updatePasswordAction,
  resetAccount as resetAccountAction
} from '../actions/settingsActions';

// Icon Constants
import { ICON_WARNING } from '../constants/icons';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const TABS = [
  { id: 'account', icon: FaIdCard, labelKey: 'settings.tabAccount' },
  { id: 'profile', icon: FaUserEdit, labelKey: 'settings.tabProfile' },
  { id: 'google', icon: FaGoogle, labelKey: 'settings.tabGoogle', requiresGoogle: true },
  { id: 'danger', icon: FaShieldAlt, labelKey: 'settings.tabDanger' },
];

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user, refreshUser, googleRelink, googleUnlink } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('account');
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
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Account reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: warning, 2: confirmation
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  
  // Filter tabs based on Google availability
  const visibleTabs = TABS.filter(tab => !tab.requiresGoogle || GOOGLE_CLIENT_ID);
  
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
      // Use centralized action helper for consistent cache invalidation
      const result = await updateEmailAction(email, refreshUser);
      setEmailSuccess(result.message || t('settings.emailUpdated'));
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
      // Use centralized action helper for consistent cache invalidation
      const result = await updateUsernameAction(newUsername, refreshUser);
      setUsernameSuccess(result.message || t('settings.usernameUpdated'));
    } catch (err) {
      setUsernameError(err.response?.data?.error || t('settings.usernameUpdateFailed'));
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    
    // Check for at least one letter and one number
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setPasswordError(t('auth.passwordRequirements'));
      return;
    }
    
    // Confirm password match
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordsMismatch'));
      return;
    }
    
    // If user has password, require current password
    if (user?.hasPassword && !currentPassword) {
      setPasswordError(t('settings.currentPasswordRequired'));
      return;
    }
    
    setPasswordLoading(true);
    try {
      // Use centralized action helper for consistent cache invalidation
      const result = await updatePasswordAction({
        currentPassword: user?.hasPassword ? currentPassword : undefined,
        newPassword
      }, refreshUser);
      setPasswordSuccess(result.message || t('settings.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || t('settings.passwordUpdateFailed'));
    } finally {
      setPasswordLoading(false);
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

    const REQUIRED_TEXT = t('settings.resetAccountText');
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
      // Use centralized action helper for consistent cache invalidation
      const result = await resetAccountAction({
        password: resetPassword || undefined,
        confirmationText: resetConfirmText
      }, refreshUser);
      
      setResetSuccess(result.message || t('settings.resetSuccess'));
      setShowResetConfirm(false);
      setResetStep(1);
      setResetPassword('');
      setResetConfirmText('');
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

  const renderAccountTab = () => (
    <TabContent
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <TabHeader>
        <TabIcon><FaIdCard /></TabIcon>
        <div>
          <TabTitle>{t('settings.accountInfo')}</TabTitle>
          <TabDescription>{t('settings.accountInfoDesc') || 'View your account details'}</TabDescription>
        </div>
      </TabHeader>
      
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
        <InfoRow>
          <InfoLabel><FaLock /> {t('settings.passwordSet') || 'Password'}</InfoLabel>
          <InfoValue>
            {user?.hasPassword ? (
              <LinkedBadge><FaCheck /> {t('settings.set') || 'Set'}</LinkedBadge>
            ) : (
              <NotLinkedBadge>{t('settings.notSet')}</NotLinkedBadge>
            )}
          </InfoValue>
        </InfoRow>
      </InfoCard>
    </TabContent>
  );

  const renderProfileTab = () => (
    <TabContent
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <TabHeader>
        <TabIcon><FaUserEdit /></TabIcon>
        <div>
          <TabTitle>{t('settings.tabProfile')}</TabTitle>
          <TabDescription>{t('settings.profileDesc') || 'Update your email and username'}</TabDescription>
        </div>
      </TabHeader>

      {/* Email Section */}
      <SubSection>
        <SubSectionTitle>
          <FaEnvelope /> {user?.email ? t('settings.updateEmail') : t('settings.addEmail')}
        </SubSectionTitle>
        <SubSectionDescription>
          {t('settings.emailDescription')}
        </SubSectionDescription>
        
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
      </SubSection>

      <Divider />

      {/* Username Section */}
      <SubSection>
        <SubSectionTitle>
          <FaUser /> {t('settings.changeUsername')}
        </SubSectionTitle>
        
        {user?.usernameChanged ? (
          <DisabledSection>
            <FaLock />
            <span>{t('settings.usernameAlreadyChanged')}</span>
          </DisabledSection>
        ) : (
          <>
            <SubSectionDescription>
              {t('settings.usernameDescription')}
            </SubSectionDescription>
            <WarningBox>
              {ICON_WARNING} {t('settings.usernameWarning')}
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
      </SubSection>

      <Divider />

      {/* Password Section */}
      <SubSection>
        <SubSectionTitle>
          <FaLock /> {user?.hasPassword ? t('settings.changePassword') : t('settings.setPassword')}
        </SubSectionTitle>
        <SubSectionDescription>
          {user?.hasPassword 
            ? t('settings.changePasswordDesc') 
            : t('settings.setPasswordDesc')
          }
        </SubSectionDescription>
        
        {!user?.hasPassword && (
          <WarningBox style={{ background: 'rgba(0, 113, 227, 0.15)', borderColor: 'rgba(0, 113, 227, 0.3)', color: theme.colors.primary }}>
            <FaExclamationTriangle style={{ marginRight: '4px' }} /> {t('settings.setPasswordHint')}
          </WarningBox>
        )}
        
        <Form onSubmit={handlePasswordSubmit}>
          {user?.hasPassword && (
            <InputWrapper>
              <InputIcon><FaLock /></InputIcon>
              <StyledInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('settings.currentPasswordPlaceholder')}
              />
            </InputWrapper>
          )}
          
          <InputWrapper>
            <InputIcon><FaLock /></InputIcon>
            <StyledInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('settings.newPasswordPlaceholder')}
            />
          </InputWrapper>
          
          <InputWrapper>
            <InputIcon><FaLock /></InputIcon>
            <StyledInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('settings.confirmPasswordPlaceholder')}
            />
          </InputWrapper>
          
          {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
          {passwordSuccess && <SuccessMessage><FaCheck /> {passwordSuccess}</SuccessMessage>}
          
          <SubmitButton 
            type="submit" 
            disabled={passwordLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {passwordLoading ? <LoadingSpinner /> : (user?.hasPassword ? t('settings.updatePassword') : t('settings.setPasswordBtn'))}
          </SubmitButton>
        </Form>
      </SubSection>
    </TabContent>
  );

  const renderGoogleTab = () => (
    <TabContent
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <TabHeader>
        <TabIcon $google><FaGoogle /></TabIcon>
        <div>
          <TabTitle>{t('settings.googleAccount')}</TabTitle>
          <TabDescription>
            {user?.hasGoogle 
              ? t('settings.googleAccountLinkedDesc')
              : t('settings.googleAccountNotLinkedDesc')
            }
          </TabDescription>
        </div>
      </TabHeader>

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
              <p>{ICON_WARNING} {t('settings.unlinkConfirmMessage')}</p>
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
    </TabContent>
  );

  const renderDangerTab = () => (
    <TabContent
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <TabHeader $danger>
        <TabIcon $danger><FaExclamationTriangle /></TabIcon>
        <div>
          <TabTitle $danger>{t('settings.dangerZone')}</TabTitle>
          <TabDescription>{t('settings.dangerZoneDescription')}</TabDescription>
        </div>
      </TabHeader>
      
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
              {t('settings.resetTypeConfirm', { text: t('settings.resetAccountText') })}
            </ResetLabel>
            <StyledInput
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder={t('settings.resetAccountText')}
              style={{ textAlign: 'center', fontWeight: 600, letterSpacing: '1px', paddingLeft: '16px' }}
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
              disabled={resetLoading || resetConfirmText !== t('settings.resetAccountText')}
              whileHover={{ scale: resetConfirmText === t('settings.resetAccountText') ? 1.02 : 1 }}
              whileTap={{ scale: resetConfirmText === t('settings.resetAccountText') ? 0.98 : 1 }}
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
    </TabContent>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountTab();
      case 'profile':
        return renderProfileTab();
      case 'google':
        return renderGoogleTab();
      case 'danger':
        return renderDangerTab();
      default:
        return renderAccountTab();
    }
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
        <TabsContainer>
          <TabList>
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isDanger = tab.id === 'danger';
              return (
                <Tab
                  key={tab.id}
                  $active={activeTab === tab.id}
                  $danger={isDanger}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon />
                  <span>{t(tab.labelKey) || tab.id}</span>
                  {activeTab === tab.id && (
                    <TabIndicator
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </Tab>
              );
            })}
          </TabList>

          <TabPanel>
            <AnimatePresence mode="wait">
              {renderActiveTab()}
            </AnimatePresence>
          </TabPanel>
        </TabsContainer>
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
  max-width: 700px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
`;

const TabsContainer = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
`;

const TabList = styled.div`
  display: flex;
  gap: 2px;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  overflow-x: auto;
  
  /* Hide scrollbar but allow scrolling on mobile */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const Tab = styled(motion.button)`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: transparent;
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$active 
    ? (props.$danger ? theme.colors.error : theme.colors.text)
    : theme.colors.textSecondary};
  cursor: pointer;
  transition: color ${theme.transitions.fast};
  white-space: nowrap;
  flex: 1;
  justify-content: center;
  min-width: 100px;
  
  svg {
    font-size: 16px;
    color: ${props => props.$active 
      ? (props.$danger ? theme.colors.error : theme.colors.primary)
      : theme.colors.textMuted};
  }
  
  &:hover {
    color: ${props => props.$danger ? theme.colors.error : theme.colors.text};
    
    svg {
      color: ${props => props.$danger ? theme.colors.error : theme.colors.primary};
    }
  }
  
  @media (max-width: 500px) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    
    span {
      display: none;
    }
  }
`;

const TabIndicator = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
`;

const TabPanel = styled.div`
  padding: ${theme.spacing.xl};
  min-height: 400px;
`;

const TabContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const TabHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid ${props => props.$danger 
    ? 'rgba(255, 59, 48, 0.2)' 
    : theme.colors.surfaceBorder};
`;

const TabIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.$danger 
    ? 'rgba(255, 59, 48, 0.15)' 
    : props.$google 
      ? 'rgba(66, 133, 244, 0.15)'
      : `rgba(0, 113, 227, 0.15)`};
  border-radius: ${theme.radius.lg};
  
  svg {
    font-size: 22px;
    color: ${props => props.$danger 
      ? theme.colors.error 
      : props.$google 
        ? '#4285f4'
        : theme.colors.primary};
  }
`;

const TabTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.text};
`;

const TabDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SubSectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0;
  color: ${theme.colors.text};
  
  svg {
    color: ${theme.colors.primary};
    font-size: 14px;
  }
`;

const SubSectionDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const Divider = styled.div`
  height: 1px;
  background: ${theme.colors.surfaceBorder};
  margin: ${theme.spacing.md} 0;
`;

const InfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
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
