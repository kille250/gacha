import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FaUser, FaLock, FaDice, FaArrowRight, FaGem } from 'react-icons/fa';
import { MdLanguage, MdCollections, MdAutoAwesome } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { motionVariants, springs, LoadingSpinner, PageTransition } from '../design-system';
import { languages } from '../i18n';
// ForcePasswordChangeModal is now handled globally in App.js

// Styled Components
import {
  PageContainer,
  BackgroundEffects,
  GradientOrb,
  ContentWrapper,
  BrandSection,
  LogoWrapper,
  BrandTitle,
  BrandSubtitle,
  FeatureList,
  FeatureItem,
  AuthCard,
  CardHeader,
  WelcomeText,
  SubText,
  ErrorMessage,
  AuthForm,
  InputGroup,
  InputLabel,
  InputWrapper,
  InputIcon,
  StyledInput,
  SubmitButton,
  Divider,
  DividerLine,
  DividerText,
  NavigationPrompt,
  NavigationLink,
  GoogleButtonWrapper,
  GoogleLoadingButton,
  LanguageSelectorContainer,
  LanguageButton,
  LanguageDropdown,
  LanguageOption,
} from './AuthPage.styles';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const {
    login,
    googleLogin,
    error,
    user,
    loading,
    requiresPasswordChange,
  } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already logged in (but not if password change is required)
  useEffect(() => {
    if (!loading && user && !requiresPasswordChange) {
      navigate('/gacha', { replace: true });
    }
  }, [user, loading, navigate, requiresPasswordChange]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);

    // If login was successful and no password change required, navigate
    if (result === true) {
      navigate('/gacha');
    }
    // If result is an object with requiresPasswordChange, the modal will be shown
    // No need to navigate here - the modal handles it
  };

  // Password change success is now handled by GlobalPasswordChangeHandler in App.js

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsGoogleLoading(true);
    const success = await googleLogin(credentialResponse.credential);
    setIsGoogleLoading(false);
    if (success) navigate('/gacha');
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  // Feature highlights for value proposition - enhanced descriptions
  const features = [
    { icon: MdAutoAwesome, label: t('auth.feature.collect', '500+ anime characters') },
    { icon: MdCollections, label: t('auth.feature.build', 'Free daily rewards') },
    { icon: FaGem, label: t('auth.feature.unlock', 'Legendary drop rates') },
  ];

  return (
    <PageTransition>
      <PageContainer>
        {/* Language Selector */}
        <LanguageSelectorContainer>
        <LanguageButton
          onClick={() => setShowLangMenu(!showLangMenu)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
        >
          <MdLanguage />
          <span>{languages[i18n.language]?.flag || ''}</span>
        </LanguageButton>
        <AnimatePresence>
          {showLangMenu && (
            <LanguageDropdown
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springs.snappy}
            >
              {Object.entries(languages).map(([code, lang]) => (
                <LanguageOption
                  key={code}
                  $active={i18n.language === code}
                  onClick={() => changeLanguage(code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </LanguageOption>
              ))}
            </LanguageDropdown>
          )}
        </AnimatePresence>
      </LanguageSelectorContainer>

      <BackgroundEffects>
        <GradientOrb className="orb-1" />
        <GradientOrb className="orb-2" />
        <GradientOrb className="orb-3" />
      </BackgroundEffects>

      <ContentWrapper
        initial="hidden"
        animate="visible"
        variants={motionVariants.fadeIn}
      >
        <BrandSection
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.gentle}
        >
          <LogoWrapper
            as="div"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={springs.bouncy}
          >
            <FaDice />
          </LogoWrapper>
          <BrandTitle>{t('auth.gachaGame', 'GachaMaster')}</BrandTitle>
          <BrandSubtitle>{t('auth.rollYourDestiny', 'Collect characters from your favorite anime')}</BrandSubtitle>

          {/* Value Proposition Features */}
          <FeatureList
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {features.map((feature, index) => (
              <FeatureItem
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <feature.icon />
                <span>{feature.label}</span>
              </FeatureItem>
            ))}
          </FeatureList>
        </BrandSection>

        <AuthCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.gentle}
        >
          <CardHeader>
            <WelcomeText>{t('auth.welcomeBack')}</WelcomeText>
            <SubText>{t('auth.signInToContinue')}</SubText>
          </CardHeader>

          <AnimatePresence mode="wait">
            {error && (
              <ErrorMessage
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {error}
              </ErrorMessage>
            )}
          </AnimatePresence>

          <AuthForm onSubmit={handleSubmit}>
            <InputGroup>
              <InputLabel>{t('auth.username')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaUser /></InputIcon>
                <StyledInput
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
              <InputLabel>{t('auth.password')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaLock /></InputIcon>
                <StyledInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.enterPassword')}
                  required
                  autoComplete="current-password"
                />
              </InputWrapper>
            </InputGroup>

            <SubmitButton
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={springs.snappy}
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  {t('auth.login')}
                  <FaArrowRight />
                </>
              )}
            </SubmitButton>
          </AuthForm>

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
                    text="signin_with"
                    shape="rectangular"
                  />
                )}
              </GoogleButtonWrapper>
            </>
          )}

          <Divider>
            <DividerLine />
            <DividerText>{t('auth.newToGacha')}</DividerText>
            <DividerLine />
          </Divider>

          <NavigationPrompt>
            <NavigationLink to="/register">{t('auth.createAccount')}</NavigationLink>
          </NavigationPrompt>
        </AuthCard>
      </ContentWrapper>

      {/* Force Password Change Modal is now rendered globally in App.js */}
    </PageContainer>
    </PageTransition>
  );
};

export default LoginPage;
