module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.test.mjs'],
  transform: {},
  collectCoverageFrom: [
    'modules/**/*.{js,mjs}',
    'Simulator/web/js/*.{js,mjs}',
    '!modules/**/node_modules/**',
    '!Simulator/web/static/**',
    '!**/vendor/**',
  ],
  coverageThreshold: {
    global: {
      branches: 47,
      functions: 60,
      lines: 57,
      statements: 53,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
};
