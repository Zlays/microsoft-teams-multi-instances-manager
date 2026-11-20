import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jestPlugin from 'eslint-plugin-jest';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/.kilo/**',
      '**/.agent/**',
      '**/tools/**',
      '**/.erb/**',
      '**/assets/**',
      '**/babel.config.js',
      '**/next.config.js',
      '**/package.json',
      '**/tsconfig.tsbuildinfo',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/dll/**',
      '**/release/**',
      '**/logs/**',
      '**/*.log',
      '**/pids/**',
      '**/*.pid',
      '**/*.seed',
      '**/lib-cov/**',
      '**/coverage/**',
      '**/.grunt/**',
      '**/.lock-wscript',
      '**/build/Release/**',
      '**/.eslintcache',
      '**/.DS_Store',
      '**/src/*.prod.js*',
      '**/src/*.main.prod.js',
      '**/src/main.prod.js',
      '**/src/main.prod.js.map',
      '**/src/preload.js',
      '**/src/preload.js.map',
      '**/src/renderer.prod.js',
      '**/src/renderer.prod.js.map',
      '**/src/style.css',
      '**/src/style.css.map',
      '**/main.js',
      '**/main.js.map',
      '**/.idea/**',
      '**/npm-debug.log.*',
      '**/__snapshots__/**',
      '**/*.css.d.ts',
      '**/*.sass.d.ts',
      '**/*.scss.d.ts',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-param-reassign': ['error', { props: false }],
    },
  },
  {
    files: [
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
    ],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },
  prettierConfig,
];
