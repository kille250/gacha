const js = require('@eslint/js');

/**
 * Custom rule to prevent emoji usage in code.
 * Allows emojis in:
 * - Files with documented EMOJI USAGE NOTICE headers (fishing config, etc.)
 * - Comments
 */
const noEmojisRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow emoji characters in code (use icon constants instead)',
      category: 'Stylistic Issues'
    },
    messages: {
      noEmoji: 'Avoid using emojis directly. Import from constants/icons.js instead.'
    }
  },
  create(context) {
    // Emoji regex covering most common ranges
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

    // Files with documented intentional emoji usage (game data)
    // Note: Only files with user-facing emotes (chat, reactions) should be here
    const allowedFiles = [
      'config/fishing.js',
      'config/fishing/prestige.js',
      'config/fishing/validator.js',
      'routes/fishingMultiplayer.js',  // Chat emotes
      'routes/fishing/prestige.js'
    ];

    const filename = context.getFilename();
    const isAllowed = allowedFiles.some(f => filename.includes(f.replace(/\//g, require('path').sep)));

    if (isAllowed) return {};

    return {
      Literal(node) {
        if (typeof node.value === 'string' && emojiRegex.test(node.value)) {
          context.report({ node, messageId: 'noEmoji' });
        }
      },
      TemplateElement(node) {
        if (node.value && emojiRegex.test(node.value.raw)) {
          context.report({ node, messageId: 'noEmoji' });
        }
      }
    };
  }
};

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        // Node.js 18+ globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        it: 'readonly'
      }
    },
    plugins: {
      'custom': {
        rules: {
          'no-emojis': noEmojisRule
        }
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'custom/no-emojis': 'error'
    }
  },
  {
    ignores: ['node_modules/**']
  }
];

