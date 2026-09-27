import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// ── Root ESLint config (shared base rules) ──────────────────────
// Apps extend this config with their own rules

export default [
  // ── Global ignores ──────────────────────────────────────────────
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.astro/**',
      '**/.tmp/**',
      '**/tmp/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/blob-report/**',
      '**/playwright/.cache/**',
      '**/graphify-out/**',
      '**/.codebase-memory/**',
      '**/.secret-scan.*',
      '**/eslint.config.js', // App-specific configs
      'old/**',
      'scripts/**',
      'constants/**',
      'backups/**',
      'tooling/**',
      '.corepack-cache/**',
      // Astro files are linted ONLY by apps/web config (which has the parser)
      '**/*.astro',
    ],
  },

  // ── Base JS rules ──────────────────────────────────────────────
  eslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.builtin,
      },
    },
  },

  // ── TypeScript rules ───────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── Import sorting ─────────────────────────────────────────────
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // ── Shared TypeScript overrides ────────────────────────────────
  {
    rules: {
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Allow explicit any with warning (not error)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── Config files (process.env, CJS globals) ──────────────────
  {
    files: ['**/*.config.{js,mjs}', '**/scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ── Prettier (must be last) ────────────────────────────────────
  eslintConfigPrettier,
]
