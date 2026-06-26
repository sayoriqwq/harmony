import { assert, describe, it } from '@effect/vitest'
import { VocabularyInput } from '@harmony/semantic-model/schema/input'
import { StructuredVocabularyManifest } from '@harmony/semantic-model/schema/vocabulary-manifest'
import { Effect, Schema } from 'effect'
import { baseVocabularyInputV1 } from './input.ts'
import { baseVocabularyManifestV1, baseVocabularyNamespace } from './manifest.ts'

function concept(id: string) {
  const value = baseVocabularyManifestV1.concepts.find(candidate => candidate.id === id)
  if (value === undefined) {
    assert.fail(`Missing concept ${id}`)
  }
  return value
}

describe('Base Vocabulary manifest v1', () => {
  it.effect('defines a structured source manifest for agent-runtime base semantics', () =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(StructuredVocabularyManifest)(baseVocabularyManifestV1)
      const rewrite = concept('base.action.rewrite')
      const validate = concept('base.action.validate')
      const prohibit = concept('base.constraint.prohibit')

      assert.strictEqual(decoded.namespace, baseVocabularyNamespace)
      assert.strictEqual(decoded.vocabularyKind, 'base')
      assert.ok(decoded.concepts.length >= 20)
      assert.deepStrictEqual(
        rewrite.lexicalSenses.map(sense => sense.term),
        ['修改', '改写', '编辑', 'rewrite', 'edit', 'modify', 'fix', 'improve'],
      )
      assert.ok(validate.lexicalSenses.some(sense => sense.term === 'check'))
      assert.ok(prohibit.lexicalSenses.some(sense => sense.term === 'do not'))
      assert.ok(decoded.relations.some(relation =>
        relation.subject === 'base.action.rewrite'
        && relation.predicate === 'has_trait'
        && relation.object === 'base.effect.mutating',
      ))
      assert.ok(decoded.relations.some(relation =>
        relation.subject === 'base.action.delete'
        && relation.predicate === 'has_trait'
        && relation.object === 'base.effect.destructive',
      ))
    }))

  it.effect('exports an importable VocabularyInput source', () =>
    Effect.gen(function* () {
      const encoded = yield* Schema.encodeUnknownEffect(VocabularyInput)(baseVocabularyInputV1)
      const decoded = yield* Schema.decodeUnknownEffect(VocabularyInput)(encoded)

      assert.strictEqual(decoded.namespace, baseVocabularyNamespace)
      assert.strictEqual(decoded.vocabularyKind, 'base')
      assert.strictEqual(decoded.spans.length, 1)
      assert.strictEqual(decoded.spans[0]?.text, decoded.content)
      assert.deepStrictEqual(JSON.parse(decoded.content), baseVocabularyManifestV1)
    }))
})
