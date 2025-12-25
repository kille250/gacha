/**
 * Global CAPTCHA Handler Component
 * 
 * Listens for CAPTCHA_REQUIRED_EVENT dispatched by the API layer
 * and shows the CaptchaModal globally. This ensures users always
 * have a way to complete CAPTCHA verification regardless of which 
 * component triggered the request.
 * 
 * UX Philosophy:
 * - CAPTCHA is a neutral security step, not an error
 * - Business logic errors are separate from CAPTCHA verification
 * - Users should understand what succeeded and what failed
 * - Clear next actions are always provided
 * 
 * State Flow:
 * 1. Request triggers CAPTCHA_REQUIRED
 * 2. Modal shows verification in progress
 * 3. CAPTCHA verification completes (success or retry)
 * 4. Original request is retried with CAPTCHA token
 * 5. Result: either success (modal closes) or business error (show in modal)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CaptchaModal from './CaptchaModal';
import { CAPTCHA_REQUIRED_EVENT } from '../../utils/api';
import api from '../../utils/api';

// Error codes that indicate CAPTCHA-specific failures (retry CAPTCHA)
const CAPTCHA_ERROR_CODES = ['CAPTCHA_FAILED', 'CAPTCHA_REQUIRED', 'CAPTCHA_EXPIRED', 'CAPTCHA_INVALID'];

// Error codes that are NOT user-fixable (don't show "Try Again" for these)
const TERMINAL_ERROR_CODES = ['ACCOUNT_BANNED', 'ACCOUNT_LOCKED', 'IP_BANNED'];

/**
 * Determine if an error is a CAPTCHA-related error that requires
 * the user to complete verification again
 */
const isCaptchaError = (error) => {
  const code = error?.response?.data?.code;
  return CAPTCHA_ERROR_CODES.includes(code);
};

/**
 * Determine if an error is terminal (user cannot recover by retrying)
 */
const isTerminalError = (error) => {
  const code = error?.response?.data?.code;
  return TERMINAL_ERROR_CODES.includes(code);
};

/**
 * Extract a user-friendly error message from an API error
 * Avoids technical jargon and provides actionable information
 */
const extractUserMessage = (error) => {
  // Check for a custom user message first
  if (error?.response?.data?.userMessage) {
    return error.response.data.userMessage;
  }
  
  // Use the standard error message
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Fallback for network errors
  if (error?.message === 'Network Error') {
    return 'Unable to reach the server. Please check your connection and try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

const GlobalCaptchaHandler = () => {
  const [showModal, setShowModal] = useState(false);
  const [captchaData, setCaptchaData] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  
  // Store pending retry function
  const pendingRetry = useRef(null);
  
  // Listen for CAPTCHA required events
  useEffect(() => {
    const handleCaptchaRequired = (event) => {
      const { detail } = event;

      // Store the retry function and original config
      pendingRetry.current = {
        retry: detail.retry,
        originalConfig: detail.originalConfig
      };
      
      // Set up modal data
      setCaptchaData({
        captchaType: detail.captchaType || 'fallback',
        challenge: detail.challenge || null,
        siteKey: detail.siteKey || null,
        action: detail.action || 'verify'
      });
      
      // Reset retry state
      setIsRetrying(false);
      setRetryError(null);
      setShowModal(true);
    };
    
    window.addEventListener(CAPTCHA_REQUIRED_EVENT, handleCaptchaRequired);
    
    return () => {
      window.removeEventListener(CAPTCHA_REQUIRED_EVENT, handleCaptchaRequired);
    };
  }, []);
  
  // Handle CAPTCHA solved - attempt to retry the original request
  const handleSolved = useCallback(async ({ token, answer, type }) => {
    if (!pendingRetry.current) {
      console.warn('[GlobalCaptcha] No pending request to retry');
      setShowModal(false);
      return;
    }
    
    // Show "submitting" state in modal
    setIsRetrying(true);
    setRetryError(null);
    
    try {
      // Build headers based on CAPTCHA type
      const headers = {};
      if (type === 'recaptcha') {
        headers['x-recaptcha-token'] = token;
      } else {
        headers['x-captcha-token'] = token;
        headers['x-captcha-answer'] = answer;
      }
      
      // Try the provided retry function first
      if (pendingRetry.current.retry) {
        await pendingRetry.current.retry(headers);
      } else if (pendingRetry.current.originalConfig) {
        // Fallback: retry using original config
        const config = { ...pendingRetry.current.originalConfig };
        config.headers = { ...config.headers, ...headers };
        await api.request(config);
      }
      
      // SUCCESS - Close modal and clean up
      setShowModal(false);
      setIsRetrying(false);
      pendingRetry.current = null;
      
      // Dispatch success event for any interested listeners
      window.dispatchEvent(new CustomEvent('captcha:solved', { 
        detail: { success: true } 
      }));
      
    } catch (err) {
      console.error('[GlobalCaptcha] Request failed after CAPTCHA:', err);
      setIsRetrying(false);
      
      // Check if CAPTCHA verification itself failed (need to re-verify)
      if (isCaptchaError(err)) {
        // Update with new challenge data if provided
        setCaptchaData({
          captchaType: err.response?.data?.captchaType || 'fallback',
          challenge: err.response?.data?.challenge || null,
          siteKey: err.response?.data?.siteKey || null,
          action: err.response?.data?.action || 'verify'
        });
        
        // Clear any previous error - modal will show new verification state
        setRetryError(null);
        return;
      }
      
      // This is a BUSINESS LOGIC error (not CAPTCHA-related)
      // CAPTCHA succeeded, but the actual request failed
      // Show the error in the modal with clear messaging
      const userMessage = extractUserMessage(err);
      setRetryError(userMessage);
      
      // Dispatch failure event with details
      window.dispatchEvent(new CustomEvent('captcha:failed', { 
        detail: { 
          error: userMessage,
          code: err.response?.data?.code,
          isTerminal: isTerminalError(err)
        } 
      }));
    }
  }, []);
  
  // Handle modal close
  const handleClose = useCallback(() => {
    setShowModal(false);
    pendingRetry.current = null;
    setRetryError(null);
    setIsRetrying(false);
    
    // Dispatch cancelled event
    window.dispatchEvent(new CustomEvent('captcha:cancelled'));
  }, []);
  
  if (!showModal || !captchaData) return null;
  
  return (
    <CaptchaModal
      isOpen={showModal}
      onClose={handleClose}
      onSolved={handleSolved}
      action={captchaData.action}
      captchaType={captchaData.captchaType}
      challenge={captchaData.challenge}
      siteKey={captchaData.siteKey}
      isSubmitting={isRetrying}
      submitError={retryError}
    />
  );
};

export default GlobalCaptchaHandler;
