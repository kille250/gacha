/**
 * Frontend ESLint Configuration (ESLint v9 flat config format)
 *
 * Basic config for React projects with custom no-emojis rule.
 */

import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        // React globals
        React: 'readonly',
        JSX: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooks
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // Relax some rules for React apps
      // varsIgnorePattern includes capitalized names (React components/styled-components)
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^[A-Z]',
        ignoreRestSiblings: true
      }],
      'no-console': 'off',

      // React rules - detect JSX usage
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Custom no-emojis rule
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/[\\u{1F300}-\\u{1F9FF}]/u]',
          message: 'Avoid using emojis directly in code. Import from constants/icons.js instead.'
        },
        {
          selector: 'TemplateElement[value.raw=/[\\u{1F300}-\\u{1F9FF}]/u]',
          message: 'Avoid using emojis directly in code. Import from constants/icons.js instead.'
        }
      ]
    }
  },
  {
    // Allow emojis in the centralized icons file
    files: ['src/constants/icons.js'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Allow emojis in fishing components
    files: [
      'src/components/Fishing/**/*.js',
      'src/hooks/useFishingNotifications.js'
    ],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Ignore build outputs and dependencies
    ignores: ['build/**', 'node_modules/**', 'coverage/**']
  }
];
