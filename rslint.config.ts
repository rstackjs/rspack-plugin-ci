import { defineConfig, js, ts } from '@rslint/core';

export default defineConfig([
  js.configs.recommended,
  ts.configs.recommended,
  {
    files: ['css-extract/cases/**/expected/**/*.js'],
    rules: {
      'no-constant-condition': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-redeclare': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
]);
