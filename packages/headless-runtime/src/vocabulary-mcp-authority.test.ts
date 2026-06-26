import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import {
  compileAndPublishVocabularyCommandFromMcp,
  compileVocabularyDraftCommandFromMcp,
  McpProjectRefInput,
  McpSemanticCompileAndPublishVocabularyRequest,
  McpSemanticCompileVocabularyDraftRequest,
  SemanticRuntimeFacade,
  semanticRuntimeToolMetadata,
} from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import { VocabularyCommandLedger } from '@harmony/headless-runtime/runtime/vocabulary-command-ledger'
import { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeGetCaseQuery,
  SemanticRuntimeStatusQuery,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect, Schema } from 'effect'

const projectRef = new ProjectRef({
  projectId: 'project:vocabulary-mcp-authority',
  canonicalRoot: '/workspace/vocabulary-mcp-authority',
})

const mcpProjectRef = new McpProjectRefInput({
  project_id: projectRef.projectId,
  canonical_root: projectRef.canonicalRoot,
})

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-vocabulary-mcp-')),
  catch: cause => cause,
})

function removeTempDataRoot(dataRoot: string) {
  return Effect.tryPromise({
    try: () => Fs.rm(dataRoot, { recursive: true, force: true }),
    catch: cause => cause,
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

function draftRequest(dataRoot: string, operationId: string, content = '退款：将已支付金额返还给用户') {
  return new McpSemanticCompileVocabularyDraftRequest({
    tool: 'semantic_compile_vocabulary_draft',
    effect: 'evidence_command',
    request_id: `request:${operationId}`,
    data_root: dataRoot,
    project_ref: mcpProjectRef,
    operation_id: operationId,
    vocabulary_source: {
      namespace: 'base.refund25',
      vocabulary_kind: 'base',
      content,
    },
  })
}

function publishRequest(dataRoot: string, operationId: string, content = '退款：将已支付金额返还给用户') {
  return new McpSemanticCompileAndPublishVocabularyRequest({
    tool: 'semantic_compile_and_publish_vocabulary',
    effect: 'authority_command',
    request_id: `request:${operationId}`,
    data_root: dataRoot,
    project_ref: mcpProjectRef,
    operation_id: operationId,
    vocabulary_source: {
      namespace: 'base.refund25',
      vocabulary_kind: 'base',
      content,
    },
  })
}

function compileDraft(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const command = yield* compileVocabularyDraftCommandFromMcp(draftRequest(dataRoot, 'operation:vocabulary-draft'))
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.compileVocabularyDraft(command)
  }))
}

function compileAndPublish(dataRoot: string, content = '退款：将已支付金额返还给用户') {
  return runFacade(Effect.gen(function* () {
    const command = yield* compileAndPublishVocabularyCommandFromMcp(
      publishRequest(dataRoot, 'operation:vocabulary-publish', content),
    )
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

function status(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.status(new SemanticRuntimeStatusQuery({
      requestId: 'request:vocabulary-status',
      dataRoot,
      projectRef,
    }))
  }))
}

function getMissingCase(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    const query = yield* Schema.decodeUnknownEffect(SemanticRuntimeGetCaseQuery)({
      requestId: 'request:vocabulary-get-case',
      dataRoot,
      projectRef,
      caseId: 'case:vocabulary-missing',
    })
    return yield* facade.getCase(query)
  }))
}

describe('MCP vocabulary draft and publish authority vertical', () => {
  it.effect('records a draft/evidence command without publishing authority and exposes provenance to queries', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const response = yield* compileDraft(dataRoot)
      const records = yield* vocabularyRecords(dataRoot)
      const statusResponse = yield* status(dataRoot)
      const getCaseResponse = yield* getMissingCase(dataRoot)

      assert.strictEqual(response.apiVersion, 'semantic-runtime-facade.v1')
      assert.strictEqual(response.effect, 'ledger-write')
      assert.strictEqual(response.result.resultKind, 'vocabulary_draft_compiled')
      assert.strictEqual(response.result.draft.lifecycle, 'draft')
      assert.deepStrictEqual(records.map(record => record.recordKind), [
        'VocabularySourceImported',
        'SemanticPackageDraftCompiled',
      ])
      assert.deepStrictEqual(response.committedRecordIds, records.map(record => record.id))
      assert.deepStrictEqual(response.sourceRecordIds, response.committedRecordIds)
      assert.isFalse(records.some(record => record.recordKind === 'PackageVersionPublished'))

      assert.strictEqual(statusResponse.result.resultKind, 'runtime_status')
      assert.strictEqual(statusResponse.effect, 'pure')
      assert.deepStrictEqual(statusResponse.sourceRecordIds, response.committedRecordIds)
      assert.deepStrictEqual(statusResponse.committedRecordIds, [])

      assert.strictEqual(getCaseResponse.result.resultKind, 'missing_case')
      assert.deepStrictEqual(getCaseResponse.sourceRecordIds, response.committedRecordIds)
      assert.deepStrictEqual(getCaseResponse.committedRecordIds, [])
    }))

  it.effect('publishes only through the distinct authority command and classifies tools explicitly', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const metadata = semanticRuntimeToolMetadata()
      const byToolName = new Map(metadata.map(tool => [tool.toolName, tool]))
      assert.strictEqual(byToolName.get('semantic_status')?.category, 'query')
      assert.strictEqual(byToolName.get('semantic_compile_vocabulary_draft')?.category, 'evidence_command')
      assert.strictEqual(byToolName.get('semantic_compile_and_publish_vocabulary')?.category, 'authority_command')
      assert.strictEqual(byToolName.has('semantic_import_vocabulary'), false)

      const response = yield* compileAndPublish(dataRoot)
      const records = yield* vocabularyRecords(dataRoot)

      assert.strictEqual(response.result.resultKind, 'vocabulary_published')
      assert.strictEqual(response.effect, 'ledger-write')
      assert.deepStrictEqual(records.map(record => record.recordKind), [
        'VocabularySourceImported',
        'SemanticPackageDraftCompiled',
        'PackageVersionPublished',
      ])
      assert.deepStrictEqual(response.committedRecordIds, records.map(record => record.id))
      assert.strictEqual(response.result.packageVersion.version, 'v1')
      assert.strictEqual(response.result.currentView.currentVersionId, response.result.packageVersion.id)
      assert.deepStrictEqual(response.result.currentView.ledgerRecordIds, response.committedRecordIds)
    }))

  it.effect('prevents publish when core vocabulary validation fails after MCP mapping succeeds', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const failureTag = yield* compileAndPublish(dataRoot, '退款 without separator').pipe(
        Effect.matchEffect({
          onFailure: error =>
            Effect.succeed(typeof error === 'object' && error !== null && '_tag' in error ? String(error._tag) : ''),
          onSuccess: () => Effect.succeed('unexpected-success'),
        }),
      )
      const records = yield* vocabularyRecords(dataRoot)

      assert.strictEqual(failureTag, 'VocabularyCompileError')
      assert.strictEqual(records.length, 0)
    }))
})
