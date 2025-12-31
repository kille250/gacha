/**
 * useImageGeneration - React hook for AI image generation via StableHorde
 *
 * Provides state management for image generation including:
 * - Generation progress tracking
 * - Cancellation support
 * - Result handling
 * - Error management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import stableHordeService, {
  StableHordeError,
  STABLEHORDE_ERROR_CODES
} from '../services/stableHordeService';
import { CHARACTER_GENERATION_CONFIG, buildPromptFromSelections, getParamsForRarity } from '../config/characterPrompts.config';

// ===========================================
// GENERATION STATUS
// ===========================================

export const GENERATION_STATUS = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// ===========================================
// HOOK IMPLEMENTATION
// ===========================================

/**
 * Hook for managing AI image generation
 *
 * @returns {Object} Generation state and controls
 */
export const useImageGeneration = () => {
  // Generation state
  const [status, setStatus] = useState(GENERATION_STATUS.IDLE);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);

  // Abort controller ref for cancellation
  const abortControllerRef = useRef(null);

  // Generation history (stores recent generations)
  const [history, setHistory] = useState([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Handle progress updates during generation
   */
  const handleProgress = useCallback((progressData) => {
    setProgress({
      queuePosition: progressData.queue_position,
      waitTime: progressData.wait_time,
      processing: progressData.processing,
      finished: progressData.finished,
      waiting: progressData.waiting,
      isPossible: progressData.is_possible,
      jobId: progressData.jobId,
      attempts: progressData.attempts,
      maxAttempts: progressData.maxAttempts
    });

    // Update status based on progress
    if (progressData.processing > 0) {
      setStatus(GENERATION_STATUS.PROCESSING);
    } else if (progressData.queue_position > 0) {
      setStatus(GENERATION_STATUS.QUEUED);
    }
  }, []);

  /**
   * Generate an image with custom request parameters
   *
   * @param {Object} request - Generation request
   * @param {string} request.prompt - The prompt
   * @param {string} [request.negative_prompt] - Negative prompt
   * @param {string[]} [request.models] - Preferred models
   * @param {Object} [request.params] - Generation params
   * @returns {Promise<Array>} Generated images
   */
  const generate = useCallback(async (request) => {
    // Reset state
    setStatus(GENERATION_STATUS.SUBMITTING);
    setProgress(null);
    setResult(null);
    setError(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const generations = await stableHordeService.generateAndWait(
        request,
        {
          onProgress: handleProgress,
          signal: abortControllerRef.current.signal
        }
      );

      // Store result
      const generationResult = {
        images: generations,
        prompt: request.prompt,
        negativePrompt: request.negative_prompt,
        model: generations[0]?.model,
        seed: generations[0]?.seed,
        timestamp: new Date().toISOString()
      };

      setResult(generationResult);
      setStatus(GENERATION_STATUS.COMPLETED);

      // Add to history
      setHistory(prev => [generationResult, ...prev].slice(0, 10));

      return generations;
    } catch (err) {
      if (err.code === STABLEHORDE_ERROR_CODES.GENERATION_CANCELLED) {
        setStatus(GENERATION_STATUS.CANCELLED);
        setError({ message: 'Generation cancelled', code: err.code });
      } else {
        setStatus(GENERATION_STATUS.FAILED);
        setError({
          message: err instanceof StableHordeError ? err.getUserMessage() : err.message,
          code: err.code || 'UNKNOWN',
          details: err.details
        });
      }
      throw err;
    } finally {
      abortControllerRef.current = null;
    }
  }, [handleProgress]);

  /**
   * Generate a character portrait using presets
   *
   * @param {Object} options - Character and style options
   * @param {string} options.characterName - Character name
   * @param {string} options.characterClass - Class/type
   * @param {string} options.rarity - Rarity level
   * @param {string} [options.artStyle='anime'] - Art style
   * @param {string} [options.pose='portrait'] - Pose
   * @param {string} [options.background='simple'] - Background
   * @param {string} [options.element='none'] - Element theme
   * @param {string} [options.customPrompt] - Additional prompt text
   * @param {string[]} [options.models] - Preferred models
   * @returns {Promise<Array>} Generated images
   */
  const generateCharacter = useCallback(async (options) => {
    const {
      characterName,
      characterClass,
      rarity = 'common',
      artStyle = 'anime',
      pose = 'portrait',
      background = 'simple',
      element = 'none',
      customPrompt = '',
      models = CHARACTER_GENERATION_CONFIG.preferredModels
    } = options;

    // Build prompt from selections
    const prompt = buildPromptFromSelections({
      characterName,
      characterClass,
      rarity,
      artStyle,
      pose,
      background,
      element,
      customPrompt
    });

    // Get params for rarity
    const imageType = pose === 'fullBody' ? 'fullBody' : pose === 'portrait' ? 'portrait' : 'portrait';
    const params = getParamsForRarity(rarity, imageType);

    // Build request
    const request = {
      prompt,
      negative_prompt: CHARACTER_GENERATION_CONFIG.negativePromptTemplate,
      models,
      params
    };

    return generate(request);
  }, [generate]);

  /**
   * Cancel the current generation
   */
  const cancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (jobId) {
      try {
        await stableHordeService.cancelGeneration(jobId);
      } catch {
        // Ignore cancellation errors
      }
    }

    setStatus(GENERATION_STATUS.CANCELLED);
  }, [jobId]);

  /**
   * Reset state to idle
   */
  const reset = useCallback(() => {
    setStatus(GENERATION_STATUS.IDLE);
    setProgress(null);
    setResult(null);
    setError(null);
    setJobId(null);
  }, []);

  /**
   * Clear generation history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Computed values
  const isGenerating = status === GENERATION_STATUS.SUBMITTING ||
    status === GENERATION_STATUS.QUEUED ||
    status === GENERATION_STATUS.PROCESSING;

  const estimatedWaitTime = progress?.waitTime
    ? stableHordeService.formatWaitTime(progress.waitTime)
    : null;

  return {
    // State
    status,
    progress,
    result,
    error,
    history,

    // Computed
    isGenerating,
    estimatedWaitTime,
    queuePosition: progress?.queuePosition,

    // Actions
    generate,
    generateCharacter,
    cancel,
    reset,
    clearHistory
  };
};

// ===========================================
// AVAILABLE MODELS HOOK
// ===========================================

/**
 * Hook for fetching and caching available StableHorde models
 *
 * @returns {Object} Models state and refresh function
 */
export const useAvailableModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchModels = useCallback(async (force = false) => {
    // Skip if recently fetched (cache for 5 minutes)
    if (!force && lastFetch && Date.now() - lastFetch < 5 * 60 * 1000) {
      return models;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedModels = await stableHordeService.getAvailableModels();
      setModels(fetchedModels);
      setLastFetch(Date.now());
      return fetchedModels;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [lastFetch, models]);

  // Fetch on mount
  useEffect(() => {
    fetchModels();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Get recommended models (filter available by recommended list)
  const recommendedModels = models.filter(model =>
    stableHordeService.RECOMMENDED_MODELS.includes(model.name)
  );

  return {
    models,
    recommendedModels,
    loading,
    error,
    refresh: () => fetchModels(true)
  };
};

// ===========================================
// API HEALTH HOOK
// ===========================================

/**
 * Hook for checking StableHorde API health
 *
 * @returns {Object} Health status
 */
export const useStableHordeHealth = () => {
  const [isHealthy, setIsHealthy] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const healthy = await stableHordeService.healthCheck();
      setIsHealthy(healthy);
      return healthy;
    } catch {
      setIsHealthy(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    isHealthy,
    checking,
    checkHealth
  };
};

// ===========================================
// USER INFO HOOK
// ===========================================

/**
 * Hook for fetching StableHorde user info (kudos balance)
 *
 * @returns {Object} User info state
 */
export const useStableHordeUser = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const info = await stableHordeService.getUserInfo();
      setUserInfo(info);
      return info;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    userInfo,
    loading,
    error,
    kudos: userInfo?.kudos || 0,
    refresh: fetchUserInfo
  };
};

export default useImageGeneration;
