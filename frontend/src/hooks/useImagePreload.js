/**
 * useImagePreload - Hook for preloading images to prevent layout shift
 *
 * Preloads an image and returns loading state, allowing components to
 * defer showing the image until it's fully loaded, preventing CLS.
 *
 * @param {string} src - Image source URL
 * @returns {{ loaded: boolean, error: boolean }} Loading state
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Preload a single image
 * @param {string} src - Image URL to preload
 * @returns {{ loaded: boolean, error: boolean }}
 */
export const useImagePreload = (src) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      setError(false);
      return;
    }

    // Reset state when src changes
    setLoaded(false);
    setError(false);

    const img = new Image();
    imgRef.current = img;

    img.onload = () => {
      setLoaded(true);
      setError(false);
    };

    img.onerror = () => {
      setLoaded(true); // Consider loaded even on error to stop showing loading state
      setError(true);
    };

    img.src = src;

    return () => {
      // Cleanup: abort pending load by clearing src
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
        imgRef.current = null;
      }
    };
  }, [src]);

  return { loaded, error };
};

/**
 * Preload multiple images
 * @param {string[]} sources - Array of image URLs
 * @returns {{ loaded: boolean, progress: number, errors: string[] }}
 */
export const useImagesPreload = (sources = []) => {
  const [loadedCount, setLoadedCount] = useState(0);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!sources.length) {
      setLoadedCount(0);
      setErrors([]);
      return;
    }

    setLoadedCount(0);
    setErrors([]);

    const loadedSources = new Set();
    const errorSources = [];

    sources.forEach((src) => {
      if (!src) {
        setLoadedCount((prev) => prev + 1);
        return;
      }

      const img = new Image();

      img.onload = () => {
        if (!loadedSources.has(src)) {
          loadedSources.add(src);
          setLoadedCount((prev) => prev + 1);
        }
      };

      img.onerror = () => {
        if (!loadedSources.has(src)) {
          loadedSources.add(src);
          errorSources.push(src);
          setErrors([...errorSources]);
          setLoadedCount((prev) => prev + 1);
        }
      };

      img.src = src;
    });
  }, [sources.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loaded: loadedCount >= sources.length,
    progress: sources.length ? loadedCount / sources.length : 1,
    errors,
  };
};

export default useImagePreload;
