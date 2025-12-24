/**
 * AriaLiveRegion - Accessible live region for screen reader announcements
 *
 * Features:
 * - Polite announcements for status updates
 * - Assertive announcements for errors
 * - Visually hidden but screen reader accessible
 */
import React, { memo, useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

const AriaLiveRegion = memo(({
  message,
  type = 'polite', // 'polite' | 'assertive'
  clearAfter = 5000,
}) => {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (message) {
      // Clear then set to ensure screen readers detect the change
      setAnnouncement('');

      // Small delay to ensure the empty state registers
      requestAnimationFrame(() => {
        setAnnouncement(message);
      });

      // Auto-clear after specified time
      if (clearAfter > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setAnnouncement('');
        }, clearAfter);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <LiveRegion
      role="status"
      aria-live={type}
      aria-atomic="true"
    >
      {announcement}
    </LiveRegion>
  );
});

AriaLiveRegion.displayName = 'AriaLiveRegion';

const LiveRegion = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export default AriaLiveRegion;
