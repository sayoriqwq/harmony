import { Schema } from 'effect'
import { CodexHookEventName } from './host-event.ts'
import { ProjectRef } from './runtime-data.ts'

export const IntegrationHealthStatus = Schema.Literals([
  'fully-active',
  'degraded',
])

export const IntegrationHealthReason = Schema.Literals([
  'healthy',
  'ledger_unavailable',
  'host_non_guarantee',
])

export const IntegrationHealthNoteSeverity = Schema.Literals([
  'info',
  'warning',
  'error',
])

export const IntegrationHealthNoteComponent = Schema.Literals([
  'runtime-data-ledger',
  'prompt-gate-ledger',
  'host-hook',
])

export const IntegrationHealthNoteReason = Schema.Literals([
  'ledger_unavailable',
  'host_timeout',
  'host_crash',
  'host_malformed_output',
  'host_unsupported_output',
])

export const IntegrationLedgerKind = Schema.Literals([
  'runtime-data',
  'prompt-gate',
])

export class IntegrationLedgerProvenance extends Schema.Class<IntegrationLedgerProvenance>(
  'harmony.semantic-model/IntegrationLedgerProvenance',
)({
  ledgerKind: IntegrationLedgerKind,
  operation: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  path: Schema.optionalKey(Schema.String),
}) {}

export class IntegrationHostHookProvenance extends Schema.Class<IntegrationHostHookProvenance>(
  'harmony.semantic-model/IntegrationHostHookProvenance',
)({
  eventName: CodexHookEventName,
  command: Schema.NonEmptyString,
  sessionId: Schema.optionalKey(Schema.NonEmptyString),
  turnId: Schema.optionalKey(Schema.NonEmptyString),
  toolName: Schema.optionalKey(Schema.NonEmptyString),
  exitCode: Schema.optionalKey(Schema.Number),
  timeoutMs: Schema.optionalKey(Schema.Number),
  stdout: Schema.optionalKey(Schema.String),
  stderr: Schema.optionalKey(Schema.String),
}) {}

export class IntegrationHealthNote extends Schema.Class<IntegrationHealthNote>(
  'harmony.semantic-model/IntegrationHealthNote',
)({
  severity: IntegrationHealthNoteSeverity,
  component: IntegrationHealthNoteComponent,
  reason: IntegrationHealthNoteReason,
  message: Schema.NonEmptyString,
  ledgerProvenance: Schema.optionalKey(IntegrationLedgerProvenance),
  hostProvenance: Schema.optionalKey(IntegrationHostHookProvenance),
}) {}

export class IntegrationHealthReport extends Schema.Class<IntegrationHealthReport>(
  'harmony.semantic-model/IntegrationHealthReport',
)({
  status: IntegrationHealthStatus,
  reason: IntegrationHealthReason,
  ledgerProvenance: Schema.optionalKey(IntegrationLedgerProvenance),
  notes: Schema.Array(IntegrationHealthNote),
}) {}

export const HostHookFailureKind = Schema.Literals([
  'timeout',
  'crash',
  'malformed_output',
  'unsupported_output',
])

export class HostHookFailureOutcome extends Schema.Class<HostHookFailureOutcome>(
  'harmony.semantic-model/HostHookFailureOutcome',
)({
  outcomeKind: HostHookFailureKind,
  message: Schema.NonEmptyString,
  hostProvenance: IntegrationHostHookProvenance,
}) {}

export type IntegrationHealthReportType = typeof IntegrationHealthReport.Type
export type HostHookFailureOutcomeType = typeof HostHookFailureOutcome.Type
