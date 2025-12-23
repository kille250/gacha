/**
 * useCaptchaProtectedRequest Hook
 * 
 * Provides a wrapper for API calls that may require CAPTCHA verification.
 * Automatically handles CAPTCHA_REQUIRED responses by showing a modal
 * and retrying the request with the verification token.
 * 
 * Usage:
 *   const { execute, CaptchaModalComponent } = useCaptchaProtectedRequest();
 *   
 *   const result = await execute(
 *     () => api.post('/trade', data),
 *     'trade'  // action name for reCAPTCHA v3
 *   );
 */

import { useState, useCallback, useRef } from 'react';
import CaptchaModal from '../components/UI/CaptchaModal';
import api from '../utils/api';

/**
 * Hook for executing CAPTCHA-protected requests
 */
export const useCaptchaProtectedRequest = () => {
  const [showModal, setShowModal] = useState(false);
  const [captchaType, setCaptchaType] = useState('recaptcha');
  const [challenge, setChallenge] = useState(null);
  const [siteKey, setSiteKey] = useState(null);
  const [currentAction, setCurrentAction] = useState('verify');
  
  // Store the pending request and resolve/reject functions
  const pendingRequest = useRef(null);
  const pendingResolve = useRef(null);
  const pendingReject = useRef(null);
  
  /**
   * Handle CAPTCHA solution
   */
  const handleSolved = useCallback(async ({ token, answer, type }) => {
    setShowModal(false);
    
    if (!pendingRequest.current) {
      console.warn('[useCaptchaProtectedRequest] No pending request to retry');
      return;
    }
    
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
      const { requestFn, originalConfig } = pendingRequest.current;
      
      // If we have the original config, merge headers
      if (originalConfig) {
        originalConfig.headers = {
          ...originalConfig.headers,
          ...headers
        };
        const result = await api.request(originalConfig);
        pendingResolve.current?.(result.data);
      } else {
        // Re-execute the function (less ideal but works)
        const result = await requestFn(headers);
        pendingResolve.current?.(result);
      }
    } catch (err) {
      // Check if CAPTCHA failed again
      if (err.response?.data?.code === 'CAPTCHA_FAILED') {
        // Show error but don't reject - let user try again
        setShowModal(true);
        return;
      }
      
      pendingReject.current?.(err);
    } finally {
      pendingRequest.current = null;
      pendingResolve.current = null;
      pendingReject.current = null;
    }
  }, []);
  
  /**
   * Handle modal close without solving
   */
  const handleClose = useCallback(() => {
    setShowModal(false);
    
    // Reject the pending request
    pendingReject.current?.(new Error('CAPTCHA verification cancelled'));
    
    pendingRequest.current = null;
    pendingResolve.current = null;
    pendingReject.current = null;
  }, []);
  
  /**
   * Execute a request with CAPTCHA protection
   * 
   * @param {Function} requestFn - The API request function to execute
   * @param {string} action - The action name for reCAPTCHA v3
   * @param {Object} options - Additional options
   * @returns {Promise} - Resolves with the response data
   */
  const execute = useCallback(async (requestFn, action = 'verify', options = {}) => {
    return new Promise(async (resolve, reject) => {
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
          setShowModal(true);
          
          return; // Don't resolve/reject yet
        }
        
        // Not a CAPTCHA error, propagate it
        reject(err);
      }
    });
  }, []);
  
  /**
   * Modal component to render
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
    />
  ), [showModal, handleClose, handleSolved, currentAction, captchaType, challenge, siteKey]);
  
  return {
    execute,
    CaptchaModalComponent,
    isShowingCaptcha: showModal
  };
};

/**
 * Create a CAPTCHA-protected version of an API function
 * 
 * Usage:
 *   const protectedTrade = createProtectedRequest(
 *     (data) => api.post('/trade', data),
 *     'trade'
 *   );
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
        
        // Throw a special error that can be caught by the global handler
        const captchaError = new Error('CAPTCHA verification required');
        captchaError.code = 'CAPTCHA_REQUIRED';
        captchaError.captchaData = err.response.data;
        throw captchaError;
      }
      throw err;
    }
  };
};

export default useCaptchaProtectedRequest;

