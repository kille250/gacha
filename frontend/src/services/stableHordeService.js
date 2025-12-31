/**
 * StableHorde Service - AI Image Generation via StableHorde API
 *
 * Provides methods for generating images using the crowdsourced StableHorde network.
 * Handles async generation requests, polling, cancellation, and model listing.
 *
 * @see https://stablehorde.net/api/
 */

// ===========================================
// CONFIGURATION
// ===========================================

const API_BASE = process.env.REACT_APP_STABLEHORDE_API_URL || 'https://aihorde.net/api/v2';
const API_KEY = process.env.REACT_APP_STABLEHORDE_API_KEY || '0000000000';
const CLIENT_AGENT = process.env.REACT_APP_STABLEHORDE_CLIENT_AGENT || 'GachaGame:v1.0.0:admin@example.com';

// Default polling configuration
const DEFAULT_POLLING_INTERVAL = 3000; // 3 seconds
const MAX_POLLING_ATTEMPTS = 120; // 6 minutes max wait

// ===========================================
// ERROR TYPES
// ===========================================

/**
 * StableHorde-specific error codes
 */
export const STABLEHORDE_ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  GENERATION_FAILED: 'GENERATION_FAILED',
  GENERATION_TIMEOUT: 'GENERATION_TIMEOUT',
  GENERATION_CANCELLED: 'GENERATION_CANCELLED',
  NO_WORKERS_AVAILABLE: 'NO_WORKERS_AVAILABLE',
  NSFW_BLOCKED: 'NSFW_BLOCKED',
  CONTENT_FLAGGED: 'CONTENT_FLAGGED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  FAULTED: 'FAULTED'
};

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES = {
  [STABLEHORDE_ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  [STABLEHORDE_ERROR_CODES.INVALID_API_KEY]: 'API key is invalid. Please check your configuration.',
  [STABLEHORDE_ERROR_CODES.GENERATION_FAILED]: 'Image generation failed. Please try again.',
  [STABLEHORDE_ERROR_CODES.GENERATION_TIMEOUT]: 'Generation took too long. Try with simpler parameters.',
  [STABLEHORDE_ERROR_CODES.GENERATION_CANCELLED]: 'Generation was cancelled.',
  [STABLEHORDE_ERROR_CODES.NO_WORKERS_AVAILABLE]: 'No AI workers available. Please try again later.',
  [STABLEHORDE_ERROR_CODES.NSFW_BLOCKED]: 'Content was flagged and blocked. Please adjust your prompt.',
  [STABLEHORDE_ERROR_CODES.CONTENT_FLAGGED]: 'Prompt contains flagged content. Please revise.',
  [STABLEHORDE_ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [STABLEHORDE_ERROR_CODES.INVALID_PARAMS]: 'Invalid generation parameters. Please check your settings.',
  [STABLEHORDE_ERROR_CODES.FAULTED]: 'Generation encountered an error. Please try again.'
};

/**
 * Custom error class for StableHorde errors
 */
export class StableHordeError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'StableHordeError';
    this.code = code;
    this.details = details;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    return ERROR_MESSAGES[this.code] || this.message;
  }
}

// ===========================================
// SAMPLER TYPES
// ===========================================

/**
 * Available sampler names for image generation
 */
export const SAMPLER_NAMES = [
  'k_euler',
  'k_euler_a',
  'k_heun',
  'k_dpm_2',
  'k_dpm_2_a',
  'k_dpm_fast',
  'k_dpmpp_2s_a',
  'k_dpmpp_2m',
  'k_dpmpp_sde',
  'DDIM',
  'dpmsolver'
];

/**
 * Available post-processors
 */
export const POST_PROCESSORS = [
  'GFPGAN',
  'RealESRGAN_x4plus',
  'RealESRGAN_x2plus',
  'RealESRGAN_x4plus_anime_6B',
  'NMKD_Siax',
  'strip_background',
  '4x_AnimeSharp',
  'CodeFormers'
];

/**
 * Recommended models for anime/game character art
 */
export const RECOMMENDED_MODELS = [
  'Anything Diffusion',
  'Deliberate',
  'Dreamshaper',
  'Counterfeit',
  'MeinaMix',
  'RevAnimated',
  'Pastel-Mix',
  'Abyss OrangeMix',
  'CetusMix',
  'GhostMix'
];

// ===========================================
// API HELPERS
// ===========================================

/**
 * Make an API request to StableHorde
 */
const apiRequest = async (endpoint, options = {}) => {
  const { method = 'GET', body = null, headers = {} } = options;

  const requestHeaders = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
    'Client-Agent': CLIENT_AGENT,
    ...headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : null
    });

    // Handle rate limiting
    if (response.status === 429) {
      throw new StableHordeError(
        'Rate limited by StableHorde',
        STABLEHORDE_ERROR_CODES.RATE_LIMITED,
        { retryAfter: response.headers.get('Retry-After') }
      );
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      throw new StableHordeError(
        'Invalid API key',
        STABLEHORDE_ERROR_CODES.INVALID_API_KEY
      );
    }

    const data = await response.json();

    // Check for error in response
    if (!response.ok) {
      throw new StableHordeError(
        data.message || 'API request failed',
        STABLEHORDE_ERROR_CODES.GENERATION_FAILED,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof StableHordeError) {
      throw error;
    }

    // Network or parsing error
    throw new StableHordeError(
      error.message || 'Network error',
      STABLEHORDE_ERROR_CODES.NETWORK_ERROR,
      { originalError: error.toString() }
    );
  }
};

// ===========================================
// GENERATION METHODS
// ===========================================

/**
 * Submit an async image generation request
 *
 * @param {Object} request - Generation request
 * @param {string} request.prompt - The positive prompt
 * @param {string} [request.negative_prompt] - Negative prompt
 * @param {string[]} [request.models] - Preferred models (defaults to 'any')
 * @param {Object} [request.params] - Generation parameters
 * @param {boolean} [request.nsfw=false] - Allow NSFW content
 * @param {boolean} [request.censor_nsfw=true] - Censor NSFW if detected
 * @param {boolean} [request.trusted_workers=false] - Only use trusted workers
 * @param {boolean} [request.slow_workers=true] - Allow slow workers
 * @param {boolean} [request.r2=true] - Use R2 URLs instead of base64
 * @returns {Promise<{id: string, kudos: number, message?: string}>}
 */
export const submitGeneration = async (request) => {
  const payload = {
    prompt: request.prompt,
    params: {
      sampler_name: 'k_euler_a',
      cfg_scale: 7,
      height: 512,
      width: 512,
      steps: 30,
      n: 1,
      karras: true,
      clip_skip: 2,
      ...request.params
    },
    nsfw: request.nsfw ?? false,
    censor_nsfw: request.censor_nsfw ?? true,
    trusted_workers: request.trusted_workers ?? false,
    slow_workers: request.slow_workers ?? true,
    r2: request.r2 ?? true,
    shared: request.shared ?? false
  };

  // Add optional fields
  if (request.negative_prompt) {
    payload.params.negative_prompt = request.negative_prompt;
  }

  if (request.models && request.models.length > 0) {
    payload.models = request.models;
  }

  if (request.params?.post_processing) {
    payload.params.post_processing = request.params.post_processing;
  }

  return apiRequest('/generate/async', {
    method: 'POST',
    body: payload
  });
};

/**
 * Check generation status (lightweight, no images)
 *
 * @param {string} jobId - The generation job ID
 * @returns {Promise<Object>} Status response
 */
export const checkStatus = async (jobId) => {
  return apiRequest(`/generate/check/${jobId}`);
};

/**
 * Get generation result with images (consumes the generation)
 *
 * @param {string} jobId - The generation job ID
 * @returns {Promise<Object>} Status response with generations
 */
export const getResult = async (jobId) => {
  return apiRequest(`/generate/status/${jobId}`);
};

/**
 * Cancel a pending generation
 *
 * @param {string} jobId - The generation job ID
 */
export const cancelGeneration = async (jobId) => {
  return apiRequest(`/generate/status/${jobId}`, {
    method: 'DELETE'
  });
};

/**
 * Get available models
 *
 * @param {string} [type='image'] - Model type filter
 * @returns {Promise<Array>} List of available models
 */
export const getAvailableModels = async (type = 'image') => {
  const models = await apiRequest('/status/models');

  // Filter to image models and sort by popularity
  return models
    .filter(model => model.type === type || !type)
    .sort((a, b) => b.count - a.count);
};

/**
 * Check API health
 *
 * @returns {Promise<boolean>} True if API is healthy
 */
export const healthCheck = async () => {
  try {
    await apiRequest('/status/heartbeat');
    return true;
  } catch {
    return false;
  }
};

/**
 * Get current user info (kudos balance, etc.)
 *
 * @returns {Promise<Object>} User info
 */
export const getUserInfo = async () => {
  return apiRequest('/find_user');
};

// ===========================================
// HIGH-LEVEL GENERATION WITH POLLING
// ===========================================

/**
 * Generate an image and wait for completion with progress updates
 *
 * @param {Object} request - Generation request (same as submitGeneration)
 * @param {Object} [options] - Additional options
 * @param {Function} [options.onProgress] - Callback for status updates
 * @param {AbortSignal} [options.signal] - AbortController signal for cancellation
 * @param {number} [options.pollingInterval] - Polling interval in ms
 * @param {number} [options.maxAttempts] - Max polling attempts
 * @returns {Promise<Array>} Array of generated images
 */
export const generateAndWait = async (request, options = {}) => {
  const {
    onProgress,
    signal,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    maxAttempts = MAX_POLLING_ATTEMPTS
  } = options;

  // Submit the generation request
  const submission = await submitGeneration(request);
  const jobId = submission.id;

  // Handle cancellation via AbortController
  const handleCancel = async () => {
    try {
      await cancelGeneration(jobId);
    } catch {
      // Ignore cancellation errors
    }
  };

  if (signal) {
    signal.addEventListener('abort', handleCancel);
  }

  let attempts = 0;

  try {
    // Poll for completion
    while (attempts < maxAttempts) {
      // Check if cancelled
      if (signal?.aborted) {
        throw new StableHordeError(
          'Generation cancelled',
          STABLEHORDE_ERROR_CODES.GENERATION_CANCELLED
        );
      }

      // Wait before checking
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
      attempts++;

      // Check status
      const status = await checkStatus(jobId);

      // Report progress
      if (onProgress) {
        onProgress({
          ...status,
          jobId,
          attempts,
          maxAttempts
        });
      }

      // Check for completion
      if (status.done) {
        // Fetch final result with images
        const result = await getResult(jobId);

        // Check for faults
        if (result.faulted) {
          throw new StableHordeError(
            'Generation faulted',
            STABLEHORDE_ERROR_CODES.FAULTED,
            result
          );
        }

        // Return the generations
        return result.generations || [];
      }

      // Check if generation is possible
      if (!status.is_possible) {
        throw new StableHordeError(
          'No workers can fulfill this request',
          STABLEHORDE_ERROR_CODES.NO_WORKERS_AVAILABLE,
          status
        );
      }
    }

    // Timeout reached
    await cancelGeneration(jobId);
    throw new StableHordeError(
      'Generation timeout',
      STABLEHORDE_ERROR_CODES.GENERATION_TIMEOUT
    );
  } finally {
    if (signal) {
      signal.removeEventListener('abort', handleCancel);
    }
  }
};

// ===========================================
// CHARACTER PORTRAIT GENERATION
// ===========================================

/**
 * Generate a character portrait with preset configuration
 *
 * @param {Object} characterData - Character information
 * @param {string} characterData.name - Character name
 * @param {string} characterData.series - Series/franchise name
 * @param {string} characterData.rarity - Character rarity
 * @param {Object} [characterData.traits] - Additional traits
 * @param {Object} config - Generation configuration
 * @param {Function} [onProgress] - Progress callback
 * @param {AbortSignal} [signal] - Abort signal
 * @returns {Promise<Object>} Generation result
 */
export const generateCharacterPortrait = async (
  characterData,
  config,
  onProgress,
  signal
) => {
  // Build prompt from character data and config
  const prompt = buildCharacterPrompt(characterData, config);
  const negativePrompt = buildNegativePrompt(config);

  // Get rarity-specific settings
  const raritySettings = config.rarityModifiers?.[characterData.rarity] || {};

  const request = {
    prompt,
    negative_prompt: negativePrompt,
    models: config.preferredModels || [config.defaultModel],
    params: {
      ...config.defaultParams,
      steps: raritySettings.recommendedSteps || config.defaultParams?.steps || 30,
      cfg_scale: raritySettings.recommendedCfg || config.defaultParams?.cfg_scale || 7
    },
    nsfw: false,
    censor_nsfw: true,
    r2: true
  };

  const generations = await generateAndWait(request, {
    onProgress,
    signal
  });

  return {
    images: generations,
    prompt,
    negativePrompt,
    model: generations[0]?.model,
    seed: generations[0]?.seed
  };
};

/**
 * Build a character prompt from data and template
 */
const buildCharacterPrompt = (characterData, config) => {
  const { name, series, rarity, traits = {} } = characterData;
  const rarityMod = config.rarityModifiers?.[rarity] || {};

  // Start with base template
  let prompt = config.basePromptTemplate || '';

  // Replace template variables
  prompt = prompt
    .replace(/{characterName}/g, name || 'character')
    .replace(/{series}/g, series || 'original')
    .replace(/{characterClass}/g, traits.characterClass || 'warrior')
    .replace(/{element}/g, traits.element || '')
    .replace(/{personalityTraits}/g, traits.personality || '');

  // Add rarity-specific modifiers
  if (rarityMod.promptSuffix) {
    prompt += ', ' + rarityMod.promptSuffix;
  }

  if (rarityMod.qualityBoost) {
    prompt += ', ' + rarityMod.qualityBoost;
  }

  // Add any custom style or pose
  if (traits.artStyle) {
    prompt += ', ' + traits.artStyle;
  }

  if (traits.pose) {
    prompt += ', ' + traits.pose;
  }

  // Clean up prompt
  prompt = prompt
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();

  return prompt;
};

/**
 * Build negative prompt from config
 */
const buildNegativePrompt = (config) => {
  let negative = config.negativePromptTemplate || '';

  // Clean up
  negative = negative
    .replace(/\s+/g, ' ')
    .trim();

  return negative;
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Validate generation parameters
 *
 * @param {Object} params - Generation parameters to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateParams = (params) => {
  const errors = [];

  // Dimension validation (must be 64-3072, divisible by 64)
  if (params.width) {
    if (params.width < 64 || params.width > 3072) {
      errors.push('Width must be between 64 and 3072');
    }
    if (params.width % 64 !== 0) {
      errors.push('Width must be divisible by 64');
    }
  }

  if (params.height) {
    if (params.height < 64 || params.height > 3072) {
      errors.push('Height must be between 64 and 3072');
    }
    if (params.height % 64 !== 0) {
      errors.push('Height must be divisible by 64');
    }
  }

  // Steps validation (1-500)
  if (params.steps) {
    if (params.steps < 1 || params.steps > 500) {
      errors.push('Steps must be between 1 and 500');
    }
  }

  // CFG scale validation (1-30)
  if (params.cfg_scale) {
    if (params.cfg_scale < 1 || params.cfg_scale > 30) {
      errors.push('CFG scale must be between 1 and 30');
    }
  }

  // Clip skip validation (1-12)
  if (params.clip_skip) {
    if (params.clip_skip < 1 || params.clip_skip > 12) {
      errors.push('CLIP skip must be between 1 and 12');
    }
  }

  // Sampler validation
  if (params.sampler_name && !SAMPLER_NAMES.includes(params.sampler_name)) {
    errors.push('Invalid sampler name');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format wait time for display
 *
 * @param {number} seconds - Wait time in seconds
 * @returns {string} Formatted time string
 */
export const formatWaitTime = (seconds) => {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Estimate kudos cost for a generation
 *
 * @param {Object} params - Generation parameters
 * @returns {number} Estimated kudos cost
 */
export const estimateKudosCost = (params) => {
  const baseKudos = 10;
  const width = params.width || 512;
  const height = params.height || 512;
  const steps = params.steps || 30;
  const n = params.n || 1;

  // Simple estimation formula
  const pixelFactor = (width * height) / (512 * 512);
  const stepFactor = steps / 30;

  return Math.ceil(baseKudos * pixelFactor * stepFactor * n);
};

// ===========================================
// SERVICE EXPORT
// ===========================================

const stableHordeService = {
  // Core API methods
  submitGeneration,
  checkStatus,
  getResult,
  cancelGeneration,
  getAvailableModels,
  healthCheck,
  getUserInfo,

  // High-level methods
  generateAndWait,
  generateCharacterPortrait,

  // Utilities
  validateParams,
  formatWaitTime,
  estimateKudosCost,

  // Constants
  SAMPLER_NAMES,
  POST_PROCESSORS,
  RECOMMENDED_MODELS,
  ERROR_CODES: STABLEHORDE_ERROR_CODES,
  ERROR_MESSAGES
};

export default stableHordeService;
