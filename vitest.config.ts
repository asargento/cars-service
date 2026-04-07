import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(root, 'src/domain'),
      '@application': path.resolve(root, 'src/application'),
      '@infrastructure': path.resolve(root, 'src/infrastructure'),
      '@': path.resolve(root, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
