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
    // Custom no-emojis rule - enforces React Icons usage
    // This catches emoji characters and Unicode symbols that should use React Icons:
    // - U+1F300-U+1FAFF (emoji pictographs)
    // - U+2600-U+26FF (miscellaneous symbols like stars, checkmarks)
    // - U+2700-U+27BF (dingbats like checkmarks, arrows)
    'no-restricted-syntax': [
      'error',
      {
        // Match string literals containing emoji/symbol characters
        selector: 'Literal[value=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/u]',
        message: 'Emojis are not allowed. Use React Icons from the icons utility instead.'
      },
      {
        // Match template literals containing emoji/symbol characters
        selector: 'TemplateElement[value.raw=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/u]',
        message: 'Emojis are not allowed. Use React Icons from the icons utility instead.'
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
    }
  ]
};
