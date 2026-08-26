/**
 * Client test configuration.
 *
 * The suites here cover the logic that decides what a member sees — level maths,
 * formatting, PKCE construction, error wording and the demo backend's rule enforcement.
 * API behaviour is covered by the server suite in `server/tests`.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand|@tanstack/.*))',
  ],
  collectCoverageFrom: ['lib/**/*.ts', 'services/**/*.ts', 'constants/**/*.ts'],
};
