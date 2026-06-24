import { assert, describe, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

describe('harmony Effect runtime', () => {
  it.effect('runs an Effect program', () =>
    Effect.gen(function* () {
      const value = yield* Effect.succeed(1 + 1)
      assert.equal(value, 2)
    }))
})
