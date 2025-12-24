/**
 * Frontend ESLint Configuration
 *
 * Extends create-react-app's config and adds custom no-emojis rule.
 *
 * ============================================================================
 * NO-EMOJIS RULE
 * ============================================================================
 * This config includes a custom rule to prevent emoji usage in code.
 * Emojis should be centralized in constants/icons.js and imported from there.
 *
 * Allowed files:
 * - src/constants/icons.js (centralized icon definitions)
 *
 * All other files should import from icons.js instead of using raw emojis.
 * ============================================================================
 */

module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Custom no-emojis rule implemented via no-restricted-syntax
    // This catches actual emoji characters (colorful pictographs) but allows:
    // - U+2600-U+26FF (miscellaneous symbols like ★, ☆, ♦)
    // - U+2700-U+27BF (dingbats like ✓, ✕, ✦)
    // Only flags the main emoji ranges (1F300-1F9FF) which are colorful pictographs
    'no-restricted-syntax': [
      'warn',
      {
        // Match string literals containing emoji characters (pictographs only)
        selector: 'Literal[value=/[\\u{1F300}-\\u{1F9FF}]/u]',
        message: 'Avoid using emojis directly in code. Import from constants/icons.js instead.'
      },
      {
        // Match template literals containing emoji characters (pictographs only)
        selector: 'TemplateElement[value.raw=/[\\u{1F300}-\\u{1F9FF}]/u]',
        message: 'Avoid using emojis directly in code. Import from constants/icons.js instead.'
      }
    ]
  },
  overrides: [
    {
      // Allow emojis in the centralized icons file
      files: ['src/constants/icons.js'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    },
    {
      // Allow emojis in fishing components (fish/rarity emojis are game data from backend)
      files: [
        'src/components/Fishing/**/*.js',
        'src/hooks/useFishingNotifications.js'
      ],
      rules: {
        'no-restricted-syntax': 'off'
      }
    }
  ]
};
