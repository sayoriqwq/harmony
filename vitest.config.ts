import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'apps/**/*.test.ts',
      'libs/**/*.test.ts',
      'packages/**/*.test.ts',
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
  },
})
