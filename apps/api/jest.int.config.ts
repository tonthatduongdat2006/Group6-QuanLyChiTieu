import type { Config } from 'jest';
// Integration: PostgreSQL thật (DATABASE_URL trỏ DB test đã migrate), chạy tuần tự (--runInBand).
const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  testMatch: ['**/*.int-spec.ts'],
  setupFiles: ['<rootDir>/test/setup/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/no-network.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  testTimeout: 30_000,
};
export default config;
