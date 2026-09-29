import { defineConfig } from 'vite-plus'

/**
 * The data set's one Vite+ config: tests, format and lint (Wildflower's
 * settings, less the React and app rules). The Wildflower
 * packages it consumes are linked from the `wildflower` submodule and resolved
 * against their `source` export (`./src/index.ts`), so nothing in the
 * submodule needs building — the same `source` condition Wildflower's own
 * `vite.config.base.ts` sets, for both the client and the SSR (Vitest)
 * resolver.
 */
export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'wildflower/**'],
    // Rendering the family runs every importer once per test file; the
    // Pebble minute history alone is 28 days of minutes.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  fmt: {
    trailingComma: 'es5',
    tabWidth: 2,
    semi: false,
    singleQuote: true,
    printWidth: 100,
    sortPackageJson: { sortScripts: true },
    sortImports: { partitionByNewline: true, newlinesBetween: false },
    ignorePatterns: ['wildflower/**', 'site/**', 'sources/**', 'pnpm-lock.yaml'],
  },
  lint: {
    ignorePatterns: ['wildflower/**', 'site/**', 'sources/**'],
    plugins: ['typescript', 'unicorn', 'import'],
    categories: { correctness: 'error', suspicious: 'error' },
    env: { builtin: true, es2024: true },
    options: { typeAware: true, typeCheck: true, reportUnusedDisableDirectives: 'error' },
    rules: {
      'import/no-unassigned-import': 'off',
      'import/no-named-export': 'off',
      'unicorn/filename-case': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'import/namespace': 'off',
      'eslint/no-underscore-dangle': ['error', { allow: ['_tag'] }],
      'no-shadow': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowIIFEs: true, allowExpressions: true },
      ],
      'unicorn/no-array-callback-reference': 'off',
      'import/no-duplicates': 'warn',
      'no-console': 'warn',
    },
    overrides: [
      {
        // As in Wildflower: tests hoist small helpers inside `describe`/`test`
        // blocks for locality.
        files: ['**/*.test.ts'],
        rules: { 'unicorn/consistent-function-scoping': 'off' },
      },
    ],
  },
})
