import eslintPluginAstro from 'eslint-plugin-astro'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

import rootConfig from '../../eslint.config.js'

// ── Astro web app config (extends root) ─────────────────────────

export default tseslint.config(
  // ── Ignores ───────────────────────────────────────────────────
  {
    ignores: ['eslint.config.js', 'tsconfig.json'],
  },

  // Inherit root config
  ...rootConfig.slice(0, -1), // All rules except prettier

  // ── Astro-specific rules ────────────────────────────────────────
  ...eslintPluginAstro.configs.recommended,
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: jsxA11y.configs.recommended.rules,
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // ── Astro files with TypeScript frontmatter ─────────────────────
  {
    files: ['src/**/*.astro'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        Astro: 'readonly',
      },
    },
    rules: {
      // Astro expects components to have names
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_(?:[A-Z]|[a-z]+)',
        },
      ],
    },
  },

  // ── Config files ────────────────────────────────────────────────
  {
    files: ['*.config.{js,mjs}', 'eslint.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ── Prettier (must be last) ─────────────────────────────────────
  rootConfig[rootConfig.length - 1], // Prettier config
)
