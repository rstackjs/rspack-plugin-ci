// Configuration guide: https://rstack.rs/config
import { define } from 'rstack';
import type { ProjectConfig } from 'rstack/test';

const commonProjectConfig: ProjectConfig = {
  globals: true,
  testTimeout: process.env.CI ? 60000 : 30000,
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  env: {
    UPDATE_SNAPSHOT:
      process.argv.includes('-u') || process.argv.includes('--updateSnapshot')
        ? 'true'
        : undefined,
  },
};

define.test({
  projects: [
    {
      extends: commonProjectConfig,
      name: 'node',
      include: ['**/*.test.js', '**/*.test.mjs', '**/*.test.ts'],
      exclude: ['**/css-extract/HMR.test.js'],
      testEnvironment: 'node',
    },
    {
      extends: commonProjectConfig,
      name: 'jsdom',
      include: ['**/css-extract/HMR.test.js'],
      testEnvironment: 'jsdom',
    },
  ],
});

define.lint(({ js, ts }) => [
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

define.fmt({
  singleQuote: true,
  sortPackageJson: true,
  // Keep upstream fixtures, examples, and expected output unchanged.
  ignorePatterns: [
    '**/__fixtures__/**',
    '**/__snapshots__/**',
    '**/fixtures/**',
    'css-extract/cases/**',
    'css-extract/manual/**',
    'sri-plugin/examples/**',
  ],
});

define.staged({
  '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}': ['rs lint', 'rs fmt'],
  '*.{json,jsonc,md,mdx,css,scss,less,html,yml,yaml}': 'rs fmt',
});
