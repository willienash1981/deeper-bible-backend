module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/e2e/**/*.test.ts',
    '**/e2e/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@ai/(.*)$': '<rootDir>/src/ai/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1'
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true
};