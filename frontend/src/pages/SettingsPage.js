import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FaUser, FaEnvelope, FaCheck, FaArrowLeft, FaGoogle, FaLock, FaUnlink, FaLink, FaExclamationTriangle, FaTrash, FaIdCard, FaUserEdit, FaShieldAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { theme, LoadingSpinner, ErrorMessage as SharedErrorMessage, SuccessMessage as SharedSuccessMessage, PageTransition } from '../design-system';
import {
  updateEmail as updateEmailAction,
  updateUsername as updateUsernameAction,
  updatePassword as updatePasswordAction,
  resetAccount as resetAccountAction
} from '../actions/settingsActions';

// Icon Constants
import { IconWarning } from '../constants/icons';

// Styled Components
import {
  PageContainer,
  Header,
  BackButton,
  Title,
  Content,
  TabsContainer,
  TabList,
  Tab,
  TabIndicator,
  TabPanel,
  TabContent,
  TabHeader,
  TabIcon,
  TabTitle,
  TabDescription,
  SubSection,
  SubSectionTitle,
  SubSectionDescription,
  Divider,
  InfoCard,
  InfoRow,
  InfoLabel,
  InfoValue,
  LinkedBadge,
  NotLinkedBadge,
  GoogleEmailBadge,
  Form,
  InputWrapper,
  InputIcon,
  StyledInput,
  SubmitButton,
  WarningBox,
  DisabledSection,
  GoogleButtonGroup,
  GoogleActionButton,
  GoogleUnlinkButton,
  RelinkConfirmBox,
  GoogleButtonWrapper,
  GoogleLoadingButton,
  CancelButton,
  DangerButton,
  ResetConfirmBox,
  WarningHeader,
  WarningList,
  KeepList,
  DangerButtonGroup,
  ResetForm,
  ResetLabel,
} from './SettingsPage.styles';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const TABS = [
  { id: 'account', icon: FaIdCard, labelKey: 'settings.tabAccount' },
  { id: 'profile', icon: FaUserEdit, labelKey: 'settings.tabProfile' },
  { id: 'google', icon: FaGoogle, labelKey: 'settings.tabGoogle', requiresGoogle: true },
  { id: 'danger', icon: FaShieldAlt, labelKey: 'settings.tabDanger' },
];

// Use shared ErrorMessage and SuccessMessage from DesignSystem
const ErrorMessage = SharedErrorMessage;
const SuccessMessage = SharedSuccessMessage;

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
              <IconWarning /> {t('settings.usernameWarning')}
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
              <p><IconWarning /> {t('settings.unlinkConfirmMessage')}</p>
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
    <PageTransition>
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
    </PageTransition>
  );
};

export default SettingsPage;
