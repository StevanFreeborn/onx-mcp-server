import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['**/src/**/*.ts'],
      exclude: ['**/src/index.ts', '**/src/server.ts'],
    },
  },
});
