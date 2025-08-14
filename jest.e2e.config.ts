import type { Config } from 'jest';
import baseConfig from './jest.config';

const e2eConfig: Config = {
  ...baseConfig,
  displayName: 'e2e',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.e2e.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  maxConcurrency: 1,
  bail: true,
  globalSetup: '<rootDir>/tests/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/tests/e2e/global-teardown.ts',
  testEnvironment: '<rootDir>/tests/e2e/test-environment.ts',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};

export default e2eConfig;