/**
 * useNetworkStatus - Hook for monitoring network connectivity
 *
 * Features:
 * - Detects online/offline state
 * - Detects slow connections (2G, save-data mode)
 * - Provides connection quality information
 * - Listens for network changes
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Connection quality levels
 */
export const CONNECTION_QUALITY = {
  OFFLINE: 'offline',
  SLOW: 'slow',
  GOOD: 'good',
  UNKNOWN: 'unknown',
};

/**
 * Get connection quality from Navigator.connection API
 * @returns {string} Connection quality level
 */
const getConnectionQuality = () => {
  if (!navigator.onLine) {
    return CONNECTION_QUALITY.OFFLINE;
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return CONNECTION_QUALITY.UNKNOWN;
  }

  // Check for save-data mode
  if (connection.saveData) {
    return CONNECTION_QUALITY.SLOW;
  }

  // Check effective type
  const effectiveType = connection.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return CONNECTION_QUALITY.SLOW;
  }

  // Check downlink speed (Mbps)
  const downlink = connection.downlink;
  if (downlink !== undefined && downlink < 1) {
    return CONNECTION_QUALITY.SLOW;
  }

  return CONNECTION_QUALITY.GOOD;
};

/**
 * Hook for monitoring network status
 * @returns {Object} Network status information
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionQuality, setConnectionQuality] = useState(CONNECTION_QUALITY.UNKNOWN);
  const [lastOnlineAt, setLastOnlineAt] = useState(Date.now());

  // Update connection quality
  const updateConnectionQuality = useCallback(() => {
    const quality = getConnectionQuality();
    setConnectionQuality(quality);
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineAt(Date.now());
    updateConnectionQuality();
  }, [updateConnectionQuality]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setConnectionQuality(CONNECTION_QUALITY.OFFLINE);
  }, []);

  // Handle connection change
  const handleConnectionChange = useCallback(() => {
    updateConnectionQuality();
  }, [updateConnectionQuality]);

  useEffect(() => {
    // Initial check
    updateConnectionQuality();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if supported
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, updateConnectionQuality]);

  // Compute derived states
  const isSlowConnection = connectionQuality === CONNECTION_QUALITY.SLOW;
  const shouldWarnAboutUpload = !isOnline || isSlowConnection;

  // Get user-friendly message
  const getStatusMessage = useCallback(() => {
    if (!isOnline) {
      return 'You are offline. Please check your connection.';
    }
    if (isSlowConnection) {
      return 'Slow connection detected. Large uploads may take longer.';
    }
    return null;
  }, [isOnline, isSlowConnection]);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionQuality,
    isSlowConnection,
    shouldWarnAboutUpload,
    lastOnlineAt,
    getStatusMessage,
    refresh: updateConnectionQuality,
  };
};

export default useNetworkStatus;
