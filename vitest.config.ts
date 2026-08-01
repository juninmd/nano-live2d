import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/js/**/*.test.ts'],
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
