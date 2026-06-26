import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import { baseVocabularyMcpSourceV1 } from '@harmony/base-vocabulary/input'
import {
  compileAndPublishVocabularyCommandFromMcp,
  McpProjectRefInput,
  McpSemanticCompileAndPublishVocabularyRequest,
  SemanticRuntimeFacade,
} from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import { VocabularyCommandLedger } from '@harmony/headless-runtime/runtime/vocabulary-command-ledger'
import { LedgerRecord } from '@harmony/semantic-model/schema/ledger-record'
import { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import { Effect, Schema } from 'effect'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

const projectRef = new ProjectRef({
  projectId: 'project:base-vocabulary-publish',
  canonicalRoot: '/workspace/base-vocabulary-publish',
})

const mcpProjectRef = new McpProjectRefInput({
  project_id: projectRef.projectId,
  canonical_root: projectRef.canonicalRoot,
})

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-base-vocabulary-')),
  catch: nodeFileSystemError('mkdtemp', Os.tmpdir()),
})

function removeTempDataRoot(dataRoot: string) {
  return Effect.tryPromise({
    try: () => Fs.rm(dataRoot, { recursive: true, force: true }),
    catch: nodeFileSystemError('rm', dataRoot),
  }).pipe(
    Effect.catch(() => Effect.succeed(undefined)),
  )
}

const tempDataRoot = Effect.acquireRelease(
  makeTempDataRoot,
  dataRoot => removeTempDataRoot(dataRoot),
)

function runFacade<A, E>(effect: Effect.Effect<A, E, SemanticRuntimeFacade>) {
  return effect.pipe(Effect.provide(SemanticRuntimeFacade.layerLive))
}

function runVocabularyLedger<A, E>(effect: Effect.Effect<A, E, VocabularyCommandLedger>) {
  return effect.pipe(Effect.provide(VocabularyCommandLedger.layerLive))
}

function publishRequest(dataRoot: string) {
  return new McpSemanticCompileAndPublishVocabularyRequest({
    tool: 'semantic_compile_and_publish_vocabulary',
    effect: 'authority_command',
    request_id: 'request:base-vocabulary-v1',
    data_root: dataRoot,
    project_ref: mcpProjectRef,
    operation_id: 'operation:base-vocabulary-v1',
    vocabulary_source: baseVocabularyMcpSourceV1,
  })
}

function publishBaseVocabulary(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const command = yield* compileAndPublishVocabularyCommandFromMcp(publishRequest(dataRoot))
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.compileAndPublishVocabulary(command)
  }))
}

function vocabularyRecords(dataRoot: string) {
  return runVocabularyLedger(Effect.gen(function* () {
    const ledger = yield* VocabularyCommandLedger
    return yield* ledger.records(dataRoot, projectRef)
  }))
}

describe('Base Vocabulary structured publish vertical', () => {
  it.effect('publishes the importable Base Vocabulary package with lexical senses and action traits', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const response = yield* publishBaseVocabulary(dataRoot)
      const records = yield* vocabularyRecords(dataRoot)
      const publishRecord = records.find(record => record.recordKind === 'PackageVersionPublished')

      assert.strictEqual(response.result.resultKind, 'vocabulary_published')
      assert.deepStrictEqual(records.map(record => record.recordKind), [
        'VocabularySourceImported',
        'SemanticPackageDraftCompiled',
        'PackageVersionPublished',
      ])
      assert.ok(publishRecord)
      if (publishRecord === undefined || publishRecord.recordKind !== 'PackageVersionPublished') {
        assert.fail('Expected PackageVersionPublished record')
      }

      const publishedPackage = publishRecord.publishedPackage
      const rewriteConcept = publishedPackage.artifacts.concepts.find(
        concept => String(concept.id) === 'concept:base.action.rewrite',
      )
      const rewriteTerms = publishedPackage.artifacts.lexicalSenses
        .filter(sense => String(sense.conceptId) === 'concept:base.action.rewrite')
        .map(sense => publishedPackage.artifacts.terms.find(term => term.id === sense.termId)?.label)
        .filter((term): term is string => term !== undefined)

      assert.strictEqual(publishedPackage.namespace, 'base.agent-runtime')
      assert.ok(rewriteConcept)
      assert.deepStrictEqual(
        rewriteTerms,
        ['修改', '改写', '编辑', 'rewrite', 'edit', 'modify', 'fix', 'improve'],
      )
      assert.ok(publishedPackage.authoritativeRelations.some(relation =>
        String(relation.subjectConceptId) === 'concept:base.action.rewrite'
        && relation.predicate === 'has_trait'
        && String(relation.objectConceptId) === 'concept:base.effect.mutating',
      ))
      assert.ok(publishedPackage.authoritativeRelations.some(relation =>
        String(relation.subjectConceptId) === 'concept:base.action.delete'
        && relation.predicate === 'has_trait'
        && String(relation.objectConceptId) === 'concept:base.effect.destructive',
      ))

      for (const record of records) {
        const encoded = yield* Schema.encodeUnknownEffect(LedgerRecord)(record)
        yield* Schema.decodeUnknownEffect(LedgerRecord)(encoded)
      }
    }), 10_000)
})
