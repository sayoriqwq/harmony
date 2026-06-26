import type { PromptGateLedgerRecordType } from '@harmony/semantic-model/schema/prompt-gate'
import type { SemanticRuntimeEvaluatePromptCommand } from '@harmony/semantic-model/schema/runtime-facade'
import type { FileHandle } from 'node:fs/promises'
import type { RuntimeDataAccessError } from './runtime-data-locator.ts'
import { createHash } from 'node:crypto'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import { Case } from '@harmony/semantic-model/schema/case'
import {
  ActiveEnvironmentId,
  CaseId,
  EvidenceSourceId,
  RequestFrameId,
  SemanticInputId,
  SemanticIrId,
  SourceSpanId,
} from '@harmony/semantic-model/schema/ids'
import {
  EvidenceRef,
  PromptEvidenceSource,
  PromptInput,
  SourceSpan,
} from '@harmony/semantic-model/schema/input'
import {
  ClarificationAnswerObservedRecord,
  HostTurnBoundToCaseRecord,
  PendingClarification,
  PendingClarificationRecordedRecord,
  PromptClarificationCandidate,
  PromptGateAdditionalContext,
  PromptGateBlockClarifyDecision,
  PromptGateCaseOpenedRecord,
  PromptGateCaseTransitionRecord,
  PromptGateCaseView,
  PromptGateClarificationResolvedDecision,
  PromptGateCommitResult,
  PromptGateDecisionRecordedRecord,
  PromptGateLedgerRecord,
  PromptGatePassDecision,
  PromptObservedRecord,
} from '@harmony/semantic-model/schema/prompt-gate'
import {
  ProjectRef,
  RuntimeDataLocatorRequest,
  RuntimeHostProvenance,
} from '@harmony/semantic-model/schema/runtime-data'
import {
  ProhibitedAction,
  RequestFrame,
  RequestTarget,
  SemanticIr,
} from '@harmony/semantic-model/schema/semantic-ir'
import { Context, Effect, Layer, Schema } from 'effect'
import { deterministicInstant } from './constants.ts'
import { RuntimeDataLocator } from './runtime-data-locator.ts'

export class PromptGateLedgerError extends Schema.TaggedErrorClass<PromptGateLedgerError>()(
  'PromptGateLedgerError',
  {
    operation: Schema.Literals([
      'append-prompt-gate-records',
      'read-prompt-gate-records',
      'decode-prompt-gate-record',
    ]),
    path: Schema.String,
    message: Schema.String,
  },
) {}

export class PromptGateLedgerBusyError extends Schema.TaggedErrorClass<PromptGateLedgerBusyError>()(
  'PromptGateLedgerBusyError',
  {
    operation: Schema.Literal('append-prompt-gate-records'),
    path: Schema.String,
    retryAfterMs: Schema.Number,
    message: Schema.String,
  },
) {}

const ledgerLockMaxAttempts = 5
const ledgerBusyRetryAfterMs = 25

function causeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function promptGateLedgerPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'prompt-gate-ledger.jsonl')
}

function promptGateLedgerLockPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'prompt-gate-ledger.lock')
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function tokenFor(operationId: string) {
  return digest(operationId)
}

function sourceSpan(id: string, startOffset: number, endOffset: number, text: string) {
  return new SourceSpan({
    id: Schema.decodeUnknownSync(SourceSpanId)(`source-span:${id}`),
    startOffset,
    endOffset,
    text,
  })
}

function firstMatchingSpan(prompt: string, text: string, fallbackStart: number, id: string) {
  const index = prompt.indexOf(text)
  const startOffset = index === -1 ? fallbackStart : index
  return sourceSpan(id, startOffset, startOffset + text.length, text)
}

function recordId(token: string, suffix: string) {
  return `prompt-gate-record:${token}-${suffix}`
}

function evidenceRef(sourceId: typeof EvidenceSourceId.Type, spanId: typeof SourceSpanId.Type) {
  return new EvidenceRef({ sourceId, spanId })
}

function observedRecordFrom(
  command: SemanticRuntimeEvaluatePromptCommand,
  token: string,
  source: PromptEvidenceSource,
) {
  return new PromptObservedRecord({
    recordKind: 'PromptObserved',
    recordId: recordId(token, 'prompt-observed'),
    operationId: command.operationId,
    recordedAt: deterministicInstant,
    projectRef: command.projectRef,
    source,
    hostProvenance: new RuntimeHostProvenance({
      hostKind: 'hook',
      cwd: command.hostEvent.cwd,
      sessionId: command.hostEvent.session_id,
      turnId: command.hostEvent.turn_id,
      eventName: command.hostEvent.hook_event_name,
    }),
  })
}

function canonicalValidateOnlyArtifacts(
  command: SemanticRuntimeEvaluatePromptCommand,
): PromptGateCommitResult {
  const token = tokenFor(command.operationId)
  const prompt = command.hostEvent.prompt
  const promptInputId = Schema.decodeUnknownSync(SemanticInputId)(`semantic-input:${token}-prompt`)
  const targetInputId = Schema.decodeUnknownSync(SemanticInputId)(`semantic-input:${token}-target`)
  const evidenceSourceId = Schema.decodeUnknownSync(EvidenceSourceId)(`evidence-source:${token}-prompt`)
  const environmentRef = Schema.decodeUnknownSync(ActiveEnvironmentId)('active-environment:default-project')
  const semanticIrId = Schema.decodeUnknownSync(SemanticIrId)(`semantic-ir:${token}-prompt`)
  const caseId = Schema.decodeUnknownSync(CaseId)(`case:${token}`)
  const requestFrameId = Schema.decodeUnknownSync(RequestFrameId)(`request-frame:${token}-validate`)

  const fullSpan = sourceSpan(`${token}-full`, 0, prompt.length, prompt)
  const actionSpan = firstMatchingSpan(prompt, 'check', 0, `${token}-action`)
  const prohibitedSpan = firstMatchingSpan(prompt, 'do not edit it', prompt.length - 'do not edit it'.length, `${token}-prohibit-edit`)
  const actionEvidence = evidenceRef(evidenceSourceId, actionSpan.id)
  const prohibitedEvidence = evidenceRef(evidenceSourceId, prohibitedSpan.id)

  const input = new PromptInput({
    id: promptInputId,
    inputKind: 'prompt',
    content: prompt,
    promptRole: 'user_request',
    targetRefs: [targetInputId],
    spans: [fullSpan, actionSpan, prohibitedSpan],
  })
  const source = new PromptEvidenceSource({
    id: evidenceSourceId,
    evidenceKind: 'prompt-source',
    inputRef: input.id,
    originalText: prompt,
    spans: input.spans,
    capturedAt: deterministicInstant,
  })
  const requestFrame = new RequestFrame({
    id: requestFrameId,
    frameKind: 'request',
    action: 'validate',
    target: new RequestTarget({
      targetKind: 'referenced_document',
      targetRef: targetInputId,
      evidenceRefs: [actionEvidence],
    }),
    prohibitedActions: [
      new ProhibitedAction({
        action: 'rewrite',
        evidenceRefs: [prohibitedEvidence],
      }),
    ],
    actionEvidenceRefs: [actionEvidence],
    targetEvidenceRefs: [actionEvidence],
    prohibitedActionEvidenceRefs: [prohibitedEvidence],
  })
  const semanticIr = new SemanticIr({
    id: semanticIrId,
    artifactKind: 'semantic-ir',
    inputKind: 'prompt',
    inputRef: input.id,
    environmentRef,
    frameInstances: [requestFrame],
    relationAssertions: [],
    competingInterpretations: [],
    unresolvedSpans: [],
    evidenceRefs: [actionEvidence, prohibitedEvidence],
    decisionState: 'parsed',
  })
  const openedCase = new Case({
    id: caseId,
    artifactKind: 'case',
    originalPromptInputRef: input.id,
    originalPromptEvidenceSourceId: source.id,
    originalIrRef: semanticIr.id,
    currentIrRef: semanticIr.id,
    currentSemanticIr: semanticIr,
    status: 'opened',
    openedAt: deterministicInstant,
    updatedAt: deterministicInstant,
  })
  const additionalContext = new PromptGateAdditionalContext({
    caseId,
    action: 'validate',
    prohibitedActions: ['rewrite'],
    environmentRef,
  })
  const decision = new PromptGatePassDecision({
    decisionKind: 'pass',
    caseId,
    action: 'validate',
    prohibitedActions: ['rewrite'],
    environmentRef,
    additionalContext,
  })
  return new PromptGateCommitResult({
    case: openedCase,
    decision,
    records: [
      observedRecordFrom(command, token, source),
      new PromptGateCaseOpenedRecord({
        recordKind: 'CaseOpened',
        recordId: recordId(token, 'case-opened'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        case: openedCase,
      }),
      new PromptGateDecisionRecordedRecord({
        recordKind: 'PromptGateDecisionRecorded',
        recordId: recordId(token, 'decision-recorded'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        decision,
      }),
      new HostTurnBoundToCaseRecord({
        recordKind: 'HostTurnBoundToCase',
        recordId: recordId(token, 'turn-bound-to-case'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        hostSessionId: command.hostEvent.session_id,
        hostTurnId: command.hostEvent.turn_id,
        caseId,
      }),
    ],
  })
}

function clarificationCandidates() {
  return [
    new PromptClarificationCandidate({
      candidateId: 'candidate:validate-without-editing',
      action: 'validate',
      behavior: 'review_without_modifying',
      label: 'Validate only; do not edit.',
    }),
    new PromptClarificationCandidate({
      candidateId: 'candidate:rewrite-improve',
      action: 'rewrite',
      behavior: 'modify_target_content',
      label: 'Rewrite/improve the document.',
    }),
  ]
}

function canonicalClarificationArtifacts(
  command: SemanticRuntimeEvaluatePromptCommand,
): PromptGateCommitResult {
  const base = canonicalValidateOnlyArtifacts(command)
  const token = tokenFor(command.operationId)
  const questionId = `clarification-question:${token}`
  const candidates = clarificationCandidates()
  const clarifiedIr = new SemanticIr({
    ...base.case.currentSemanticIr,
    decisionState: 'requires_clarification',
  })
  const clarifiedCase = new Case({
    ...base.case,
    currentSemanticIr: clarifiedIr,
    currentIrRef: clarifiedIr.id,
  })
  const decision = new PromptGateBlockClarifyDecision({
    decisionKind: 'blockClarify',
    caseId: clarifiedCase.id,
    questionId,
    question: 'Should Harmony only validate/review the document, or rewrite/improve it?',
    reason: 'behavior_changing_action_ambiguity',
    candidates,
    attempts: 1,
  })
  const pending = new PendingClarification({
    caseId: clarifiedCase.id,
    projectRef: command.projectRef,
    hostSessionId: command.hostEvent.session_id,
    blockedTurnId: command.hostEvent.turn_id,
    questionId,
    candidates,
    attempts: 1,
  })
  const sourceRecord = base.records.find(record => record.recordKind === 'PromptObserved')
  if (sourceRecord === undefined || sourceRecord.recordKind !== 'PromptObserved') {
    throw new Error('PromptObserved record is required')
  }

  return new PromptGateCommitResult({
    case: clarifiedCase,
    decision,
    records: [
      sourceRecord,
      new PromptGateCaseOpenedRecord({
        recordKind: 'CaseOpened',
        recordId: recordId(token, 'case-opened'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        case: clarifiedCase,
      }),
      new PromptGateDecisionRecordedRecord({
        recordKind: 'PromptGateDecisionRecorded',
        recordId: recordId(token, 'decision-recorded'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        decision,
      }),
      new PendingClarificationRecordedRecord({
        recordKind: 'PendingClarificationRecorded',
        recordId: recordId(token, 'pending-clarification'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        pending,
      }),
    ],
  })
}

function canonicalClarificationResolutionArtifacts(
  command: SemanticRuntimeEvaluatePromptCommand,
  pending: PendingClarification,
  currentCase: Case,
): PromptGateCommitResult {
  const token = tokenFor(command.operationId)
  const sourceSpanValue = sourceSpan(`${token}-answer-full`, 0, command.hostEvent.prompt.length, command.hostEvent.prompt)
  const source = new PromptEvidenceSource({
    id: Schema.decodeUnknownSync(EvidenceSourceId)(`evidence-source:${token}-clarification-answer`),
    evidenceKind: 'prompt-source',
    inputRef: currentCase.originalPromptInputRef,
    originalText: command.hostEvent.prompt,
    spans: [sourceSpanValue],
    capturedAt: deterministicInstant,
  })
  const selectedCandidate = pending.candidates[0]
  if (selectedCandidate === undefined) {
    throw new Error('Pending clarification requires at least one candidate')
  }
  const resolvedIr = new SemanticIr({
    ...currentCase.currentSemanticIr,
    decisionState: 'parsed',
  })
  const resolvedCase = new Case({
    ...currentCase,
    currentSemanticIr: resolvedIr,
    currentIrRef: resolvedIr.id,
    updatedAt: deterministicInstant,
  })
  const additionalContext = new PromptGateAdditionalContext({
    caseId: resolvedCase.id,
    action: selectedCandidate.action,
    prohibitedActions: ['rewrite'],
    environmentRef: resolvedCase.currentSemanticIr.environmentRef,
  })
  const decision = new PromptGateClarificationResolvedDecision({
    decisionKind: 'clarificationResolved',
    caseId: resolvedCase.id,
    questionId: pending.questionId,
    selectedCandidate,
    action: selectedCandidate.action,
    prohibitedActions: ['rewrite'],
    environmentRef: resolvedCase.currentSemanticIr.environmentRef,
    additionalContext,
  })

  return new PromptGateCommitResult({
    case: resolvedCase,
    decision,
    records: [
      new ClarificationAnswerObservedRecord({
        recordKind: 'ClarificationAnswerObserved',
        recordId: recordId(token, 'clarification-answer'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        pending,
        source,
        hostProvenance: new RuntimeHostProvenance({
          hostKind: 'hook',
          cwd: command.hostEvent.cwd,
          sessionId: command.hostEvent.session_id,
          turnId: command.hostEvent.turn_id,
          eventName: command.hostEvent.hook_event_name,
        }),
        resolutionKind: 'resolved',
        selectedCandidate,
      }),
      new PromptGateCaseTransitionRecord({
        recordKind: 'CaseTransitioned',
        recordId: recordId(token, 'case-transitioned'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        caseId: resolvedCase.id,
        fromState: 'awaiting_clarification',
        toState: 'resolved',
        reason: 'user_selected_validate_without_editing',
        case: resolvedCase,
      }),
      new PromptGateDecisionRecordedRecord({
        recordKind: 'PromptGateDecisionRecorded',
        recordId: recordId(token, 'decision-recorded'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        decision,
      }),
      new HostTurnBoundToCaseRecord({
        recordKind: 'HostTurnBoundToCase',
        recordId: recordId(token, 'turn-bound-to-case'),
        operationId: command.operationId,
        recordedAt: deterministicInstant,
        projectRef: command.projectRef,
        hostSessionId: command.hostEvent.session_id,
        hostTurnId: command.hostEvent.turn_id,
        caseId: resolvedCase.id,
      }),
    ],
  })
}

function sameProjectRef(left: ProjectRef, right: ProjectRef) {
  return left.projectId === right.projectId && left.worktreeId === right.worktreeId
}

function commitResultFromRecords(records: ReadonlyArray<PromptGateLedgerRecordType>) {
  const caseRecord = records.find(isPromptGateCaseOpenedRecord)
  const transitionRecord = records.find(isPromptGateCaseTransitionRecord)
  const decisionRecord = records.find(isPromptGateDecisionRecordedRecord)
  if (caseRecord === undefined || decisionRecord === undefined) {
    if (transitionRecord === undefined || decisionRecord === undefined) {
      return undefined
    }
    return new PromptGateCommitResult({
      case: transitionRecord.case,
      decision: decisionRecord.decision,
      records,
    })
  }

  return new PromptGateCommitResult({
    case: caseRecord.case,
    decision: decisionRecord.decision,
    records,
  })
}

function caseViewFromRecords(caseId: typeof CaseId.Type, records: ReadonlyArray<PromptGateLedgerRecordType>) {
  const caseRecord = records
    .filter(isPromptGateCaseOpenedRecord)
    .find(record => record.case.id === caseId)
  if (caseRecord === undefined) {
    return undefined
  }
  const caseRecords = records.filter(record =>
    record.operationId === caseRecord.operationId || recordBelongsToCase(caseId)(record),
  )
  const transitionRecord = caseRecords
    .filter(isPromptGateCaseTransitionRecord)
    .at(-1)
  const decisionRecord = caseRecords.filter(isPromptGateDecisionRecordedRecord).at(-1)
  if (decisionRecord === undefined) {
    return undefined
  }

  return new PromptGateCaseView({
    case: transitionRecord?.case ?? caseRecord.case,
    decision: decisionRecord.decision,
    sourceRecordIds: caseRecords.map(record => record.recordId),
  })
}

function isPromptGateCaseOpenedRecord(
  record: PromptGateLedgerRecordType,
): record is PromptGateCaseOpenedRecord {
  return record.recordKind === 'CaseOpened'
}

function isPromptGateDecisionRecordedRecord(
  record: PromptGateLedgerRecordType,
): record is PromptGateDecisionRecordedRecord {
  return record.recordKind === 'PromptGateDecisionRecorded'
}

function isPromptGateCaseTransitionRecord(
  record: PromptGateLedgerRecordType,
): record is PromptGateCaseTransitionRecord {
  return record.recordKind === 'CaseTransitioned'
}

function isPendingClarificationRecordedRecord(
  record: PromptGateLedgerRecordType,
): record is PendingClarificationRecordedRecord {
  return record.recordKind === 'PendingClarificationRecorded'
}

function recordBelongsToCase(caseId: typeof CaseId.Type) {
  return (record: PromptGateLedgerRecordType) => {
    if (record.recordKind === 'CaseOpened') {
      return record.case.id === caseId
    }
    if (record.recordKind === 'PromptGateDecisionRecorded') {
      return 'caseId' in record.decision && record.decision.caseId === caseId
    }
    if (record.recordKind === 'HostTurnBoundToCase') {
      return record.caseId === caseId
    }
    if (record.recordKind === 'PendingClarificationRecorded') {
      return record.pending.caseId === caseId
    }
    if (record.recordKind === 'ClarificationAnswerObserved') {
      return record.pending.caseId === caseId
    }
    if (record.recordKind === 'CaseTransitioned') {
      return record.caseId === caseId
    }
    return false
  }
}

function pendingClarificationForSession(
  records: ReadonlyArray<PromptGateLedgerRecordType>,
  hostSessionId: string,
) {
  const pendingRecords = records
    .filter(isPendingClarificationRecordedRecord)
    .filter(record => record.pending.hostSessionId === hostSessionId)
  return latestUnresolvedPending(records, pendingRecords)
}

function latestUnresolvedPending(
  records: ReadonlyArray<PromptGateLedgerRecordType>,
  pendingRecords: ReadonlyArray<PendingClarificationRecordedRecord>,
) {
  const latestPending = pendingRecords.at(-1)
  if (latestPending === undefined) {
    return undefined
  }
  const hasResolution = records
    .filter(isPromptGateCaseTransitionRecord)
    .some(record => record.caseId === latestPending.pending.caseId && record.toState !== 'awaiting_clarification')
  return hasResolution ? undefined : latestPending.pending
}

function isAmbiguousImprovePrompt(prompt: string) {
  return prompt.trim().toLowerCase() === 'check and improve this document'
}

function promptGateRecordLines(records: ReadonlyArray<PromptGateLedgerRecordType>) {
  return `${records.map(record => JSON.stringify(record)).join('\n')}\n`
}

function isNotFound(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'
}

function isAlreadyExists(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'EEXIST'
}

function acquirePromptLedgerLock(lockPath: string) {
  return Effect.gen(function* () {
    for (let attempt = 0; attempt < ledgerLockMaxAttempts; attempt += 1) {
      const handle = yield* Effect.tryPromise({
        try: () => Fs.open(lockPath, 'wx'),
        catch: cause => cause,
      }).pipe(
        Effect.matchEffect({
          onFailure: (cause) => {
            if (isAlreadyExists(cause)) {
              return Effect.succeed<FileHandle | undefined>(undefined)
            }
            return Effect.fail(new PromptGateLedgerError({
              operation: 'append-prompt-gate-records',
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

    return yield* new PromptGateLedgerBusyError({
      operation: 'append-prompt-gate-records',
      path: lockPath,
      retryAfterMs: ledgerBusyRetryAfterMs,
      message: 'Prompt Gate ledger is busy; retry the same operation id after the suggested delay.',
    })
  })
}

function releasePromptLedgerLock(lockPath: string, handle: FileHandle) {
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

function withPromptLedgerLock<A, E, R>(
  lockPath: string,
  effect: Effect.Effect<A, E, R>,
) {
  return Effect.acquireUseRelease(
    acquirePromptLedgerLock(lockPath),
    () => effect,
    handle => releasePromptLedgerLock(lockPath, handle),
  )
}

const commandSchema = Schema.Struct({
  requestId: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  operationId: Schema.NonEmptyString,
  hostEvent: Schema.Struct({
    session_id: Schema.NonEmptyString,
    turn_id: Schema.NonEmptyString,
    prompt: Schema.NonEmptyString,
    cwd: Schema.NonEmptyString,
    transcript_path: Schema.NullOr(Schema.NonEmptyString),
    hook_event_name: Schema.Literal('UserPromptSubmit'),
  }),
})

export class PromptGateLedger extends Context.Service<PromptGateLedger, {
  recordPrompt: (
    command: SemanticRuntimeEvaluatePromptCommand,
  ) => Effect.Effect<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
  recordPass: (
    command: SemanticRuntimeEvaluatePromptCommand,
  ) => Effect.Effect<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
  recordClarification: (
    command: SemanticRuntimeEvaluatePromptCommand,
  ) => Effect.Effect<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
  resolveClarification: (
    command: SemanticRuntimeEvaluatePromptCommand,
    pending: PendingClarification,
  ) => Effect.Effect<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
  pendingForSession: (
    dataRoot: string,
    projectRef: ProjectRef,
    hostSessionId: string,
  ) => Effect.Effect<PendingClarification | undefined, PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
  getCase: (
    dataRoot: string,
    projectRef: ProjectRef,
    caseId: typeof CaseId.Type,
  ) => Effect.Effect<PromptGateCaseView | undefined, PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
  records: (
    dataRoot: string,
    projectRef: ProjectRef,
  ) => Effect.Effect<ReadonlyArray<PromptGateLedgerRecordType>, PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError>
}>()('harmony/headless-runtime/PromptGateLedger') {
  static readonly layerNoDeps = Layer.effect(
    PromptGateLedger,
    Effect.gen(function* () {
      const locator = yield* RuntimeDataLocator

      const records = Effect.fn('PromptGateLedger.records')(
        function* (
          dataRoot: string,
          projectRef: ProjectRef,
        ): Effect.fn.Return<ReadonlyArray<PromptGateLedgerRecordType>, PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({ dataRoot, projectRef }))
          const ledgerPath = promptGateLedgerPath(location.projectDataRoot)
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
              new PromptGateLedgerError({
                operation: 'read-prompt-gate-records',
                path: ledgerPath,
                message: causeMessage(cause),
              }),
          })
          const lines = text.split(/\r?\n/).filter(line => line.length > 0)
          const decodedRecords: Array<PromptGateLedgerRecordType> = []

          for (const [lineIndex, line] of lines.entries()) {
            const parsed = yield* Effect.try({
              try: () => JSON.parse(line) as unknown,
              catch: cause =>
                new PromptGateLedgerError({
                  operation: 'decode-prompt-gate-record',
                  path: ledgerPath,
                  message: `Invalid JSON on line ${lineIndex + 1}: ${causeMessage(cause)}`,
                }),
            })
            const record = yield* Schema.decodeUnknownEffect(PromptGateLedgerRecord)(parsed)
            if (sameProjectRef(record.projectRef, projectRef)) {
              decodedRecords.push(record)
            }
          }

          return decodedRecords
        },
      )

      const recordPass = Effect.fn('PromptGateLedger.recordPass')(
        function* (
          command: SemanticRuntimeEvaluatePromptCommand,
        ): Effect.fn.Return<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(commandSchema)(command)
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          }))
          const ledgerPath = promptGateLedgerPath(location.projectDataRoot)
          return yield* withPromptLedgerLock(promptGateLedgerLockPath(location.projectDataRoot), Effect.gen(function* () {
            const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
            const existingOperationRecords = existingRecords.filter(record => record.operationId === decoded.operationId)
            const existingCommit = commitResultFromRecords(existingOperationRecords)
            if (existingCommit !== undefined) {
              return existingCommit
            }

            const commit = yield* Schema.decodeUnknownEffect(PromptGateCommitResult)(
              canonicalValidateOnlyArtifacts(decoded),
            )
            yield* Effect.tryPromise({
              try: () => Fs.appendFile(ledgerPath, promptGateRecordLines(commit.records), 'utf8'),
              catch: cause =>
                new PromptGateLedgerError({
                  operation: 'append-prompt-gate-records',
                  path: ledgerPath,
                  message: causeMessage(cause),
                }),
            })

            return commit
          }))
        },
      )

      const recordClarification = Effect.fn('PromptGateLedger.recordClarification')(
        function* (
          command: SemanticRuntimeEvaluatePromptCommand,
        ): Effect.fn.Return<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(commandSchema)(command)
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          }))
          const ledgerPath = promptGateLedgerPath(location.projectDataRoot)
          return yield* withPromptLedgerLock(promptGateLedgerLockPath(location.projectDataRoot), Effect.gen(function* () {
            const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
            const existingOperationRecords = existingRecords.filter(record => record.operationId === decoded.operationId)
            const existingCommit = commitResultFromRecords(existingOperationRecords)
            if (existingCommit !== undefined) {
              return existingCommit
            }

            const commit = yield* Schema.decodeUnknownEffect(PromptGateCommitResult)(
              canonicalClarificationArtifacts(decoded),
            )
            yield* Effect.tryPromise({
              try: () => Fs.appendFile(ledgerPath, promptGateRecordLines(commit.records), 'utf8'),
              catch: cause =>
                new PromptGateLedgerError({
                  operation: 'append-prompt-gate-records',
                  path: ledgerPath,
                  message: causeMessage(cause),
                }),
            })

            return commit
          }))
        },
      )

      const resolveClarification = Effect.fn('PromptGateLedger.resolveClarification')(
        function* (
          command: SemanticRuntimeEvaluatePromptCommand,
          pending: PendingClarification,
        ): Effect.fn.Return<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(commandSchema)(command)
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          }))
          const ledgerPath = promptGateLedgerPath(location.projectDataRoot)
          return yield* withPromptLedgerLock(promptGateLedgerLockPath(location.projectDataRoot), Effect.gen(function* () {
            const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
            const existingOperationRecords = existingRecords.filter(record => record.operationId === decoded.operationId)
            const existingCommit = commitResultFromRecords(existingOperationRecords)
            if (existingCommit !== undefined) {
              return existingCommit
            }
            const currentCase = caseViewFromRecords(pending.caseId, existingRecords)?.case
            if (currentCase === undefined) {
              return yield* new PromptGateLedgerError({
                operation: 'append-prompt-gate-records',
                path: decoded.dataRoot,
                message: `Pending clarification case ${pending.caseId} was not found`,
              })
            }

            const commit = yield* Schema.decodeUnknownEffect(PromptGateCommitResult)(
              canonicalClarificationResolutionArtifacts(decoded, pending, currentCase),
            )
            yield* Effect.tryPromise({
              try: () => Fs.appendFile(ledgerPath, promptGateRecordLines(commit.records), 'utf8'),
              catch: cause =>
                new PromptGateLedgerError({
                  operation: 'append-prompt-gate-records',
                  path: ledgerPath,
                  message: causeMessage(cause),
                }),
            })

            return commit
          }))
        },
      )

      const recordPrompt = Effect.fn('PromptGateLedger.recordPrompt')(
        function* (
          command: SemanticRuntimeEvaluatePromptCommand,
        ): Effect.fn.Return<PromptGateCommitResult, PromptGateLedgerBusyError | PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(commandSchema)(command)
          const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
          const pending = pendingClarificationForSession(
            existingRecords,
            decoded.hostEvent.session_id,
          )
          if (pending !== undefined) {
            return yield* resolveClarification(decoded, pending)
          }
          if (isAmbiguousImprovePrompt(decoded.hostEvent.prompt)) {
            return yield* recordClarification(decoded)
          }
          return yield* recordPass(decoded)
        },
      )

      const pendingForSessionEffect = Effect.fn('PromptGateLedger.pendingForSession')(
        function* (
          dataRoot: string,
          projectRef: ProjectRef,
          hostSessionId: string,
        ): Effect.fn.Return<PendingClarification | undefined, PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          return pendingClarificationForSession(yield* records(dataRoot, projectRef), hostSessionId)
        },
      )

      const getCase = Effect.fn('PromptGateLedger.getCase')(
        function* (
          dataRoot: string,
          projectRef: ProjectRef,
          caseId: typeof CaseId.Type,
        ): Effect.fn.Return<PromptGateCaseView | undefined, PromptGateLedgerError | RuntimeDataAccessError | Schema.SchemaError> {
          return caseViewFromRecords(caseId, yield* records(dataRoot, projectRef))
        },
      )

      return PromptGateLedger.of({
        recordPrompt,
        recordPass,
        recordClarification,
        resolveClarification,
        pendingForSession: pendingForSessionEffect,
        getCase,
        records,
      })
    }),
  )

  static readonly layerLive = PromptGateLedger.layerNoDeps.pipe(
    Layer.provide(RuntimeDataLocator.layerLive),
  )
}
