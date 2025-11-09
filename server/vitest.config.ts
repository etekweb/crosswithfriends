import {defineConfig} from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true, // Enable global test APIs (describe, it, expect, etc.)
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git'],
    setupFiles: [path.resolve(__dirname, '__tests__/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/node_modules/**', '**/dist/**', '**/coverage/**'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@lib': path.resolve(__dirname, '../src/lib'),
    },
  },
});
