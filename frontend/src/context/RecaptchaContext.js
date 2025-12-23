/**
 * reCAPTCHA Context
 * 
 * Provides reCAPTCHA v3 functionality throughout the application.
 * Automatically loads the reCAPTCHA script and provides methods to execute challenges.
 * 
 * Usage:
 *   const { executeRecaptcha, isReady, siteKey } = useRecaptcha();
 *   const token = await executeRecaptcha('trade');
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const RecaptchaContext = createContext(null);

// Get site key from environment or dynamically from server
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || null;

// Script loading state
let scriptLoadPromise = null;
let isScriptLoaded = false;

/**
 * Load the reCAPTCHA script dynamically
 */
function loadRecaptchaScript(siteKey) {
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }
  
  if (isScriptLoaded && window.grecaptcha) {
    return Promise.resolve();
  }
  
  scriptLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.grecaptcha && window.grecaptcha.execute) {
      isScriptLoaded = true;
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for grecaptcha to be ready
      window.grecaptcha.ready(() => {
        isScriptLoaded = true;
        resolve();
      });
    };
    
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    
    document.head.appendChild(script);
  });
  
  return scriptLoadPromise;
}

/**
 * reCAPTCHA Provider Component
 */
export const RecaptchaProvider = ({ children, siteKey: propSiteKey }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [siteKey, setSiteKey] = useState(propSiteKey || RECAPTCHA_SITE_KEY);
  const loadAttempted = useRef(false);
  
  // Load the script when site key is available
  useEffect(() => {
    if (!siteKey || loadAttempted.current) {
      return;
    }
    
    loadAttempted.current = true;
    
    loadRecaptchaScript(siteKey)
      .then(() => {
        setIsReady(true);
        setError(null);
      })
      .catch((err) => {
        console.error('[reCAPTCHA] Failed to load:', err);
        setError(err.message);
        setIsReady(false);
      });
  }, [siteKey]);
  
  /**
   * Execute reCAPTCHA challenge for a specific action
   * @param {string} action - The action name (e.g., 'trade', 'login')
   * @returns {Promise<string|null>} - The reCAPTCHA token or null if failed
   */
  const executeRecaptcha = useCallback(async (action) => {
    if (!siteKey) {
      console.warn('[reCAPTCHA] No site key configured');
      return null;
    }
    
    if (!isReady || !window.grecaptcha) {
      console.warn('[reCAPTCHA] Not ready yet');
      
      // Try to load if not loaded
      try {
        await loadRecaptchaScript(siteKey);
        setIsReady(true);
      } catch (err) {
        console.error('[reCAPTCHA] Failed to load on demand:', err);
        return null;
      }
    }
    
    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (err) {
      console.error('[reCAPTCHA] Execute error:', err);
      return null;
    }
  }, [siteKey, isReady]);
  
  /**
   * Update site key dynamically (e.g., from server response)
   */
  const updateSiteKey = useCallback((newSiteKey) => {
    if (newSiteKey && newSiteKey !== siteKey) {
      setSiteKey(newSiteKey);
      loadAttempted.current = false;
      isScriptLoaded = false;
      scriptLoadPromise = null;
    }
  }, [siteKey]);
  
  const value = {
    isReady,
    isEnabled: !!siteKey,
    siteKey,
    error,
    executeRecaptcha,
    updateSiteKey
  };
  
  return (
    <RecaptchaContext.Provider value={value}>
      {children}
    </RecaptchaContext.Provider>
  );
};

/**
 * Hook to use reCAPTCHA functionality
 */
export const useRecaptcha = () => {
  const context = useContext(RecaptchaContext);
  
  if (!context) {
    // Return a no-op implementation if used outside provider
    return {
      isReady: false,
      isEnabled: false,
      siteKey: null,
      error: null,
      executeRecaptcha: async () => null,
      updateSiteKey: () => {}
    };
  }
  
  return context;
};

export default RecaptchaContext;

