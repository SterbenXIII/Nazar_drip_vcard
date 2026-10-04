import eslintPluginAstro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'

import rootConfig from '../../eslint.config.js'

export default tseslint.config(
  { ignores: ['eslint.config.js', 'tsconfig.json'] },
  ...rootConfig.slice(0, -1),
  ...eslintPluginAstro.configs.recommended,
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
  },
  rootConfig.at(rootConfig.length - 1),
)
