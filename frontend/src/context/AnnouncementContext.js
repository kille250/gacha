/**
 * AnnouncementContext - Global announcement management
 *
 * Provides announcement state and actions from anywhere in the app.
 * Handles fetching, caching, and user interactions with announcements.
 *
 * @example
 * const { announcements, unreadCount, markAsRead } = useAnnouncements();
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getAnnouncements,
  getUnacknowledgedAnnouncements,
  markAnnouncementViewed,
  acknowledgeAnnouncement as acknowledgeAnnouncementAPI,
  dismissAnnouncement as dismissAnnouncementAPI
} from '../services/announcementService';
import { useAuth } from './AuthContext';
import { onCacheInvalidation, ANNOUNCEMENT_ACTIONS } from '../cache/manager';

const AnnouncementContext = createContext(null);

// Refresh interval for announcements (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * AnnouncementProvider Component
 *
 * Wrap your app with this provider to enable announcement functionality.
 */
export const AnnouncementProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unacknowledgedAnnouncements, setUnacknowledgedAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const refreshIntervalRef = useRef(null);

  /**
   * Fetch all announcements for the current user
   */
  const fetchAnnouncements = useCallback(async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getAnnouncements();
      setAnnouncements(data.announcements || []);
      setUnreadCount(data.unreadCount || 0);
      setLastFetched(new Date());
    } catch (err) {
      console.error('Error fetching announcements:', err);
      if (!silent) {
        setError(err.response?.data?.error || 'Failed to fetch announcements');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [user]);

  /**
   * Fetch announcements that require acknowledgment
   */
  const fetchUnacknowledged = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getUnacknowledgedAnnouncements();
      setUnacknowledgedAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Error fetching unacknowledged announcements:', err);
    }
  }, [user]);

  /**
   * Mark an announcement as read/viewed
   */
  const markAsRead = useCallback(async (announcementId) => {
    try {
      await markAnnouncementViewed(announcementId);

      // Update local state
      setAnnouncements(prev => prev.map(a =>
        a.id === announcementId
          ? { ...a, isRead: true, userStatus: { ...a.userStatus, viewedAt: new Date() } }
          : a
      ));

      // Recalculate unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking announcement as read:', err);
      throw err;
    }
  }, []);

  /**
   * Acknowledge an announcement
   */
  const acknowledge = useCallback(async (announcementId) => {
    try {
      await acknowledgeAnnouncementAPI(announcementId);

      // Update local state
      setAnnouncements(prev => prev.map(a =>
        a.id === announcementId
          ? {
            ...a,
            isRead: true,
            isAcknowledged: true,
            userStatus: {
              ...a.userStatus,
              viewedAt: a.userStatus?.viewedAt || new Date(),
              acknowledgedAt: new Date()
            }
          }
          : a
      ));

      // Remove from unacknowledged list
      setUnacknowledgedAnnouncements(prev =>
        prev.filter(a => a.id !== announcementId)
      );
    } catch (err) {
      console.error('Error acknowledging announcement:', err);
      throw err;
    }
  }, []);

  /**
   * Dismiss an announcement
   */
  const dismiss = useCallback(async (announcementId) => {
    try {
      await dismissAnnouncementAPI(announcementId);

      // Update local state
      setAnnouncements(prev => prev.map(a =>
        a.id === announcementId
          ? {
            ...a,
            isDismissed: true,
            userStatus: { ...a.userStatus, dismissedAt: new Date() }
          }
          : a
      ));

      // Also remove from unacknowledged list (dismissed = no longer needs acknowledgment)
      setUnacknowledgedAnnouncements(prev =>
        prev.filter(a => a.id !== announcementId)
      );

      // Recalculate unread count (dismissed announcements don't count as unread)
      setUnreadCount(prev => {
        const announcement = announcements.find(a => a.id === announcementId);
        if (announcement && !announcement.isRead) {
          return Math.max(0, prev - 1);
        }
        return prev;
      });
    } catch (err) {
      console.error('Error dismissing announcement:', err);
      throw err;
    }
  }, [announcements]);

  /**
   * Refetch announcements
   */
  const refetch = useCallback(() => {
    return fetchAnnouncements(false);
  }, [fetchAnnouncements]);

  /**
   * Get active announcements (not dismissed) filtered by display mode
   */
  const getActiveByDisplayMode = useCallback((displayMode) => {
    return announcements.filter(a =>
      a.displayMode === displayMode &&
      !a.isDismissed &&
      a.status === 'published'
    );
  }, [announcements]);

  /**
   * Get banner announcements (for top/bottom banners)
   */
  const bannerAnnouncements = useMemo(() => {
    return getActiveByDisplayMode('banner');
  }, [getActiveByDisplayMode]);

  /**
   * Get modal announcements (for popups)
   */
  const modalAnnouncements = useMemo(() => {
    return getActiveByDisplayMode('modal');
  }, [getActiveByDisplayMode]);

  /**
   * Get toast announcements (for non-intrusive notifications)
   */
  const toastAnnouncements = useMemo(() => {
    return getActiveByDisplayMode('toast');
  }, [getActiveByDisplayMode]);

  /**
   * Get inline announcements (for embedding in pages)
   */
  const inlineAnnouncements = useMemo(() => {
    return getActiveByDisplayMode('inline');
  }, [getActiveByDisplayMode]);

  /**
   * Check if there are any critical announcements
   */
  const hasCriticalAnnouncements = useMemo(() => {
    return announcements.some(a =>
      a.priority === 'critical' &&
      !a.isDismissed &&
      a.status === 'published'
    );
  }, [announcements]);

  /**
   * Check if there are maintenance announcements
   */
  const hasMaintenanceAnnouncements = useMemo(() => {
    return announcements.some(a =>
      a.type === 'maintenance' &&
      !a.isDismissed &&
      a.status === 'published'
    );
  }, [announcements]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (user && !authLoading) {
      fetchAnnouncements();
      fetchUnacknowledged();
    } else if (!user) {
      // Clear state when user logs out
      setAnnouncements([]);
      setUnreadCount(0);
      setUnacknowledgedAnnouncements([]);
      setLastFetched(null);
    }
  }, [user, authLoading, fetchAnnouncements, fetchUnacknowledged]);

  // Set up periodic refresh
  useEffect(() => {
    if (user) {
      refreshIntervalRef.current = setInterval(() => {
        fetchAnnouncements(true); // Silent refresh
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, fetchAnnouncements]);

  // Refresh on visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && lastFetched) {
        const timeSinceLastFetch = Date.now() - lastFetched.getTime();
        // Refetch if more than 2 minutes have passed
        if (timeSinceLastFetch > 2 * 60 * 1000) {
          fetchAnnouncements(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, lastFetched, fetchAnnouncements]);

  // Subscribe to cache invalidation events for announcements
  // This ensures React state stays in sync when admin actions clear the cache
  useEffect(() => {
    if (!user) return;

    const announcementActions = [
      ANNOUNCEMENT_ACTIONS.CREATE,
      ANNOUNCEMENT_ACTIONS.UPDATE,
      ANNOUNCEMENT_ACTIONS.DELETE,
      ANNOUNCEMENT_ACTIONS.PUBLISH,
      ANNOUNCEMENT_ACTIONS.ARCHIVE
    ];

    return onCacheInvalidation(
      'announcement-context',
      () => {
        // Refetch announcements when cache is invalidated
        fetchAnnouncements(true);
        fetchUnacknowledged();
      },
      announcementActions
    );
  }, [user, fetchAnnouncements, fetchUnacknowledged]);

  // Memoize context value
  const value = useMemo(() => ({
    // State
    announcements,
    unreadCount,
    unacknowledgedAnnouncements,
    isLoading,
    error,

    // Filtered lists
    bannerAnnouncements,
    modalAnnouncements,
    toastAnnouncements,
    inlineAnnouncements,

    // Flags
    hasCriticalAnnouncements,
    hasMaintenanceAnnouncements,

    // Actions
    markAsRead,
    acknowledge,
    dismiss,
    refetch,
    getActiveByDisplayMode
  }), [
    announcements,
    unreadCount,
    unacknowledgedAnnouncements,
    isLoading,
    error,
    bannerAnnouncements,
    modalAnnouncements,
    toastAnnouncements,
    inlineAnnouncements,
    hasCriticalAnnouncements,
    hasMaintenanceAnnouncements,
    markAsRead,
    acknowledge,
    dismiss,
    refetch,
    getActiveByDisplayMode
  ]);

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
};

/**
 * Hook to access announcement functionality
 *
 * @returns {Object} Announcement context value
 */
export const useAnnouncements = () => {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  }
  return context;
};

export default AnnouncementContext;
