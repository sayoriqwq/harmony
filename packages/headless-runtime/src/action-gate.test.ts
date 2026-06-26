import { readFile } from 'node:fs/promises'
import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import { ActionGate, ActionGateRequest } from '@harmony/headless-runtime/runtime/action-gate'
import { SemanticRuntimeFacade } from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  decodeCodexHostEventFixture,
  decodeCodexPreToolUseApplyPatchEvent,
  decodeCodexPreToolUseMcpEvent,
  decodeCodexUserPromptSubmitEvent,
} from '@harmony/semantic-model/schema/host-event'
import { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import { SemanticRuntimeEvaluatePromptCommand } from '@harmony/semantic-model/schema/runtime-facade'
import { Effect } from 'effect'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

const projectRef = new ProjectRef({
  projectId: 'project:action-gate',
  canonicalRoot: '/workspace/action-gate',
})

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-action-gate-')),
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

function runActionGate<A, E>(effect: Effect.Effect<A, E, ActionGate>) {
  return effect.pipe(Effect.provide(ActionGate.layerLive))
}

const readFixture = Effect.fn('readFixture')(function* (name: string) {
  const raw = yield* Effect.promise(() =>
    readFile(new URL(`../../../fixtures/hooks/${name}`, import.meta.url), 'utf8'),
  )
  return yield* decodeCodexHostEventFixture(JSON.parse(raw) as unknown)
})

function createValidateOnlyCase(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const fixture = yield* readFixture('user-prompt-submit.json')
    const hostEvent = yield* decodeCodexUserPromptSubmitEvent(fixture.payload)
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.evaluateAndRecordPrompt(new SemanticRuntimeEvaluatePromptCommand({
      requestId: 'request:action-gate-case',
      dataRoot,
      projectRef,
      operationId: 'operation:action-gate-case',
      hostEvent,
    }))
  }))
}

function evaluateActionGate(dataRoot: string, event: ActionGateRequest['event']) {
  return runActionGate(Effect.gen(function* () {
    const actionGate = yield* ActionGate
    return yield* actionGate.evaluate(new ActionGateRequest({
      dataRoot,
      projectRef,
      managedProject: true,
      event,
    }))
  }))
}

describe('Action Gate apply_patch deny vertical', () => {
  it.effect('denies apply_patch for a validate-only Case through turn-to-case binding', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const promptResponse = yield* createValidateOnlyCase(dataRoot)
      const fixture = yield* readFixture('pre-tool-use-apply-patch.json')
      const applyPatchEvent = yield* decodeCodexPreToolUseApplyPatchEvent(fixture.payload)

      const decision = yield* evaluateActionGate(dataRoot, applyPatchEvent)

      if (promptResponse.result.decisionKind !== 'pass') {
        assert.fail('Expected Prompt Gate pass result')
      }
      assert.strictEqual(decision.decisionKind, 'deny')
      if (decision.decisionKind !== 'deny') {
        assert.fail('Expected apply_patch to deny')
      }
      assert.strictEqual(decision.reason, 'prohibited_action')
      assert.strictEqual(decision.supportedPath, 'apply_patch')
      assert.strictEqual(decision.toolName, 'apply_patch')
      assert.strictEqual(decision.attemptedAction, 'rewrite')
      assert.strictEqual(decision.caseId, promptResponse.result.caseId)
    }))

  it.effect('allows read-only MCP query actions under explicit policy', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const fixture = yield* readFixture('pre-tool-use-mcp.json')
      const mcpEvent = yield* decodeCodexPreToolUseMcpEvent(fixture.payload)

      const decision = yield* evaluateActionGate(dataRoot, mcpEvent)

      assert.strictEqual(decision.decisionKind, 'allow')
      assert.strictEqual(decision.reason, 'read_only_action')
      assert.strictEqual(decision.supportedPath, 'mcp_query')
    }))

  it.effect('does not fall back to the session current Case when turn binding is missing', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      yield* createValidateOnlyCase(dataRoot)
      const fixture = yield* readFixture('pre-tool-use-apply-patch.json')
      const applyPatchEvent = yield* decodeCodexPreToolUseApplyPatchEvent({
        ...fixture.payload,
        turn_id: 'codex-turn:unbound',
      })

      const decision = yield* evaluateActionGate(dataRoot, applyPatchEvent)

      assert.strictEqual(decision.decisionKind, 'deny')
      if (decision.decisionKind !== 'deny') {
        assert.fail('Expected unbound apply_patch to deny')
      }
      assert.strictEqual(decision.reason, 'missing_turn_binding')
      assert.strictEqual(decision.caseId, undefined)
    }))

  it.effect('denies writes when runtime storage is unavailable for a managed project', () =>
    Effect.gen(function* () {
      const fixture = yield* readFixture('pre-tool-use-apply-patch.json')
      const applyPatchEvent = yield* decodeCodexPreToolUseApplyPatchEvent(fixture.payload)

      const decision = yield* evaluateActionGate('relative-data-root', applyPatchEvent)

      assert.strictEqual(decision.decisionKind, 'deny')
      if (decision.decisionKind !== 'deny') {
        assert.fail('Expected unavailable storage write to deny')
      }
      assert.strictEqual(decision.reason, 'runtime_storage_unavailable')
      assert.strictEqual(decision.toolName, 'apply_patch')
    }))
})
