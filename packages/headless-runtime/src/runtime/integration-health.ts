import type {
  HostHookFailureOutcomeType,
  IntegrationHealthReportType,
} from '@harmony/semantic-model/schema/integration-health'
import type { ProjectRef } from '@harmony/semantic-model/schema/runtime-data'
import {
  IntegrationHealthNote,
  IntegrationHealthReport,
  IntegrationLedgerProvenance,
} from '@harmony/semantic-model/schema/integration-health'

interface LedgerUnavailableError {
  readonly operation?: string
  readonly path?: string
  readonly message: string
}

interface LedgerUnavailableOptions {
  readonly ledgerKind: typeof IntegrationLedgerProvenance.Type.ledgerKind
  readonly dataRoot: string
  readonly projectRef: ProjectRef
  readonly operation?: string
}

function ledgerComponent(ledgerKind: typeof IntegrationLedgerProvenance.Type.ledgerKind) {
  return ledgerKind === 'prompt-gate' ? 'prompt-gate-ledger' : 'runtime-data-ledger'
}

function ledgerOperation(error: LedgerUnavailableError, fallback: string | undefined) {
  return error.operation ?? fallback ?? 'unknown-ledger-operation'
}

export function healthyIntegrationHealth(): IntegrationHealthReportType {
  return new IntegrationHealthReport({
    status: 'fully-active',
    reason: 'healthy',
    notes: [],
  })
}

export function ledgerUnavailableIntegrationHealth(
  error: LedgerUnavailableError,
  options: LedgerUnavailableOptions,
): IntegrationHealthReportType {
  const ledgerProvenance = new IntegrationLedgerProvenance({
    ledgerKind: options.ledgerKind,
    operation: ledgerOperation(error, options.operation),
    dataRoot: options.dataRoot,
    projectRef: options.projectRef,
    ...(error.path !== undefined ? { path: error.path } : {}),
  })
  const note = new IntegrationHealthNote({
    severity: 'error',
    component: ledgerComponent(options.ledgerKind),
    reason: 'ledger_unavailable',
    message: error.message,
    ledgerProvenance,
  })

  return new IntegrationHealthReport({
    status: 'degraded',
    reason: 'ledger_unavailable',
    ledgerProvenance,
    notes: [note],
  })
}

function hostFailureReason(outcomeKind: HostHookFailureOutcomeType['outcomeKind']) {
  if (outcomeKind === 'timeout') {
    return 'host_timeout'
  }
  if (outcomeKind === 'crash') {
    return 'host_crash'
  }
  if (outcomeKind === 'malformed_output') {
    return 'host_malformed_output'
  }
  return 'host_unsupported_output'
}

export function hostHookOutcomeIntegrationHealth(
  outcome: HostHookFailureOutcomeType,
): IntegrationHealthReportType {
  const note = new IntegrationHealthNote({
    severity: 'warning',
    component: 'host-hook',
    reason: hostFailureReason(outcome.outcomeKind),
    message: outcome.message,
    hostProvenance: outcome.hostProvenance,
  })

  return new IntegrationHealthReport({
    status: 'degraded',
    reason: 'host_non_guarantee',
    notes: [note],
  })
}
