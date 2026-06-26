import type { PendingClarification } from '@harmony/semantic-model/schema/prompt-gate'
import { readFile } from 'node:fs/promises'
import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import {
  decodeCodexHostEventFixture,
  decodeCodexUserPromptSubmitEvent,
} from '@harmony/semantic-model/schema/host-event'
import { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeEvaluatePromptCommand,
  SemanticRuntimeEvaluatePromptResponse,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect } from 'effect'
import { PromptGateLedger } from './runtime/prompt-gate-ledger.ts'

const projectRef = new ProjectRef({
  projectId: 'project:prompt-clarification-continuation',
  canonicalRoot: '/workspace/prompt-clarification-continuation',
})

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-prompt-clarification-')),
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

const readUserPromptSubmitFixture = Effect.fn('readUserPromptSubmitFixture')(function* (
  prompt: string,
  turnId: string,
) {
  const raw = yield* Effect.promise(() =>
    readFile(new URL('../../../fixtures/hooks/user-prompt-submit.json', import.meta.url), 'utf8'),
  )
  const fixture = yield* decodeCodexHostEventFixture(JSON.parse(raw) as unknown)
  return yield* decodeCodexUserPromptSubmitEvent({
    ...fixture.payload,
    prompt,
    turn_id: turnId,
  })
})

function evaluatePrompt(dataRoot: string, operationId: string, prompt: string, turnId: string) {
  return Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    const hostEvent = yield* readUserPromptSubmitFixture(prompt, turnId)
    const command = new SemanticRuntimeEvaluatePromptCommand({
      requestId: `request:${operationId}`,
      dataRoot,
      projectRef,
      operationId,
      hostEvent,
    })
    const pending = yield* ledger.pendingForSession(dataRoot, projectRef, 'codex-session:host-contract')
    const commit = pending === undefined
      ? yield* ledger.recordPrompt(command)
      : yield* ledger.resolveClarification(command, pending)
    return new SemanticRuntimeEvaluatePromptResponse({
      apiVersion: 'semantic-runtime-facade.v1',
      requestId: `request:${operationId}`,
      effect: 'ledger-write',
      asOfSeq: commit.records.length,
      sourceRecordIds: commit.records.map(record => record.recordId),
      committedRecordIds: commit.records.map(record => record.recordId),
      result: commit.decision,
    })
  }).pipe(Effect.provide(PromptGateLedger.layerLive))
}

function promptGateRecords(dataRoot: string) {
  return Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    return yield* ledger.records(dataRoot, projectRef)
  }).pipe(Effect.provide(PromptGateLedger.layerLive))
}

function pendingForSession(dataRoot: string) {
  return Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    return yield* ledger.pendingForSession(dataRoot, projectRef, 'codex-session:host-contract')
  }).pipe(Effect.provide(PromptGateLedger.layerLive))
}

function resolvePromptWithPending(
  dataRoot: string,
  operationId: string,
  prompt: string,
  turnId: string,
  pending: PendingClarification,
) {
  return Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    const hostEvent = yield* readUserPromptSubmitFixture(prompt, turnId)
    const command = new SemanticRuntimeEvaluatePromptCommand({
      requestId: `request:${operationId}`,
      dataRoot,
      projectRef,
      operationId,
      hostEvent,
    })
    const commit = yield* ledger.resolveClarification(command, pending)
    return new SemanticRuntimeEvaluatePromptResponse({
      apiVersion: 'semantic-runtime-facade.v1',
      requestId: `request:${operationId}`,
      effect: 'ledger-write',
      asOfSeq: commit.records.length,
      sourceRecordIds: commit.records.map(record => record.recordId),
      committedRecordIds: commit.records.map(record => record.recordId),
      result: commit.decision,
    })
  }).pipe(Effect.provide(PromptGateLedger.layerLive))
}

function blockClarifyResult(response: SemanticRuntimeEvaluatePromptResponse) {
  if (response.result.decisionKind !== 'blockClarify') {
    assert.fail('Expected Prompt Gate blockClarify result')
  }
  return response.result
}

function resolvedResult(response: SemanticRuntimeEvaluatePromptResponse) {
  assert.strictEqual(response.result.decisionKind, 'clarificationResolved')
  if (response.result.decisionKind !== 'clarificationResolved') {
    assert.fail('Expected Prompt Gate clarificationResolved result')
  }
  return response.result
}

describe('Prompt Gate clarification continuation vertical', () => {
  it.effect('blocks ambiguous improve prompt and persists pending clarification state', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const response = yield* evaluatePrompt(
        dataRoot,
        'operation:clarify-ambiguous',
        'check and improve this document',
        'codex-turn:clarify-001',
      )
      const result = blockClarifyResult(response)
      const records = yield* promptGateRecords(dataRoot)
      const pendingRecord = records.find(record => record.recordKind === 'PendingClarificationRecorded')

      assert.strictEqual(result.reason, 'behavior_changing_action_ambiguity')
      assert.isTrue(result.question.includes('validate/review'))
      assert.isTrue(result.question.includes('rewrite/improve'))
      assert.strictEqual(result.candidates.length, 2)
      assert.ok(pendingRecord)
      if (pendingRecord === undefined || pendingRecord.recordKind !== 'PendingClarificationRecorded') {
        assert.fail('Expected pending clarification record')
      }
      assert.strictEqual(pendingRecord.pending.caseId, result.caseId)
      assert.strictEqual(pendingRecord.pending.projectRef.projectId, projectRef.projectId)
      assert.strictEqual(pendingRecord.pending.hostSessionId, 'codex-session:host-contract')
      assert.strictEqual(pendingRecord.pending.blockedTurnId, 'codex-turn:clarify-001')
      assert.strictEqual(pendingRecord.pending.questionId, result.questionId)
      assert.strictEqual(pendingRecord.pending.candidates.length, 2)
      assert.strictEqual(pendingRecord.pending.attempts, 1)
    }))

  it.effect('resolves the next same-session answer into the same Case idempotently', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const clarify = yield* evaluatePrompt(
        dataRoot,
        'operation:clarify-before-resolution',
        'check and improve this document',
        'codex-turn:clarify-010',
      )
      const clarifyResult = blockClarifyResult(clarify)
      const pending = yield* pendingForSession(dataRoot)
      assert.ok(pending)
      assert.strictEqual(pending.caseId, clarifyResult.caseId)

      const resolution = yield* resolvePromptWithPending(
        dataRoot,
        'operation:clarify-resolution',
        'Validate only; do not edit it.',
        'codex-turn:clarify-011',
        pending,
      )
      const resolutionResult = resolvedResult(resolution)
      const recordsAfterResolution = yield* promptGateRecords(dataRoot)
      const retry = yield* resolvePromptWithPending(
        dataRoot,
        'operation:clarify-resolution',
        'Validate only; do not edit it.',
        'codex-turn:clarify-011',
        pending,
      )
      const retryResult = resolvedResult(retry)
      const recordsAfterRetry = yield* promptGateRecords(dataRoot)

      assert.strictEqual(resolutionResult.caseId, clarifyResult.caseId)
      assert.strictEqual(resolutionResult.action, 'validate')
      assert.deepStrictEqual(resolutionResult.prohibitedActions, ['rewrite'])
      assert.strictEqual(resolutionResult.additionalContext.caseId, clarifyResult.caseId)
      assert.strictEqual(retryResult.caseId, resolutionResult.caseId)
      assert.deepStrictEqual(retry.committedRecordIds, resolution.committedRecordIds)
      assert.strictEqual(recordsAfterRetry.length, recordsAfterResolution.length)
      assert.strictEqual(
        recordsAfterResolution.filter(record => record.recordKind === 'CaseOpened').length,
        1,
      )
      assert.strictEqual(
        recordsAfterResolution.some(record =>
          record.recordKind === 'ClarificationAnswerObserved'
          && record.pending.caseId === clarifyResult.caseId
          && record.resolutionKind === 'resolved',
        ),
        true,
      )
      assert.strictEqual(
        recordsAfterResolution.some(record =>
          record.recordKind === 'CaseTransitioned'
          && record.caseId === clarifyResult.caseId
          && record.toState === 'resolved',
        ),
        true,
      )
    }))
})
