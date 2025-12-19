import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaDice, FaArrowRight } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { theme, motionVariants } from '../styles/DesignSystem';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);
    if (success) navigate('/gacha');
  };

  return (
    <PageContainer>
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
          <BrandTitle>Gacha Game</BrandTitle>
          <BrandSubtitle>Roll your destiny</BrandSubtitle>
        </BrandSection>

        <LoginCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <CardHeader>
            <WelcomeText>Welcome back</WelcomeText>
            <SubText>Sign in to continue your adventure</SubText>
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
              <InputLabel>Username</InputLabel>
              <InputWrapper>
                <InputIcon><FaUser /></InputIcon>
                <StyledInput 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel>Password</InputLabel>
              <InputWrapper>
                <InputIcon><FaLock /></InputIcon>
                <StyledInput 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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
                  Sign In
                  <FaArrowRight />
                </>
              )}
            </SubmitButton>
          </LoginForm>

          <Divider>
            <DividerLine />
            <DividerText>or</DividerText>
            <DividerLine />
          </Divider>

          <RegisterPrompt>
            New to Gacha Game?{' '}
            <RegisterLink to="/register">Create an account</RegisterLink>
          </RegisterPrompt>
        </LoginCard>
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

const spin = keyframes`
  to { transform: rotate(360deg); }
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
    background: radial-gradient(circle, rgba(0, 113, 227, 0.3), transparent 70%);
    top: -20%;
    left: -10%;
    animation-delay: 0s;
  }
  
  &.orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(88, 86, 214, 0.25), transparent 70%);
    bottom: -15%;
    right: -10%;
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
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin-bottom: ${theme.spacing.md};
  box-shadow: 0 8px 32px rgba(0, 113, 227, 0.4);
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

const LoginCard = styled(motion.div)`
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
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
    
    & + ${InputIcon}, ~ ${InputIcon} {
      color: ${theme.colors.primary};
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
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: 0 4px 16px rgba(0, 113, 227, 0.4);
  margin-top: ${theme.spacing.sm};
  
  &:hover:not(:disabled) {
    box-shadow: 0 6px 24px rgba(0, 113, 227, 0.5);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 14px;
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
  transition: color ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.primaryHover};
    text-decoration: underline;
  }
`;

export default LoginPage;
