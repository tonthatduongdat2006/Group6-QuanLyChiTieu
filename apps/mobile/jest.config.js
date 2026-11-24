// msw 2.x phụ thuộc gói chỉ có ESM (.mjs, vd. rettime) → cần babel-jest cho .mjs, giữ nguyên transform của jest-expo.
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  transform: { ...expoPreset.transform, '^.+\\.mjs$': 'babel-jest' },
  roots: ['<rootDir>/test'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-router|@tanstack|msw|@mswjs|until-async|.*\\.mjs$)',
  ],
};
