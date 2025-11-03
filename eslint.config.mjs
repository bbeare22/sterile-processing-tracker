import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'apps/**/dist/**',
      'apps/**/build/**',
    ],
  },

  // Base JS for all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        NodeJS: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // guardrails
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Client (React)
  {
    files: ['apps/client/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // import hygiene
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'import/no-unresolved': 'error',
      // keep raw console mostly out of client
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Server (Node)
  {
    files: ['apps/server/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { process: 'readonly', __dirname: 'readonly', module: 'readonly' },
    },
    plugins: { import: importPlugin },
    rules: {
      'import/no-unresolved': 'off', // commonjs require paths
      'no-console': ['warn', { allow: ['warn', 'error'] }], // use logger for info/debug
    },
  },
];
