/**
 * CAPTCHA Modal Component
 * 
 * Displays when CAPTCHA verification is required for sensitive actions.
 * Supports both reCAPTCHA v3 (automatic) and fallback math challenges.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../styles/DesignSystem';
import { useRecaptcha } from '../../context/RecaptchaContext';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { 
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  to { 
    opacity: 1;
    transform: translate(-50%, -50%);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 10000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  padding: 2rem;
  min-width: 320px;
  max-width: 420px;
  z-index: 10001;
  animation: ${slideUp} 0.3s ease-out;
  
  @media (max-width: 480px) {
    min-width: 280px;
    padding: 1.5rem;
    margin: 0 1rem;
  }
`;

const Title = styled.h2`
  font-family: ${theme.fonts.heading};
  font-size: ${theme.fontSizes.xl};
  color: ${theme.colors.text};
  margin-bottom: 0.5rem;
  text-align: center;
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ChallengeBox = styled.div`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const MathQuestion = styled.div`
  font-family: ${theme.fonts.mono};
  font-size: ${theme.fontSizes['2xl']};
  color: ${theme.colors.primary};
  margin-bottom: 1rem;
  letter-spacing: 0.1em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${theme.colors.background};
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.lg};
  text-align: center;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: ${theme.borderRadius.md};
  font-weight: 600;
  font-size: ${theme.fontSizes.sm};
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${theme.colors.primary};
  color: white;
  
  &:hover:not(:disabled) {
    background: ${theme.colors.primaryHover};
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${theme.colors.text};
  border: 1px solid ${theme.colors.border};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.backgroundSecondary};
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: 0.75rem;
  margin-bottom: 1rem;
  color: ${theme.colors.danger};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

const RecaptchaStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: 1rem;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${theme.colors.border};
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const RecaptchaBadge = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  text-align: center;
  margin-top: 1rem;
  
  a {
    color: ${theme.colors.textSecondary};
    text-decoration: underline;
  }
`;

/**
 * CAPTCHA Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Called when modal is closed without solving
 * @param {Function} props.onSolved - Called with {token, answer?} when CAPTCHA is solved
 * @param {string} props.action - The action requiring CAPTCHA (for reCAPTCHA v3)
 * @param {Object} props.challenge - Fallback challenge object {id, question}
 * @param {string} props.captchaType - 'recaptcha' or 'fallback'
 * @param {string} props.siteKey - reCAPTCHA site key (if not from context)
 */
const CaptchaModal = ({ 
  isOpen, 
  onClose, 
  onSolved, 
  action = 'verify',
  challenge = null,
  captchaType = 'recaptcha',
  siteKey: propSiteKey = null
}) => {
  const { executeRecaptcha, isReady, updateSiteKey, siteKey: contextSiteKey } = useRecaptcha();
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const inputRef = useRef(null);
  
  // Update site key if provided from server
  useEffect(() => {
    if (propSiteKey && propSiteKey !== contextSiteKey) {
      updateSiteKey(propSiteKey);
    }
  }, [propSiteKey, contextSiteKey, updateSiteKey]);
  
  // Focus input when showing fallback challenge
  useEffect(() => {
    if (isOpen && captchaType === 'fallback' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, captchaType]);
  
  // Auto-execute reCAPTCHA when modal opens
  useEffect(() => {
    if (!isOpen || captchaType !== 'recaptcha') return;
    
    const attemptRecaptcha = async () => {
      if (!isReady) {
        setAutoRetrying(true);
        return;
      }
      
      setAutoRetrying(false);
      setLoading(true);
      setError(null);
      
      try {
        const token = await executeRecaptcha(action);
        
        if (token) {
          onSolved({ token, type: 'recaptcha' });
        } else {
          setError('Failed to verify. Please try again.');
        }
      } catch (err) {
        console.error('[CaptchaModal] reCAPTCHA error:', err);
        setError('Verification failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    attemptRecaptcha();
  }, [isOpen, captchaType, isReady, action, executeRecaptcha, onSolved]);
  
  // Handle fallback challenge submission
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    
    if (!answer.trim()) {
      setError('Please enter your answer');
      return;
    }
    
    if (!challenge?.id) {
      setError('Invalid challenge. Please try again.');
      return;
    }
    
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
    setError(null);
    
    try {
      const token = await executeRecaptcha(action);
      
      if (token) {
        onSolved({ token, type: 'recaptcha' });
      } else {
        setError('Verification failed. Please try the manual challenge.');
      }
    } catch (err) {
      console.error('[CaptchaModal] Retry error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [captchaType, action, executeRecaptcha, onSolved]);
  
  if (!isOpen) return null;
  
  return (
    <>
      <Overlay onClick={onClose} />
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>🔒 Verification Required</Title>
        <Description>
          {captchaType === 'recaptcha' 
            ? 'Please wait while we verify you\'re human...'
            : 'Please solve this simple math problem to continue.'
          }
        </Description>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        {captchaType === 'recaptcha' ? (
          <>
            <RecaptchaStatus>
              {loading || autoRetrying ? (
                <>
                  <Spinner />
                  <span>{autoRetrying ? 'Loading verification...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>Verification ready</span>
              )}
            </RecaptchaStatus>
            
            <ButtonGroup>
              <SecondaryButton onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleRetry} disabled={loading || autoRetrying}>
                {loading ? 'Verifying...' : 'Retry Verification'}
              </PrimaryButton>
            </ButtonGroup>
            
            <RecaptchaBadge>
              Protected by reCAPTCHA. {' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
              {' '}&{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            </RecaptchaBadge>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <ChallengeBox>
              <MathQuestion>{challenge?.question || '? + ? = ?'}</MathQuestion>
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                autoComplete="off"
              />
            </ChallengeBox>
            
            <ButtonGroup>
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={!answer.trim()}>
                Verify
              </PrimaryButton>
            </ButtonGroup>
          </form>
        )}
      </Modal>
    </>
  );
};

export default CaptchaModal;

