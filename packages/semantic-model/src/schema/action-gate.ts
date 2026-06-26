import { Schema } from 'effect'
import { CaseId } from './ids.ts'
import { IntegrationHealthReport } from './integration-health.ts'
import { RequestAction } from './literals.ts'
import { ProjectRef } from './runtime-data.ts'

export const ActionGateSupportedPath = Schema.Literals([
  'apply_patch',
  'mcp_command',
  'mcp_query',
])

export const ActionGateDecisionReason = Schema.Literals([
  'read_only_action',
  'unmanaged_project',
  'prohibited_action',
  'missing_turn_binding',
  'case_not_found',
  'runtime_storage_unavailable',
])

export const ActionGateLedgerUnavailablePolicy = Schema.Literals([
  'allow_read_only_without_ledger',
  'deny_writes_without_ledger',
])

export class ActionGateAllowDecision extends Schema.Class<ActionGateAllowDecision>(
  'harmony.semantic-model/ActionGateAllowDecision',
)({
  decisionKind: Schema.Literal('allow'),
  reason: ActionGateDecisionReason,
  supportedPath: ActionGateSupportedPath,
  ledgerUnavailablePolicy: Schema.optionalKey(ActionGateLedgerUnavailablePolicy),
}) {}

export class ActionGateDenyDecision extends Schema.Class<ActionGateDenyDecision>(
  'harmony.semantic-model/ActionGateDenyDecision',
)({
  decisionKind: Schema.Literal('deny'),
  reason: ActionGateDecisionReason,
  supportedPath: ActionGateSupportedPath,
  toolName: Schema.NonEmptyString,
  attemptedAction: RequestAction,
  caseId: Schema.optionalKey(CaseId),
  ledgerUnavailablePolicy: Schema.optionalKey(ActionGateLedgerUnavailablePolicy),
  integrationHealth: Schema.optionalKey(IntegrationHealthReport),
}) {}

export class ActionGateDeferDecision extends Schema.Class<ActionGateDeferDecision>(
  'harmony.semantic-model/ActionGateDeferDecision',
)({
  decisionKind: Schema.Literal('defer'),
  reason: Schema.Literal('ledger_busy'),
  supportedPath: ActionGateSupportedPath,
  toolName: Schema.NonEmptyString,
  retryAfterMs: Schema.Number,
}) {}

export const ActionGateDecision = Schema.Union([
  ActionGateAllowDecision,
  ActionGateDenyDecision,
  ActionGateDeferDecision,
])
export type ActionGateDecisionType = typeof ActionGateDecision.Type

export class ActionGateDecisionRecordedRecord extends Schema.Class<ActionGateDecisionRecordedRecord>(
  'harmony.semantic-model/ActionGateDecisionRecordedRecord',
)({
  recordKind: Schema.Literal('ActionGateDecisionRecorded'),
  recordId: Schema.NonEmptyString,
  operationId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  hostSessionId: Schema.NonEmptyString,
  hostTurnId: Schema.NonEmptyString,
  toolUseId: Schema.NonEmptyString,
  toolName: Schema.NonEmptyString,
  decision: ActionGateDecision,
}) {}

export const ActionGateLedgerRecord = Schema.Union([
  ActionGateDecisionRecordedRecord,
])
export type ActionGateLedgerRecordType = typeof ActionGateLedgerRecord.Type

export class ActionGateCommitResult extends Schema.Class<ActionGateCommitResult>(
  'harmony.semantic-model/ActionGateCommitResult',
)({
  decision: ActionGateDecision,
  records: Schema.Array(ActionGateLedgerRecord),
}) {}
