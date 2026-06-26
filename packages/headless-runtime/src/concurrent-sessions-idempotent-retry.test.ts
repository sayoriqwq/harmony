import type {
  SemanticRuntimeEvaluatePromptResponse,
} from '@harmony/semantic-model/schema/runtime-facade'
import { readFile } from 'node:fs/promises'
import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import { ActionGate, ActionGateRequest } from '@harmony/headless-runtime/runtime/action-gate'
import { PromptGateLedger, PromptGateLedgerBusyError } from '@harmony/headless-runtime/runtime/prompt-gate-ledger'
import { RuntimeDataLocator } from '@harmony/headless-runtime/runtime/runtime-data-locator'
import { SemanticRuntimeFacade } from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  decodeCodexHostEventFixture,
  decodeCodexPreToolUseApplyPatchEvent,
  decodeCodexUserPromptSubmitEvent,
} from '@harmony/semantic-model/schema/host-event'
import { ProjectRef, RuntimeDataLocatorRequest } from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeEvaluatePromptCommand,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect } from 'effect'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-concurrency-idempotency-')),
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

function projectRef(label: string, worktreeId?: string) {
  return new ProjectRef({
    projectId: 'project:concurrency-idempotency',
    canonicalRoot: `/workspace/${label}`,
    ...(worktreeId !== undefined ? { worktreeId } : {}),
  })
}

const defaultProjectRef = projectRef('concurrency-idempotency')

function runFacade<A, E>(effect: Effect.Effect<A, E, SemanticRuntimeFacade>) {
  return effect.pipe(Effect.provide(SemanticRuntimeFacade.layerLive))
}

function runPromptLedger<A, E>(effect: Effect.Effect<A, E, PromptGateLedger>) {
  return effect.pipe(Effect.provide(PromptGateLedger.layerLive))
}

function runActionGate<A, E>(effect: Effect.Effect<A, E, ActionGate>) {
  return effect.pipe(Effect.provide(ActionGate.layerLive))
}

function runLocator<A, E>(effect: Effect.Effect<A, E, RuntimeDataLocator>) {
  return effect.pipe(Effect.provide(RuntimeDataLocator.layerLive))
}

const readUserPromptSubmitFixture = Effect.fn('readUserPromptSubmitFixture')(function* (
  prompt: string,
  sessionId: string,
  turnId: string,
) {
  const raw = yield* Effect.promise(() =>
    readFile(new URL('../../../fixtures/hooks/user-prompt-submit.json', import.meta.url), 'utf8'),
  )
  const fixture = yield* decodeCodexHostEventFixture(JSON.parse(raw) as unknown)
  return yield* decodeCodexUserPromptSubmitEvent({
    ...fixture.payload,
    session_id: sessionId,
    prompt,
    turn_id: turnId,
  })
})

const readApplyPatchFixture = Effect.fn('readApplyPatchFixture')(function* (
  sessionId: string,
  turnId: string,
  toolUseId: string,
) {
  const raw = yield* Effect.promise(() =>
    readFile(new URL('../../../fixtures/hooks/pre-tool-use-apply-patch.json', import.meta.url), 'utf8'),
  )
  const fixture = yield* decodeCodexHostEventFixture(JSON.parse(raw) as unknown)
  return yield* decodeCodexPreToolUseApplyPatchEvent({
    ...fixture.payload,
    session_id: sessionId,
    turn_id: turnId,
    tool_use_id: toolUseId,
  })
})

function evaluatePrompt(
  dataRoot: string,
  ref: ProjectRef,
  operationId: string,
  prompt: string,
  sessionId: string,
  turnId: string,
) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    const hostEvent = yield* readUserPromptSubmitFixture(prompt, sessionId, turnId)
    return yield* facade.evaluateAndRecordPrompt(new SemanticRuntimeEvaluatePromptCommand({
      requestId: `request:${operationId}`,
      dataRoot,
      projectRef: ref,
      operationId,
      hostEvent,
    }))
  }))
}

function recordPromptDirect(
  dataRoot: string,
  ref: ProjectRef,
  operationId: string,
  prompt: string,
  sessionId: string,
  turnId: string,
) {
  return runPromptLedger(Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    const hostEvent = yield* readUserPromptSubmitFixture(prompt, sessionId, turnId)
    return yield* ledger.recordPrompt(new SemanticRuntimeEvaluatePromptCommand({
      requestId: `request:${operationId}`,
      dataRoot,
      projectRef: ref,
      operationId,
      hostEvent,
    }))
  }))
}

function promptGateRecords(dataRoot: string, ref: ProjectRef) {
  return runPromptLedger(Effect.gen(function* () {
    const ledger = yield* PromptGateLedger
    return yield* ledger.records(dataRoot, ref)
  }))
}

function actionGateRecords(dataRoot: string, ref: ProjectRef) {
  return runActionGate(Effect.gen(function* () {
    const actionGate = yield* ActionGate
    return yield* actionGate.records(dataRoot, ref)
  }))
}

function evaluateActionGate(
  dataRoot: string,
  ref: ProjectRef,
  event: ActionGateRequest['event'],
  operationId?: string,
) {
  return runActionGate(Effect.gen(function* () {
    const actionGate = yield* ActionGate
    return yield* actionGate.evaluate(new ActionGateRequest({
      dataRoot,
      projectRef: ref,
      managedProject: true,
      ...(operationId !== undefined ? { operationId } : {}),
      event,
    }))
  }))
}

function passResult(response: SemanticRuntimeEvaluatePromptResponse) {
  if (response.result.decisionKind !== 'pass') {
    assert.fail(`Expected pass decision, received ${response.result.decisionKind}`)
  }
  return response.result
}

function blockClarifyResult(response: SemanticRuntimeEvaluatePromptResponse) {
  if (response.result.decisionKind !== 'blockClarify') {
    assert.fail(`Expected blockClarify decision, received ${response.result.decisionKind}`)
  }
  return response.result
}

function deferredDecisionKind(decision: Awaited<ReturnType<typeof evaluateActionGate> extends Effect.Effect<infer A, infer _E, infer _R> ? A : never>) {
  return decision.decisionKind
}

function promptGateLockPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'prompt-gate-ledger.lock')
}

function actionGateLockPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'action-gate-ledger.lock')
}

function locateProjectDataRoot(dataRoot: string, ref: ProjectRef) {
  return runLocator(Effect.gen(function* () {
    const locator = yield* RuntimeDataLocator
    const location = yield* locator.locate(new RuntimeDataLocatorRequest({
      dataRoot,
      projectRef: ref,
    }))
    return location.projectDataRoot
  }))
}

function writeLockFile(lockPath: string) {
  return Effect.tryPromise({
    try: () => Fs.writeFile(lockPath, 'busy', { flag: 'wx' }),
    catch: nodeFileSystemError('writeFile', lockPath),
  })
}

describe('Concurrent sessions and idempotent retry vertical', () => {
  it.effect('keeps interleaved prompt and action flows for different sessions attached to independent Cases', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const sessionA = 'codex-session:concurrent-a'
      const sessionB = 'codex-session:concurrent-b'

      const clarifyA = yield* evaluatePrompt(
        dataRoot,
        defaultProjectRef,
        'operation:session-a-ambiguous',
        'check and improve this document',
        sessionA,
        'codex-turn:session-a-1',
      )
      const clarifyAResult = blockClarifyResult(clarifyA)

      const passB = yield* evaluatePrompt(
        dataRoot,
        defaultProjectRef,
        'operation:session-b-pass',
        'check this document; do not edit it',
        sessionB,
        'codex-turn:session-b-1',
      )
      const passBResult = passResult(passB)

      assert.notStrictEqual(passBResult.caseId, clarifyAResult.caseId)

      const actionEventB = yield* readApplyPatchFixture(
        sessionB,
        'codex-turn:session-b-1',
        'codex-tool:session-b-apply-patch',
      )
      const actionDecisionB = yield* evaluateActionGate(
        dataRoot,
        defaultProjectRef,
        actionEventB,
        'operation:session-b-action',
      )

      assert.strictEqual(actionDecisionB.decisionKind, 'deny')
      if (actionDecisionB.decisionKind !== 'deny') {
        assert.fail('Expected session B apply_patch to deny')
      }
      assert.strictEqual(actionDecisionB.caseId, passBResult.caseId)
      assert.notStrictEqual(actionDecisionB.caseId, clarifyAResult.caseId)

      const records = yield* promptGateRecords(dataRoot, defaultProjectRef)
      const sessionABinding = records.find(record =>
        record.recordKind === 'PendingClarificationRecorded'
        && record.pending.hostSessionId === sessionA,
      )
      const sessionBBinding = records.find(record =>
        record.recordKind === 'HostTurnBoundToCase'
        && record.hostSessionId === sessionB
        && record.hostTurnId === 'codex-turn:session-b-1',
      )
      assert.ok(sessionABinding)
      assert.ok(sessionBBinding)
      if (sessionBBinding === undefined || sessionBBinding.recordKind !== 'HostTurnBoundToCase') {
        assert.fail('Expected session B turn binding')
      }
      assert.strictEqual(sessionBBinding.caseId, passBResult.caseId)
    }))

  it.effect('returns the prior prompt commit when an ambiguous prompt operation is retried', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const first = yield* evaluatePrompt(
        dataRoot,
        defaultProjectRef,
        'operation:ambiguous-retry',
        'check and improve this document',
        'codex-session:retry-prompt',
        'codex-turn:retry-prompt-1',
      )
      const firstRecords = yield* promptGateRecords(dataRoot, defaultProjectRef)
      const retry = yield* evaluatePrompt(
        dataRoot,
        defaultProjectRef,
        'operation:ambiguous-retry',
        'check and improve this document',
        'codex-session:retry-prompt',
        'codex-turn:retry-prompt-1',
      )
      const retryRecords = yield* promptGateRecords(dataRoot, defaultProjectRef)

      assert.deepStrictEqual(retry.committedRecordIds, first.committedRecordIds)
      assert.deepStrictEqual(retry.sourceRecordIds, first.sourceRecordIds)
      assert.strictEqual(retryRecords.length, firstRecords.length)
      assert.strictEqual(retryRecords.filter(record => record.recordKind === 'PromptObserved').length, 1)
      assert.strictEqual(retryRecords.filter(record => record.recordKind === 'CaseOpened').length, 1)
      assert.strictEqual(retryRecords.filter(record => record.recordKind === 'PromptGateDecisionRecorded').length, 1)
    }))

  it.effect('returns the prior action commit when a state-changing action operation is retried', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const prompt = yield* evaluatePrompt(
        dataRoot,
        defaultProjectRef,
        'operation:action-retry-case',
        'check this document; do not edit it',
        'codex-session:retry-action',
        'codex-turn:retry-action-1',
      )
      const promptResult = passResult(prompt)
      const actionEvent = yield* readApplyPatchFixture(
        'codex-session:retry-action',
        'codex-turn:retry-action-1',
        'codex-tool:retry-action-apply-patch',
      )

      const first = yield* evaluateActionGate(
        dataRoot,
        defaultProjectRef,
        actionEvent,
        'operation:state-changing-action-retry',
      )
      const recordsAfterFirst = yield* actionGateRecords(dataRoot, defaultProjectRef)
      const retry = yield* evaluateActionGate(
        dataRoot,
        defaultProjectRef,
        actionEvent,
        'operation:state-changing-action-retry',
      )
      const recordsAfterRetry = yield* actionGateRecords(dataRoot, defaultProjectRef)

      assert.deepStrictEqual(retry, first)
      assert.strictEqual(recordsAfterRetry.length, recordsAfterFirst.length)
      assert.strictEqual(recordsAfterRetry.length, 1)
      assert.strictEqual(recordsAfterRetry[0]?.operationId, 'operation:state-changing-action-retry')
      assert.strictEqual(recordsAfterRetry[0]?.decision.decisionKind, 'deny')
      if (recordsAfterRetry[0]?.decision.decisionKind !== 'deny') {
        assert.fail('Expected recorded action decision to deny')
      }
      assert.strictEqual(recordsAfterRetry[0].decision.caseId, promptResult.caseId)
    }))

  it.effect('reports ledger busy as typed retry or deferred output instead of silent success', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const projectDataRoot = yield* locateProjectDataRoot(dataRoot, defaultProjectRef)

      yield* writeLockFile(promptGateLockPath(projectDataRoot))
      const promptResult = yield* recordPromptDirect(
        dataRoot,
        defaultProjectRef,
        'operation:busy-prompt',
        'check this document; do not edit it',
        'codex-session:busy',
        'codex-turn:busy-prompt',
      ).pipe(
        Effect.match({
          onFailure: error => error,
          onSuccess: result => result,
        }),
      )

      assert.instanceOf(promptResult, PromptGateLedgerBusyError)

      yield* Effect.promise(() => Fs.rm(promptGateLockPath(projectDataRoot), { force: true }))
      const prompt = yield* evaluatePrompt(
        dataRoot,
        defaultProjectRef,
        'operation:busy-action-case',
        'check this document; do not edit it',
        'codex-session:busy',
        'codex-turn:busy-action',
      )
      passResult(prompt)

      yield* writeLockFile(actionGateLockPath(projectDataRoot))
      const actionEvent = yield* readApplyPatchFixture(
        'codex-session:busy',
        'codex-turn:busy-action',
        'codex-tool:busy-action',
      )
      const actionDecision = yield* evaluateActionGate(
        dataRoot,
        defaultProjectRef,
        actionEvent,
        'operation:busy-action',
      )

      assert.strictEqual(deferredDecisionKind(actionDecision), 'defer')
      if (actionDecision.decisionKind !== 'defer') {
        assert.fail('Expected busy action ledger to defer')
      }
      assert.strictEqual(actionDecision.reason, 'ledger_busy')
      assert.isTrue(actionDecision.retryAfterMs > 0)
    }))

  it.effect('keeps default and worktree ProjectRef identities separate under one data root', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const defaultRef = projectRef('concurrency-idempotency')
      const worktreeRef = projectRef('concurrency-idempotency-worktree', 'worktree:concurrency-idempotency')

      const defaultPrompt = yield* evaluatePrompt(
        dataRoot,
        defaultRef,
        'operation:same-id-different-worktree',
        'check this document; do not edit it',
        'codex-session:default-worktree',
        'codex-turn:default-worktree',
      )
      const worktreePrompt = yield* evaluatePrompt(
        dataRoot,
        worktreeRef,
        'operation:same-id-different-worktree',
        'check this document; do not edit it',
        'codex-session:named-worktree',
        'codex-turn:named-worktree',
      )

      passResult(defaultPrompt)
      passResult(worktreePrompt)

      const defaultRecords = yield* promptGateRecords(dataRoot, defaultRef)
      const worktreeRecords = yield* promptGateRecords(dataRoot, worktreeRef)

      assert.strictEqual(defaultRecords.length, 4)
      assert.strictEqual(worktreeRecords.length, 4)
      assert.strictEqual(defaultRecords.every(record => record.projectRef.worktreeId === undefined), true)
      assert.strictEqual(
        worktreeRecords.every(record => record.projectRef.worktreeId === 'worktree:concurrency-idempotency'),
        true,
      )

      const defaultActionEvent = yield* readApplyPatchFixture(
        'codex-session:default-worktree',
        'codex-turn:default-worktree',
        'codex-tool:default-worktree-action',
      )
      const worktreeActionEvent = yield* readApplyPatchFixture(
        'codex-session:named-worktree',
        'codex-turn:named-worktree',
        'codex-tool:named-worktree-action',
      )

      yield* evaluateActionGate(dataRoot, defaultRef, defaultActionEvent, 'operation:same-action-different-worktree')
      yield* evaluateActionGate(dataRoot, worktreeRef, worktreeActionEvent, 'operation:same-action-different-worktree')

      const defaultActionRecords = yield* actionGateRecords(dataRoot, defaultRef)
      const worktreeActionRecords = yield* actionGateRecords(dataRoot, worktreeRef)
      assert.strictEqual(defaultActionRecords.length, 1)
      assert.strictEqual(worktreeActionRecords.length, 1)
      assert.strictEqual(defaultActionRecords[0]?.projectRef.worktreeId, undefined)
      assert.strictEqual(worktreeActionRecords[0]?.projectRef.worktreeId, 'worktree:concurrency-idempotency')
    }))
})
