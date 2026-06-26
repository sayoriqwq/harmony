import type { LedgerRecordType as LedgerRecord, PackageVersionPublishedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { assert, describe, it } from '@effect/vitest'
import { SemanticLedger } from '@harmony/headless-runtime/ledger'
import { GlossaryPackageWorkflow, layerInMemory } from '@harmony/headless-runtime/runtime/glossary-package-workflow'
import { EvidenceSource, VocabularyInput } from '@harmony/semantic-model/schema/input'
import { LedgerRecord as LedgerRecordSchema } from '@harmony/semantic-model/schema/ledger-record'
import { PackageVersion, PublishedSemanticPackage, SemanticPackageDraft } from '@harmony/semantic-model/schema/package'
import { CompileAndPublishResult, PackageCurrentView } from '@harmony/semantic-model/schema/workflow-result'
import { Effect, Schema } from 'effect'
import {
  glossaryFixture,
  malformedFixture,
  otherGlossaryFixture,
  refundText,
} from './fixtures/glossary-vocabulary.js'

function firstOf<A>(items: ReadonlyArray<A>, label: string): A {
  const value = items[0]
  if (value === undefined) {
    assert.fail(`Missing ${label}`)
  }
  return value
}

function isPackageVersionPublishedRecord(record: LedgerRecord): record is PackageVersionPublishedRecord {
  return record.recordKind === 'PackageVersionPublished'
}

const roundTripDurableOutputs = Effect.fn('roundTripDurableOutputs')(
  function* (result: CompileAndPublishResult) {
    const encodedEvidence = yield* Schema.encodeUnknownEffect(EvidenceSource)(result.evidenceSource)
    yield* Schema.decodeUnknownEffect(EvidenceSource)(encodedEvidence)

    const encodedDraft = yield* Schema.encodeUnknownEffect(SemanticPackageDraft)(result.draft)
    yield* Schema.decodeUnknownEffect(SemanticPackageDraft)(encodedDraft)

    const encodedPackage = yield* Schema.encodeUnknownEffect(PublishedSemanticPackage)(result.publishedPackage)
    yield* Schema.decodeUnknownEffect(PublishedSemanticPackage)(encodedPackage)

    const encodedVersion = yield* Schema.encodeUnknownEffect(PackageVersion)(result.packageVersion)
    yield* Schema.decodeUnknownEffect(PackageVersion)(encodedVersion)

    const encodedView = yield* Schema.encodeUnknownEffect(PackageCurrentView)(result.currentView)
    yield* Schema.decodeUnknownEffect(PackageCurrentView)(encodedView)

    const encodedResult = yield* Schema.encodeUnknownEffect(CompileAndPublishResult)(result)
    yield* Schema.decodeUnknownEffect(CompileAndPublishResult)(encodedResult)

    for (const record of result.ledgerRecords) {
      const encodedRecord = yield* Schema.encodeUnknownEffect(LedgerRecordSchema)(record)
      yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)
    }
  },
)

describe('glossary Vocabulary Source workflow', () => {
  it.effect('compiles a glossary VocabularyInput into immutable package versions and ledger views', () =>
    Effect.gen(function* () {
      const input = yield* Schema.decodeUnknownEffect(VocabularyInput)(glossaryFixture)
      const encodedInput = yield* Schema.encodeUnknownEffect(VocabularyInput)(input)
      const decodedInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(encodedInput)
      assert.strictEqual(decodedInput.content, refundText)
      assert.strictEqual(decodedInput.spans.length, 3)
      assert.strictEqual(firstOf(decodedInput.spans, 'entry span').text, refundText)

      const malformedFailed = yield* Schema.decodeUnknownEffect(VocabularyInput)(malformedFixture).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(malformedFailed, true)

      const workflow = yield* GlossaryPackageWorkflow
      const ledger = yield* SemanticLedger

      const firstResult = yield* workflow.compileAndPublish(input)
      yield* roundTripDurableOutputs(firstResult)

      const term = firstOf(firstResult.publishedPackage.artifacts.terms, 'published term')
      const lexicalSense = firstOf(firstResult.publishedPackage.artifacts.lexicalSenses, 'published lexical sense')
      const concept = firstOf(firstResult.publishedPackage.artifacts.concepts, 'published concept')
      const definition = firstOf(firstResult.publishedPackage.artifacts.definitions, 'published definition')
      const definitionEvidence = firstOf(definition.evidenceRefs, 'definition evidence')

      assert.strictEqual(term.label, '退款')
      assert.strictEqual(definition.text, '将已支付金额返还给用户')
      assert.strictEqual(lexicalSense.termId, term.id)
      assert.strictEqual(lexicalSense.conceptId, concept.id)
      assert.strictEqual(lexicalSense.definitionId, definition.id)
      assert.strictEqual(definition.conceptId, concept.id)
      assert.strictEqual(definitionEvidence.sourceId, firstResult.evidenceSource.id)
      assert.strictEqual(definitionEvidence.spanId, decodedInput.spans[2]?.id)
      assert.notStrictEqual(String(term.id), String(lexicalSense.id))
      assert.notStrictEqual(String(concept.id), String(definition.id))

      assert.strictEqual(firstResult.draft.relationCandidates.length, 0)
      assert.strictEqual(firstResult.draft.constraintCandidates.length, 0)
      assert.strictEqual(firstResult.publishedPackage.authoritativeRelations.length, 0)
      assert.strictEqual(firstResult.publishedPackage.authoritativeConstraints.length, 0)

      assert.strictEqual(firstResult.packageVersion.version, 'v1')
      assert.strictEqual(firstResult.packageVersion.runtimeBinding.schemaVersion, 'semantic-package.v1')
      assert.strictEqual(firstResult.packageVersion.runtimeBinding.effectVersion, 'effect@4.0.0-beta.90')
      assert.strictEqual(firstResult.currentView.currentVersionId, firstResult.packageVersion.id)
      assert.strictEqual(firstResult.currentView.sourceIds[0], firstResult.evidenceSource.id)
      assert.strictEqual(firstResult.ledgerRecords.length, 3)

      const secondResult = yield* workflow.compileAndPublish(input)
      const allRecords = yield* ledger.records
      const rebuiltView = yield* ledger.currentPackageView(firstResult.packageVersion.packageId)
      const firstPublishRecord = allRecords
        .filter(isPackageVersionPublishedRecord)
        .find(record => record.packageVersion.id === firstResult.packageVersion.id)

      assert.strictEqual(secondResult.packageVersion.version, 'v2')
      assert.notStrictEqual(secondResult.packageVersion.id, firstResult.packageVersion.id)
      assert.strictEqual(allRecords.length, 6)
      assert.strictEqual(rebuiltView.currentVersionId, secondResult.packageVersion.id)
      assert.ok(firstPublishRecord)
      assert.strictEqual(firstPublishRecord.packageVersion.version, 'v1')
      assert.strictEqual(firstPublishRecord.publishedPackage.artifacts.definitions[0]?.text, definition.text)
    }).pipe(Effect.provide(layerInMemory)))

  it.effect('keeps PackageCurrentView provenance scoped to the requested package', () =>
    Effect.gen(function* () {
      const workflow = yield* GlossaryPackageWorkflow
      const ledger = yield* SemanticLedger
      const refundInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(glossaryFixture)
      const otherInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(otherGlossaryFixture)

      const refundResult = yield* workflow.compileAndPublish(refundInput)
      const otherResult = yield* workflow.compileAndPublish(otherInput)
      const refundView = yield* ledger.currentPackageView(refundResult.packageVersion.packageId)

      assert.deepStrictEqual(refundView.sourceIds, [refundResult.evidenceSource.id])
      assert.deepStrictEqual(refundView.ledgerRecordIds, refundResult.currentView.ledgerRecordIds)
      assert.isFalse(refundView.sourceIds.includes(otherResult.evidenceSource.id))
      assert.isFalse(
        refundView.ledgerRecordIds.some(recordId => otherResult.currentView.ledgerRecordIds.includes(recordId)),
      )
    }).pipe(Effect.provide(layerInMemory)))
})
