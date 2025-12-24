/**
 * useVideoVisibility - Intersection observer for video playback optimization
 *
 * Automatically pauses videos when they go off-screen and resumes when visible.
 * Improves performance by reducing unnecessary video rendering.
 *
 * @example
 * const videoRef = useRef(null);
 * useVideoVisibility(videoRef);
 * return <video ref={videoRef} src="..." muted loop />;
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to manage video playback based on visibility
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Ref to the video element
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Visibility threshold (0-1), default 0.5
 * @param {boolean} options.disabled - Disable the observer
 */
export function useVideoVisibility(videoRef, options = {}) {
  const { threshold = 0.5, disabled = false } = options;
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (disabled || !videoRef.current) return;

    const video = videoRef.current;

    // Check if browser supports IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Video is visible - resume if it was playing before
          if (wasPlayingRef.current || video.autoplay) {
            video.play().catch(() => {
              // Autoplay might be blocked - ignore
            });
          }
        } else {
          // Video is hidden - pause and remember state
          wasPlayingRef.current = !video.paused;
          video.pause();
        }
      },
      {
        threshold,
        rootMargin: '50px', // Start loading slightly before visible
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [videoRef, threshold, disabled]);
}

/**
 * Hook to lazy load video source when visible
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Ref to the video element
 * @param {string} src - Video source URL
 * @param {Object} options - Configuration options
 * @returns {boolean} Whether the video should be loaded
 */
export function useLazyVideo(videoRef, src, options = {}) {
  const { rootMargin = '200px' } = options;
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!videoRef.current || loadedRef.current || !src) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately
      videoRef.current.src = src;
      loadedRef.current = true;
      return;
    }

    const video = videoRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadedRef.current) {
          video.src = src;
          loadedRef.current = true;
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [videoRef, src, rootMargin]);

  return loadedRef.current;
}

export default useVideoVisibility;
