const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'server/*', '.expo/*'],
  },
  {
    rules: {
      // Imports are grouped by hand throughout; the plugin's ordering disagrees with
      // the convention used here without improving anything.
      'import/order': 'off',
    },
  },
  {
    // Jest's module mocking is hoisted above imports, so the factories have to use
    // `require`. This is the one place in the project that needs it.
    files: ['__tests__/setup.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
