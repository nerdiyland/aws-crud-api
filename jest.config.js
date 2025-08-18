module.exports = {
  roots: ['<rootDir>/test', '<rootDir>/packages/standard-crud-backend'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'packages/standard-crud-backend/**/*.ts',
    '!lib/**/*.d.ts',
    '!packages/standard-crud-backend/**/*.d.ts',
    '!packages/standard-crud-backend/node_modules/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/lib/$1'
  },
  projects: [
    {
      displayName: 'infrastructure',
      testMatch: ['<rootDir>/test/infrastructure/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest'
      }
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/packages/standard-crud-backend/**/*.spec.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest'
      }
    }
  ]
};
