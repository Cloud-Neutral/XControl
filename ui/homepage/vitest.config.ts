import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const workspaceRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['routes/**/*.test.{ts,tsx}', 'routes/**/*.__tests__/*.{ts,tsx}', 'routes/**/__tests__/**/*.{ts,tsx}'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
  },
  resolve: {
    alias: {
      '@components': resolve(workspaceRoot, 'components'),
      '@i18n': resolve(workspaceRoot, 'i18n'),
      '@islands': resolve(workspaceRoot, 'islands'),
      '@lib': resolve(workspaceRoot, 'lib'),
      '@routes': resolve(workspaceRoot, 'routes'),
      '@static': resolve(workspaceRoot, 'static'),
      '@types': resolve(workspaceRoot, 'types'),
    },
  },
  esbuild: {
    loader: 'tsx',
    jsx: 'automatic',
  },
})
