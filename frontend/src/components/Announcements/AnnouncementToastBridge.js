/**
 * AnnouncementToastBridge - Bridges toast announcements to ToastContext
 *
 * This component watches for announcements with displayMode='toast'
 * and shows them using the app's toast notification system.
 *
 * Features:
 * - Auto-shows new toast announcements
 * - Tracks shown toasts to prevent duplicates
 * - Marks announcements as read after showing
 */

import { useEffect, useRef } from 'react';
import { useAnnouncements } from '../../context/AnnouncementContext';
import { useToast } from '../../context/ToastContext';

/**
 * Map announcement type to toast variant
 */
const TYPE_TO_VARIANT = {
  maintenance: 'warning',
  update: 'success',
  event: 'info',
  patch_notes: 'info',
  promotion: 'info',
  warning: 'warning',
  info: 'info'
};

/**
 * Map announcement priority to toast variant (overrides type for critical)
 */
const getVariant = (announcement) => {
  if (announcement.priority === 'critical') {
    return 'error';
  }
  return TYPE_TO_VARIANT[announcement.type] || 'info';
};

const AnnouncementToastBridge = () => {
  const { toastAnnouncements, markAsRead } = useAnnouncements();
  const { showToast } = useToast();
  // Track which announcements we've already shown as toasts
  const shownToastIds = useRef(new Set());

  useEffect(() => {
    // Show any new toast announcements that we haven't shown yet
    toastAnnouncements.forEach(announcement => {
      if (!shownToastIds.current.has(announcement.id) && !announcement.isRead) {
        shownToastIds.current.add(announcement.id);

        // Show the toast
        showToast({
          variant: getVariant(announcement),
          title: announcement.title,
          description: announcement.content.length > 100
            ? announcement.content.substring(0, 100) + '...'
            : announcement.content,
          duration: announcement.priority === 'critical' ? 0 : 6000 // Critical stays until dismissed
        });

        // Mark as read after showing
        markAsRead(announcement.id).catch(err => {
          console.error('Failed to mark toast announcement as read:', err);
        });
      }
    });
  }, [toastAnnouncements, showToast, markAsRead]);

  // This component doesn't render anything
  return null;
};

export default AnnouncementToastBridge;
