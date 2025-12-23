/**
 * Global CAPTCHA Handler Component
 * 
 * Listens for CAPTCHA_REQUIRED_EVENT dispatched by the API layer
 * and shows the CaptchaModal globally. This ensures users always
 * have a way to solve CAPTCHAs regardless of which component triggered the request.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CaptchaModal from './CaptchaModal';
import { CAPTCHA_REQUIRED_EVENT } from '../../utils/api';
import api from '../../utils/api';

const GlobalCaptchaHandler = () => {
  const [showModal, setShowModal] = useState(false);
  const [captchaData, setCaptchaData] = useState(null);
  
  // Store pending retry function
  const pendingRetry = useRef(null);
  
  // Listen for CAPTCHA required events
  useEffect(() => {
    const handleCaptchaRequired = (event) => {
      const { detail } = event;
      
      console.log('[GlobalCaptcha] CAPTCHA required:', detail);
      
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
      
      setShowModal(true);
    };
    
    window.addEventListener(CAPTCHA_REQUIRED_EVENT, handleCaptchaRequired);
    
    return () => {
      window.removeEventListener(CAPTCHA_REQUIRED_EVENT, handleCaptchaRequired);
    };
  }, []);
  
  // Handle CAPTCHA solved
  const handleSolved = useCallback(async ({ token, answer, type }) => {
    setShowModal(false);
    
    if (!pendingRetry.current) {
      console.warn('[GlobalCaptcha] No pending request to retry');
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
      
      // Try the provided retry function first
      if (pendingRetry.current.retry) {
        await pendingRetry.current.retry(headers);
      } else if (pendingRetry.current.originalConfig) {
        // Fallback: retry using original config
        const config = { ...pendingRetry.current.originalConfig };
        config.headers = { ...config.headers, ...headers };
        await api.request(config);
      }
      
      // Dispatch success event for any interested listeners
      window.dispatchEvent(new CustomEvent('captcha:solved', { 
        detail: { success: true } 
      }));
      
    } catch (err) {
      console.error('[GlobalCaptcha] Retry failed:', err);
      
      // Check if CAPTCHA failed again
      if (err.response?.data?.code === 'CAPTCHA_FAILED' || 
          err.response?.data?.code === 'CAPTCHA_REQUIRED') {
        // Update challenge data and show modal again
        setCaptchaData({
          captchaType: err.response.data.captchaType || 'fallback',
          challenge: err.response.data.challenge || null,
          siteKey: err.response.data.siteKey || null,
          action: err.response.data.action || 'verify'
        });
        setShowModal(true);
        return;
      }
      
      // Dispatch failure event
      window.dispatchEvent(new CustomEvent('captcha:failed', { 
        detail: { error: err.message } 
      }));
    } finally {
      pendingRetry.current = null;
    }
  }, []);
  
  // Handle modal close
  const handleClose = useCallback(() => {
    setShowModal(false);
    pendingRetry.current = null;
    
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
    />
  );
};

export default GlobalCaptchaHandler;

