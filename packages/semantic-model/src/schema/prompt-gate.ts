import { Schema } from 'effect'
import { Case } from './case.ts'
import { ActiveEnvironmentId, CaseId } from './ids.ts'
import { PromptEvidenceSource } from './input.ts'
import { IntegrationHealthReport } from './integration-health.ts'
import { ClarificationReason, RequestAction, RequestBehavior } from './literals.ts'
import { ProjectRef, RuntimeHostProvenance } from './runtime-data.ts'

export class PromptGateAdditionalContext extends Schema.Class<PromptGateAdditionalContext>(
  'harmony.semantic-model/PromptGateAdditionalContext',
)({
  caseId: CaseId,
  action: RequestAction,
  prohibitedActions: Schema.Array(RequestAction),
  environmentRef: ActiveEnvironmentId,
}) {}

export class PromptGatePassDecision extends Schema.Class<PromptGatePassDecision>(
  'harmony.semantic-model/PromptGatePassDecision',
)({
  decisionKind: Schema.Literal('pass'),
  caseId: CaseId,
  action: RequestAction,
  prohibitedActions: Schema.Array(RequestAction),
  environmentRef: ActiveEnvironmentId,
  additionalContext: PromptGateAdditionalContext,
}) {}

export const PromptGateNoopReason = Schema.Literals([
  'unmanaged_project',
  'no_request_frame_detected',
])
export const PromptGateStoragePolicy = Schema.Literal('no_storage_required')
export const PromptGateBlockReason = Schema.Literal('ledger_unavailable')

export class PromptGateNoopDecision extends Schema.Class<PromptGateNoopDecision>(
  'harmony.semantic-model/PromptGateNoopDecision',
)({
  decisionKind: Schema.Literal('noop'),
  reason: PromptGateNoopReason,
  projectRef: ProjectRef,
  storagePolicy: PromptGateStoragePolicy,
}) {}

export class PromptGateBlockDecision extends Schema.Class<PromptGateBlockDecision>(
  'harmony.semantic-model/PromptGateBlockDecision',
)({
  decisionKind: Schema.Literal('block'),
  reason: PromptGateBlockReason,
  projectRef: ProjectRef,
  integrationHealth: IntegrationHealthReport,
}) {}

export class PromptClarificationCandidate extends Schema.Class<PromptClarificationCandidate>(
  'harmony.semantic-model/PromptClarificationCandidate',
)({
  candidateId: Schema.NonEmptyString,
  action: RequestAction,
  behavior: RequestBehavior,
  label: Schema.NonEmptyString,
}) {}

export class PendingClarification extends Schema.Class<PendingClarification>(
  'harmony.semantic-model/PendingClarification',
)({
  caseId: CaseId,
  projectRef: ProjectRef,
  hostSessionId: Schema.NonEmptyString,
  blockedTurnId: Schema.NonEmptyString,
  questionId: Schema.NonEmptyString,
  candidates: Schema.Array(PromptClarificationCandidate),
  attempts: Schema.Number,
}) {}

export class PromptGateBlockClarifyDecision extends Schema.Class<PromptGateBlockClarifyDecision>(
  'harmony.semantic-model/PromptGateBlockClarifyDecision',
)({
  decisionKind: Schema.Literal('blockClarify'),
  caseId: CaseId,
  questionId: Schema.NonEmptyString,
  question: Schema.NonEmptyString,
  reason: ClarificationReason,
  candidates: Schema.Array(PromptClarificationCandidate),
  attempts: Schema.Number,
}) {}

export class PromptGateClarificationResolvedDecision extends Schema.Class<PromptGateClarificationResolvedDecision>(
  'harmony.semantic-model/PromptGateClarificationResolvedDecision',
)({
  decisionKind: Schema.Literal('clarificationResolved'),
  caseId: CaseId,
  questionId: Schema.NonEmptyString,
  selectedCandidate: PromptClarificationCandidate,
  action: RequestAction,
  prohibitedActions: Schema.Array(RequestAction),
  environmentRef: ActiveEnvironmentId,
  additionalContext: PromptGateAdditionalContext,
}) {}

export class PromptGateClarificationCanceledDecision extends Schema.Class<PromptGateClarificationCanceledDecision>(
  'harmony.semantic-model/PromptGateClarificationCanceledDecision',
)({
  decisionKind: Schema.Literal('clarificationCanceled'),
  caseId: CaseId,
  questionId: Schema.NonEmptyString,
  reason: Schema.Literal('user_canceled'),
}) {}

export class PromptGateClarificationMaxAttemptsDecision extends Schema.Class<
  PromptGateClarificationMaxAttemptsDecision
>(
  'harmony.semantic-model/PromptGateClarificationMaxAttemptsDecision',
)({
  decisionKind: Schema.Literal('clarificationMaxAttemptsReached'),
  caseId: CaseId,
  questionId: Schema.NonEmptyString,
  attempts: Schema.Number,
  question: Schema.NonEmptyString,
}) {}

export const PromptGateDecision = Schema.Union([
  PromptGatePassDecision,
  PromptGateNoopDecision,
  PromptGateBlockDecision,
  PromptGateBlockClarifyDecision,
  PromptGateClarificationResolvedDecision,
  PromptGateClarificationCanceledDecision,
  PromptGateClarificationMaxAttemptsDecision,
])
export type PromptGateDecisionType = typeof PromptGateDecision.Type

export const PromptGateCaseLifecycleState = Schema.Literals([
  'open',
  'awaiting_clarification',
  'resolved',
  'rejected',
])

export class PromptObservedRecord extends Schema.Class<PromptObservedRecord>(
  'harmony.semantic-model/PromptObservedRecord',
)({
  recordKind: Schema.Literal('PromptObserved'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  source: PromptEvidenceSource,
  hostProvenance: RuntimeHostProvenance,
}) {}

export class PromptGateCaseOpenedRecord extends Schema.Class<PromptGateCaseOpenedRecord>(
  'harmony.semantic-model/PromptGateCaseOpenedRecord',
)({
  recordKind: Schema.Literal('CaseOpened'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  case: Case,
}) {}

export class PromptGateDecisionRecordedRecord extends Schema.Class<PromptGateDecisionRecordedRecord>(
  'harmony.semantic-model/PromptGateDecisionRecordedRecord',
)({
  recordKind: Schema.Literal('PromptGateDecisionRecorded'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  decision: PromptGateDecision,
}) {}

export class HostTurnBoundToCaseRecord extends Schema.Class<HostTurnBoundToCaseRecord>(
  'harmony.semantic-model/HostTurnBoundToCaseRecord',
)({
  recordKind: Schema.Literal('HostTurnBoundToCase'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  hostSessionId: Schema.NonEmptyString,
  hostTurnId: Schema.NonEmptyString,
  caseId: CaseId,
}) {}

export class PendingClarificationRecordedRecord extends Schema.Class<PendingClarificationRecordedRecord>(
  'harmony.semantic-model/PendingClarificationRecordedRecord',
)({
  recordKind: Schema.Literal('PendingClarificationRecorded'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  pending: PendingClarification,
}) {}

export class ClarificationAnswerObservedRecord extends Schema.Class<ClarificationAnswerObservedRecord>(
  'harmony.semantic-model/ClarificationAnswerObservedRecord',
)({
  recordKind: Schema.Literal('ClarificationAnswerObserved'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  pending: PendingClarification,
  source: PromptEvidenceSource,
  hostProvenance: RuntimeHostProvenance,
  resolutionKind: Schema.Literals(['resolved', 'canceled', 'unrecognized', 'max_attempts']),
  selectedCandidate: Schema.optionalKey(PromptClarificationCandidate),
}) {}

export class PromptGateCaseTransitionRecord extends Schema.Class<PromptGateCaseTransitionRecord>(
  'harmony.semantic-model/PromptGateCaseTransitionRecord',
)({
  recordKind: Schema.Literal('CaseTransitioned'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  caseId: CaseId,
  fromState: PromptGateCaseLifecycleState,
  toState: PromptGateCaseLifecycleState,
  reason: Schema.NonEmptyString,
  case: Case,
}) {}

export const PromptGateLedgerRecord = Schema.Union([
  PromptObservedRecord,
  PromptGateCaseOpenedRecord,
  PromptGateDecisionRecordedRecord,
  HostTurnBoundToCaseRecord,
  PendingClarificationRecordedRecord,
  ClarificationAnswerObservedRecord,
  PromptGateCaseTransitionRecord,
])
export type PromptGateLedgerRecordType = typeof PromptGateLedgerRecord.Type

export class PromptGateCommitResult extends Schema.Class<PromptGateCommitResult>(
  'harmony.semantic-model/PromptGateCommitResult',
)({
  case: Case,
  decision: PromptGateDecision,
  records: Schema.Array(PromptGateLedgerRecord),
}) {}

export class PromptGateCaseView extends Schema.Class<PromptGateCaseView>(
  'harmony.semantic-model/PromptGateCaseView',
)({
  case: Case,
  decision: PromptGateDecision,
  sourceRecordIds: Schema.Array(Schema.NonEmptyString),
}) {}
