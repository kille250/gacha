import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaLock, FaDice, FaArrowRight, FaGem } from 'react-icons/fa';
import { MdLanguage, MdCollections, MdAutoAwesome } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { theme, motionVariants, springs, LoadingSpinner } from '../design-system';
import { languages } from '../i18n';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { login, googleLogin, error, user, loading } = useContext(AuthContext);
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
    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);
    if (success) navigate('/gacha');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsGoogleLoading(true);
    const success = await googleLogin(credentialResponse.credential);
    setIsGoogleLoading(false);
    if (success) navigate('/gacha');
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  // Feature highlights for value proposition
  const features = [
    { icon: MdAutoAwesome, label: t('auth.feature.collect', 'Collect rare characters') },
    { icon: MdCollections, label: t('auth.feature.build', 'Build your collection') },
    { icon: FaGem, label: t('auth.feature.unlock', 'Unlock legendary rewards') },
  ];

  return (
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
            as={motion.div}
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={springs.bouncy}
          >
            <FaDice />
          </LogoWrapper>
          <BrandTitle>{t('auth.gachaGame')}</BrandTitle>
          <BrandSubtitle>{t('auth.rollYourDestiny')}</BrandSubtitle>

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

        <LoginCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.gentle}
        >
          <CardHeader>
            <WelcomeText>{t('auth.welcomeBack')}</WelcomeText>
            <SubText>{t('auth.signInToContinue')}</SubText>
          </CardHeader>

          {error && (
            <ErrorMessage
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </ErrorMessage>
          )}

          <LoginForm onSubmit={handleSubmit}>
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
          </LoginForm>

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

          <RegisterPrompt>
            <RegisterLink to="/register">{t('auth.createAccount')}</RegisterLink>
          </RegisterPrompt>
        </LoginCard>
      </ContentWrapper>
    </PageContainer>
  );
};

// Animations - calmer, more refined motion
const float = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(15px, -25px) scale(1.02); }
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
  font-family: ${theme.fonts.primary};
  position: relative;
  overflow: hidden;
  padding: ${theme.spacing.lg};
`;

const BackgroundEffects = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

const GradientOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  animation: ${float} 40s infinite ease-in-out;

  &.orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0, 113, 227, 0.25), transparent 70%);
    top: -15%;
    left: -10%;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, rgba(88, 86, 214, 0.2), transparent 70%);
    bottom: -10%;
    right: -10%;
    animation-delay: -10s;
  }

  &.orb-3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(175, 82, 222, 0.15), transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -20s;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ContentWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
`;

const BrandSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const LogoWrapper = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius['2xl']};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
  margin-bottom: ${theme.spacing.md};
  box-shadow: ${theme.shadows.glow(theme.colors.primary)};
  cursor: pointer;
`;

const BrandTitle = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  letter-spacing: -0.02em;
`;

const BrandSubtitle = styled.p`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.xs} 0 0;
`;

// Value Proposition Feature List
const FeatureList = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const FeatureItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  svg {
    font-size: 14px;
    color: ${theme.colors.primary};
  }
`;

const LoginCard = styled(motion.div)`
  width: 100%;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border-radius: ${theme.radius['2xl']};
  border: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing['2xl']};
  box-shadow: ${theme.shadows.card};
`;

const CardHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.lg};
`;

const WelcomeText = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const SubText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin: ${theme.spacing.xs} 0 0;
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const InputLabel = styled.label`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  &:focus-within > div {
    color: ${theme.colors.primary};
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: 14px;
  pointer-events: none;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};
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
  transition:
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.fast} ${theme.easing.easeOut};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.focusRing};
  }

  /* Focus icon color handled by InputWrapper */
`;

const SubmitButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: box-shadow ${theme.timing.normal} ${theme.easing.easeOut};
  box-shadow: ${theme.shadows.buttonPrimary};
  margin-top: ${theme.spacing.sm};

  &:hover:not(:disabled) {
    box-shadow: ${theme.shadows.buttonPrimaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      ${theme.shadows.buttonPrimaryHover},
      0 0 0 3px ${theme.colors.focusRing};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 14px;
  }
`;

// Using shared LoadingSpinner from DesignSystem

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.lg} 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${theme.colors.surfaceBorder};
`;

const DividerText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
`;

const RegisterPrompt = styled.p`
  text-align: center;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const RegisterLink = styled(Link)`
  color: ${theme.colors.primary};
  text-decoration: none;
  font-weight: ${theme.fontWeights.semibold};
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};
  border-radius: ${theme.radius.sm};
  padding: 2px 4px;
  margin: -2px -4px;

  &:hover {
    color: ${theme.colors.primaryHover};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
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

// Language Selector
const LanguageSelectorContainer = styled.div`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  z-index: 100;
`;

const LanguageButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 16px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }

  svg {
    font-size: 18px;
  }
`;

const LanguageDropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.dropdown};
  overflow: hidden;
  min-width: 160px;
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  background: ${props => props.$active ? theme.colors.primarySubtle : 'transparent'};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.glass};
  }
`;

export default LoginPage;
