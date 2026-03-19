import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // Base JS recommended rules
  js.configs.recommended,

  // Vue 3 recommended rules (includes vue-eslint-parser)
  ...pluginVue.configs['flat/recommended'],

  // Disable ESLint rules that conflict with Prettier
  prettierConfig,

  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      // Vue-specific
      'vue/multi-word-component-names': 'off',        // e.g. "Spinner" is fine
      'vue/no-unused-vars': 'warn',
      'vue/block-order': ['error', {
        order: ['template', 'script', 'style'],
      }],
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',              // optional props are fine without defaults
      'vue/attributes-order': 'off',                  // Prettier handles formatting

      // Core JS
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
    },
  },

  {
    // Node.js config files — override globals
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    // Ignore build output, node_modules, and Vite/Tailwind config files
    ignores: [
      'dist/**',
      'node_modules/**',
      'postcss.config.js',
      'tailwind.config.js',
      'public/**',
    ],
  },
]
