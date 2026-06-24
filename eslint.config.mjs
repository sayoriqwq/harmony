import antfu from '@antfu/eslint-config'

const sourceFiles = [
  '*.config.{js,mjs,ts}',
  'apps/**/*.ts',
  'libs/**/*.ts',
  'packages/**/*.ts',
  'src/**/*.ts',
  'tests/**/*.{js,mjs,ts}',
]

const testFiles = [
  'apps/**/*.test.{js,mjs,ts}',
  'libs/**/*.test.{js,mjs,ts}',
  'packages/**/*.test.{js,mjs,ts}',
  'src/**/*.test.{js,mjs,ts}',
  'tests/**/*.test.{js,mjs,ts}',
]

const restrictedEffectSyntax = [
  {
    selector: 'MemberExpression[object.name="Context"][property.name="Tag"]',
    message: 'Use Context.Service for v4 beta service definitions.',
  },
  {
    selector: 'MemberExpression[object.name="Effect"][property.name=/^(asVoid|catchAllCause|ignore|serviceOption)$/]',
    message: 'This Effect member is banned by the harness guardrails; use the Effect-native safer pattern.',
  },
]

export default antfu(
  {
    ignores: [
      '.codex/**',
      '*.md',
      'docs/**',
      'node_modules/**',
      '.turbo/**',
      '**/.turbo/**',
      '**/dist/**',
    ],
  },
  {
    name: 'harmony/effect-source',
    files: sourceFiles,
    rules: {
      'antfu/no-top-level-await': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:test',
              message: 'Use @effect/vitest for Effect tests.',
            },
            {
              name: 'vitest',
              message: 'Use @effect/vitest for Effect tests.',
            },
            {
              name: '@effect/cli',
              message: 'Use effect/unstable/cli for Effect v4 beta.',
            },
          ],
          patterns: [
            {
              group: ['@effect/cli/*'],
              message: 'Use effect/unstable/cli for Effect v4 beta.',
            },
            {
              group: [
                '/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/**',
                '**/repos/effect/**',
              ],
              message: 'repos/effect is read-only reference material; import installed packages instead.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...restrictedEffectSyntax,
      ],
      'test/no-import-node-test': 'off',
    },
  },
  {
    name: 'harmony/effect-vitest-tests',
    files: testFiles,
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedEffectSyntax,
        {
          selector: 'CallExpression[callee.name="it"]',
          message: 'Use it.effect, it.live, or layer from @effect/vitest for Effect tests.',
        },
      ],
    },
  },
)
