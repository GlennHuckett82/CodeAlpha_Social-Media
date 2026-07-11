'use strict';

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['models/**/*.js', 'routes/**/*.js', 'middleware/**/*.js'],
  coverageThreshold: {
 global: {
 statements: 80, branches: 80, functions: 80, lines: 80,
},
},
  verbose: true,
  forceExit: true,
  workerIdleMemoryLimit: '512MB',
};
