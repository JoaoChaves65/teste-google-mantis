const js = require('@eslint/js');
const typescriptEslint = require('typescript-eslint');
const globals = require('globals');
const prettierConfig = require('./prettier.config.js');

module.exports = typescriptEslint.config(
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'packages/*/dist/**',
      'packages/*/node_modules/**',
      '*.config.js',
      '*.config.ts',
      'scripts/**',
      'infra/**',
      'docs/**',
      'security-lab/**',
      'packages/api-secure/check_constraints.js',
      'packages/api-secure/check_db.js',
      'packages/api-secure/check_db2.js',
      'packages/api-secure/check_users.js',
      'packages/api-secure/test_truncate.js',
      'packages/api-secure/vitest.db-setup.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
  {
    files: ['packages/web/**/*.ts', 'packages/web/**/*.tsx'],
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['packages/core/src/infrastructure/database/migrations/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
  }
);
