import { readFile } from 'node:fs/promises'
import { assert, describe, it } from '@effect/vitest'
import { ActionGate, ActionGateRequest } from '@harmony/headless-runtime/runtime/action-gate'
import { hostHookOutcomeIntegrationHealth } from '@harmony/headless-runtime/runtime/integration-health'
import { SemanticRuntimeFacade } from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  decodeCodexHostEventFixture,
  decodeCodexPreToolUseApplyPatchEvent,
  decodeCodexPreToolUseMcpEvent,
  decodeCodexUserPromptSubmitEvent,
} from '@harmony/semantic-model/schema/host-event'
import { HostHookFailureOutcome, IntegrationHostHookProvenance } from '@harmony/semantic-model/schema/integration-health'
import { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeEvaluatePromptCommand,
  SemanticRuntimeStatusQuery,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect } from 'effect'

const unavailableDataRoot = 'relative-runtime-data-root'

const projectRef = new ProjectRef({
  projectId: 'project:storage-degraded',
  canonicalRoot: '/workspace/storage-degraded',
})

function runFacade<A, E>(effect: Effect.Effect<A, E, SemanticRuntimeFacade>) {
  return effect.pipe(Effect.provide(SemanticRuntimeFacade.layerLive))
}

function runActionGate<A, E>(effect: Effect.Effect<A, E, ActionGate>) {
  return effect.pipe(Effect.provide(ActionGate.layerLive))
}

const readFixture = Effect.fn('readFixture')(function* (name: string) {
  const raw = yield* Effect.promise(() =>
    readFile(new URL(`../../../fixtures/hooks/${name}`, import.meta.url), 'utf8'),
  )
  return yield* decodeCodexHostEventFixture(JSON.parse(raw) as unknown)
})

function semanticStatus() {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.status(new SemanticRuntimeStatusQuery({
      requestId: 'request:storage-degraded-status',
      dataRoot: unavailableDataRoot,
      projectRef,
    }))
  }))
}

function evaluatePrompt(managedProject: boolean) {
  return runFacade(Effect.gen(function* () {
    const fixture = yield* readFixture('user-prompt-submit.json')
    const hostEvent = yield* decodeCodexUserPromptSubmitEvent(fixture.payload)
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.evaluateAndRecordPrompt(new SemanticRuntimeEvaluatePromptCommand({
      requestId: `request:storage-degraded-prompt-${managedProject ? 'managed' : 'unmanaged'}`,
      dataRoot: unavailableDataRoot,
      projectRef,
      managedProject,
      operationId: `operation:storage-degraded-prompt-${managedProject ? 'managed' : 'unmanaged'}`,
      hostEvent,
    }))
  }))
}

function evaluateActionGate(managedProject: boolean, fixtureName: string) {
  return runActionGate(Effect.gen(function* () {
    const fixture = yield* readFixture(fixtureName)
    const event = fixtureName.includes('mcp')
      ? yield* decodeCodexPreToolUseMcpEvent(fixture.payload)
      : yield* decodeCodexPreToolUseApplyPatchEvent(fixture.payload)
    const actionGate = yield* ActionGate
    return yield* actionGate.evaluate(new ActionGateRequest({
      dataRoot: unavailableDataRoot,
      projectRef,
      managedProject,
      event,
    }))
  }))
}

describe('storage degraded integration health vertical', () => {
  it.effect('reports unavailable storage as degraded ledger_unavailable health with ledger provenance', () =>
    Effect.gen(function* () {
      const response = yield* semanticStatus()

      assert.strictEqual(response.result.resultKind, 'runtime_status')
      assert.strictEqual(response.result.integrationHealth.status, 'degraded')
      assert.strictEqual(response.result.integrationHealth.reason, 'ledger_unavailable')
      assert.strictEqual(response.result.integrationHealth.ledgerProvenance?.ledgerKind, 'runtime-data')
      assert.strictEqual(response.result.integrationHealth.ledgerProvenance?.dataRoot, unavailableDataRoot)
      assert.strictEqual(response.result.integrationHealth.ledgerProvenance?.projectRef.projectId, projectRef.projectId)
      assert.deepStrictEqual(response.result.integrationHealth.notes.map(note => note.reason), ['ledger_unavailable'])
      assert.strictEqual(response.result.probeRecordCount, 0)
      assert.deepStrictEqual(response.committedRecordIds, [])
    }))

  it.effect('blocks managed Prompt Gate work when required storage is unavailable', () =>
    Effect.gen(function* () {
      const response = yield* evaluatePrompt(true)

      assert.strictEqual(response.effect, 'pure')
      assert.deepStrictEqual(response.committedRecordIds, [])
      assert.strictEqual(response.result.decisionKind, 'block')
      if (response.result.decisionKind !== 'block') {
        assert.fail('Expected Prompt Gate storage block')
      }
      assert.strictEqual(response.result.reason, 'ledger_unavailable')
      assert.strictEqual(response.result.integrationHealth.status, 'degraded')
      assert.strictEqual(response.result.integrationHealth.ledgerProvenance?.ledgerKind, 'prompt-gate')
    }))

  it.effect('passes unmanaged Prompt Gate work as an explicit no-op without storage', () =>
    Effect.gen(function* () {
      const response = yield* evaluatePrompt(false)

      assert.strictEqual(response.effect, 'pure')
      assert.deepStrictEqual(response.sourceRecordIds, [])
      assert.deepStrictEqual(response.committedRecordIds, [])
      assert.strictEqual(response.result.decisionKind, 'noop')
      if (response.result.decisionKind !== 'noop') {
        assert.fail('Expected unmanaged Prompt Gate no-op')
      }
      assert.strictEqual(response.result.reason, 'unmanaged_project')
      assert.strictEqual(response.result.storagePolicy, 'no_storage_required')
    }))

  it.effect('denies managed writes when ledger is unavailable and allows read-only queries by explicit policy', () =>
    Effect.gen(function* () {
      const writeDecision = yield* evaluateActionGate(true, 'pre-tool-use-apply-patch.json')
      assert.strictEqual(writeDecision.decisionKind, 'deny')
      if (writeDecision.decisionKind !== 'deny') {
        assert.fail('Expected storage-unavailable write deny')
      }
      assert.strictEqual(writeDecision.reason, 'runtime_storage_unavailable')
      assert.strictEqual(writeDecision.ledgerUnavailablePolicy, 'deny_writes_without_ledger')
      assert.strictEqual(writeDecision.integrationHealth?.reason, 'ledger_unavailable')

      const readOnlyDecision = yield* evaluateActionGate(true, 'pre-tool-use-mcp.json')
      assert.strictEqual(readOnlyDecision.decisionKind, 'allow')
      if (readOnlyDecision.decisionKind !== 'allow') {
        assert.fail('Expected read-only action allow')
      }
      assert.strictEqual(readOnlyDecision.reason, 'read_only_action')
      assert.strictEqual(readOnlyDecision.ledgerUnavailablePolicy, 'allow_read_only_without_ledger')
    }))

  it.effect('represents host hook timeout, crash, and malformed output as non-guarantee health notes', () =>
    Effect.gen(function* () {
      const provenance = new IntegrationHostHookProvenance({
        eventName: 'PreToolUse',
        command: 'harmony-action-gate',
        sessionId: 'session:storage-degraded',
        turnId: 'turn:storage-degraded',
        toolName: 'apply_patch',
      })
      const reports = [
        hostHookOutcomeIntegrationHealth(new HostHookFailureOutcome({
          outcomeKind: 'timeout',
          message: 'Hook timed out before returning a decision.',
          hostProvenance: new IntegrationHostHookProvenance({
            ...provenance,
            timeoutMs: 500,
          }),
        })),
        hostHookOutcomeIntegrationHealth(new HostHookFailureOutcome({
          outcomeKind: 'crash',
          message: 'Hook process exited before producing a decision.',
          hostProvenance: new IntegrationHostHookProvenance({
            ...provenance,
            exitCode: 1,
          }),
        })),
        hostHookOutcomeIntegrationHealth(new HostHookFailureOutcome({
          outcomeKind: 'malformed_output',
          message: 'Hook stdout was not valid JSON.',
          hostProvenance: provenance,
        })),
      ]

      assert.deepStrictEqual(reports.map(report => report.status), ['degraded', 'degraded', 'degraded'])
      assert.deepStrictEqual(reports.map(report => report.reason), [
        'host_non_guarantee',
        'host_non_guarantee',
        'host_non_guarantee',
      ])
      assert.deepStrictEqual(reports.map(report => report.notes[0]?.reason), [
        'host_timeout',
        'host_crash',
        'host_malformed_output',
      ])
      const notes = reports.map((report) => {
        const note = report.notes[0]
        if (note === undefined) {
          assert.fail('Expected integration-health note')
        }
        return note
      })
      assert.strictEqual(notes.every(note => note.hostProvenance?.eventName === 'PreToolUse'), true)
    }))
})
