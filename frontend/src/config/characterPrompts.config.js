/**
 * Character Image Generation Configuration
 *
 * Defines prompt templates, rarity modifiers, and default parameters
 * for generating character portraits via StableHorde.
 */

// ===========================================
// PROMPT TEMPLATES
// ===========================================

/**
 * Base prompt template for character portraits
 * Variables: {characterName}, {series}, {characterClass}, {element}, {personalityTraits}
 */
export const BASE_PROMPT_TEMPLATE = `{characterName}, {characterClass} character, {element} elemental theme, {personalityTraits}, game character portrait, detailed anime style, high quality, sharp focus, professional artwork, beautiful lighting, intricate details`;

/**
 * Default negative prompt to exclude unwanted elements
 */
export const NEGATIVE_PROMPT_TEMPLATE = `bad anatomy, bad hands, missing fingers, extra fingers, fused fingers, too many fingers, mutated hands, malformed limbs, extra limbs, missing limbs, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation, lowres, bad quality, low quality, worst quality, jpeg artifacts, watermark, signature, text, logo, cropped, out of frame, deformed, disfigured, duplicate, error, extra digits, fewer digits, gross proportions, long neck, poorly drawn face, poorly drawn hands, username`;

// ===========================================
// ART STYLE PRESETS
// ===========================================

/**
 * Available art styles for character generation
 */
export const ART_STYLES = {
  anime: {
    label: 'Anime',
    suffix: 'anime style, cel shaded, vibrant colors, clean lineart',
    recommendedModels: ['Anything Diffusion', 'Counterfeit', 'MeinaMix']
  },
  realistic: {
    label: 'Semi-Realistic',
    suffix: 'semi-realistic, detailed rendering, soft lighting, photorealistic elements',
    recommendedModels: ['Deliberate', 'Dreamshaper', 'RevAnimated']
  },
  chibi: {
    label: 'Chibi',
    suffix: 'chibi style, cute, big head, small body, kawaii, adorable',
    recommendedModels: ['Pastel-Mix', 'Anything Diffusion']
  },
  painterly: {
    label: 'Painterly',
    suffix: 'painterly style, oil painting, artistic brushstrokes, classical art',
    recommendedModels: ['Deliberate', 'Dreamshaper']
  },
  pixelArt: {
    label: 'Pixel Art',
    suffix: 'pixel art, 16-bit style, retro game aesthetic, limited color palette',
    recommendedModels: ['Anything Diffusion']
  },
  watercolor: {
    label: 'Watercolor',
    suffix: 'watercolor style, soft colors, flowing, artistic, delicate',
    recommendedModels: ['Pastel-Mix', 'Dreamshaper']
  }
};

// ===========================================
// POSE PRESETS
// ===========================================

/**
 * Available pose options for character portraits
 */
export const POSE_PRESETS = {
  portrait: {
    label: 'Portrait',
    suffix: 'portrait, face focus, head and shoulders, looking at viewer'
  },
  upperBody: {
    label: 'Upper Body',
    suffix: 'upper body, waist up, dynamic pose, confident stance'
  },
  fullBody: {
    label: 'Full Body',
    suffix: 'full body, standing pose, dynamic stance, showing outfit'
  },
  action: {
    label: 'Action Pose',
    suffix: 'action pose, dynamic movement, battle stance, dramatic angle'
  },
  sitting: {
    label: 'Sitting',
    suffix: 'sitting, relaxed pose, casual, comfortable'
  },
  thinking: {
    label: 'Thinking',
    suffix: 'thinking pose, contemplative, hand on chin, thoughtful expression'
  }
};

// ===========================================
// BACKGROUND PRESETS
// ===========================================

/**
 * Available background options
 */
export const BACKGROUND_PRESETS = {
  simple: {
    label: 'Simple Gradient',
    suffix: 'simple gradient background, clean, minimalist'
  },
  abstract: {
    label: 'Abstract',
    suffix: 'abstract background, colorful, geometric shapes, artistic'
  },
  nature: {
    label: 'Nature',
    suffix: 'nature background, outdoor, trees, sky, scenic'
  },
  urban: {
    label: 'Urban',
    suffix: 'urban background, city, buildings, modern environment'
  },
  fantasy: {
    label: 'Fantasy',
    suffix: 'fantasy background, magical, ethereal, mystical environment'
  },
  transparent: {
    label: 'Plain/Transparent',
    suffix: 'plain background, solid color, clean'
  }
};

// ===========================================
// ELEMENT THEMES
// ===========================================

/**
 * Elemental theme modifiers
 */
export const ELEMENT_THEMES = {
  fire: {
    label: 'Fire',
    suffix: 'fire theme, flames, warm colors, orange and red, burning aura'
  },
  water: {
    label: 'Water',
    suffix: 'water theme, aquatic, blue colors, flowing water, ocean vibes'
  },
  earth: {
    label: 'Earth',
    suffix: 'earth theme, nature, green and brown, plants, grounded'
  },
  wind: {
    label: 'Wind',
    suffix: 'wind theme, airy, flowing hair and clothes, light colors, breezy'
  },
  lightning: {
    label: 'Lightning',
    suffix: 'lightning theme, electric, yellow and purple, sparks, energy'
  },
  ice: {
    label: 'Ice',
    suffix: 'ice theme, frozen, blue and white, crystals, cold aura'
  },
  light: {
    label: 'Light',
    suffix: 'light theme, radiant, golden, holy, divine glow'
  },
  dark: {
    label: 'Dark',
    suffix: 'dark theme, shadows, purple and black, mysterious aura'
  },
  none: {
    label: 'None',
    suffix: ''
  }
};

// ===========================================
// RARITY MODIFIERS
// ===========================================

/**
 * Rarity-specific prompt modifiers and generation settings
 * These enhance the visual quality based on character rarity
 */
export const RARITY_MODIFIERS = {
  common: {
    promptSuffix: 'simple design, basic outfit, clean appearance',
    qualityBoost: '',
    recommendedSteps: 25,
    recommendedCfg: 7
  },
  uncommon: {
    promptSuffix: 'detailed design, quality outfit, nice accessories',
    qualityBoost: 'good quality',
    recommendedSteps: 30,
    recommendedCfg: 7
  },
  rare: {
    promptSuffix: 'intricate design, ornate details, subtle glowing effects, quality craftsmanship',
    qualityBoost: 'high quality, detailed',
    recommendedSteps: 35,
    recommendedCfg: 7.5
  },
  epic: {
    promptSuffix: 'elaborate design, magical aura, particle effects, ethereal glow, impressive presence',
    qualityBoost: 'masterpiece, best quality, highly detailed',
    recommendedSteps: 40,
    recommendedCfg: 8
  },
  legendary: {
    promptSuffix: 'legendary design, divine aura, cosmic effects, transcendent presence, ultimate power, breathtaking',
    qualityBoost: 'masterpiece, best quality, extremely detailed, award winning, perfect composition, stunning',
    recommendedSteps: 50,
    recommendedCfg: 8.5
  }
};

// ===========================================
// DEFAULT PARAMETERS
// ===========================================

/**
 * Default generation parameters
 */
export const DEFAULT_PARAMS = {
  width: 512,
  height: 768, // Portrait aspect ratio
  steps: 30,
  cfg_scale: 7,
  sampler_name: 'k_euler_a',
  clip_skip: 2,
  karras: true
};

/**
 * Portrait-specific parameters (512x768)
 */
export const PORTRAIT_PARAMS = {
  ...DEFAULT_PARAMS,
  width: 512,
  height: 768
};

/**
 * Square icon parameters (512x512)
 */
export const ICON_PARAMS = {
  ...DEFAULT_PARAMS,
  width: 512,
  height: 512
};

/**
 * Full body parameters (512x896)
 */
export const FULL_BODY_PARAMS = {
  ...DEFAULT_PARAMS,
  width: 512,
  height: 896
};

// ===========================================
// RECOMMENDED MODELS
// ===========================================

/**
 * Recommended models for different purposes
 */
export const MODEL_RECOMMENDATIONS = {
  // Best for anime-style characters
  anime: [
    'Anything Diffusion',
    'Counterfeit',
    'MeinaMix',
    'Abyss OrangeMix',
    'CetusMix'
  ],
  // Best for semi-realistic or detailed art
  realistic: [
    'Deliberate',
    'Dreamshaper',
    'RevAnimated',
    'GhostMix'
  ],
  // Best for cute/chibi style
  cute: [
    'Pastel-Mix',
    'MeinaMix',
    'Anything Diffusion'
  ],
  // General purpose (good for most styles)
  general: [
    'Anything Diffusion',
    'Dreamshaper',
    'Deliberate'
  ]
};

/**
 * Default model to use when none specified
 */
export const DEFAULT_MODEL = 'Anything Diffusion';

// ===========================================
// FULL CONFIGURATION OBJECT
// ===========================================

/**
 * Complete character generation configuration
 */
export const CHARACTER_GENERATION_CONFIG = {
  basePromptTemplate: BASE_PROMPT_TEMPLATE,
  negativePromptTemplate: NEGATIVE_PROMPT_TEMPLATE,
  defaultModel: DEFAULT_MODEL,
  defaultParams: DEFAULT_PARAMS,
  rarityModifiers: RARITY_MODIFIERS,
  artStyles: ART_STYLES,
  posePresets: POSE_PRESETS,
  backgroundPresets: BACKGROUND_PRESETS,
  elementThemes: ELEMENT_THEMES,
  modelRecommendations: MODEL_RECOMMENDATIONS,
  preferredModels: MODEL_RECOMMENDATIONS.general
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Build a complete prompt from selections
 *
 * @param {Object} options - Prompt building options
 * @param {string} options.characterName - Character name
 * @param {string} options.characterClass - Character class/type
 * @param {string} options.element - Element theme key
 * @param {string} options.artStyle - Art style key
 * @param {string} options.pose - Pose preset key
 * @param {string} options.background - Background preset key
 * @param {string} options.rarity - Character rarity
 * @param {string} options.customPrompt - Additional custom prompt text
 * @returns {string} Complete prompt
 */
export const buildPromptFromSelections = (options) => {
  const parts = [];

  // Character basics
  if (options.characterName) {
    parts.push(options.characterName);
  }

  if (options.characterClass) {
    parts.push(`${options.characterClass} character`);
  }

  // Art style
  const artStyle = ART_STYLES[options.artStyle];
  if (artStyle?.suffix) {
    parts.push(artStyle.suffix);
  }

  // Element theme
  const element = ELEMENT_THEMES[options.element];
  if (element?.suffix) {
    parts.push(element.suffix);
  }

  // Pose
  const pose = POSE_PRESETS[options.pose];
  if (pose?.suffix) {
    parts.push(pose.suffix);
  }

  // Background
  const background = BACKGROUND_PRESETS[options.background];
  if (background?.suffix) {
    parts.push(background.suffix);
  }

  // Rarity modifiers
  const rarity = RARITY_MODIFIERS[options.rarity];
  if (rarity?.promptSuffix) {
    parts.push(rarity.promptSuffix);
  }
  if (rarity?.qualityBoost) {
    parts.push(rarity.qualityBoost);
  }

  // Custom additions
  if (options.customPrompt) {
    parts.push(options.customPrompt);
  }

  // Base quality tags
  parts.push('high quality', 'detailed', 'professional artwork');

  return parts.filter(Boolean).join(', ');
};

/**
 * Get recommended models for a rarity
 *
 * @param {string} rarity - Character rarity
 * @param {string} artStyle - Preferred art style
 * @returns {string[]} Recommended model names
 */
export const getModelsForRarity = (rarity, artStyle = 'anime') => {
  // Higher rarities might want more capable/popular models
  const styleModels = MODEL_RECOMMENDATIONS[artStyle] || MODEL_RECOMMENDATIONS.general;

  // For legendary/epic, prioritize the best models
  if (rarity === 'legendary' || rarity === 'epic') {
    return styleModels.slice(0, 2);
  }

  return styleModels;
};

/**
 * Get generation params for a rarity
 *
 * @param {string} rarity - Character rarity
 * @param {string} imageType - 'portrait', 'icon', or 'fullBody'
 * @returns {Object} Generation parameters
 */
export const getParamsForRarity = (rarity, imageType = 'portrait') => {
  const baseParams = imageType === 'icon' ? ICON_PARAMS
    : imageType === 'fullBody' ? FULL_BODY_PARAMS
    : PORTRAIT_PARAMS;

  const rarityMod = RARITY_MODIFIERS[rarity] || RARITY_MODIFIERS.common;

  return {
    ...baseParams,
    steps: rarityMod.recommendedSteps,
    cfg_scale: rarityMod.recommendedCfg
  };
};

export default CHARACTER_GENERATION_CONFIG;
