import type { Config } from '@stryker-mutator/api/core'

const config: Config = {
  testRunner: 'vitest',
  mutate: [
    'src/repositories/**/*.ts',
    'src/routes/**/*.ts',
    'src/auth.ts',
    '!src/**/*.test.ts',
  ],
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: '.stryker-report/report.html' },
  thresholds: { high: 80, low: 60, break: 0 },
}

export default config
