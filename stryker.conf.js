/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
module.exports = {
  mutator: 'typescript',
  testRunner: 'vitest',
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'off',
  tsconfigFile: 'tsconfig.json',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/db.ts'
  ]
};
