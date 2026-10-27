import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '.claude/**',
      'artifacts/**',
      'ios/**',
      'android/**',
      'dist/**',
      'dist-e2e/**',
      'dist-debug/**',
      'node_modules/**',
      'prototypes/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } },
  {
    // test/tooling scripts poke at window globals inside page.evaluate
    files: ['scripts/**/*.ts', 'tests/e2e/**/*.ts', 'tests/perf/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // The core must stay pure and deterministic: no DOM, no wall clock, no Math.random.
    files: ['src/core/**/*.ts', 'src/sim/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'performance',
        'requestAnimationFrame',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use core/rng (seeded) for determinism.' },
        { object: 'Date', property: 'now', message: 'Core must not read the wall clock.' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['../render/*', '../input/*', '../audio/*', '../app/*', '../ui/*', '../platform/*'] },
      ],
    },
  },
);
