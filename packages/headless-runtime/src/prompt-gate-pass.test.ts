import type { SemanticRuntimeEvaluatePromptResponse } from '@harmony/semantic-model/schema/runtime-facade'
import { readFile } from 'node:fs/promises'
import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import {
  compileAndPublishVocabularyCommandFromMcp,
  McpProjectRefInput,
  McpSemanticCompileAndPublishVocabularyRequest,
  SemanticRuntimeFacade,
} from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  decodeCodexHostEventFixture,
  decodeCodexUserPromptSubmitEvent,
} from '@harmony/semantic-model/schema/host-event'
import { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeEvaluatePromptCommand,
  SemanticRuntimeGetCaseQuery,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect } from 'effect'
import { PromptGateLedger } from './runtime/prompt-gate-ledger.ts'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

const projectRef = new ProjectRef({
  projectId: 'project:prompt-gate-pass',
  canonicalRoot: '/workspace/prompt-gate-pass',
})

const mcpProjectRef = new McpProjectRefInput({
  project_id: projectRef.projectId,
  canonical_root: projectRef.canonicalRoot,
})

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-prompt-gate-')),
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

function runPromptLedger<A, E>(effect: Effect.Effect<A, E, PromptGateLedger>) {
  return effect.pipe(Effect.provide(PromptGateLedger.layerLive))
}

const readUserPromptSubmitFixture = Effect.fn('readUserPromptSubmitFixture')(function* (prompt?: string) {
  const raw = yield* Effect.promise(() =>
    readFile(new URL('../../../fixtures/hooks/user-prompt-submit.json', import.meta.url), 'utf8'),
  )
  const fixture = yield* decodeCodexHostEventFixture(JSON.parse(raw) as unknown)
  return yield* decodeCodexUserPromptSubmitEvent({
    ...fixture.payload,
    ...(prompt !== undefined ? { prompt } : {}),
  })
})

function baseVocabularyPublishRequest(dataRoot: string, namespace: string, content: string) {
  return new McpSemanticCompileAndPublishVocabularyRequest({
    tool: 'semantic_compile_and_publish_vocabulary',
    effect: 'authority_command',
    request_id: `request:${namespace}`,
    data_root: dataRoot,
    project_ref: mcpProjectRef,
    operation_id: `operation:${namespace}`,
    vocabulary_source: {
      namespace,
      vocabulary_kind: 'base',
      content,
    },
  })
}

function publishBaseVocabulary(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    const sources = [
      ['base.prompt_action', '检查：对目标内容进行验证、审阅或判断，不直接修改目标内容'],
      ['base.prompt_action.edit', '修改：对目标内容进行编辑、改写、替换或改变'],
      ['base.prompt_action.prohibit_edit', '禁止修改：用户明确要求不要编辑、改写、替换或改变目标内容'],
    ] as const
    for (const [namespace, content] of sources) {
      const command = yield* compileAndPublishVocabularyCommandFromMcp(
        baseVocabularyPublishRequest(dataRoot, namespace, content),
      )
      yield* facade.compileAndPublishVocabulary(command)
    }
  }))
}

function evaluatePrompt(
  dataRoot: string,
  operationId = 'operation:prompt-pass-1',
  prompt?: string,
) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    const hostEvent = yield* readUserPromptSubmitFixture(prompt)
    return yield* facade.evaluateAndRecordPrompt(new SemanticRuntimeEvaluatePromptCommand({
      requestId: 'request:prompt-pass-1',
      dataRoot,
      projectRef,
      operationId,
      hostEvent,
    }))
  }))
}

function getCase(dataRoot: string, caseId: SemanticRuntimeGetCaseQuery['caseId']) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.getCase(new SemanticRuntimeGetCaseQuery({
      requestId: 'request:prompt-pass-get-case',
      dataRoot,
      projectRef,
      caseId,
    }))
  }))
}

function promptGateRecords(dataRoot: string) {
  return runPromptLedger(Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    return yield* ledger.records(dataRoot, projectRef)
  }))
}

function passResult(response: SemanticRuntimeEvaluatePromptResponse) {
  if (response.result.decisionKind !== 'pass') {
    assert.fail('Expected Prompt Gate pass result')
  }
  return response.result
}

describe('Prompt Gate pass-to-case vertical', () => {
  it.effect('records a validate-only UserPromptSubmit as a compact pass decision and queryable Case', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      yield* publishBaseVocabulary(dataRoot)

      const response = yield* evaluatePrompt(dataRoot)
      const records = yield* promptGateRecords(dataRoot)

      assert.strictEqual(response.apiVersion, 'semantic-runtime-facade.v1')
      assert.strictEqual(response.requestId, 'request:prompt-pass-1')
      assert.strictEqual(response.effect, 'ledger-write')
      const result = passResult(response)
      assert.strictEqual(result.decisionKind, 'pass')
      assert.strictEqual(result.action, 'validate')
      assert.deepStrictEqual(result.prohibitedActions, ['rewrite'])
      assert.deepStrictEqual(Object.keys(result.additionalContext).sort(), [
        'action',
        'caseId',
        'environmentRef',
        'prohibitedActions',
      ])
      assert.strictEqual(result.additionalContext.caseId, result.caseId)
      assert.strictEqual(result.additionalContext.action, 'validate')
      assert.deepStrictEqual(result.additionalContext.prohibitedActions, ['rewrite'])

      assert.deepStrictEqual(records.map(record => record.recordKind), [
        'PromptObserved',
        'CaseOpened',
        'PromptGateDecisionRecorded',
        'HostTurnBoundToCase',
      ])
      assert.deepStrictEqual(response.committedRecordIds, records.map(record => record.recordId))
      assert.deepStrictEqual(response.sourceRecordIds, response.committedRecordIds)
      assert.strictEqual(records.every(record => record.operationId === 'operation:prompt-pass-1'), true)

      const promptRecord = records.find(record => record.recordKind === 'PromptObserved')
      const caseRecord = records.find(record => record.recordKind === 'CaseOpened')
      const decisionRecord = records.find(record => record.recordKind === 'PromptGateDecisionRecorded')
      const turnRecord = records.find(record => record.recordKind === 'HostTurnBoundToCase')
      assert.ok(promptRecord)
      assert.ok(caseRecord)
      assert.ok(decisionRecord)
      assert.ok(turnRecord)
      if (decisionRecord.decision.decisionKind !== 'pass') {
        assert.fail('Expected recorded Prompt Gate pass decision')
      }
      assert.strictEqual(promptRecord.source.originalText, 'check this document; do not edit it')
      assert.strictEqual(caseRecord.case.id, result.caseId)
      assert.strictEqual(caseRecord.case.currentSemanticIr.decisionState, 'parsed')
      assert.strictEqual(caseRecord.case.currentSemanticIr.frameInstances[0]?.action, 'validate')
      assert.strictEqual(decisionRecord.decision.caseId, result.caseId)
      assert.strictEqual(turnRecord.caseId, result.caseId)
      assert.strictEqual(turnRecord.hostTurnId, 'codex-turn:prompt-001')

      const serializedAdditionalContext = JSON.stringify(result.additionalContext)
      assert.strictEqual(serializedAdditionalContext.includes('check this document'), false)
      assert.strictEqual(serializedAdditionalContext.includes('Vocabulary Source'), false)
      assert.strictEqual(serializedAdditionalContext.includes('reasoning'), false)

      const getCaseResponse = yield* getCase(dataRoot, result.caseId)
      assert.strictEqual(getCaseResponse.result.resultKind, 'case_found')
      if (getCaseResponse.result.resultKind !== 'case_found') {
        assert.fail('Expected get-case to return the Prompt Gate-created Case')
      }
      assert.strictEqual(getCaseResponse.result.caseView.case.id, result.caseId)
      assert.deepStrictEqual(getCaseResponse.result.caseView.sourceRecordIds, records.map(record => record.recordId))
      assert.deepStrictEqual(getCaseResponse.committedRecordIds, [])

      const afterGetCase = yield* promptGateRecords(dataRoot)
      assert.strictEqual(afterGetCase.length, records.length)
    }))

  it.effect('records a rewrite prompt from published Base Vocabulary without fabricated spans', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      yield* publishBaseVocabulary(dataRoot)

      const response = yield* evaluatePrompt(dataRoot, 'operation:prompt-rewrite-zh', '请修改代码')
      const records = yield* promptGateRecords(dataRoot)
      const result = passResult(response)

      assert.strictEqual(result.action, 'rewrite')
      assert.deepStrictEqual(result.prohibitedActions, [])
      const promptRecord = records.find(record => record.recordKind === 'PromptObserved')
      assert.ok(promptRecord)
      if (promptRecord === undefined || promptRecord.recordKind !== 'PromptObserved') {
        assert.fail('Expected PromptObserved record')
      }
      assert.strictEqual(promptRecord.source.originalText, '请修改代码')
      assert.strictEqual(promptRecord.source.spans.some(span => span.text === 'check'), false)
      assert.strictEqual(promptRecord.source.spans.some(span => span.text === 'do not edit it'), false)
      assert.strictEqual(promptRecord.source.spans.every(span => span.startOffset >= 0 && span.endOffset >= 0), true)
    }))

  it.effect('returns managed no-op without opening a Case when no request frame is detected', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      yield* publishBaseVocabulary(dataRoot)

      const response = yield* evaluatePrompt(dataRoot, 'operation:prompt-no-frame-zh', '测试第二次')
      const records = yield* promptGateRecords(dataRoot)

      assert.strictEqual(response.effect, 'pure')
      assert.deepStrictEqual(response.sourceRecordIds, [])
      assert.deepStrictEqual(response.committedRecordIds, [])
      assert.strictEqual(response.result.decisionKind, 'noop')
      if (response.result.decisionKind !== 'noop') {
        assert.fail('Expected Prompt Gate no-op')
      }
      assert.strictEqual(response.result.reason, 'no_request_frame_detected')
      assert.deepStrictEqual(records, [])
    }))

  it.effect('keeps ambiguous check-and-improve prompt blocked for clarification', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      yield* publishBaseVocabulary(dataRoot)

      const response = yield* evaluatePrompt(
        dataRoot,
        'operation:prompt-check-improve',
        'check and improve this document',
      )

      assert.strictEqual(response.result.decisionKind, 'blockClarify')
      if (response.result.decisionKind !== 'blockClarify') {
        assert.fail('Expected Prompt Gate blockClarify')
      }
      assert.strictEqual(response.result.reason, 'behavior_changing_action_ambiguity')
    }))

  it.effect('returns the prior prompt commit on operation retry without duplicate records', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      yield* publishBaseVocabulary(dataRoot)

      const first = yield* evaluatePrompt(dataRoot, 'operation:prompt-pass-retry')
      const recordsAfterFirst = yield* promptGateRecords(dataRoot)
      const retry = yield* evaluatePrompt(dataRoot, 'operation:prompt-pass-retry')
      const recordsAfterRetry = yield* promptGateRecords(dataRoot)
      const firstResult = passResult(first)
      const retryResult = passResult(retry)

      assert.deepStrictEqual(retry.committedRecordIds, first.committedRecordIds)
      assert.strictEqual(retryResult.caseId, firstResult.caseId)
      assert.strictEqual(recordsAfterRetry.length, recordsAfterFirst.length)
      assert.deepStrictEqual(
        recordsAfterRetry.map(record => record.recordId),
        recordsAfterFirst.map(record => record.recordId),
      )
    }))
})
