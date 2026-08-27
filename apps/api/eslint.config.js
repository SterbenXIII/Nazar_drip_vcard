import globals from 'globals'
import tseslint from 'typescript-eslint'

import rootConfig from '../../eslint.config.js'

// ── API backend config (extends root) ───────────────────────────

export default tseslint.config(
  // ── Ignores ───────────────────────────────────────────────────
  {
    ignores: ['eslint.config.js', 'tsconfig.json'],
  },

  // Inherit root config
  ...rootConfig.slice(0, -1), // All rules except prettier

  // ── API-specific rules (Node.js + Hono) ────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.builtin,
      },
    },
    rules: {
      // API doesn't export components
      'no-unused-vars': 'off',
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
