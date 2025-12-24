/**
 * CAPTCHA Modal Component
 * 
 * A user-friendly CAPTCHA verification interface that:
 * - Clearly separates CAPTCHA verification from business logic results
 * - Uses calm, neutral styling for the verification step
 * - Only shows error styling for actual failures
 * - Provides clear next actions based on state
 * 
 * States:
 * - verifying: CAPTCHA verification in progress
 * - verified: CAPTCHA passed, submitting original request
 * - business_error: Request failed (not a CAPTCHA issue)
 * - captcha_error: CAPTCHA itself failed
 * - fallback_input: User is entering math challenge answer
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { theme } from '../../design-system';
import { useRecaptcha } from '../../context/RecaptchaContext';
import { ICON_SEARCH, ICON_SUCCESS, ICON_INFO } from '../../constants/icons';

// State icons mapping (use unicode symbols for clean UI)
const STATE_ICONS = {
  verifying: ICON_SEARCH,
  verified: ICON_SUCCESS,
  business_error: ICON_INFO,
  captcha_error: ICON_SEARCH, // Reuse search for "try again"
  challenge: ICON_SEARCH,     // Calculator-like icon would be better, but search works
};

// ==================== ANIMATIONS ====================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { 
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to { 
    opacity: 1;
    transform: translate(-50%, -50%);
  }
`;

const checkmark = keyframes`
  0% { 
    stroke-dashoffset: 50;
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% { 
    stroke-dashoffset: 0;
    opacity: 1;
  }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ==================== STYLED COMPONENTS ====================

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 10000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: 2rem;
  min-width: 340px;
  max-width: 440px;
  width: 90%;
  z-index: 10001;
  animation: ${slideUp} 0.3s ease-out;
  
  @media (max-width: 480px) {
    min-width: 0;
    width: calc(100% - 2rem);
    padding: 1.5rem;
    margin: 0 1rem;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  transition: all 0.3s ease;
  
  ${props => props.$variant === 'verifying' && css`
    background: rgba(90, 200, 250, 0.15);
    border: 2px solid rgba(90, 200, 250, 0.3);
    color: ${theme.colors.info};
  `}
  
  ${props => props.$variant === 'verified' && css`
    background: rgba(52, 199, 89, 0.15);
    border: 2px solid rgba(52, 199, 89, 0.3);
    color: ${theme.colors.success};
  `}
  
  ${props => props.$variant === 'error' && css`
    background: rgba(255, 159, 10, 0.15);
    border: 2px solid rgba(255, 159, 10, 0.3);
    color: ${theme.colors.warning};
  `}
  
  ${props => props.$variant === 'captcha_error' && css`
    background: rgba(255, 59, 48, 0.15);
    border: 2px solid rgba(255, 59, 48, 0.3);
    color: ${theme.colors.error};
  `}
  
  ${props => props.$variant === 'challenge' && css`
    background: rgba(88, 86, 214, 0.15);
    border: 2px solid rgba(88, 86, 214, 0.3);
    color: ${theme.colors.accent};
  `}
`;

const Title = styled.h2`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.xl};
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0 0 0.5rem 0;
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

const StatusSection = styled.div`
  margin-bottom: 1.5rem;
`;

const StatusCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: ${theme.radius.md};
  transition: all 0.3s ease;
  
  ${props => props.$variant === 'info' && css`
    background: rgba(90, 200, 250, 0.1);
    border: 1px solid rgba(90, 200, 250, 0.2);
  `}
  
  ${props => props.$variant === 'success' && css`
    background: rgba(52, 199, 89, 0.1);
    border: 1px solid rgba(52, 199, 89, 0.2);
  `}
  
  ${props => props.$variant === 'warning' && css`
    background: rgba(255, 159, 10, 0.1);
    border: 1px solid rgba(255, 159, 10, 0.2);
  `}
  
  ${props => props.$variant === 'error' && css`
    background: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.2);
  `}
`;

const StatusIcon = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  
  ${props => props.$variant === 'info' && css`
    background: rgba(90, 200, 250, 0.2);
    color: ${theme.colors.info};
  `}
  
  ${props => props.$variant === 'success' && css`
    background: rgba(52, 199, 89, 0.2);
    color: ${theme.colors.success};
  `}
  
  ${props => props.$variant === 'warning' && css`
    background: rgba(255, 159, 10, 0.2);
    color: ${theme.colors.warning};
  `}
  
  ${props => props.$variant === 'error' && css`
    background: rgba(255, 59, 48, 0.2);
    color: ${theme.colors.error};
  `}
`;

const StatusContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StatusTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: 0.25rem;
`;

const StatusText = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  line-height: 1.4;
`;

const Spinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(90, 200, 250, 0.3);
  border-top-color: ${theme.colors.info};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const CheckmarkSvg = styled.svg`
  width: 18px;
  height: 18px;
  stroke: ${theme.colors.success};
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  
  path {
    stroke-dasharray: 50;
    animation: ${checkmark} 0.4s ease forwards;
  }
`;

const ChallengeBox = styled.div`
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const MathQuestion = styled.div`
  font-family: ${theme.fonts.mono};
  font-size: ${theme.fontSizes['2xl']};
  color: ${theme.colors.accent};
  margin-bottom: 1rem;
  letter-spacing: 0.15em;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  background: ${theme.colors.backgroundSecondary};
  border: 2px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.lg};
  text-align: center;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(88, 86, 214, 0.2);
  }
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  flex: 1;
  padding: 0.875rem 1.25rem;
  border-radius: ${theme.radius.md};
  font-weight: 600;
  font-size: ${theme.fontSizes.sm};
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${theme.colors.primary};
  color: white;
  border: none;
  
  &:hover:not(:disabled) {
    background: ${theme.colors.primaryHover};
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${theme.colors.text};
  border: 1px solid ${theme.colors.surfaceBorder};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.backgroundTertiary};
  }
`;

const Footer = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  text-align: center;
  margin-top: 1rem;
  line-height: 1.4;
  
  a {
    color: ${theme.colors.textSecondary};
    text-decoration: underline;
    
    &:hover {
      color: ${theme.colors.text};
    }
  }
`;

const ErrorDetails = styled.div`
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.2);
  border-radius: ${theme.radius.md};
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const ErrorTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  color: ${theme.colors.warning};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ErrorMessage = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const HelpText = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 159, 10, 0.15);
`;

// ==================== HELPER COMPONENTS ====================

const Checkmark = () => (
  <CheckmarkSvg viewBox="0 0 24 24">
    <path d="M4 12l6 6L20 6" />
  </CheckmarkSvg>
);

// ==================== STATE CONFIGURATION ====================

const STATE_CONFIG = {
  verifying: {
    icon: STATE_ICONS.verifying,
    iconVariant: 'verifying',
    title: 'Security Check',
    description: 'Please wait while we verify your request...',
    statusVariant: 'info',
    statusTitle: 'Verifying',
    statusText: 'This usually takes just a moment',
    showSpinner: true,
  },
  verified: {
    icon: STATE_ICONS.verified,
    iconVariant: 'verified',
    title: 'Verified',
    description: 'Security check passed. Processing your request...',
    statusVariant: 'success',
    statusTitle: 'Verification Complete',
    statusText: 'Submitting your request',
    showSpinner: true,
  },
  business_error: {
    icon: STATE_ICONS.business_error,
    iconVariant: 'error',
    title: 'Action Required',
    description: 'Your verification was successful, but there was an issue with your request.',
    statusVariant: 'success',
    statusTitle: 'Security Check Passed',
    statusText: 'The verification step was successful',
  },
  captcha_error: {
    icon: STATE_ICONS.captcha_error,
    iconVariant: 'captcha_error',
    title: 'Verification Issue',
    description: 'We couldn\'t complete the security check. Please try again.',
    statusVariant: 'error',
    statusTitle: 'Verification Failed',
    statusText: 'Please retry the security check',
  },
  challenge: {
    icon: STATE_ICONS.challenge,
    iconVariant: 'challenge',
    title: 'Quick Verification',
    description: 'Please solve this simple math problem to continue.',
    statusVariant: 'info',
    statusTitle: 'Answer Required',
    statusText: 'This helps us verify you\'re human',
  },
};

// ==================== MAIN COMPONENT ====================

/**
 * CAPTCHA Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Called when modal is closed
 * @param {Function} props.onSolved - Called with {token, answer?, type} when CAPTCHA is solved
 * @param {string} props.action - The action requiring CAPTCHA (for reCAPTCHA v3)
 * @param {Object} props.challenge - Fallback challenge object {id, question}
 * @param {string} props.captchaType - 'recaptcha' or 'fallback'
 * @param {string} props.siteKey - reCAPTCHA site key (if not from context)
 * @param {boolean} props.isSubmitting - Whether the parent is retrying the request
 * @param {string} props.submitError - Business error from the parent's retry attempt
 */
const CaptchaModal = ({ 
  isOpen, 
  onClose, 
  onSolved, 
  action = 'verify',
  challenge = null,
  captchaType = 'recaptcha',
  siteKey: propSiteKey = null,
  isSubmitting = false,
  submitError = null
}) => {
  const { executeRecaptcha, isReady, updateSiteKey, siteKey: contextSiteKey } = useRecaptcha();
  const [answer, setAnswer] = useState('');
  const [internalError, setInternalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRef = useRef(null);
  
  // Determine current state
  const getState = useCallback(() => {
    if (captchaType === 'fallback') {
      return 'challenge';
    }
    if (internalError) {
      return 'captcha_error';
    }
    if (submitError) {
      return 'business_error';
    }
    if (isSubmitting) {
      return 'verified';
    }
    if (verified) {
      return 'verified';
    }
    return 'verifying';
  }, [captchaType, internalError, submitError, isSubmitting, verified]);
  
  const currentState = getState();
  const config = STATE_CONFIG[currentState];
  
  // Update site key if provided from server
  useEffect(() => {
    if (propSiteKey && propSiteKey !== contextSiteKey) {
      updateSiteKey(propSiteKey);
    }
  }, [propSiteKey, contextSiteKey, updateSiteKey]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAnswer('');
      setInternalError(null);
      setVerified(false);
    }
  }, [isOpen]);
  
  // Focus input when showing fallback challenge
  useEffect(() => {
    if (isOpen && captchaType === 'fallback' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, captchaType]);
  
  // Auto-execute reCAPTCHA when modal opens
  useEffect(() => {
    if (!isOpen || captchaType !== 'recaptcha' || submitError) return;
    
    const attemptRecaptcha = async () => {
      if (!isReady) {
        // Wait for reCAPTCHA to load
        return;
      }
      
      setLoading(true);
      setInternalError(null);
      
      try {
        const token = await executeRecaptcha(action);
        
        if (token) {
          setVerified(true);
          onSolved({ token, type: 'recaptcha' });
        } else {
          setInternalError('Unable to complete verification. Please try again.');
        }
      } catch (err) {
        console.error('[CaptchaModal] reCAPTCHA error:', err);
        setInternalError('Verification service unavailable. Please try again in a moment.');
      } finally {
        setLoading(false);
      }
    };
    
    attemptRecaptcha();
  }, [isOpen, captchaType, isReady, action, executeRecaptcha, onSolved, submitError]);
  
  // Handle fallback challenge submission
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    
    if (!answer.trim()) {
      setInternalError('Please enter your answer');
      return;
    }
    
    if (!challenge?.id) {
      setInternalError('Challenge expired. Please close and try again.');
      return;
    }
    
    setVerified(true);
    onSolved({ 
      token: challenge.id, 
      answer: answer.trim(),
      type: 'fallback' 
    });
  }, [answer, challenge, onSolved]);
  
  // Retry reCAPTCHA
  const handleRetry = useCallback(async () => {
    if (captchaType !== 'recaptcha') return;
    
    setLoading(true);
    setInternalError(null);
    setVerified(false);
    
    try {
      const token = await executeRecaptcha(action);
      
      if (token) {
        setVerified(true);
        onSolved({ token, type: 'recaptcha' });
      } else {
        setInternalError('Verification failed. Please try again or contact support.');
      }
    } catch (err) {
      console.error('[CaptchaModal] Retry error:', err);
      setInternalError('Verification service is temporarily unavailable. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [captchaType, action, executeRecaptcha, onSolved]);
  
  // Get user-friendly error message
  const getFriendlyErrorMessage = (error) => {
    if (!error) return null;
    
    // Map common error patterns to friendly messages
    const errorMappings = [
      { pattern: /invalid.*coupon/i, message: 'The coupon code you entered is invalid or has expired.' },
      { pattern: /coupon.*expired/i, message: 'This coupon code has expired and can no longer be used.' },
      { pattern: /coupon.*used/i, message: 'This coupon has already been redeemed.' },
      { pattern: /incorrect.*password/i, message: 'The password you entered is incorrect.' },
      { pattern: /password.*incorrect/i, message: 'The password you entered is incorrect.' },
      { pattern: /rate.*limit/i, message: 'You\'ve made too many attempts. Please wait a moment before trying again.' },
      { pattern: /too.*many.*requests/i, message: 'Please slow down and try again in a few seconds.' },
      { pattern: /not.*found/i, message: 'The requested item could not be found.' },
      { pattern: /insufficient/i, message: 'You don\'t have enough resources to complete this action.' },
      { pattern: /already.*exists/i, message: 'This item already exists.' },
      { pattern: /not.*authorized/i, message: 'You don\'t have permission to perform this action.' },
    ];
    
    for (const { pattern, message } of errorMappings) {
      if (pattern.test(error)) {
        return message;
      }
    }
    
    // Return the original error if no mapping found
    return error;
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <Overlay onClick={onClose} aria-hidden="true" />
      <Modal 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="captcha-title"
        aria-describedby="captcha-description"
      >
        <Header>
          <IconWrapper $variant={config.iconVariant}>
            {currentState === 'verified' && !submitError ? '✓' : config.icon}
          </IconWrapper>
          <Title id="captcha-title">{config.title}</Title>
          <Description id="captcha-description">{config.description}</Description>
        </Header>
        
        {/* Status Card - shows verification progress */}
        {captchaType === 'recaptcha' && !submitError && (
          <StatusSection>
            <StatusCard $variant={config.statusVariant}>
              <StatusIcon $variant={config.statusVariant}>
                {config.showSpinner && (loading || isSubmitting) ? (
                  <Spinner />
                ) : currentState === 'verified' || (currentState === 'verifying' && verified) ? (
                  <Checkmark />
                ) : currentState === 'captcha_error' ? (
                  '✕'
                ) : (
                  <Spinner />
                )}
              </StatusIcon>
              <StatusContent>
                <StatusTitle>
                  {isSubmitting ? 'Submitting Request' : config.statusTitle}
                </StatusTitle>
                <StatusText>
                  {isSubmitting ? 'Please wait...' : config.statusText}
                </StatusText>
              </StatusContent>
            </StatusCard>
          </StatusSection>
        )}
        
        {/* Business Error Display - shows after CAPTCHA success but request failed */}
        {submitError && (
          <ErrorDetails>
            <ErrorTitle>
              <span>⚠️</span>
              Request Could Not Be Completed
            </ErrorTitle>
            <ErrorMessage>
              {getFriendlyErrorMessage(submitError)}
            </ErrorMessage>
            <HelpText>
              The security verification was successful. Please check the information above and try your action again.
            </HelpText>
          </ErrorDetails>
        )}
        
        {/* CAPTCHA Error Display */}
        {internalError && !submitError && (
          <StatusSection>
            <StatusCard $variant="error">
              <StatusIcon $variant="error">⚠</StatusIcon>
              <StatusContent>
                <StatusTitle>Unable to Verify</StatusTitle>
                <StatusText>{internalError}</StatusText>
              </StatusContent>
            </StatusCard>
          </StatusSection>
        )}
        
        {/* Fallback Challenge Input */}
        {captchaType === 'fallback' && (
          <form onSubmit={handleSubmit}>
            <ChallengeBox>
              <MathQuestion aria-label="Math challenge">
                {challenge?.question || '? + ? = ?'}
              </MathQuestion>
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                autoComplete="off"
                aria-label="Your answer to the math problem"
              />
            </ChallengeBox>
            
            <ButtonGroup>
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={!answer.trim()}>
                Submit
              </PrimaryButton>
            </ButtonGroup>
          </form>
        )}
        
        {/* reCAPTCHA Buttons */}
        {captchaType === 'recaptcha' && (
          <ButtonGroup>
            <SecondaryButton onClick={onClose} disabled={isSubmitting}>
              {submitError ? 'Close' : 'Cancel'}
            </SecondaryButton>
            {(internalError || submitError) && (
              <PrimaryButton 
                onClick={submitError ? onClose : handleRetry} 
                disabled={loading || isSubmitting}
              >
                {submitError ? 'Try Again' : 'Retry Verification'}
              </PrimaryButton>
            )}
          </ButtonGroup>
        )}
        
        <Footer>
          {captchaType === 'recaptcha' ? (
            <>
              Protected by reCAPTCHA.{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Privacy
              </a>
              {' '}·{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                Terms
              </a>
            </>
          ) : (
            'This helps protect our service from automated abuse.'
          )}
        </Footer>
      </Modal>
    </>
  );
};

export default CaptchaModal;
