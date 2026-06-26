import { Schema } from 'effect'
import { CaseId } from './ids.ts'
import { EvidenceSource, VocabularyInput } from './input.ts'
import { IntegrationHealthReport } from './integration-health.ts'
import { PackageVersion, PublishedSemanticPackage, SemanticPackageDraft } from './package.ts'
import { PromptGateCaseView, PromptGateDecision } from './prompt-gate.ts'
import { ProjectRef, RuntimeProbeOrigin } from './runtime-data.ts'
import { PackageCurrentView } from './workflow-result.ts'

export const SemanticRuntimeApiVersion = Schema.Literal('semantic-runtime-facade.v1')

export const RuntimeOperationEffect = Schema.Literals([
  'pure',
  'ledger-write',
  'project-write',
  'external-side-effect',
])

export const SemanticRuntimeToolCategory = Schema.Literals([
  'query',
  'evidence_command',
  'authority_command',
])

export class SemanticRuntimeToolMetadata extends Schema.Class<SemanticRuntimeToolMetadata>(
  'harmony.semantic-model/SemanticRuntimeToolMetadata',
)({
  toolName: Schema.NonEmptyString,
  category: SemanticRuntimeToolCategory,
  operationEffect: RuntimeOperationEffect,
}) {}

export const SemanticRuntimeQueryErrorReason = Schema.Literals([
  'ledger_busy',
  'storage_unavailable',
])

export class SemanticRuntimeQueryError extends Schema.TaggedErrorClass<SemanticRuntimeQueryError>()(
  'SemanticRuntimeQueryError',
  {
    reason: SemanticRuntimeQueryErrorReason,
    requestId: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
  },
) {}

export class SemanticRuntimeStatusQuery extends Schema.Class<SemanticRuntimeStatusQuery>(
  'harmony.semantic-model/SemanticRuntimeStatusQuery',
)({
  requestId: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
}) {}

export class SemanticRuntimeGetCaseQuery extends Schema.Class<SemanticRuntimeGetCaseQuery>(
  'harmony.semantic-model/SemanticRuntimeGetCaseQuery',
)({
  requestId: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  caseId: CaseId,
}) {}

export class SemanticRuntimeEvaluatePromptCommand extends Schema.Class<SemanticRuntimeEvaluatePromptCommand>(
  'harmony.semantic-model/SemanticRuntimeEvaluatePromptCommand',
)({
  requestId: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  managedProject: Schema.optionalKey(Schema.Boolean),
  operationId: Schema.NonEmptyString,
  hostEvent: Schema.Struct({
    session_id: Schema.NonEmptyString,
    turn_id: Schema.NonEmptyString,
    prompt: Schema.NonEmptyString,
    cwd: Schema.NonEmptyString,
    transcript_path: Schema.NullOr(Schema.NonEmptyString),
    hook_event_name: Schema.Literal('UserPromptSubmit'),
  }),
}) {}

export class SemanticRuntimeCompileVocabularyDraftCommand extends Schema.Class<SemanticRuntimeCompileVocabularyDraftCommand>(
  'harmony.semantic-model/SemanticRuntimeCompileVocabularyDraftCommand',
)({
  requestId: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  operationId: Schema.NonEmptyString,
  input: VocabularyInput,
}) {}

export class SemanticRuntimeCompileAndPublishVocabularyCommand extends Schema.Class<SemanticRuntimeCompileAndPublishVocabularyCommand>(
  'harmony.semantic-model/SemanticRuntimeCompileAndPublishVocabularyCommand',
)({
  requestId: Schema.NonEmptyString,
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  operationId: Schema.NonEmptyString,
  input: VocabularyInput,
}) {}

export class SemanticRuntimeStatusResult extends Schema.Class<SemanticRuntimeStatusResult>(
  'harmony.semantic-model/SemanticRuntimeStatusResult',
)({
  resultKind: Schema.Literal('runtime_status'),
  integrationHealth: IntegrationHealthReport,
  projectRef: ProjectRef,
  probeRecordCount: Schema.Number,
  observedOrigins: Schema.Array(RuntimeProbeOrigin),
}) {}

export class SemanticRuntimeMissingCaseResult extends Schema.Class<SemanticRuntimeMissingCaseResult>(
  'harmony.semantic-model/SemanticRuntimeMissingCaseResult',
)({
  resultKind: Schema.Literal('missing_case'),
  caseId: CaseId,
  reason: Schema.Literal('case_not_found'),
}) {}

export class SemanticRuntimeFoundCaseResult extends Schema.Class<SemanticRuntimeFoundCaseResult>(
  'harmony.semantic-model/SemanticRuntimeFoundCaseResult',
)({
  resultKind: Schema.Literal('case_found'),
  caseView: PromptGateCaseView,
}) {}

export class SemanticRuntimeVocabularyDraftCompiledResult extends Schema.Class<SemanticRuntimeVocabularyDraftCompiledResult>(
  'harmony.semantic-model/SemanticRuntimeVocabularyDraftCompiledResult',
)({
  resultKind: Schema.Literal('vocabulary_draft_compiled'),
  evidenceSource: EvidenceSource,
  draft: SemanticPackageDraft,
  ledgerRecordIds: Schema.Array(Schema.NonEmptyString),
}) {}

export class SemanticRuntimeVocabularyPublishedResult extends Schema.Class<SemanticRuntimeVocabularyPublishedResult>(
  'harmony.semantic-model/SemanticRuntimeVocabularyPublishedResult',
)({
  resultKind: Schema.Literal('vocabulary_published'),
  evidenceSource: EvidenceSource,
  draft: SemanticPackageDraft,
  publishedPackage: PublishedSemanticPackage,
  packageVersion: PackageVersion,
  currentView: PackageCurrentView,
  ledgerRecordIds: Schema.Array(Schema.NonEmptyString),
}) {}

export const SemanticRuntimeGetCaseResult = Schema.Union([
  SemanticRuntimeFoundCaseResult,
  SemanticRuntimeMissingCaseResult,
])
export type SemanticRuntimeGetCaseResultType = typeof SemanticRuntimeGetCaseResult.Type

export class SemanticRuntimeStatusResponse extends Schema.Class<SemanticRuntimeStatusResponse>(
  'harmony.semantic-model/SemanticRuntimeStatusResponse',
)({
  apiVersion: SemanticRuntimeApiVersion,
  requestId: Schema.NonEmptyString,
  effect: Schema.Literal('pure'),
  asOfSeq: Schema.Number,
  sourceRecordIds: Schema.Array(Schema.NonEmptyString),
  committedRecordIds: Schema.Array(Schema.NonEmptyString),
  result: SemanticRuntimeStatusResult,
}) {}

export class SemanticRuntimeGetCaseResponse extends Schema.Class<SemanticRuntimeGetCaseResponse>(
  'harmony.semantic-model/SemanticRuntimeGetCaseResponse',
)({
  apiVersion: SemanticRuntimeApiVersion,
  requestId: Schema.NonEmptyString,
  effect: Schema.Literal('pure'),
  asOfSeq: Schema.Number,
  sourceRecordIds: Schema.Array(Schema.NonEmptyString),
  committedRecordIds: Schema.Array(Schema.NonEmptyString),
  result: SemanticRuntimeGetCaseResult,
}) {}

export class SemanticRuntimeEvaluatePromptResponse extends Schema.Class<SemanticRuntimeEvaluatePromptResponse>(
  'harmony.semantic-model/SemanticRuntimeEvaluatePromptResponse',
)({
  apiVersion: SemanticRuntimeApiVersion,
  requestId: Schema.NonEmptyString,
  effect: Schema.Literals(['pure', 'ledger-write']),
  asOfSeq: Schema.Number,
  sourceRecordIds: Schema.Array(Schema.NonEmptyString),
  committedRecordIds: Schema.Array(Schema.NonEmptyString),
  result: PromptGateDecision,
}) {}

export class SemanticRuntimeCompileVocabularyDraftResponse extends Schema.Class<SemanticRuntimeCompileVocabularyDraftResponse>(
  'harmony.semantic-model/SemanticRuntimeCompileVocabularyDraftResponse',
)({
  apiVersion: SemanticRuntimeApiVersion,
  requestId: Schema.NonEmptyString,
  effect: Schema.Literal('ledger-write'),
  asOfSeq: Schema.Number,
  sourceRecordIds: Schema.Array(Schema.NonEmptyString),
  committedRecordIds: Schema.Array(Schema.NonEmptyString),
  result: SemanticRuntimeVocabularyDraftCompiledResult,
}) {}

export class SemanticRuntimeCompileAndPublishVocabularyResponse extends Schema.Class<SemanticRuntimeCompileAndPublishVocabularyResponse>(
  'harmony.semantic-model/SemanticRuntimeCompileAndPublishVocabularyResponse',
)({
  apiVersion: SemanticRuntimeApiVersion,
  requestId: Schema.NonEmptyString,
  effect: Schema.Literal('ledger-write'),
  asOfSeq: Schema.Number,
  sourceRecordIds: Schema.Array(Schema.NonEmptyString),
  committedRecordIds: Schema.Array(Schema.NonEmptyString),
  result: SemanticRuntimeVocabularyPublishedResult,
}) {}

export type SemanticRuntimeStatusResponseType = typeof SemanticRuntimeStatusResponse.Type
export type SemanticRuntimeGetCaseResponseType = typeof SemanticRuntimeGetCaseResponse.Type
export type SemanticRuntimeEvaluatePromptResponseType = typeof SemanticRuntimeEvaluatePromptResponse.Type
export type SemanticRuntimeCompileVocabularyDraftResponseType
  = typeof SemanticRuntimeCompileVocabularyDraftResponse.Type
export type SemanticRuntimeCompileAndPublishVocabularyResponseType
  = typeof SemanticRuntimeCompileAndPublishVocabularyResponse.Type
