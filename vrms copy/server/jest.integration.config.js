module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.int.test.js'],
  globalSetup: './tests/integration/globalSetup.js',
  globalTeardown: './tests/integration/globalTeardown.js',
  setupFiles: ['./tests/integration/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
};
