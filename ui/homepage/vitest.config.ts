import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const workspaceRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}', 'app/**/*.__tests__/*.{ts,tsx}', 'app/**/__tests__/**/*.{ts,tsx}'],
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
      '@lib': resolve(workspaceRoot, 'lib'),
      '@types': resolve(workspaceRoot, 'types'),
    },
  },
  esbuild: {
    loader: 'tsx',
    jsx: 'automatic',
  },
})
