import { defineConfig, js, ts } from '@rslint/core';

export default defineConfig([
  js.configs.recommended,
  ts.configs.recommended,
  {
    files: ['css-extract/cases/**/expected/**/*.js'],
    rules: {
      'no-constant-condition': 'off',
    },
  },
]);
