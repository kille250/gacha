/**
 * useNetworkStatus - Hook for monitoring network connectivity
 *
 * Features:
 * - Detects online/offline state
 * - Detects slow connections (2G, save-data mode)
 * - Provides connection quality information
 * - Listens for network changes
 * - Callbacks for online/offline events
 * - Tracks reconnection state for showing "back online" banners
 *
 * @example
 * const { isOnline, wasRecentlyOffline } = useNetworkStatus({
 *   onOnline: () => refetchData(),
 *   onOffline: () => showOfflineBanner(),
 * });
 */
import { useState, useEffect, useCallback, useRef } from 'react';

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
 * @param {Object} options - Configuration options
 * @param {Function} options.onOnline - Callback when connection is restored
 * @param {Function} options.onOffline - Callback when connection is lost
 * @param {number} options.reconnectGracePeriod - Time in ms to show "back online" state (default: 5000)
 * @returns {Object} Network status information
 */
export const useNetworkStatus = (options = {}) => {
  const {
    onOnline,
    onOffline,
    reconnectGracePeriod = 5000,
  } = options;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionQuality, setConnectionQuality] = useState(CONNECTION_QUALITY.UNKNOWN);
  const [lastOnlineAt, setLastOnlineAt] = useState(Date.now());
  const [wasRecentlyOffline, setWasRecentlyOffline] = useState(false);

  // Refs for stable callbacks
  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);
  const reconnectTimerRef = useRef(null);

  // Keep refs updated
  useEffect(() => {
    onOnlineRef.current = onOnline;
    onOfflineRef.current = onOffline;
  }, [onOnline, onOffline]);

  // Update connection quality
  const updateConnectionQuality = useCallback(() => {
    const quality = getConnectionQuality();
    setConnectionQuality(quality);
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineAt(Date.now());
    setWasRecentlyOffline(true);
    updateConnectionQuality();

    // Call user callback
    if (onOnlineRef.current) {
      onOnlineRef.current();
    }

    // Clear "recently offline" state after grace period
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectTimerRef.current = setTimeout(() => {
      setWasRecentlyOffline(false);
    }, reconnectGracePeriod);
  }, [updateConnectionQuality, reconnectGracePeriod]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setConnectionQuality(CONNECTION_QUALITY.OFFLINE);

    // Clear any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    // Call user callback
    if (onOfflineRef.current) {
      onOfflineRef.current();
    }
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
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
    if (wasRecentlyOffline) {
      return 'You are back online!';
    }
    if (isSlowConnection) {
      return 'Slow connection detected. Large uploads may take longer.';
    }
    return null;
  }, [isOnline, isSlowConnection, wasRecentlyOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionQuality,
    isSlowConnection,
    shouldWarnAboutUpload,
    lastOnlineAt,
    wasRecentlyOffline,
    getStatusMessage,
    refresh: updateConnectionQuality,
  };
};

export default useNetworkStatus;
