'use strict';

module.exports = {
  env: { node: true, es2021: true },
  extends: ['airbnb-base'],
  parserOptions: { ecmaVersion: 2021, sourceType: 'commonjs' },
  rules: {
    'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
    indent: 'off',
    'linebreak-style': 'off',
    quotes: ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
    semi: ['error', 'always'],
    strict: 'off',
    'max-len': ['error', {
      code: 100,
      ignoreComments: true,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
    'no-restricted-syntax': ['error',
      { selector: 'LabeledStatement', message: 'Labels are a form of GOTO; avoid them.' },
      { selector: 'WithStatement', message: '`with` is disallowed in strict mode.' },
    ],
    'global-require': 'off',
    'no-underscore-dangle': ['error', { allow: ['_id', '__v'] }],
    'consistent-return': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
  },
  overrides: [{
    files: ['tests/**/*.js', '**/*.test.js', 'server.e2e.js', 'jest.config.js'],
    env: { jest: true },
    rules: { 'no-console': 'off', 'import/no-extraneous-dependencies': 'off' },
  }],
};
