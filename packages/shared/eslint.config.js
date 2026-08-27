import globals from 'globals'
import tseslint from 'typescript-eslint'

import rootConfig from '../../eslint.config.js'

// ── Shared library config (extends root) ────────────────────────

export default tseslint.config(
  // ── Ignores ───────────────────────────────────────────────────
  {
    ignores: ['eslint.config.js', 'tsconfig.json'],
  },

  // Inherit root config
  ...rootConfig.slice(0, -1), // All rules except prettier

  // ── Library-specific rules (TypeScript only) ────────────────────
  {
    files: ['src/**/*.ts'],
    rules: {
      // Library files should export types
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // ── Config files ────────────────────────────────────────────────
  {
    files: ['tsconfig.json', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ── Prettier (must be last) ─────────────────────────────────────
  rootConfig[rootConfig.length - 1], // Prettier config
)
