import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaLock, FaDice, FaArrowRight, FaGem, FaEnvelope } from 'react-icons/fa';
import { MdLanguage } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { theme, motionVariants } from '../design-system';
import { LoadingSpinner } from '../styles/DesignSystem';
import { languages } from '../i18n';

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
    <PageContainer>
      {/* Language Selector */}
      <LanguageSelectorContainer>
        <LanguageButton
          onClick={() => setShowLangMenu(!showLangMenu)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MdLanguage />
          <span>{languages[i18n.language]?.flag || '🌐'}</span>
        </LanguageButton>
        <AnimatePresence>
          {showLangMenu && (
            <LanguageDropdown
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
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
          <LogoWrapper>
            <FaDice />
          </LogoWrapper>
          <BrandTitle>{t('auth.gachaGame')}</BrandTitle>
          <BrandSubtitle>{t('auth.startYourJourney')}</BrandSubtitle>
        </BrandSection>

        <RegisterCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <CardHeader>
            <WelcomeText>{t('auth.createYourAccount')}</WelcomeText>
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

          <RegisterForm onSubmit={handleSubmit}>
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
              <InputLabel>{t('auth.email')}</InputLabel>
              <InputWrapper>
                <InputIcon><FaEnvelope /></InputIcon>
                <StyledInput 
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
                <StyledInput 
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
                <StyledInput 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmYourPassword')}
                  required
                  autoComplete="new-password"
                />
              </InputWrapper>
            </InputGroup>

            <SubmitButton 
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
            </SubmitButton>
          </RegisterForm>

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

          <LoginPrompt>
            <LoginLink to="/login">{t('auth.signInHere')}</LoginLink>
          </LoginPrompt>
        </RegisterCard>
      </ContentWrapper>
    </PageContainer>
  );
};

// Animations
const float = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
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
  filter: blur(80px);
  animation: ${float} 20s infinite ease-in-out;
  
  &.orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(88, 86, 214, 0.3), transparent 70%);
    top: -20%;
    right: -10%;
    animation-delay: 0s;
  }
  
  &.orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0, 113, 227, 0.25), transparent 70%);
    bottom: -15%;
    left: -10%;
    animation-delay: -7s;
  }
  
  &.orb-3 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(175, 82, 222, 0.2), transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -14s;
  }
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: ${pulse} 8s infinite ease-in-out;
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
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: ${theme.radius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin-bottom: ${theme.spacing.md};
  box-shadow: 0 8px 32px rgba(88, 86, 214, 0.4);
`;

const BrandTitle = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  letter-spacing: -0.02em;
`;

const BrandSubtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textTertiary};
  margin: ${theme.spacing.xs} 0 0;
`;

const RegisterCard = styled(motion.div)`
  width: 100%;
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.xl});
  -webkit-backdrop-filter: blur(${theme.blur.xl});
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.lg};
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

const RegisterForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
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
`;

const InputIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: 14px;
  pointer-events: none;
  transition: color ${theme.transitions.fast};
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
  
  &:hover {
    border-color: ${theme.colors.glassBorder};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(88, 86, 214, 0.2);
    
    & + ${InputIcon}, ~ ${InputIcon} {
      color: ${theme.colors.accent};
    }
  }
`;

const SubmitButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: 0 4px 16px rgba(88, 86, 214, 0.4);
  margin-top: ${theme.spacing.sm};
  
  &:hover:not(:disabled) {
    box-shadow: 0 6px 24px rgba(88, 86, 214, 0.5);
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

const BonusInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.2);
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.success};
  
  svg {
    font-size: 16px;
  }
  
  strong {
    font-weight: ${theme.fontWeights.semibold};
  }
`;

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

const LoginPrompt = styled.p`
  text-align: center;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const LoginLink = styled(Link)`
  color: ${theme.colors.accent};
  text-decoration: none;
  font-weight: ${theme.fontWeights.semibold};
  transition: color ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.accentSecondary};
    text-decoration: underline;
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
  gap: 4px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.text};
  cursor: pointer;
  font-size: 16px;
  
  svg {
    font-size: 18px;
  }
`;

const LanguageDropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.lg};
  overflow: hidden;
  min-width: 150px;
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$active ? theme.colors.accent : theme.colors.text};
  background: ${props => props.$active ? 'rgba(88, 86, 214, 0.1)' : 'transparent'};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.glass};
  }
`;

export default RegisterPage;
