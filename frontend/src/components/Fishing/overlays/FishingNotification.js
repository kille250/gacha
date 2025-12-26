/**
 * FishingNotification Component
 * 
 * Extracted from FishingPage.js - Notification toast display.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';

import { Notification } from '../Fishing.styles';

/**
 * FishingNotification component
 * @param {Object} props
 * @param {Object|null} props.notification - Notification object { message, type } or null
 */
export const FishingNotification = ({ notification }) => {
  return (
    <AnimatePresence>
      {notification && (
        <Notification
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          $type={notification.type}
        >
          {notification.message}
        </Notification>
      )}
    </AnimatePresence>
  );
};

export default FishingNotification;

