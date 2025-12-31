/**
 * Frontend ESLint Configuration (ESLint v9 flat config format)
 *
 * Basic config for React projects with custom no-emojis rule.
 */

import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// Clean globals to remove any keys with leading/trailing whitespace
const cleanGlobals = (obj) => {
  if (!obj) return {};
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key.trim()] = obj[key];
  }
  return result;
};

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...cleanGlobals(globals.browser),
        ...cleanGlobals(globals.es2021),
        ...cleanGlobals(globals.node),
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
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      'no-console': 'off',

      // React 19+ with new JSX transform - no need to import React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Custom no-emojis rule - enforces React Icons usage
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/u]',
          message: 'Emojis are not allowed. Use React Icons from the icons utility instead.'
        },
        {
          selector: 'TemplateElement[value.raw=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/u]',
          message: 'Emojis are not allowed. Use React Icons from the icons utility instead.'
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
    // Ignore build outputs and dependencies
    ignores: ['build/**', 'node_modules/**', 'coverage/**']
  }
];
