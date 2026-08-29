import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./src/test-setup.ts', './src/infrastructure/database/tests/setup.ts'],
    testTimeout: 30000,
  },
});
