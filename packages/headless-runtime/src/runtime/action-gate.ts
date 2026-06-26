import type {
  ActionGateDecisionRecordedRecord as ActionGateDecisionRecordedRecordType,
  ActionGateDecisionType,
  ActionGateLedgerRecordType,
} from '@harmony/semantic-model/schema/action-gate'
import type { CodexPreToolUseEventType } from '@harmony/semantic-model/schema/host-event'
import type { CaseId } from '@harmony/semantic-model/schema/ids'
import type { PromptGateCaseOpenedRecord, PromptGateLedgerRecordType } from '@harmony/semantic-model/schema/prompt-gate'
import type { FileHandle } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import {
  ActionGateAllowDecision,
  ActionGateDecision,
  ActionGateDecisionRecordedRecord,
  ActionGateDeferDecision,
  ActionGateDenyDecision,
  ActionGateLedgerRecord,
} from '@harmony/semantic-model/schema/action-gate'
import { CodexPreToolUseEvent } from '@harmony/semantic-model/schema/host-event'
import { ProjectRef, RuntimeDataLocatorRequest } from '@harmony/semantic-model/schema/runtime-data'
import { Context, Effect, Layer, Schema } from 'effect'
import { deterministicInstant } from './constants.ts'
import { ledgerUnavailableIntegrationHealth } from './integration-health.ts'
import { PromptGateLedger, PromptGateLedgerError } from './prompt-gate-ledger.ts'
import { RuntimeDataAccessError, RuntimeDataLocator } from './runtime-data-locator.ts'
import {
  hasErrorCode,
  causeMessage as nodeCauseMessage,
  nodeFileSystemError,
} from './shared/errors.ts'

export class ActionGateRequest extends Schema.Class<ActionGateRequest>(
  'harmony.headless-runtime/ActionGateRequest',
)({
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  managedProject: Schema.Boolean,
  operationId: Schema.optionalKey(Schema.NonEmptyString),
  event: CodexPreToolUseEvent,
}) {}

export class ActionGateLedgerError extends Schema.TaggedErrorClass<ActionGateLedgerError>()(
  'ActionGateLedgerError',
  {
    operation: Schema.Literals([
      'append-action-gate-records',
      'read-action-gate-records',
      'decode-action-gate-record',
    ]),
    path: Schema.String,
    message: Schema.String,
  },
) {}

export class ActionGateLedgerBusyError extends Schema.TaggedErrorClass<ActionGateLedgerBusyError>()(
  'ActionGateLedgerBusyError',
  {
    operation: Schema.Literal('append-action-gate-records'),
    path: Schema.String,
    retryAfterMs: Schema.Number,
    message: Schema.String,
  },
) {}

const ledgerLockMaxAttempts = 5
const ledgerBusyRetryAfterMs = 25

function causeMessage(cause: unknown): string {
  return nodeCauseMessage(cause)
}

function actionGateLedgerPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'action-gate-ledger.jsonl')
}

function actionGateLedgerLockPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'action-gate-ledger.lock')
}

function isNotFound(cause: unknown): boolean {
  return hasErrorCode(cause, 'ENOENT')
}

function isAlreadyExists(cause: unknown): boolean {
  return hasErrorCode(cause, 'EEXIST')
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function operationIdFor(request: ActionGateRequest) {
  return request.operationId ?? `operation:action-gate-${digest([
    request.projectRef.projectId,
    request.projectRef.worktreeId ?? 'default',
    request.event.session_id,
    request.event.turn_id,
    request.event.tool_use_id,
    request.event.tool_name,
  ].join('\n'))}`
}

function recordIdFor(operationId: string) {
  return `action-gate-record:${digest(operationId)}`
}

function actionGateRecordLines(records: ReadonlyArray<ActionGateLedgerRecordType>) {
  return `${records.map(record => JSON.stringify(record)).join('\n')}\n`
}

function deferForBusyLedger(event: CodexPreToolUseEventType, retryAfterMs: number) {
  return new ActionGateDeferDecision({
    decisionKind: 'defer',
    reason: 'ledger_busy',
    supportedPath: event.tool_name === 'apply_patch' ? 'apply_patch' : 'mcp_command',
    toolName: event.tool_name,
    retryAfterMs,
  })
}

function acquireActionLedgerLock(lockPath: string) {
  return Effect.gen(function* () {
    for (let attempt = 0; attempt < ledgerLockMaxAttempts; attempt += 1) {
      const handle = yield* Effect.tryPromise({
        try: () => Fs.open(lockPath, 'wx'),
        catch: nodeFileSystemError,
      }).pipe(
        Effect.matchEffect({
          onFailure: (cause) => {
            if (isAlreadyExists(cause)) {
              return Effect.succeed<FileHandle | undefined>(undefined)
            }
            return Effect.fail(new ActionGateLedgerError({
              operation: 'append-action-gate-records',
              path: lockPath,
              message: causeMessage(cause),
            }))
          },
          onSuccess: handle => Effect.succeed<FileHandle | undefined>(handle),
        }),
      )
      if (handle !== undefined) {
        return handle
      }
    }

    return yield* new ActionGateLedgerBusyError({
      operation: 'append-action-gate-records',
      path: lockPath,
      retryAfterMs: ledgerBusyRetryAfterMs,
      message: 'Action Gate ledger is busy; retry the same operation id after the suggested delay.',
    })
  })
}

function releaseActionLedgerLock(lockPath: string, handle: FileHandle) {
  return Effect.tryPromise({
    async try() {
      await handle.close()
      await Fs.rm(lockPath, { force: true })
    },
    catch: () => undefined,
  }).pipe(
    Effect.catch(() => Effect.succeed(undefined)),
  )
}

function withActionLedgerLock<A, E, R>(lockPath: string, effect: Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    acquireActionLedgerLock(lockPath),
    () => effect,
    handle => releaseActionLedgerLock(lockPath, handle),
  )
}

function isPromptGateCaseOpenedRecord(
  record: PromptGateLedgerRecordType,
): record is PromptGateCaseOpenedRecord {
  return record.recordKind === 'CaseOpened'
}

function isHostTurnBoundToCaseRecord(
  record: PromptGateLedgerRecordType,
): record is Extract<PromptGateLedgerRecordType, { recordKind: 'HostTurnBoundToCase' }> {
  return record.recordKind === 'HostTurnBoundToCase'
}

function isReadOnlyMcpQuery(event: CodexPreToolUseEventType) {
  return event.tool_name === 'mcp__semantic_runtime__semantic_status'
    || event.tool_name === 'mcp__semantic_runtime__semantic_get_case'
}

function writeDeniedForUnavailableStorage(
  event: CodexPreToolUseEventType,
  integrationHealth: ReturnType<typeof ledgerUnavailableIntegrationHealth>,
) {
  return new ActionGateDenyDecision({
    decisionKind: 'deny',
    reason: 'runtime_storage_unavailable',
    supportedPath: 'apply_patch',
    toolName: event.tool_name,
    attemptedAction: 'rewrite',
    ledgerUnavailablePolicy: 'deny_writes_without_ledger',
    integrationHealth,
  })
}

function denyMissingTurnBinding(event: CodexPreToolUseEventType) {
  return new ActionGateDenyDecision({
    decisionKind: 'deny',
    reason: 'missing_turn_binding',
    supportedPath: 'apply_patch',
    toolName: event.tool_name,
    attemptedAction: 'rewrite',
  })
}

function denyCaseNotFound(event: CodexPreToolUseEventType, caseId: typeof CaseId.Type) {
  return new ActionGateDenyDecision({
    decisionKind: 'deny',
    reason: 'case_not_found',
    supportedPath: 'apply_patch',
    toolName: event.tool_name,
    attemptedAction: 'rewrite',
    caseId,
  })
}

function allowReadOnly() {
  return new ActionGateAllowDecision({
    decisionKind: 'allow',
    reason: 'read_only_action',
    supportedPath: 'mcp_query',
    ledgerUnavailablePolicy: 'allow_read_only_without_ledger',
  })
}

function allowUnmanaged() {
  return new ActionGateAllowDecision({
    decisionKind: 'allow',
    reason: 'unmanaged_project',
    supportedPath: 'apply_patch',
  })
}

function hasRewriteProhibition(record: Extract<PromptGateLedgerRecordType, { recordKind: 'CaseOpened' }>) {
  return record.case.currentSemanticIr.frameInstances.some(frame =>
    frame.prohibitedActions.some(prohibited => prohibited.action === 'rewrite'),
  )
}

function evaluateApplyPatchFromRecords(
  event: CodexPreToolUseEventType,
  records: ReadonlyArray<PromptGateLedgerRecordType>,
) {
  const turnBinding = records
    .filter(isHostTurnBoundToCaseRecord)
    .find(record => record.hostTurnId === event.turn_id)
  if (turnBinding === undefined) {
    return denyMissingTurnBinding(event)
  }

  const caseRecord = records
    .filter(isPromptGateCaseOpenedRecord)
    .find(record => record.case.id === turnBinding.caseId)
  if (caseRecord === undefined) {
    return denyCaseNotFound(event, turnBinding.caseId)
  }

  if (hasRewriteProhibition(caseRecord)) {
    return new ActionGateDenyDecision({
      decisionKind: 'deny',
      reason: 'prohibited_action',
      supportedPath: 'apply_patch',
      toolName: event.tool_name,
      attemptedAction: 'rewrite',
      caseId: caseRecord.case.id,
    })
  }

  return new ActionGateAllowDecision({
    decisionKind: 'allow',
    reason: 'read_only_action',
    supportedPath: 'apply_patch',
  })
}

export class ActionGate extends Context.Service<ActionGate, {
  evaluate: (
    request: ActionGateRequest,
  ) => Effect.Effect<ActionGateDecisionType, Schema.SchemaError>
  records: (
    dataRoot: string,
    projectRef: ProjectRef,
  ) => Effect.Effect<ReadonlyArray<ActionGateLedgerRecordType>, ActionGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
}>()('harmony/headless-runtime/ActionGate') {
  static readonly layerNoDeps = Layer.effect(
    ActionGate,
    Effect.gen(function* () {
      const promptGateLedger = yield* PromptGateLedger
      const locator = yield* RuntimeDataLocator

      const records = Effect.fn('ActionGate.records')(
        function* (
          dataRoot: string,
          projectRef: ProjectRef,
        ): Effect.fn.Return<ReadonlyArray<ActionGateLedgerRecordType>, ActionGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({ dataRoot, projectRef }))
          const ledgerPath = actionGateLedgerPath(location.projectDataRoot)
          const text = yield* Effect.tryPromise({
            async try() {
              try {
                return await Fs.readFile(ledgerPath, 'utf8')
              }
              catch (cause) {
                if (isNotFound(cause)) {
                  return ''
                }
                throw cause
              }
            },
            catch: cause =>
              new ActionGateLedgerError({
                operation: 'read-action-gate-records',
                path: ledgerPath,
                message: causeMessage(cause),
              }),
          })
          const lines = text.split(/\r?\n/).filter(line => line.length > 0)
          const decodedRecords: Array<ActionGateLedgerRecordType> = []

          for (const [lineIndex, line] of lines.entries()) {
            const parsed = yield* Effect.try({
              try: () => JSON.parse(line) as unknown,
              catch: cause =>
                new ActionGateLedgerError({
                  operation: 'decode-action-gate-record',
                  path: ledgerPath,
                  message: `Invalid JSON on line ${lineIndex + 1}: ${causeMessage(cause)}`,
                }),
            })
            const record = yield* Schema.decodeUnknownEffect(ActionGateLedgerRecord)(parsed)
            if (record.projectRef.projectId === projectRef.projectId && record.projectRef.worktreeId === projectRef.worktreeId) {
              decodedRecords.push(record)
            }
          }

          return decodedRecords
        },
      )

      const appendDecisionRecord = Effect.fn('ActionGate.appendDecisionRecord')(
        function* (
          decoded: ActionGateRequest,
          operationId: string,
          decision: ActionGateDecisionType,
        ): Effect.fn.Return<ActionGateDecisionType, ActionGateLedgerError | ActionGateLedgerBusyError | RuntimeDataAccessError | Schema.SchemaError> {
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          }))
          const ledgerPath = actionGateLedgerPath(location.projectDataRoot)
          const lockPath = actionGateLedgerLockPath(location.projectDataRoot)

          return yield* withActionLedgerLock(lockPath, Effect.gen(function* () {
            const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
            const existingRecord = existingRecords.find(record => record.operationId === operationId)
            if (existingRecord !== undefined) {
              return existingRecord.decision
            }

            const record = new ActionGateDecisionRecordedRecord({
              recordKind: 'ActionGateDecisionRecorded',
              recordId: recordIdFor(operationId),
              operationId,
              recordedAt: deterministicInstant,
              projectRef: decoded.projectRef,
              hostSessionId: decoded.event.session_id,
              hostTurnId: decoded.event.turn_id,
              toolUseId: decoded.event.tool_use_id,
              toolName: decoded.event.tool_name,
              decision,
            }) satisfies ActionGateDecisionRecordedRecordType
            const encoded = yield* Schema.decodeUnknownEffect(ActionGateLedgerRecord)(record)
            yield* Effect.tryPromise({
              try: () => Fs.appendFile(ledgerPath, actionGateRecordLines([encoded]), 'utf8'),
              catch: cause =>
                new ActionGateLedgerError({
                  operation: 'append-action-gate-records',
                  path: ledgerPath,
                  message: causeMessage(cause),
                }),
            })
            return decision
          }))
        },
      )

      const evaluate = Effect.fn('ActionGate.evaluate')(
        function* (request: ActionGateRequest): Effect.fn.Return<ActionGateDecisionType, Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(ActionGateRequest)(request)
          if (isReadOnlyMcpQuery(decoded.event)) {
            return yield* Schema.decodeUnknownEffect(ActionGateDecision)(allowReadOnly())
          }
          if (!decoded.managedProject) {
            return yield* Schema.decodeUnknownEffect(ActionGateDecision)(allowUnmanaged())
          }
          if (decoded.event.tool_name !== 'apply_patch') {
            return yield* Schema.decodeUnknownEffect(ActionGateDecision)(allowReadOnly())
          }

          const records = yield* promptGateLedger.records(decoded.dataRoot, decoded.projectRef).pipe(
            Effect.catch((error: PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError) => {
              if (error instanceof PromptGateLedgerError || error instanceof RuntimeDataAccessError) {
                const integrationHealth = ledgerUnavailableIntegrationHealth(error, {
                  ledgerKind: 'prompt-gate',
                  dataRoot: decoded.dataRoot,
                  projectRef: decoded.projectRef,
                  operation: 'read-prompt-gate-records',
                })
                return Effect.succeed<ReadonlyArray<PromptGateLedgerRecordType> | ActionGateDenyDecision>(
                  writeDeniedForUnavailableStorage(decoded.event, integrationHealth),
                )
              }
              return Effect.fail(error)
            }),
          )
          if (records instanceof ActionGateDenyDecision) {
            return yield* Schema.decodeUnknownEffect(ActionGateDecision)(records)
          }

          const operationId = operationIdFor(decoded)
          const decision = yield* Schema.decodeUnknownEffect(ActionGateDecision)(
            evaluateApplyPatchFromRecords(decoded.event, records),
          )
          return yield* appendDecisionRecord(decoded, operationId, decision).pipe(
            Effect.catch((error: ActionGateLedgerError | ActionGateLedgerBusyError | RuntimeDataAccessError | Schema.SchemaError) => {
              if (error instanceof ActionGateLedgerBusyError) {
                return Schema.decodeUnknownEffect(ActionGateDecision)(deferForBusyLedger(decoded.event, error.retryAfterMs))
              }
              if (error instanceof ActionGateLedgerError || error instanceof RuntimeDataAccessError) {
                const integrationHealth = ledgerUnavailableIntegrationHealth(error, {
                  ledgerKind: 'prompt-gate',
                  dataRoot: decoded.dataRoot,
                  projectRef: decoded.projectRef,
                  operation: 'append-action-gate-records',
                })
                return Schema.decodeUnknownEffect(ActionGateDecision)(
                  writeDeniedForUnavailableStorage(decoded.event, integrationHealth),
                )
              }
              return Effect.fail(error)
            }),
          )
        },
      )

      return ActionGate.of({ evaluate, records })
    }),
  )

  static readonly layerLive = ActionGate.layerNoDeps.pipe(
    Layer.provide(PromptGateLedger.layerLive),
    Layer.provide(RuntimeDataLocator.layerLive),
  )
}
