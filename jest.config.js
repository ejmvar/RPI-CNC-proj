module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'modules/**/*.{js,mjs}',
    'Simulator/web/js/*.{js,mjs}',
    '!modules/**/node_modules/**',
    '!Simulator/web/static/**',
    '!**/vendor/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
};
