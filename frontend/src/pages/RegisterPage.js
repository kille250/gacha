import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FaUser, FaLock, FaDice, FaArrowRight, FaGem, FaEnvelope } from 'react-icons/fa';
import { MdLanguage } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { motionVariants, LoadingSpinner, PageTransition } from '../design-system';
import { languages } from '../i18n';

// Styled Components
import {
  PageContainer,
  BackgroundEffects,
  GradientOrbLarge,
  GridOverlay,
  ContentWrapper,
  BrandSection,
  LogoWrapperAccent,
  BrandTitleLarge,
  BrandSubtitleTertiary,
  AuthCardXl,
  CardHeader,
  WelcomeTextXl,
  SubText,
  ErrorMessage,
  AuthFormMd,
  InputGroup,
  InputLabel,
  InputWrapper,
  InputIcon,
  StyledInputAccent,
  SubmitButtonAccent,
  Divider,
  DividerLine,
  DividerText,
  NavigationPrompt,
  NavigationLinkAccent,
  GoogleButtonWrapper,
  GoogleLoadingButton,
  LanguageSelectorContainer,
  LanguageButton,
  LanguageDropdownSimple,
  LanguageOptionAccent,
  BonusInfo,
} from './AuthPage.styles';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { register, googleLogin, error, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/gacha', { replace: true });
    }
  }, [user, loading, navigate]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setLocalError(t('auth.invalidEmail'));
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t('auth.passwordsMismatch'));
      return;
    }

    if (password.length < 8) {
      setLocalError(t('auth.passwordTooShort'));
      return;
    }

    // Password must contain at least one letter and one number
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setLocalError(t('auth.passwordRequirements'));
      return;
    }

    if (!register) {
      setLocalError(t('auth.registrationUnavailable'));
      return;
    }

    setIsLoading(true);

    try {
      const success = await register(username, email.trim().toLowerCase(), password);
      if (success) {
        navigate('/gacha');
      }
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsGoogleLoading(true);
    const success = await googleLogin(credentialResponse.credential);
    setIsGoogleLoading(false);
    if (success) navigate('/gacha');
  };

  const handleGoogleError = () => {
    console.error('Google signup failed');
  };

  const displayError = localError || error;

  return (
    <PageTransition>
      <PageContainer>
        {/* Language Selector */}
        <LanguageSelectorContainer>
        <LanguageButton
          onClick={() => setShowLangMenu(!showLangMenu)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MdLanguage />
          <span>{languages[i18n.language]?.flag || ''}</span>
        </LanguageButton>
        <AnimatePresence>
          {showLangMenu && (
            <LanguageDropdownSimple
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              {Object.entries(languages).map(([code, lang]) => (
                <LanguageOptionAccent
                  key={code}
                  $active={i18n.language === code}
                  onClick={() => changeLanguage(code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </LanguageOptionAccent>
              ))}
            </LanguageDropdownSimple>
          )}
        </AnimatePresence>
      </LanguageSelectorContainer>

      <BackgroundEffects>
        <GradientOrbLarge className="orb-1" />
        <GradientOrbLarge className="orb-2" />
        <GradientOrbLarge className="orb-3" />
        <GridOverlay />
      </BackgroundEffects>

      <ContentWrapper
        initial="hidden"
        animate="visible"
        variants={motionVariants.fadeIn}
      >
        <BrandSection
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <LogoWrapperAccent>
            <FaDice />
          </LogoWrapperAccent>
          <BrandTitleLarge>{t('auth.gachaGame')}</BrandTitleLarge>
          <BrandSubtitleTertiary>{t('auth.startYourJourney')}</BrandSubtitleTertiary>
        </BrandSection>

        <AuthCardXl
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <CardHeader>
            <WelcomeTextXl>{t('auth.createYourAccount')}</WelcomeTextXl>
            <SubText>{t('auth.signInToContinue')}</SubText>
          </CardHeader>

          {displayError && (
            <ErrorMessage
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {displayError}
            </ErrorMessage>
          )}

          <AuthFormMd onSubmit={handleSubmit}>
            <InputGroup>
              <InputLabel>{t('auth.username')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaUser /></InputIcon>
                <StyledInputAccent
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.enterUsername')}
                  required
                  autoComplete="username"
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel>{t('auth.email')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaEnvelope /></InputIcon>
                <StyledInputAccent
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.enterEmail')}
                  required
                  autoComplete="email"
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel>{t('auth.password')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaLock /></InputIcon>
                <StyledInputAccent
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.enterPassword')}
                  required
                  autoComplete="new-password"
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel>{t('auth.confirmPassword')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaLock /></InputIcon>
                <StyledInputAccent
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmYourPassword')}
                  required
                  autoComplete="new-password"
                />
              </InputWrapper>
            </InputGroup>

            <SubmitButtonAccent
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  {t('auth.register')}
                  <FaArrowRight />
                </>
              )}
            </SubmitButtonAccent>
          </AuthFormMd>

          <BonusInfo>
            <FaGem />
            <span dangerouslySetInnerHTML={{ __html: t('auth.bonusInfo', { gems: 100 }) }} />
          </BonusInfo>

          {GOOGLE_CLIENT_ID && (
            <>
              <Divider>
                <DividerLine />
                <DividerText>{t('common.or')}</DividerText>
                <DividerLine />
              </Divider>

              <GoogleButtonWrapper>
                {isGoogleLoading ? (
                  <GoogleLoadingButton disabled>
                    <LoadingSpinner />
                  </GoogleLoadingButton>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    width={400}
                    text="signup_with"
                    shape="rectangular"
                  />
                )}
              </GoogleButtonWrapper>
            </>
          )}

          <Divider>
            <DividerLine />
            <DividerText>{t('auth.alreadyHaveAccount')}</DividerText>
            <DividerLine />
          </Divider>

          <NavigationPrompt>
            <NavigationLinkAccent to="/login">{t('auth.signInHere')}</NavigationLinkAccent>
          </NavigationPrompt>
        </AuthCardXl>
      </ContentWrapper>
    </PageContainer>
    </PageTransition>
  );
};

export default RegisterPage;
