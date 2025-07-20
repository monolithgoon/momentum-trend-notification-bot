import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@analytics/(.*)$': '<rootDir>/src/analytics/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@enums/(.*)$': '<rootDir>/src/core/enums/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@net/(.*)$': '<rootDir>/src/net/$1',
    '^@scanners/(.*)$': '<rootDir>/src/scanners/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@strategies/(.*)$': '<rootDir>/src/strategies/$1',
    '^@tasks/(.*)$': '<rootDir>/src/tasks/$1',
    '^@utils/(.*)$': '<rootDir>/src/core/utils/$1',
  },
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/test/**/*.test.ts'],
};

export default config;