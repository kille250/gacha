/**
 * useCaptchaProtectedRequest Hook
 * 
 * Provides a wrapper for API calls that may require CAPTCHA verification.
 * Automatically handles CAPTCHA_REQUIRED responses by showing a modal
 * and retrying the request with the verification token.
 * 
 * Key UX Principles:
 * - CAPTCHA is presented as a neutral security step, not an error
 * - Business logic errors are clearly separated from CAPTCHA issues
 * - Users always understand what succeeded and what failed
 * - Clear next actions are provided in all scenarios
 * 
 * Usage:
 *   const { execute, CaptchaModalComponent, isShowingCaptcha } = useCaptchaProtectedRequest();
 *   
 *   try {
 *     const result = await execute(
 *       () => api.post('/trade', data),
 *       'trade'  // action name for reCAPTCHA v3
 *     );
 *     // Success!
 *   } catch (err) {
 *     // Handle non-CAPTCHA errors
 *   }
 */

import { useState, useCallback, useRef } from 'react';
import CaptchaModal from '../components/UI/CaptchaModal';
import api from '../utils/api';
import { isCaptchaError, getUserFriendlyError } from '../utils/errorHandler';

/**
 * Hook for executing CAPTCHA-protected requests
 * 
 * @returns {Object} Hook utilities
 * @returns {Function} returns.execute - Execute a CAPTCHA-protected request
 * @returns {Function} returns.CaptchaModalComponent - Modal component to render
 * @returns {boolean} returns.isShowingCaptcha - Whether the modal is currently visible
 */
export const useCaptchaProtectedRequest = () => {
  const [showModal, setShowModal] = useState(false);
  const [captchaType, setCaptchaType] = useState('recaptcha');
  const [challenge, setChallenge] = useState(null);
  const [siteKey, setSiteKey] = useState(null);
  const [currentAction, setCurrentAction] = useState('verify');
  const [isRetrying, setIsRetrying] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  // Store the pending request and resolve/reject functions
  const pendingRequest = useRef(null);
  const pendingResolve = useRef(null);
  const pendingReject = useRef(null);
  
  /**
   * Handle CAPTCHA solution - retry the original request
   */
  const handleSolved = useCallback(async ({ token, answer, type }) => {
    if (!pendingRequest.current) {
      console.warn('[useCaptchaProtectedRequest] No pending request to retry');
      setShowModal(false);
      return;
    }
    
    // Show "submitting" state
    setIsRetrying(true);
    setSubmitError(null);
    
    try {
      // Build headers based on CAPTCHA type
      const headers = {};
      if (type === 'recaptcha') {
        headers['x-recaptcha-token'] = token;
      } else {
        headers['x-captcha-token'] = token;
        headers['x-captcha-answer'] = answer;
      }
      
      // Retry the request with CAPTCHA headers
      const { originalConfig } = pendingRequest.current;
      
      // Merge headers into original config
      if (originalConfig) {
        originalConfig.headers = {
          ...originalConfig.headers,
          ...headers
        };
        const result = await api.request(originalConfig);
        
        // SUCCESS!
        setShowModal(false);
        setIsRetrying(false);
        pendingResolve.current?.(result.data);
      } else {
        // Fallback: re-execute the function (less ideal)
        const { requestFn } = pendingRequest.current;
        const result = await requestFn(headers);
        
        setShowModal(false);
        setIsRetrying(false);
        pendingResolve.current?.(result);
      }
    } catch (err) {
      setIsRetrying(false);
      
      // Check if CAPTCHA itself failed - need to re-verify
      if (isCaptchaError(err)) {
        // Update with new challenge if provided
        const responseData = err.response?.data;
        setCaptchaType(responseData?.captchaType || 'fallback');
        setChallenge(responseData?.challenge || null);
        setSiteKey(responseData?.siteKey || null);
        
        // Clear previous error - modal shows new verification state
        setSubmitError(null);
        return;
      }
      
      // Business logic error - CAPTCHA succeeded but request failed
      const { message } = getUserFriendlyError(err, { context: currentAction });
      setSubmitError(message);
      
      // Don't reject here - let user close modal and see the error
      // The modal will show the error with clear messaging
    } finally {
      pendingRequest.current = null;
      pendingResolve.current = null;
      pendingReject.current = null;
    }
  }, [currentAction]);
  
  /**
   * Handle modal close without solving or after business error
   */
  const handleClose = useCallback(() => {
    setShowModal(false);
    setSubmitError(null);
    setIsRetrying(false);
    
    // If there's a pending request that was never completed, reject it
    if (pendingRequest.current) {
      const error = new Error('Verification cancelled');
      error.code = 'CAPTCHA_CANCELLED';
      error.userCancelled = true;
      pendingReject.current?.(error);
    }
    
    pendingRequest.current = null;
    pendingResolve.current = null;
    pendingReject.current = null;
  }, []);
  
  /**
   * Execute a request with CAPTCHA protection
   * 
   * If the request triggers a CAPTCHA requirement, this will:
   * 1. Show the CAPTCHA modal
   * 2. Wait for user to complete verification
   * 3. Retry the request with the CAPTCHA token
   * 4. Resolve with the result or reject with error
   * 
   * @param {Function} requestFn - The API request function to execute
   * @param {string} action - The action name for reCAPTCHA v3 (e.g., 'trade', 'login')
   * @param {Object} options - Additional options
   * @returns {Promise} - Resolves with the response data
   */
  const execute = useCallback((requestFn, action = 'verify', _options = {}) => {
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        try {
          // Execute the request
          const result = await requestFn();
          resolve(result);
        } catch (err) {
          // Check if CAPTCHA is required
          const responseData = err.response?.data;

          if (responseData?.code === 'CAPTCHA_REQUIRED') {
            // Store the request for retry
            pendingRequest.current = {
              requestFn,
              originalConfig: err.config
            };
            pendingResolve.current = resolve;
            pendingReject.current = reject;

            // Set up modal
            setCurrentAction(responseData.action || action);
            setCaptchaType(responseData.captchaType || 'recaptcha');
            setChallenge(responseData.challenge || null);
            setSiteKey(responseData.siteKey || null);
            setSubmitError(null);
            setIsRetrying(false);
            setShowModal(true);

            return; // Don't resolve/reject yet - wait for CAPTCHA completion
          }

          // Not a CAPTCHA error, propagate it
          reject(err);
        }
      };

      executeRequest();
    });
  }, []);
  
  /**
   * Modal component to render in your component tree
   * This allows the hook to be used without the global handler
   */
  const CaptchaModalComponent = useCallback(() => (
    <CaptchaModal
      isOpen={showModal}
      onClose={handleClose}
      onSolved={handleSolved}
      action={currentAction}
      captchaType={captchaType}
      challenge={challenge}
      siteKey={siteKey}
      isSubmitting={isRetrying}
      submitError={submitError}
    />
  ), [showModal, handleClose, handleSolved, currentAction, captchaType, challenge, siteKey, isRetrying, submitError]);
  
  return {
    execute,
    CaptchaModalComponent,
    isShowingCaptcha: showModal
  };
};

/**
 * Create a CAPTCHA-protected version of an API function
 * 
 * This is a utility for wrapping API functions that might require CAPTCHA.
 * It dispatches the global CAPTCHA event when needed.
 * 
 * Usage:
 *   const protectedTrade = createProtectedRequest(
 *     (data) => api.post('/trade', data),
 *     'trade'
 *   );
 *   
 *   try {
 *     const result = await protectedTrade({ fishId: 123 });
 *   } catch (err) {
 *     if (err.code === 'CAPTCHA_REQUIRED') {
 *       // Global handler will show modal
 *     } else {
 *       // Handle other errors
 *     }
 *   }
 */
export const createProtectedRequest = (requestFn, action) => {
  return async (...args) => {
    try {
      const result = await requestFn(...args);
      return result;
    } catch (err) {
      if (err.response?.data?.code === 'CAPTCHA_REQUIRED') {
        // Dispatch event for global CAPTCHA handler
        window.dispatchEvent(new CustomEvent('captcha:required', {
          detail: {
            ...err.response.data,
            action,
            retry: async (headers) => {
              // Clone the original config and add headers
              const config = { ...err.config };
              config.headers = { ...config.headers, ...headers };
              return api.request(config);
            }
          }
        }));
        
        // Throw a recognizable error for callers to handle
        const captchaError = new Error('Security verification required');
        captchaError.code = 'CAPTCHA_REQUIRED';
        captchaError.captchaData = err.response.data;
        throw captchaError;
      }
      throw err;
    }
  };
};

export default useCaptchaProtectedRequest;
